/*
 * The "friendly" look (direction B, chosen 4 Nov 2026): warm cream, pastel tints, pill buttons, rounder cards and Plus
 * Jakarta Sans, on the product screens Gigsters, clients and owners use. The client-approved marketing pages (home,
 * /professionals, /storyboard, /crew-call) and the internal tools keep their own look. app/globals.css holds the
 * tokens under :root[data-look=friendly]; the root layout's first-paint script and <LookSync> set the attribute.
 */
export const FRIENDLY_PATHS = "/(login|join|profile|p|owners|emails|preview|preview-access|privacy|terms|provider-standards|licensing-insurance)(/|$)";

export const isFriendly = (pathname: string) => new RegExp(FRIENDLY_PATHS).test(pathname);
