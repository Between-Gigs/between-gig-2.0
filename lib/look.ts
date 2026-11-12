/** Original designs preserve the internal tools’ established chrome. The two newer designs also style Studio and Workspace. */
const base = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export const SITE_LOOK_PATHS = `^(?!(${base})?/(studio|workspace|_journal)(/|$))`;

// The original Warm & friendly release kept the existing brand typography on its public marketing pages.
export const BRAND_PATHS = `^(?:${base})?(?:/?$|/(?:professionals|storyboard|crew-call|proposals)(?:/|$))`;
export const isBrandPage = (pathname: string) => new RegExp(BRAND_PATHS).test(pathname);

const TOOL_PATHS = `^(?:${base})?/(studio|workspace)(/|$)`;
export const looks = {
  "call-sheet": { name: "Call Sheet", detail: "Coming Soon & Professionals · forest and mint" },
  modern: { name: "Crisp modern app", detail: "Geist type, compact panels and a soft mint glow" },
  friendly: { name: "Warm & friendly", detail: "Soft cards and forest tones" },
  classic: { name: "Between Gigs classic", detail: "Original type and mint accents" },
  swiss: { name: "Swiss grid", detail: "Bold type and square corners" },
} as const;
export type Look = keyof typeof looks;
export const lookIds = Object.keys(looks) as Look[];
export const defaultLook: Look = "friendly";
export const lookKey = "bg2-site-look";
export const isLook = (value: string | null): value is Look => lookIds.some((look) => look === value);
const toolLooks: readonly Look[] = ["call-sheet", "modern"];
export function hasSiteLook(pathname: string, look: Look = defaultLook) {
  return new RegExp(SITE_LOOK_PATHS).test(pathname) || (toolLooks.includes(look) && new RegExp(TOOL_PATHS).test(pathname));
}

/** Runs in the root layout before paint, including on a static export with a base path. */
export const firstPaintLook = `(function () {
  var root = document.documentElement, allowed = ${JSON.stringify(lookIds)}, key = ${JSON.stringify(lookKey)};
  var requested = location.search ? new URLSearchParams(location.search).get("look") : null, saved;
  try {
    if (allowed.includes(requested)) localStorage.setItem(key, requested);
    saved = localStorage.getItem(key);
  } catch (_) {
    if (allowed.includes(requested)) root.dataset.entryLook = requested;
  }
  var look = allowed.includes(requested) ? requested : allowed.includes(saved) ? saved : ${JSON.stringify(defaultLook)};
  if (!new RegExp(${JSON.stringify(SITE_LOOK_PATHS)}).test(location.pathname) &&
      !(${JSON.stringify(toolLooks)}.includes(look) && new RegExp(${JSON.stringify(TOOL_PATHS)}).test(location.pathname))) return;
  if (new RegExp(${JSON.stringify(BRAND_PATHS)}).test(location.pathname)) root.dataset.brandPage = "";
  root.dataset.look = look;
})();`;
