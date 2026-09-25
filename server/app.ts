import express from "express";
import dotenv from "dotenv";
import {
  getGeminiClient,
  translateText,
  detectLanguage,
  SUPPORTED_LANGUAGES,
  splitIntoChunks,
  translateChunkWithGemini,
  extractDocumentText,
} from "./engine";

dotenv.config();

const app = express();

// Set payload limits for document uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Enable CORS for API routes
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

// API: Health check - handles both /api/health and /health
app.get(["/api/health", "/health"], (_req, res) => {
  res.json({
    status: "ok",
    service: "Indian Language Translator API",
    timestamp: new Date().toISOString(),
  });
});

// API: Extract text from uploaded document base64
app.post(["/api/extract-document", "/extract-document"], async (req, res) => {
  try {
    const { base64Data, fileName, mimeType } = req.body;

    if (!base64Data) {
      return res.status(400).json({ error: "No document data provided" });
    }

    const buffer = Buffer.from(base64Data, "base64");
    const ai = getGeminiClient();

    const extractedText = await extractDocumentText(buffer, base64Data, fileName, mimeType, ai);

    const cleanText = extractedText
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .trim();

    if (!cleanText) {
      return res.status(422).json({
        error: "The uploaded document contains no extractable text. Please ensure it is not empty or password-protected.",
      });
    }

    const wordCount = cleanText.split(/\s+/).filter(Boolean).length;
    const charCount = cleanText.length;

    return res.json({
      text: cleanText,
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

// API: Translate content
app.post(["/api/translate", "/translate"], async (req, res) => {
  try {
    const { text, sourceLang = "auto", targetLang } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Source text is empty." });
    }

    if (!targetLang) {
      return res.status(400).json({ error: "Destination language is required." });
    }

    const ai = getGeminiClient();
    const result = await translateText(ai, text, sourceLang, targetLang);

    return res.json(result);
  } catch (err: any) {
    console.error("Translation API error:", err);
    const message = err.message || "Failed to translate text with Gemini.";
    const statusCode = message.includes("GEMINI_API_KEY") ? 400 : 500;
    return res.status(statusCode).json({ error: message });
  }
});

// API: Translate to all 6 languages
app.post(["/api/translate-all", "/translate-all"], async (req, res) => {
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
    const results: Record<
      string,
      { translatedText: string; wordCount: number; charCount: number; languageName: string }
    > = {};

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
    const message = err.message || "Failed to translate to all languages.";
    const statusCode = message.includes("GEMINI_API_KEY") ? 400 : 500;
    return res.status(statusCode).json({ error: message });
  }
});

// Fallback JSON 404 for unknown /api routes (prevents returning HTML)
app.use("/api/*", (req, res) => {
  res.status(404).json({
    error: `API route '${req.originalUrl}' not found.`,
  });
});

// Global JSON error handler
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: err.message || "An unexpected server error occurred.",
  });
});

export default app;
export { app };
