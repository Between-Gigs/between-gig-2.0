/** Appearance preferences apply to the shared site. Studio, Workspace and the journal have their own chrome. */
const base = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export const SITE_LOOK_PATHS = `^(?!(${base})?/(studio|workspace|_journal)(/|$))`;

export const looks = {
  friendly: { name: "Warm & friendly", detail: "Soft cards and forest tones" },
  classic: { name: "Between Gigs classic", detail: "Original type and mint accents" },
  swiss: { name: "Swiss grid", detail: "Bold type and square corners" },
} as const;
export type Look = keyof typeof looks;
export const lookIds = Object.keys(looks) as Look[];
export const defaultLook: Look = "friendly";
export const lookKey = "bg2-site-look";
export const isLook = (value: string | null): value is Look => lookIds.some((look) => look === value);
export const hasSiteLook = (pathname: string) => new RegExp(SITE_LOOK_PATHS).test(pathname);

/** Runs in the root layout before paint, including on a static export with a base path. */
export const firstPaintLook = `(function(){if(!new RegExp(${JSON.stringify(SITE_LOOK_PATHS)}).test(location.pathname))return;var v;try{v=localStorage.getItem(${JSON.stringify(lookKey)})}catch(e){}document.documentElement.dataset.look=${JSON.stringify(lookIds)}.includes(v)?v:${JSON.stringify(defaultLook)}})();`;
