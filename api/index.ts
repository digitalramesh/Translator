export default function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  return res.status(200).json({
    status: "ok",
    service: "Indian Language Translator API",
    endpoints: [
      "/api/translate",
      "/api/translate-all",
      "/api/extract-document",
      "/api/health",
    ],
    timestamp: new Date().toISOString(),
  });
}
