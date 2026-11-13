/** Original designs preserve the internal tools’ established chrome. The two newer designs also style Studio and Workspace. */
const base = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export const SITE_LOOK_PATHS = `^(?!(${base})?/(studio|workspace|_journal)(/|$))`;

// Brand pages keep their own approved designs and skip the theme: Storyboard, Crew Call, the home proposals, and the
// drafts of the pre-Green Room Coming soon and For professionals pages. Since 13 Nov 2026 the live Coming soon (/) and
// For professionals pages are Green Room, so they are no longer brand pages.
export const BRAND_PATHS = `^(?:${base})?/(?:storyboard|crew-call|proposals|preview/drafts/(?:coming-soon|professionals)-v1)(?:/|$)`;
export const isBrandPage = (pathname: string) => new RegExp(BRAND_PATHS).test(pathname);

const TOOL_PATHS = `^(?:${base})?/(studio|workspace)(/|$)`;
export const looks = {
  editorial: { name: "Green Room", detail: "Design system v1 · cream, forest, serif" },
  "call-sheet": { name: "Call Sheet", detail: "Coming Soon & Professionals · forest and mint" },
  modern: { name: "Crisp modern app", detail: "Geist type, compact panels and a soft mint glow" },
  friendly: { name: "Warm & friendly", detail: "Soft cards and forest tones" },
  classic: { name: "Between Gigs classic", detail: "Original type and mint accents" },
  swiss: { name: "Swiss grid", detail: "Bold type and square corners" },
} as const;
export type Look = keyof typeof looks;
export const lookIds = Object.keys(looks) as Look[];
export const defaultLook: Look = "editorial";
/** v2 since the Green Room launch: earlier saved choices (Swiss, Call Sheet…) no longer stick for visitors. */
export const lookKey = "bg2-site-look-v2";
/** Styled or Unstyled (wireframe) mode, independent of the look. `?unstyled=1` or `?unstyled=0` in a link sets it. */
export const unstyledKey = "bg2-unstyled";
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
  var plain = location.search ? new URLSearchParams(location.search).get("unstyled") : null, bare;
  try {
    if (plain === "1" || plain === "0") localStorage.setItem(${JSON.stringify(unstyledKey)}, plain);
    bare = localStorage.getItem(${JSON.stringify(unstyledKey)}) === "1";
  } catch (_) { bare = plain === "1"; }
  if (bare) root.dataset.unstyled = ""; else delete root.dataset.unstyled;
})();`;
