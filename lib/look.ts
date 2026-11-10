/*
 * The "swiss" look (direction G · Swiss grid, chosen 6 Nov 2026): a strict grid, oversized Inter Tight display type,
 * thick black rules, no rounding, one mint block per screen, on every page Gigsters, clients, visitors and owners see
 * (product screens and the public site, 6 Nov 2026; the Storyboard keeps its sketchbook artwork). The internal tools
 * (studio, workspace) keep their own look. styles/look-swiss.css holds the tokens under :root[data-look=swiss]; the root layout's first-paint script
 * and <LookSync> set the attribute.
 */
// Anchored, with the deploy's base path optional (the first-paint script tests location.pathname, which includes it;
// <LookSync> tests usePathname(), which doesn't). Every page is Swiss except the internal tools (studio, workspace,
// the journal), so a 404 or any new page gets it too.
const BASE = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export const SWISS_PATHS = `^(?!(${BASE})?/(studio|workspace|_journal)(/|$))`;

export const isSwiss = (pathname: string) => new RegExp(SWISS_PATHS).test(pathname);
