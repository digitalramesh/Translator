import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");

dotenv.config();

const app = express();
const PORT = 3000;

// Set payload limits for document uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Lazy initialization of Gemini client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

const SUPPORTED_LANGUAGES: Record<string, string> = {
  en: "English",
  hi: "Hindi (हिंदी)",
  kn: "Kannada (ಕನ್ನಡ)",
  te: "Telugu (తెలుగు)",
  ta: "Tamil (தமிழ்)",
  ml: "Malayalam (മലയാളം)",
};

// Helper to extract text from PDF buffer with local parsing and Gemini OCR fallback
async function extractTextFromPdfBuffer(
  buffer: Buffer,
  base64Data: string,
  ai: GoogleGenAI
): Promise<string> {
  let extractedText = "";

  // 1. Try local PDF extraction using PDFParse
  try {
    if (typeof pdfParse === "function") {
      const data = await pdfParse(buffer);
      extractedText = data.text || "";
    } else if (pdfParse && typeof pdfParse.PDFParse === "function") {
      const parser = new pdfParse.PDFParse({ data: buffer });
      try {
        const data = await parser.getText();
        extractedText = data.text || "";
      } finally {
        await parser.destroy();
      }
    } else if (typeof (pdfParse as any)?.default === "function") {
      const data = await (pdfParse as any).default(buffer);
      extractedText = data.text || "";
    }
  } catch (err) {
    console.warn("Local PDFParse encountered an issue, falling back to Gemini OCR:", err);
  }

  // Remove common page joiner noise like '-- 1 of 3 --'
  extractedText = extractedText
    .replace(/--\s*\d+\s+of\s+\d+\s*--/gi, "")
    .trim();

  // 2. If text is empty or negligible (e.g. scanned PDF without OCR layer), use Gemini OCR
  if (!extractedText || extractedText.length < 15) {
    try {
      console.log("Using Gemini PDF OCR for scanned or image-based PDF...");
      const ocrResponse = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: [
          {
            inlineData: {
              mimeType: "application/pdf",
              data: base64Data,
            },
          },
          {
            text: "Extract and return the full text content from this document exactly as written. Preserve all headings, paragraphs, lists, and tables. Return only the extracted text.",
          },
        ],
      });
      const ocrText = ocrResponse.text?.trim() || "";
      if (ocrText) {
        extractedText = ocrText;
      }
    } catch (ocrErr) {
      console.error("Gemini PDF OCR fallback error:", ocrErr);
    }
  }

  return extractedText;
}

// API: Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API: Extract text from uploaded document base64
app.post("/api/extract-document", async (req, res) => {
  try {
    const { base64Data, fileName, mimeType } = req.body;

    if (!base64Data) {
      return res.status(400).json({ error: "No document data provided" });
    }

    const buffer = Buffer.from(base64Data, "base64");
    let extractedText = "";

    const lowerName = (fileName || "").toLowerCase();

    if (lowerName.endsWith(".pdf") || mimeType === "application/pdf") {
      try {
        const ai = getGeminiClient();
        extractedText = await extractTextFromPdfBuffer(buffer, base64Data, ai);
      } catch (pdfErr) {
        console.error("PDF parse error:", pdfErr);
        return res.status(422).json({
          error: "Failed to extract text from PDF. The file might be encrypted or corrupted.",
        });
      }
    } else if (
      lowerName.endsWith(".docx") ||
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      try {
        const result = await mammoth.extractRawText({ buffer });
        extractedText = result.value || "";
      } catch (docxErr) {
        console.error("DOCX parse error:", docxErr);
        return res.status(422).json({
          error: "Failed to extract text from DOCX document. Please ensure the file is not password-protected.",
        });
      }
    } else {
      // Plain text, markdown, csv, or generic text
      extractedText = buffer.toString("utf-8");
    }

    // Clean up excessive whitespace while preserving paragraph breaks
    extractedText = extractedText
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .trim();

    if (!extractedText) {
      return res.status(422).json({
        error: "The uploaded document appears to be empty or contains no extractable text.",
      });
    }

    const wordCount = extractedText.split(/\s+/).filter(Boolean).length;
    const charCount = extractedText.length;

    return res.json({
      text: extractedText,
      wordCount,
      charCount,
      fileName,
    });
  } catch (err: any) {
    console.error("Extraction error:", err);
    return res.status(500).json({
      error: err.message || "Failed to process uploaded file.",
    });
  }
});

