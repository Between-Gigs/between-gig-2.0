import type { ProfileFields, ProfileSection, ReviewNote } from "@/lib/data/types";

/** The builder's five steps. The first four are profile sections; the fifth is the review. */
export const STEPS = ["About you", "Skills", "Where & when", "Your story", "Review"] as const;
export const SECTIONS: ProfileSection[] = ["about", "skills", "where", "story"];
export const sectionLabel: Record<ProfileSection, string> = { about: "About you", skills: "Skills & services", where: "Where & when", story: "Your story", photo: "Photo" };

export const IMDB_RE = /^https:\/\/(www\.|m\.)?imdb\.com\/name\/nm\d+\/?$/;
export const ABOUT_MAX = 600;
/** Longest answers the page lays out well. Names also make the /p/ link, which live caps at 60 characters. */
export const NAME_MAX = 60;
export const DEPARTMENT_MAX = 40;
export const DATES_MAX = 80;

/** A starting rate clients see: a whole number above 0. Blank or 0 reads "Rate on request" everywhere. */
export const hasRate = (rate: string | undefined) => Number(rate) > 0;

/** Availability is the one thing a live profile changes without a review (Company OS decision N-09). */
export const LIVE_FIELDS = ["month", "monthStatus", "dates"] as const satisfies readonly (keyof ProfileFields)[];

/**
 * Whether two versions differ in anything but availability: the changes that need the team. Credit pins are compared
 * as shown (a missing pin is a pinned credit), and key order doesn't matter.
 */
export function contentChanged(a: ProfileFields, b: ProfileFields): boolean {
  const norm = (f: ProfileFields) => {
    const rest: Record<string, unknown> = { ...f, creditPins: f.credits.map((_, i) => f.creditPins?.[i] !== false) };
    for (const k of LIVE_FIELDS) delete rest[k];
    return JSON.stringify(rest, Object.keys(rest).sort());
  };
  return norm(a) !== norm(b);
}

/**
 * Review notes as the Gigster reads them: a photo note is about the photo, whether it was saved under "photo" or, as
 * older notes were, under "About you" starting "Photo:" (anything after the first line break there is about the rest).
 */
export function readNotes<N extends Pick<ReviewNote, "section" | "note">>(notes: N[]): N[] {
  return notes.flatMap((n) => {
    const m = n.section === "about" ? /^\s*photo:\s*/i.exec(n.note) : null;
    if (!m) return [n];
    const [photo, ...rest] = n.note.slice(m[0].length).split("\n");
    const about = rest.join("\n").trim();
    return [{ ...n, section: "photo" as const, note: photo.trim() }, ...(about ? [{ ...n, note: about }] : [])];
  });
}

export type FieldErrors = Partial<Record<keyof ProfileFields, string>>;

/**
 * What each step still needs before the profile can be submitted. The builder doesn't block moving between steps;
 * it checks everything on Submit. Messages say how to fix the field, per BRAND.md.
 */
export function validateStep(step: number, d: ProfileFields): FieldErrors {
  const e: FieldErrors = {};
  if (step === 0) {
    if (!d.photo) e.photo = "Add a profile photo.";
    if (!d.name.trim()) e.name = "Enter your full name.";
    else if (d.name.trim().length > NAME_MAX) e.name = `Keep your name to ${NAME_MAX} characters.`;
    if (d.years === "" || Number.isNaN(Number(d.years))) e.years = "Enter years in the business, like 6.";
    if (!d.position.trim()) e.position = "Enter your industry position or department.";
    else if (d.position.trim().length > DEPARTMENT_MAX) e.position = `Keep your department to ${DEPARTMENT_MAX} characters.`;
    if (d.imdb.trim() && !IMDB_RE.test(d.imdb.trim())) e.imdb = "Use an IMDb name-profile link, like https://www.imdb.com/name/nm1234567/, or leave it empty.";
    if (!d.credits.some((c) => c.trim())) e.credits = "Add at least one credit.";
  }
  if (step === 1) {
    if (!d.skills.length) e.skills = "Pick at least one on-set skill.";
    if (!d.services.length && !d.other.trim()) e.services = "Pick at least one service you'd offer.";
  }
  if (step === 2) {
    if (d.market === "other" && !d.otherCity.trim()) e.otherCity = "Enter your city, region and country.";
    if (!/^\d{5}$/.test(d.zip)) e.zip = "Enter a 5-digit ZIP code, like 90026.";
    if (d.market === "la" && !d.areas.length) e.areas = "Pick at least one service area.";
    if (!d.dates.trim()) e.dates = "Add the dates or times you're free this month.";
    else if (d.dates.trim().length > DATES_MAX) e.dates = `Keep the dates to ${DATES_MAX} characters.`;
  }
  if (step === 3 && !d.about.trim()) e.about = "Write a few lines about you and the help you offer.";
  else if (step === 3 && d.about.length > ABOUT_MAX) e.about = `Keep About me to ${ABOUT_MAX} characters. It's ${d.about.length} now.`;
  return e;
}

