/*
 * The "swiss" look (direction G · Swiss grid, chosen 6 Nov 2026): a strict grid, oversized Inter Tight display type,
 * thick black rules, no rounding, one mint block per screen, on the product screens Gigsters, clients and owners use.
 * The client-approved marketing pages (home, /professionals, /storyboard, /crew-call) and the internal tools keep their
 * own look. styles/look-swiss.css holds the tokens under :root[data-look=swiss]; the root layout's first-paint script
 * and <LookSync> set the attribute.
 */
export const SWISS_PATHS = "/(login|join|profile|p|owners|emails|preview|preview-access|privacy|terms|provider-standards|licensing-insurance)(/|$)";

export const isSwiss = (pathname: string) => new RegExp(SWISS_PATHS).test(pathname);
