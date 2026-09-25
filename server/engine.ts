import { GoogleGenAI } from "@google/genai";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

let pdfParse: any = null;
try {
  pdfParse = require("pdf-parse");
} catch {
  // pdf-parse might not be available in all serverless environments
}

let mammoth: any = null;
try {
  mammoth = require("mammoth");
} catch {
  // mammoth optional check
}

export const SUPPORTED_LANGUAGES: Record<string, string> = {
  en: "English",
  hi: "Hindi (हिंदी)",
  kn: "Kannada (ಕನ್ನಡ)",
  te: "Telugu (తెలుగు)",
  ta: "Tamil (தமிழ்)",
  ml: "Malayalam (മലയാളം)",
};

let cachedClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (cachedClient) return cachedClient;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is missing. If running on Vercel, please set GEMINI_API_KEY in your Vercel Project Settings > Environment Variables."
    );
  }

  cachedClient = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  return cachedClient;
}

// Fast script detection for Indian languages and English
export function detectScriptLanguage(text: string): string | null {
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
export async function detectLanguage(ai: GoogleGenAI, sampleText: string): Promise<string> {
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

// Resilient Gemini generateContent with fallback across supported models
export async function generateContentWithRetry(
  ai: GoogleGenAI,
  params: {
    contents: any;
    systemInstruction?: string;
    temperature?: number;
  }
): Promise<string> {
  const models = ["gemini-3.8-flash", "gemini-3.1-flash-lite"];
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
      console.warn(`Gemini model ${model} failed (${errMsg.slice(0, 100)}), trying fallback...`);
      continue;
    }
  }

  throw lastError || new Error("Failed to get response from Gemini API after retries.");
}

// Split text into logical chunks for robust processing
export function splitIntoChunks(text: string, maxChunkLength = 2500): string[] {
  if (text.length <= maxChunkLength) {
    return [text];
  }

  const paragraphs = text.split(/\n\s*\n/);
  const chunks: string[] = [];
  let currentChunk = "";

  for (const para of paragraphs) {
    if (para.length > maxChunkLength) {
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

// Translate a single chunk
export async function translateChunkWithGemini(
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

// Translate full text
export async function translateText(
  ai: GoogleGenAI,
  text: string,
  sourceLang: string,
  targetLang: string
) {
  let sourceLangName = "Auto-detected";
  if (sourceLang === "auto" || !sourceLang) {
    sourceLangName = await detectLanguage(ai, text);
  } else {
    sourceLangName = SUPPORTED_LANGUAGES[sourceLang] || sourceLang;
  }

  const targetLangName = SUPPORTED_LANGUAGES[targetLang] || targetLang;

  if (
    sourceLang !== "auto" &&
    (sourceLang === targetLang || sourceLangName.toLowerCase().startsWith(targetLangName.toLowerCase()))
  ) {
    throw new Error("Source language and Destination language cannot be the same.");
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

  return {
    translatedText: finalTranslatedText,
    sourceLang: sourceLangName,
    targetLang: targetLangName,
    targetLangCode: targetLang,
    wordCount,
    charCount,
    chunksCount: chunks.length,
  };
}

// Extract document text supporting PDF, DOCX, and TXT
export async function extractDocumentText(
  buffer: Buffer,
  base64Data: string,
  fileName: string,
  mimeType: string,
  ai: GoogleGenAI
): Promise<string> {
  const lowerName = (fileName || "").toLowerCase();

  // PDF Extraction
  if (lowerName.endsWith(".pdf") || mimeType === "application/pdf") {
    let extractedText = "";

    // 1. Try local PDF parser if available
    if (pdfParse) {
      try {
        if (typeof pdfParse === "function") {
          const data = await pdfParse(buffer);
          extractedText = data.text || "";
        } else if (typeof pdfParse.PDFParse === "function") {
          const parser = new pdfParse.PDFParse({ data: buffer });
          try {
            const data = await parser.getText();
            extractedText = data.text || "";
          } finally {
            await parser.destroy();
          }
        }
      } catch (err) {
        console.warn("Local PDF parse issue, relying on Gemini OCR:", err);
      }
    }

    extractedText = extractedText
      .replace(/--\s*\d+\s+of\s+\d+\s*--/gi, "")
      .trim();

    // 2. If negligible or empty, use Gemini OCR directly with PDF base64
    if (!extractedText || extractedText.length < 15) {
      console.log("Using Gemini PDF extraction directly...");
      const ocrResponse = await ai.models.generateContent({
        model: "gemini-3.8-flash",
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
    }

    return extractedText;
  }

  // DOCX Extraction
  if (
    lowerName.endsWith(".docx") ||
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    if (mammoth) {
      const result = await mammoth.extractRawText({ buffer });
      return result.value || "";
    }
    throw new Error("DOCX parser is not available in this environment.");
  }

  // Plain text
  return buffer.toString("utf-8");
}