/** Every step's errors, keyed by step index. Empty when the profile can be submitted. */
export function validateAll(d: ProfileFields): Record<number, FieldErrors> {
  const out: Record<number, FieldErrors> = {};
  for (let s = 0; s < 4; s++) {
    const e = validateStep(s, d);
    if (Object.keys(e).length) out[s] = e;
  }
  return out;
}

/** Share of required answers given, 0 to 1. Drives the owner list's progress and the builder's meter. */
export function completeness(d: ProfileFields | null): number {
  if (!d) return 0;
  const checks = [
    !!d.photo, !!d.name.trim(), d.years !== "", !!d.position.trim(), d.credits.some((c) => c.trim()),
    d.skills.length > 0, d.services.length > 0 || !!d.other.trim(),
    /^\d{5}$/.test(d.zip), d.market === "other" ? !!d.otherCity.trim() : d.areas.length > 0, !!d.dates.trim(),
    !!d.about.trim(),
  ];
  return checks.filter(Boolean).length / checks.length;
}

/** Which step a field lives on, so the error summary can link to it. */
export const fieldStep: Partial<Record<keyof ProfileFields, number>> = {
  photo: 0, name: 0, years: 0, position: 0, imdb: 0, credits: 0,
  skills: 1, services: 1, other: 1,
  market: 2, otherCity: 2, zip: 2, areas: 2, travel: 2, dates: 2, rate: 2, basis: 2,
  about: 3, languages: 3, insurance: 3, tools: 3, transport: 3, mode: 3,
};

export const fieldLabel: Partial<Record<keyof ProfileFields, string>> = {
  photo: "Profile photo", name: "Full name", years: "Years in the business", position: "Department",
  imdb: "IMDb profile link", credits: "Notable credits", skills: "On-set skills", services: "Off-set services",
  otherCity: "City / region and country", zip: "Home ZIP code", areas: "Service areas", dates: "Dates or times this month", about: "About me",
};

/** The credits shown to clients: the pinned ones, in the order the Gigster set. A credit is pinned unless unpinned. */
export function pinnedCredits(d: Pick<ProfileFields, "credits" | "creditPins">): string[] {
  return d.credits.filter((c, i) => c.trim() && d.creditPins?.[i] !== false);
}

/** The parts of a profile page, as the editor (/profile/canvas/) names them. */
export type ProfilePartId = "photo" | "name" | "position" | "years" | "services" | "skills" | "where" | "availability" | "rate" | "about" | "credits" | "imdb" | "languages" | "details";
/** The ten parts a profile needs before it can be sent, in the order the editor leads them. */
export const REQUIRED_PARTS: ProfilePartId[] = ["name", "position", "years", "services", "skills", "where", "availability", "about", "credits", "photo"];

/** Whether a part of the page has its answer. The editor's spots, My profile and the Gigster home all count with this. */
export function isPartFilled(id: ProfilePartId, d: ProfileFields): boolean {
  switch (id) {
    case "photo": return !!d.photo;
    case "name": return !!d.name.trim();
    case "position": return !!d.position.trim();
    case "years": return d.years !== "";
    case "services": return d.services.length > 0 || !!d.other.trim();
    case "skills": return d.skills.length > 0;
    case "where": return /^\d{5}$/.test(d.zip) && (d.market === "other" ? !!d.otherCity.trim() : d.areas.length > 0);
    case "availability": return !!d.dates.trim();
    case "rate": return hasRate(d.rate);
    case "about": return !!d.about.trim();
    case "credits": return d.credits.some((c) => c.trim());
    case "imdb": return !!d.imdb.trim();
    case "languages": return !!d.languages.trim();
    case "details": return !!(d.tools.trim() || d.transport.trim());
  }
}

/** "2 of 10 parts done": required parts filled. The editor fills a blank name from the account, so `name` stands in for it. */
export function partsDone(d: ProfileFields | null, name = ""): { done: number; total: number } {
  const total = REQUIRED_PARTS.length;
  if (!d) return { done: name.trim() ? 1 : 0, total };
  const f = d.name.trim() ? d : { ...d, name };
  return { done: REQUIRED_PARTS.filter((id) => isPartFilled(id, f)).length, total };
}