// Helper: Split text into logical chunks (paragraphs) if long
function splitIntoChunks(text: string, maxChunkLength = 2500): string[] {
  if (text.length <= maxChunkLength) {
    return [text];
  }

  const paragraphs = text.split(/\n\s*\n/);
  const chunks: string[] = [];
  let currentChunk = "";

  for (const para of paragraphs) {
    if (para.length > maxChunkLength) {
      // If a single paragraph is enormous, split by line or period
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
        currentChunk = "";
      }
      const sentences = para.split(/(?<=[.?!])\s+/);
      let sentenceChunk = "";
      for (const s of sentences) {
        if ((sentenceChunk + " " + s).length > maxChunkLength) {
          if (sentenceChunk.trim()) chunks.push(sentenceChunk.trim());
          sentenceChunk = s;
        } else {
          sentenceChunk = sentenceChunk ? sentenceChunk + " " + s : s;
        }
      }
      if (sentenceChunk.trim()) {
        chunks.push(sentenceChunk.trim());
      }
    } else if ((currentChunk + "\n\n" + para).length > maxChunkLength) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = para;
    } else {
      currentChunk = currentChunk ? currentChunk + "\n\n" + para : para;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.length > 0 ? chunks : [text];
}

// Resilient Gemini generateContent with retry and fallback across supported flash models
async function generateContentWithRetry(
  ai: GoogleGenAI,
  params: {
    contents: any;
    systemInstruction?: string;
    temperature?: number;
  }
): Promise<string> {
  const models = ["gemini-3.6-flash", "gemini-3.8-flash", "gemini-3.1-flash-lite"];
  let lastError: any = null;

  for (const model of models) {
    try {
      const config: any = {};
      if (params.systemInstruction) config.systemInstruction = params.systemInstruction;
      if (typeof params.temperature === "number") config.temperature = params.temperature;

      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config,
      });

      const text = response.text?.trim();
      if (text) return text;
    } catch (err: any) {
      lastError = err;
      const errMsg = err?.message || String(err);
      console.warn(`Gemini model ${model} failed (${errMsg.slice(0, 120)}), trying fallback model...`);
      // Immediately fallback to next available model
      continue;
    }
  }

  throw lastError || new Error("Failed to get response from Gemini API after retries.");
}

// Single chunk translation using Gemini
async function translateChunkWithGemini(
  ai: GoogleGenAI,
  text: string,
  sourceLangName: string,
  targetLangName: string
): Promise<string> {
  const systemInstruction = `You are a professional multilingual translator specializing in Indian languages.

Translate the supplied source content completely into the requested target language.

Rules:
- Translate every meaningful part of the source.
- Never summarize or shorten the content.
- Never invent information.
- Preserve meaning, context, tone and intent.
- Preserve names, numbers, dates, addresses, URLs, email addresses and identifiers.
- Preserve headings, paragraphs, bullet lists and numbered lists.
- Maintain the original sequence.
- Use natural native-language grammar and vocabulary.
- For Indian languages, use proper native script with grammatically correct phrasing.
- Do not transliterate unless specifically requested.
- Do not translate people's names unnecessarily.
- Preserve company names and brand names unless translation is clearly appropriate.
- Preserve numerical values and currency values.
- Preserve technical terms when translating them would reduce accuracy.
- Do not provide explanations or translator notes.
- Return ONLY the translated content.
- If a portion should remain unchanged (like code or untranslatable IDs), keep it unchanged.
- If the source contains tables, preserve the table structure as closely as possible.`;

  const prompt = `Source language: ${sourceLangName}
Target language: ${targetLangName}

Source content:
${text}`;

  return await generateContentWithRetry(ai, {
    contents: prompt,
    systemInstruction,
    temperature: 0.2,
  });
}

// Script-based fast detection for Indian languages and English
function detectScriptLanguage(text: string): string | null {
  const sample = text.slice(0, 1000);
  let devanagari = 0;
  let telugu = 0;
  let kannada = 0;
  let tamil = 0;
  let malayalam = 0;
  let latin = 0;

  for (const ch of sample) {
    const cp = ch.codePointAt(0) || 0;
    if (cp >= 0x0900 && cp <= 0x097f) devanagari++;
    else if (cp >= 0x0c00 && cp <= 0x0c7f) telugu++;
    else if (cp >= 0x0c80 && cp <= 0x0cff) kannada++;
    else if (cp >= 0x0b80 && cp <= 0x0bff) tamil++;
    else if (cp >= 0x0d00 && cp <= 0x0d7f) malayalam++;
    else if ((cp >= 65 && cp <= 90) || (cp >= 97 && cp <= 122)) latin++;
  }

  const max = Math.max(devanagari, telugu, kannada, tamil, malayalam, latin);
  if (max === 0) return null;
  if (devanagari === max && devanagari > 3) return "Hindi (हिंदी)";
  if (telugu === max && telugu > 3) return "Telugu (తెలుగు)";
  if (kannada === max && kannada > 3) return "Kannada (ಕನ್ನಡ)";
  if (tamil === max && tamil > 3) return "Tamil (தமிழ்)";
  if (malayalam === max && malayalam > 3) return "Malayalam (മലയാളം)";
  if (latin === max && latin > 5) return "English";
  return null;
}

