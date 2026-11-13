import type { ProfileFields, ProfileSection, ReviewNote } from "@/lib/data/types";
import { stageTwoLimits, startDateLabel } from "./stage-two";
import { profileFieldParts, readProfileTemplate, requiredProfileParts, type ProfileFieldRule, type ProfilePartId, type ProfileTemplate } from "./template";
export type { ProfilePartId } from "./template";

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
/** Up to five services per Gigster (Patti, 13 Nov 2026). */
export const MAX_SERVICES = 5;
/** The Gigster's own line per service: one sentence in customer words. */
export const SERVICE_LINE_MAX = 120;
/** The professional title under the name. */
export const TITLE_MAX = 60;

/** A starting rate clients see: a whole number above 0. Blank or 0 reads "Rate on request" everywhere. */
export const hasRate = (rate: string | undefined) => Number(rate) > 0;

/** Availability is the one thing a live profile changes without a review (Company OS decision N-09). */
export const LIVE_FIELDS = ["month", "monthStatus", "dates", "earliestStart"] as const satisfies readonly (keyof ProfileFields)[];

/**
 * Whether two versions differ in anything but availability: the changes that need the team. Credit pins are compared
 * as shown (a missing pin is a pinned credit), and key order doesn't matter.
 */
export function contentChanged(a: ProfileFields, b: ProfileFields): boolean {
  const norm = (f: ProfileFields) => {
    const rest: Record<string, unknown> = { ...f, creditPins: f.credits.map((_, i) => f.creditPins?.[i] !== false) };
    for (const k of LIVE_FIELDS) delete rest[k];
    // The editor's answers as sorted pairs (a replacer list would drop nested keys), and absent when empty.
    const lines = Object.entries(f.serviceLines ?? {}).filter(([, v]) => v.trim()).sort(([a], [b]) => a.localeCompare(b));
    if (lines.length) rest.serviceLines = lines; else delete rest.serviceLines;
    for (const key of ["personalityQuestion", "title"] as const) if (!f[key]) delete rest[key];
    // A draft saved before the booking questions existed has the same answers as blank inputs.
    for (const key of Object.keys(stageTwoLimits) as (keyof typeof stageTwoLimits)[]) {
      if (!f[key]) delete rest[key];
    }
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
const missingAnswer: Record<ProfileFieldRule, string> = {
  photo: "Add a profile photo.", name: "Enter your full name.", years: "Enter years in the business, like 6.",
  position: "Enter your industry position or department.", credits: "Add at least one credit.", skills: "Pick at least one on-set skill.",
  services: "Pick at least one service you'd offer.", zip: "Enter a 5-digit ZIP code, like 90026.", location: "Pick at least one service area.",
  dates: "Add the dates or times you're free this month.", about: "Write a few lines about you and the help you offer.",
  rate: "Add a starting rate greater than zero.", imdb: "Add your IMDb name-profile link.", languages: "Add the languages you work in.",
  bookingMobile: "Enter your private booking mobile number.", earliestStart: "Choose the earliest date you can start.",
  bookingMinimum: "Describe your minimum booking.", personality: "Share something about your personality.",
  hireableJobs: "List specific jobs a client can hire you to do.",
  travel: "Describe how far you can travel.", tools: "Add the tools or equipment you bring.", transport: "Describe your transport arrangements.",
};

function answered(key: ProfileFieldRule, d: ProfileFields): boolean {
  switch (key) {
    case "location": return d.market === "other" ? !!d.otherCity.trim() : d.areas.length > 0;
    case "services": return d.services.length > 0 || !!d.other.trim();
    case "credits": return d.credits.some((c) => c.trim());
    case "skills": return d.skills.length > 0;
    case "rate": return hasRate(d.rate);
    default: return !!d[key]?.trim();
  }
}

const answerKey = (key: ProfileFieldRule, d: ProfileFields) => key === "location" ? (d.market === "other" ? "otherCity" : "areas") : key;

export function validateStep(step: number, d: ProfileFields, template = readProfileTemplate()): FieldErrors {
  const e: FieldErrors = {};
  for (const rule of template.required) {
    const key = answerKey(rule, d);
    if (fieldStep[key] === step && !answered(rule, d)) {
      e[key] = key === "otherCity" ? "Enter your city, region and country." : missingAnswer[rule];
    }
  }
  // Optional answers can be empty; a supplied answer must still have a valid format.
  if (step === 0) {
    if (d.name.trim().length > NAME_MAX) e.name = `Keep your name to ${NAME_MAX} characters.`;
    if (d.years !== "" && Number.isNaN(Number(d.years))) e.years = missingAnswer.years;
    if (d.position.trim().length > DEPARTMENT_MAX) e.position = `Keep your department to ${DEPARTMENT_MAX} characters.`;
    if ((d.title?.trim().length ?? 0) > TITLE_MAX) e.title = `Keep your title to ${TITLE_MAX} characters.`;
    if (d.imdb.trim() && !IMDB_RE.test(d.imdb.trim())) e.imdb = template.required.includes("imdb")
      ? "Use an IMDb name-profile link, like https://www.imdb.com/name/nm1234567/."
      : "Use an IMDb name-profile link, like https://www.imdb.com/name/nm1234567/, or leave it empty.";
  }
  if (step === 1) {
    if (d.services.length > MAX_SERVICES) e.services = `Choose up to ${MAX_SERVICES} services. You have ${d.services.length}.`;
    if (d.services.some((s) => (d.serviceLines?.[s]?.trim().length ?? 0) > SERVICE_LINE_MAX)) e.serviceLines = `Keep each line to ${SERVICE_LINE_MAX} characters.`;
  }
  if (step === 2) {
    if (d.zip && !/^\d{5}$/.test(d.zip)) e.zip = missingAnswer.zip;
    if (d.dates.trim().length > DATES_MAX) e.dates = `Keep the dates to ${DATES_MAX} characters.`;
  }
  if (step === 3 && d.about.length > ABOUT_MAX) e.about = `Keep About me to ${ABOUT_MAX} characters. It's ${d.about.length} now.`;
  if (step === 3) {
    for (const key of Object.keys(stageTwoLimits) as (keyof typeof stageTwoLimits)[]) {
      if ((d[key]?.length ?? 0) > stageTwoLimits[key]) e[key] = `Keep this answer to ${stageTwoLimits[key]} characters.`;
    }
    if (d.earliestStart && !startDateLabel(d.earliestStart)) e.earliestStart = "Choose a valid calendar date.";
  }
  return e;
}

/**
 * The Gigster editor's submit check (/profile/canvas/): every configured required answer (validateAll), plus what the
 * editor asks for on top. At least one service, each with its own line of what you'll do ("One clearly described
 * service is enough to start"), and a personality answer says which question it answers. Empty when it can be sent.
 */
export function validateGigster(d: ProfileFields, template = readProfileTemplate()): FieldErrors {
  const e: FieldErrors = Object.assign({}, ...Object.values(validateAll(d, template)));
  if (!d.services.length && !e.services) e.services = missingAnswer.services;
  if (!e.serviceLines && d.services.some((s) => !d.serviceLines?.[s]?.trim())) e.serviceLines = "Add one line about what you'll do for each service.";
  if (d.personality?.trim() && !d.personalityQuestion) e.personalityQuestion = "Choose the question you're answering.";
  // The editor asks about film and TV experience, not an "About me".
  if (e.about === missingAnswer.about) e.about = "Tell clients how your film and TV experience helps you deliver this service.";
  return e;
}

/** How the editor names each field in its "things to finish" list. */
export const gigsterFieldLabel: Partial<Record<keyof ProfileFields, string>> = {
  photo: "Profile photo", name: "Your name", services: "How I can help", serviceLines: "What you'll do", dates: "When you're usually free",
  monthStatus: "This month", areas: "Where you work", zip: "ZIP code", otherCity: "Where you work", position: "Your film and TV work",
  skills: "On-set skills", years: "Years in film and TV", about: "How that experience helps", credits: "Credits", imdb: "IMDb link",
};

/** The editor's checklist: what's needed to submit, and what can come later. Each item names the fields it covers. */
export const gigsterItems = [
  { id: "photo", label: "A photo of you", fields: ["photo"] },
  { id: "name", label: "Your name", fields: ["name"] },
  { id: "services", label: "A service, described in one line", fields: ["services", "other", "serviceLines"] },
  { id: "availability", label: "When you're usually free", fields: ["dates", "monthStatus", "earliestStart"] },
  { id: "where", label: "Where you work", fields: ["zip", "areas", "otherCity", "market", "travel"] },
  { id: "film", label: "Your film and TV work", fields: ["position", "skills", "years"] },
  { id: "experience", label: "How that experience helps", fields: ["about"] },
  { id: "credits", label: "A credit", fields: ["credits", "imdb"] },
  { id: "title", label: "A professional title", fields: ["title"] },
  { id: "rate", label: "Your rate and minimum", fields: ["rate", "basis", "bookingMinimum"] },
  { id: "personality", label: "A personality question", fields: ["personality", "personalityQuestion"] },
  { id: "contact", label: "Private booking contact", fields: ["bookingMobile"] },
] as const satisfies readonly { id: string; label: string; fields: readonly (keyof ProfileFields)[] }[];
export type GigsterItemId = (typeof gigsterItems)[number]["id"];

/** Which item each field belongs to, so an error links to its section. */
export const gigsterItemOf = (field: keyof ProfileFields): GigsterItemId | undefined =>
  gigsterItems.find((i) => (i.fields as readonly string[]).includes(field))?.id;

function itemFilled(id: GigsterItemId, d: ProfileFields): boolean {
  switch (id) {
    case "photo": return !!d.photo;
    case "name": return !!d.name.trim();
    case "services": return d.services.length > 0 && d.services.every((s) => !!d.serviceLines?.[s]?.trim());
    case "film": return !!d.position.trim() && d.skills.length > 0 && d.years !== "";
    case "experience": return !!d.about.trim();
    case "credits": return d.credits.some((c) => c.trim());
    case "where": return isPartFilled("where", d);
    case "availability": return !!d.dates.trim();
    case "title": return !!d.title?.trim();
    case "rate": return hasRate(d.rate);
    case "personality": return !!d.personality?.trim() && !!d.personalityQuestion;
    case "contact": return !!d.bookingMobile?.trim();
  }
}

/**
 * Required items (needed to submit) and optional ones (can come later), each with whether it's done. An item is
 * required when the editor always asks for it (photo, name, a service) or when the profile template requires any of
 * its fields; otherwise it can come later.
 */
export function gigsterChecklist(d: ProfileFields, template = readProfileTemplate()) {
  const errors = validateGigster(d, template);
  const always: GigsterItemId[] = ["services"];
  const out = gigsterItems.map((item) => {
    const required = always.includes(item.id) || item.fields.some((f) => (template.required as readonly string[]).includes(f === "areas" || f === "otherCity" ? "location" : f));
    const invalid = item.fields.some((f) => errors[f]);
    return { id: item.id, label: item.label, required, done: !invalid && itemFilled(item.id, d) };
  });
  return { required: out.filter((i) => i.required), optional: out.filter((i) => !i.required), errors };
}

/** Every step's errors, keyed by step index. Empty when the profile can be submitted. */
export function validateAll(d: ProfileFields, template = readProfileTemplate()): Record<number, FieldErrors> {
  const out: Record<number, FieldErrors> = {};
  for (let step = 0; step < 4; step++) {
    const errors = validateStep(step, d, template);
    if (Object.keys(errors).length) out[step] = errors;
  }
  return out;
}

/** Share of configured required answers that are valid. */
export function completeness(d: ProfileFields | null, template = readProfileTemplate()): number {
  if (!d) return 0;
  if (!template.required.length) return 1;
  const errors = Object.assign({}, ...Object.values(validateAll(d, template))) as FieldErrors;
  return template.required.filter((k) => !errors[answerKey(k, d)]).length / template.required.length;
}

/** Which step a field lives on, so the error summary can link to it. */
export const fieldStep: Partial<Record<keyof ProfileFields, number>> = {
  photo: 0, name: 0, years: 0, position: 0, imdb: 0, credits: 0,
  skills: 1, services: 1, other: 1, serviceLines: 1, title: 0, personalityQuestion: 3,
  market: 2, otherCity: 2, zip: 2, areas: 2, travel: 2, dates: 2, rate: 2, basis: 2,
  about: 3, languages: 3, insurance: 3, tools: 3, transport: 3, mode: 3,
  bookingMobile: 3, earliestStart: 3, bookingMinimum: 3, personality: 3, hireableJobs: 3,
};

export const fieldLabel: Partial<Record<keyof ProfileFields, string>> = {
  photo: "Profile photo", name: "Full name", years: "Years in the business", position: "Department",
  imdb: "IMDb profile link", credits: "Notable credits", skills: "On-set skills", services: "Off-set services",
  rate: "Starting rate", travel: "Travel notes", languages: "Languages", transport: "Transport", tools: "Tools and equipment",
  bookingMobile: "Private booking mobile", earliestStart: "Earliest start date", bookingMinimum: "Minimum booking", personality: "Personality answer", hireableJobs: "Specific jobs",
  serviceLines: "What you'll do", personalityQuestion: "Personality question", title: "Professional title",
  otherCity: "City / region and country", zip: "Home ZIP code", areas: "Service areas", dates: "Dates or times this month", about: "About me",
};

/** The credits shown to clients: the pinned ones, in the order the Gigster set. A credit is pinned unless unpinned. */
export function pinnedCredits(d: Pick<ProfileFields, "credits" | "creditPins">): string[] {
  return d.credits.filter((c, i) => c.trim() && d.creditPins?.[i] !== false);
}

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
    case "details": return !!(d.tools.trim() || d.transport.trim() || d.bookingMobile?.trim() || d.earliestStart?.trim() || d.bookingMinimum?.trim() || d.personality?.trim() || d.hireableJobs?.trim());
  }
}

/** Use all configured answers within a combined spot (e.g. service areas and private ZIP). */
export function partComplete(id: ProfilePartId, d: ProfileFields, template: ProfileTemplate, errors: FieldErrors): boolean {
  const members = template.required.filter((k) => profileFieldParts[k] === id);
  if (!members.length) return isPartFilled(id, d);
  return members.every((k) => !errors[answerKey(k, d)]);
}

export function partsDone(d: ProfileFields | null, name = "", template = readProfileTemplate()): { done: number; total: number } {
  const required = requiredProfileParts(template);
  if (!d) return { done: required.includes("name") && name.trim() ? 1 : 0, total: required.length };
  const f = d.name.trim() ? d : { ...d, name };
  const errors = Object.assign({}, ...Object.values(validateAll(f, template))) as FieldErrors;
  return { done: required.filter((id) => partComplete(id, f, template, errors)).length, total: required.length };
}
