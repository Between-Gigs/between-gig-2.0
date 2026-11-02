/*
 * /preview-access/ asks the server for the preview cookie (POST /api/preview/grant/, lib/server/preview.ts). The
 * session goes as a Bearer token, like every other call to 2.0's API; Clerk's __session cookie is only a fallback on
 * the server and can't be relied on.
 */
export type PreviewAccessState = "granted" | "signed-out" | "refused" | "unavailable";

type Fetch = (url: string, init: RequestInit) => Promise<Response>;

export async function requestPreview(getToken: () => Promise<string | null>, doFetch: Fetch = (u, i) => fetch(u, i)): Promise<PreviewAccessState> {
  let token: string | null;
  try { token = await getToken(); } catch { return "unavailable"; }
  if (!token) return "signed-out";
  try {
    const res = await doFetch("/api/preview/grant/", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: "{}",
      credentials: "same-origin",
    });
    return res.status === 204 ? "granted" : res.status === 401 ? "signed-out" : res.status === 404 ? "refused" : "unavailable";
  } catch {
    return "unavailable";
  }
}
