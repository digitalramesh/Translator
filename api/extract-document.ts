import { getGeminiClient, extractDocumentText } from "../server/engine";

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

    const { base64Data, fileName, mimeType } = body || {};

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
        error: "The uploaded document contains no extractable text. Please ensure it is not an empty or password-protected document.",
      });
    }

    const wordCount = cleanText.split(/\s+/).filter(Boolean).length;
    const charCount = cleanText.length;

    return res.status(200).json({
      text: cleanText,
      wordCount,
      charCount,
      fileName,
    });
  } catch (err: any) {
    console.error("Document extraction error:", err);
    return res.status(500).json({
      error: err.message || "Failed to extract text from document.",
    });
  }
}
