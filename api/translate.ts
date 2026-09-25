import { getGeminiClient, translateText } from "../server/engine";

export default async function handler(req: any, res: any) {
  // Setup CORS headers
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

    const { text, sourceLang = "auto", targetLang } = body || {};

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Source text is empty." });
    }

    if (!targetLang) {
      return res.status(400).json({ error: "Destination language is required." });
    }

    const ai = getGeminiClient();
    const result = await translateText(ai, text, sourceLang, targetLang);

    return res.status(200).json(result);
  } catch (err: any) {
    console.error("Translation API error:", err);
    const message = err.message || "Translation failed.";
    const statusCode = message.includes("GEMINI_API_KEY") ? 400 : 500;
    return res.status(statusCode).json({ error: message });
  }
}
