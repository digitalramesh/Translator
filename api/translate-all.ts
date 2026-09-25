import {
  getGeminiClient,
  detectLanguage,
  SUPPORTED_LANGUAGES,
  splitIntoChunks,
  translateChunkWithGemini,
} from "../server/engine";

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({ error: "Invalid JSON in request body" });
      }
    }

    const { text, sourceLang = "auto" } = body || {};

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

    return res.status(200).json({
      detectedSourceLanguage: sourceLangName,
      translations: results,
    });
  } catch (err: any) {
    console.error("Translate all API error:", err);
    const message = err.message || "Failed to translate to all languages.";
    const statusCode = message.includes("GEMINI_API_KEY") ? 400 : 500;
    return res.status(statusCode).json({ error: message });
  }
}
