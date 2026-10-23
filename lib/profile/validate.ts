import type { ProfileFields, ProfileSection } from "@/lib/data/types";

/** The builder's five steps. The first four are profile sections; the fifth is the review. */
export const STEPS = ["About you", "Skills", "Where & when", "Your story", "Review"] as const;
export const SECTIONS: ProfileSection[] = ["about", "skills", "where", "story"];
export const sectionLabel: Record<ProfileSection, string> = { about: "About you", skills: "Skills & services", where: "Where & when", story: "Your story" };

export const IMDB_RE = /^https:\/\/(www\.|m\.)?imdb\.com\/name\/nm\d+\/?$/;
export const ABOUT_MAX = 600;

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
    if (d.years === "" || Number.isNaN(Number(d.years))) e.years = "Enter years in the business, like 6.";
    if (!d.position.trim()) e.position = "Enter your industry position or department.";
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
  }
  if (step === 3 && !d.about.trim()) e.about = "Write a few lines about you and the help you offer.";
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
  photo: "Profile photo", name: "Full name", years: "Years in the business", position: "Industry position / department",
  imdb: "IMDb profile link", credits: "Notable credits", skills: "On-set skills", services: "Off-set services",
  otherCity: "City / region and country", zip: "Home ZIP code", areas: "Service areas", dates: "Dates or times this month", about: "About me",
};

/** The credits shown to clients: the pinned ones, in the order the Gigster set. A credit is pinned unless unpinned. */
export function pinnedCredits(d: Pick<ProfileFields, "credits" | "creditPins">): string[] {
  return d.credits.filter((c, i) => c.trim() && d.creditPins?.[i] !== false);
}
