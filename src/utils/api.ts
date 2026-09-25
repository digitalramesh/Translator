/**
 * Robust API fetch wrapper that guarantees helpful, user-friendly error messages
 * and prevents JSON parsing crashes when HTML error pages (like Vercel/Netlify 404/500)
 * are returned.
 */
export async function safeFetchJson<T = any>(
  url: string,
  options?: RequestInit
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url, options);
  } catch (netErr: any) {
    throw new Error(
      `Network connection failed: ${netErr.message || "Please check your network connection."}`
    );
  }

  const rawText = await response.text();
  let data: any = null;

  try {
    data = JSON.parse(rawText);
  } catch {
    // Response is not JSON (e.g. HTML 404/500/504 error page from Vercel, Netlify, or proxy)
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(
          `Translation endpoint not found (404). If you deployed to Vercel, verify that the project deployed with Serverless Functions and that GEMINI_API_KEY is configured in Vercel Environment Variables.`
        );
      }
      if (response.status === 504 || response.status === 502) {
        throw new Error(
          `Server timeout (${response.status}). The document or translation took too long to complete. Try translating in smaller text sections.`
        );
      }
      if (rawText.toLowerCase().includes("page could not be found") || rawText.toLowerCase().includes("not found")) {
        throw new Error(
          `Deployment routing error (404). The API serverless function could not be reached. Ensure Vercel environment variable GEMINI_API_KEY is configured and redeploy.`
        );
      }
      throw new Error(
        `Server returned error (${response.status}): ${rawText.slice(0, 120)}`
      );
    }
    throw new Error("Invalid response format received from server.");
  }

  if (!response.ok) {
    const errorMsg = data?.error || `Request failed with status ${response.status}.`;
    throw new Error(errorMsg);
  }

  return data as T;
}
