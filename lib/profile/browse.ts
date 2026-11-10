import type { MonthStatus, Person, Profile } from "@/lib/data/types";
import { laServiceAreas, monthStatusLabel } from "@/lib/data/taxonomy";
import { craftOf, crafts } from "./department";

/*
 * /p/: the public list of approved Gigsters. Filters live in the query string (?craft=wardrobe&area=eastside), so a
 * profile's breadcrumb can deep-link into the list. Short, stable slugs for each craft and LA area.
 */

/** Craft label (lib/profile/department.ts) → its slug in ?craft=. */
const craftSlugs: Record<string, string> = {
  "Wardrobe & costume": "wardrobe", "Hair & makeup": "hair-makeup", "Lighting & grip": "lighting-grip",
  "Camera & photo": "camera", "Set decoration": "set-decoration", "Props & construction": "props",
  "Art department": "art-department", "Locations": "locations", "Production office": "production-office",
};

const slugify = (s: string) => s.toLowerCase().replace(/&/g, " ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const craftSlug = (label: string) => craftSlugs[label] ?? slugify(label);
export const areaSlug = slugify;

export const craftOptions = crafts.map((c) => ({ value: craftSlug(c.label), label: c.label }));
export const areaOptions = laServiceAreas.map((a) => ({ value: areaSlug(a), label: a }));
export const availabilityOptions = (Object.keys(monthStatusLabel) as MonthStatus[]).map((value) => ({ value, label: monthStatusLabel[value] }));

export interface BrowseFilters { craft: string; area: string; availability: string; q: string }
export const noFilters: BrowseFilters = { craft: "", area: "", availability: "", q: "" };

/** Reads the filters from a query string; unknown values are dropped. */
export function parseBrowse(search: string | URLSearchParams): BrowseFilters {
  const p = typeof search === "string" ? new URLSearchParams(search) : search;
  const pick = (key: string, options: { value: string }[]) => { const v = p.get(key) ?? ""; return options.some((o) => o.value === v) ? v : ""; };
  return { craft: pick("craft", craftOptions), area: pick("area", areaOptions), availability: pick("availability", availabilityOptions), q: (p.get("q") ?? "").slice(0, 100) };
}

/** The query string for these filters, without the "?"; empty when none are set. Keys in a fixed order. */
export function browseQuery(f: BrowseFilters): string {
  const p = new URLSearchParams();
  if (f.craft) p.set("craft", f.craft);
  if (f.area) p.set("area", f.area);
  if (f.availability) p.set("availability", f.availability);
  if (f.q.trim()) p.set("q", f.q.trim());
  return p.toString();
}

/** The list's URL (no base path): "/p/" or "/p/?craft=wardrobe…". */
export const browseHref = (f: Partial<BrowseFilters> = {}) => { const q = browseQuery({ ...noFilters, ...f }); return q ? `/p/?${q}` : "/p/"; };

/** The breadcrumb's craft link for a profile: "/p/?craft=wardrobe", or "/p/" when no craft matches. */
export const craftHref = (position = "", skills: string[] = []) => { const c = craftOf(position, skills); return browseHref(c ? { craft: craftSlug(c) } : {}); };

export type Listed = { person: Person; profile: Profile };

/** The approved Gigsters these filters keep, A to Z by name. Search matches every word in name, craft or services. */
export function filterGigsters(list: Listed[], f: BrowseFilters): Listed[] {
  const words = f.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return list.filter(({ person, profile: { fields: x } }) => {
    if (person.status !== "approved") return false;
    const craft = craftOf(x.position, x.skills);
    if (f.craft && (!craft || craftSlug(craft) !== f.craft)) return false;
    if (f.area && !x.areas.some((a) => areaSlug(a) === f.area)) return false;
    if (f.availability && x.monthStatus !== f.availability) return false;
    if (words.length) {
      const hay = [x.name || person.name, x.position, craft, ...x.skills, ...x.services].filter(Boolean).join(" ").toLowerCase();
      if (!words.every((w) => hay.includes(w))) return false;
    }
    return true;
  }).sort((a, b) => (a.profile.fields.name || a.person.name).localeCompare(b.profile.fields.name || b.person.name));
}
