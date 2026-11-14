/** Public browser reads only. No proxy, cookies, private addresses or URL credentials. */
export function publicPageUrl(value: string, relativeTo?: string): URL {
  const url = relativeTo ? new URL(value, relativeTo) : new URL(value);
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) throw new Error("Use a public HTTPS URL without credentials or a custom port.");
  // Numeric/IPv6 hosts and local namespaces are deliberately unsupported. This is not a server-side URL fetcher.
  if (!host.includes(".") || /[:\[\]]/.test(host) || /^[\d.]+$/.test(host) || /\.(?:localhost|local|internal|test|invalid|example)$/.test(host)) throw new Error("Use a public website hostname, not a local or private address.");
  url.hash = "";
  return url;
}

export type ShareMetadata = {
  title: string; description: string; image: string; imageAlt: string; canonical: string;
  ogTitle: string; ogDescription: string; ogImage: string;
  twitterTitle: string; twitterDescription: string; twitterImage: string;
  pageTitle: string; pageDescription: string; robots: string; warnings: string[];
};

/** DOMParser creates an inert document; remote HTML is never inserted into the application. */
export function readShareMetadata(document: Document, pageUrl: string): ShareMetadata {
  const metas = [...document.head.querySelectorAll("meta")];
  const meta = (key: string) => metas.find(el => (el.getAttribute("property") ?? el.getAttribute("name") ?? "").toLowerCase() === key)?.getAttribute("content")?.trim() ?? "";
  const ogTitle = meta("og:title"), ogDescription = meta("og:description"), ogImage = meta("og:image");
  const twitterTitle = meta("twitter:title"), twitterDescription = meta("twitter:description"), twitterImage = meta("twitter:image");
  const pageTitle = document.title.trim(), pageDescription = meta("description");
  const warnings: string[] = [];
  const rawImage = ogImage || twitterImage;
  let image = "";
  if (rawImage) {
    try { image = publicPageUrl(rawImage, pageUrl).href; }
    catch { warnings.push("The share image URL is not a supported public HTTPS address."); }
  } else warnings.push("No Open Graph or Twitter share image was found.");
  if (!ogTitle) warnings.push("No og:title was found; the reconstruction uses Twitter or page-title fallback.");
  if (!ogDescription) warnings.push("No og:description was found; the reconstruction uses Twitter or description fallback.");
  let canonical = "";
  const rawCanonical = document.head.querySelector('link[rel~="canonical"]')?.getAttribute("href");
  if (rawCanonical) { try { canonical = publicPageUrl(rawCanonical, pageUrl).href; } catch { warnings.push("The canonical URL is not a supported public HTTPS address."); } }
  return { title: ogTitle || twitterTitle || pageTitle, description: ogDescription || twitterDescription || pageDescription,
    image, imageAlt: meta("og:image:alt") || meta("twitter:image:alt"), canonical, ogTitle, ogDescription, ogImage,
    twitterTitle, twitterDescription, twitterImage, pageTitle, pageDescription, robots: meta("robots"), warnings };
}

/** A bounded, credential-free browser request. Cross-origin hosts must permit CORS; failures remain visible. */
export async function fetchPublicHtml(value: string, signal: AbortSignal): Promise<{ html: string; url: string }> {
  const url = publicPageUrl(value);
  const response = await fetch(url.href, { credentials: "omit", referrerPolicy: "no-referrer", redirect: "error", cache: "no-store", signal, headers: { Accept: "text/html" } });
  if (!response.ok) throw new Error(`The page returned HTTP ${response.status}.`);
  if (!/text\/html|application\/xhtml\+xml/i.test(response.headers.get("content-type") ?? "")) throw new Error("The response is not an HTML page.");
  if (!response.body) throw new Error("The response did not contain readable HTML.");
  const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
  try {
    for (;;) {
      const { done, value: chunk } = await reader.read(); if (done) break;
      size += chunk.byteLength;
      if (size > 2_000_000) throw new Error("The HTML exceeds the 2 MB inspection limit.");
      chunks.push(chunk);
    }
  } finally { await reader.cancel(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return { html: new TextDecoder().decode(bytes), url: url.href };
}
