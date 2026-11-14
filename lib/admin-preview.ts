/** Internal review surfaces only; visitor routes such as /join, /profile and / remain unchanged. */
export function adminPreviewRoute(path: string, basePath: string) {
  return /^\/(?:hub|preview|emails)(?:\/|$)/.test(path) || (basePath === "/hub" && path === "/");
}

/** These pages demonstrate the public page itself, including its original header and footer. */
export function faithfulPreviewRoute(path: string) {
  return /^\/preview\/drafts\//.test(path) || path === "/preview/footers/";
}
