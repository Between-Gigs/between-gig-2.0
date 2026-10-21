/** Where the app is served from. "/between-gig-2.0" on GitHub Pages, "" locally (see next.config.ts). */
export const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** A path to a file in public/, with the base path. next/link adds it for routes; plain <img> needs this. */
export const asset = (path: string) => (/^(data:|https?:|blob:)/.test(path) ? path : `${basePath}/${path.replace(/^\//, "")}`);

/**
 * An absolute link for emails. In the sample it points at wherever this preview runs, so the links in
 * the outbox open the demo. In production the API builds them from SITE_URL (emails/config.ts).
 */
export function absoluteUrl(path: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://between-gigs.com";
  return `${origin}${basePath}${path.startsWith("/") ? path : `/${path}`}`;
}
