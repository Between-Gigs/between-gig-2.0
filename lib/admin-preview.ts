/** Internal review surfaces only; visitor routes such as /join, /profile and / remain unchanged. */
export function adminPreviewRoute(path: string, basePath: string) {
  return /^\/(?:hub|preview|emails)(?:\/|$)/.test(path) || (basePath === "/hub" && path === "/");
}

/** These pages demonstrate the public page itself, including its original header and footer. */
export function faithfulPreviewRoute(path: string) {
  return /^\/preview\/drafts\//.test(path) || path === "/preview/footers/" || path === "/preview/page/";
}

/** Explicit local visitor pages only. Never proxy external URLs or private management routes. */
export function publicPreviewTarget(value: string, basePath: string): string | null {
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null;
  try {
    const url = new URL(value, "https://preview.invalid");
    if (url.origin !== "https://preview.invalid") return null;
    const publicPath = /^\/(?:join|login|professionals|storyboard|crew-call|privacy|terms|provider-standards|licensing-insurance)\/$/.test(url.pathname)
      || /^\/p\/[a-z0-9-]+\/$/.test(url.pathname) || url.pathname === "/proposals/home/"
      || (basePath === "/hub" ? url.pathname === "/home/" : url.pathname === "/");
    return publicPath ? `${url.pathname}${url.search}${url.hash}` : null;
  } catch { return null; }
}

export function publicPreviewHref(href: string, basePath: string) {
  return publicPreviewTarget(href, basePath) ? `/preview/page/?path=${encodeURIComponent(href)}` : href;
}
