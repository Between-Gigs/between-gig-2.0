/*
 * /preview-access/ asks the server for the preview cookie (POST /api/preview/grant/, lib/server/preview.ts). The
 * session goes as a Bearer token, like every other call to 2.0's API; Clerk's __session cookie is only a fallback on
 * the server and can't be relied on.
 */
import { basePath } from "@/lib/site";

export type PreviewAccessState = "granted" | "signed-out" | "refused" | "unavailable";

type Fetch = (url: string, init: RequestInit) => Promise<Response>;

export async function requestPreview(
  getToken: () => Promise<string | null>,
  doFetch: Fetch = (u, i) => fetch(u, i),
  base: string = basePath,
): Promise<PreviewAccessState> {
  let token: string | null;
  try { token = await getToken(); } catch { return "unavailable"; }
  if (!token) return "signed-out";
  try {
    const res = await doFetch(`${base}/api/preview/grant/`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: "{}",
      credentials: "same-origin",
    });
    if (res.status === 204) return "granted";
    if (res.status === 404) return "refused";
    // A token went with the request, so a 401 means Company OS refused it: signing in again wouldn't help. The status
    // (never the token) goes to the console, so a tester can tell this apart from a Company OS outage.
    console.warn(`preview access: the grant answered ${res.status}`);
    return "unavailable";
  } catch {
    return "unavailable";
  }
}