// Auto detect source language if needed
async function detectLanguage(ai: GoogleGenAI, sampleText: string): Promise<string> {
  const scriptDetected = detectScriptLanguage(sampleText);
  if (scriptDetected) {
    return scriptDetected;
  }

  try {
    const prompt = `Identify the language of the following text. Respond with ONLY the language name from this list:
- English
- Hindi
- Kannada
- Telugu
- Tamil
- Malayalam
- Other

Text snippet:
"""${sampleText.slice(0, 500)}"""`;

    const detected = await generateContentWithRetry(ai, {
      contents: prompt,
      temperature: 0.1,
    });

    for (const [code, name] of Object.entries(SUPPORTED_LANGUAGES)) {
      if (
        detected.toLowerCase().includes(code) ||
        detected.toLowerCase().includes(name.toLowerCase().split(" ")[0])
      ) {
        return name;
      }
    }
    return detected;
  } catch (e) {
    console.error("Language detection error:", e);
    return "English";
  }
}

// API: Translate content
app.post("/api/translate", async (req, res) => {
  try {
    const { text, sourceLang = "auto", targetLang } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Source text is empty." });
    }

    if (!targetLang) {
      return res.status(400).json({ error: "Destination language is required." });
    }

    const ai = getGeminiClient();

    let detectedLang = sourceLang;
    let sourceLangName = "Auto-detected";

    if (sourceLang === "auto" || !sourceLang) {
      sourceLangName = await detectLanguage(ai, text);
      detectedLang = sourceLangName;
    } else {
      sourceLangName = SUPPORTED_LANGUAGES[sourceLang] || sourceLang;
    }

    const targetLangName = SUPPORTED_LANGUAGES[targetLang] || targetLang;

    // Check if source and destination are the same
    if (
      sourceLang !== "auto" &&
      (sourceLang === targetLang || sourceLangName.toLowerCase().startsWith(targetLangName.toLowerCase()))
    ) {
      return res.status(400).json({
        error: "Source language and Destination language cannot be the same.",
      });
    }

    const chunks = splitIntoChunks(text);
    const translatedChunks: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const translated = await translateChunkWithGemini(
        ai,
        chunks[i],
        sourceLangName,
        targetLangName
      );
      translatedChunks.push(translated);
    }

    const finalTranslatedText = translatedChunks.join("\n\n");
    const wordCount = finalTranslatedText.split(/\s+/).filter(Boolean).length;
    const charCount = finalTranslatedText.length;

    return res.json({
      translatedText: finalTranslatedText,
      sourceLang: sourceLangName,
      targetLang: targetLangName,
      targetLangCode: targetLang,
      wordCount,
      charCount,
      chunksCount: chunks.length,
    });
  } catch (err: any) {
    console.error("Translation API error:", err);
    return res.status(500).json({
      error: err.message || "Failed to translate text with Gemini.",
    });
  }
});

// API: Translate to all 6 languages
app.post("/api/translate-all", async (req, res) => {
  try {
    const { text, sourceLang = "auto" } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Source text is empty." });
    }

    const ai = getGeminiClient();

    let sourceLangName = "Auto-detected";
    if (sourceLang === "auto" || !sourceLang) {
      sourceLangName = await detectLanguage(ai, text);
    } else {
      sourceLangName = SUPPORTED_LANGUAGES[sourceLang] || sourceLang;
    }

    const targetLanguages = [
      { code: "en", name: "English" },
      { code: "hi", name: "Hindi (हिंदी)" },
      { code: "kn", name: "Kannada (ಕನ್ನಡ)" },
      { code: "te", name: "Telugu (తెలుగు)" },
      { code: "ta", name: "Tamil (தமிழ்)" },
      { code: "ml", name: "Malayalam (മലയാളം)" },
    ];

    const chunks = splitIntoChunks(text);
    const results: Record<string, { translatedText: string; wordCount: number; charCount: number; languageName: string }> = {};

    // Process translations in parallel across languages (each language chunks sequentially)
    await Promise.all(
      targetLanguages.map(async (lang) => {
        try {
          const translatedChunks: string[] = [];
          for (const chunk of chunks) {
            const translated = await translateChunkWithGemini(
              ai,
              chunk,
              sourceLangName,
              lang.name
            );
            translatedChunks.push(translated);
          }
          const fullText = translatedChunks.join("\n\n");
          results[lang.code] = {
            translatedText: fullText,
            wordCount: fullText.split(/\s+/).filter(Boolean).length,
            charCount: fullText.length,
            languageName: lang.name,
          };
        } catch (err: any) {
          console.error(`Error translating to ${lang.name}:`, err);
          results[lang.code] = {
            translatedText: `Translation error for ${lang.name}: ${err.message || "Unknown error"}`,
            wordCount: 0,
            charCount: 0,
            languageName: lang.name,
          };
        }
      })
    );

    return res.json({
      detectedSourceLanguage: sourceLangName,
      translations: results,
    });
  } catch (err: any) {
    console.error("Translate all API error:", err);
    return res.status(500).json({
      error: err.message || "Failed to translate to all languages.",
    });
  }
});

// Vite middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
