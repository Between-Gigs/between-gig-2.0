/** Profile configuration in the sample preview. Live and server builds always use the product defaults. */
export const profileParts = {
  name: "Public name", position: "Department", years: "Years in the business", services: "Services offered",
  skills: "On-set skills", where: "Service location", availability: "Availability", rate: "Starting rate",
  about: "About me", credits: "Notable credits", photo: "Profile photo", imdb: "IMDb profile link",
  languages: "Languages", details: "Work and booking details",
} as const;
export type ProfilePartId = keyof typeof profileParts;

export const profileSections = {
  about: "About", services: "Services", work: "Work samples", credits: "On set", details: "Details", questions: "Questions",
} as const;
export type ProfileSectionId = keyof typeof profileSections;
export const profileFieldParts = {
  name: "name", position: "position", years: "years", services: "services", skills: "skills",
  zip: "where", location: "where", travel: "where", dates: "availability", rate: "rate",
  about: "about", credits: "credits", photo: "photo", imdb: "imdb", languages: "languages", tools: "details", transport: "details",
  bookingMobile: "details", earliestStart: "details", bookingMinimum: "details", personality: "details", hireableJobs: "details",
} as const satisfies Record<string, ProfilePartId>;
export type ProfileFieldRule = keyof typeof profileFieldParts;
export const ruleLabels: Record<ProfileFieldRule, string> = {
  name: "Public name", position: "Department", years: "Years in the business", services: "Services offered", skills: "On-set skills",
  zip: "Home ZIP code", location: "Service areas or city", travel: "Travel notes", dates: "Available dates or times",
  rate: "Starting rate", about: "About me", credits: "Notable credits", photo: "Profile photo",
  imdb: "IMDb profile link", languages: "Languages", tools: "Tools and equipment", transport: "Transport",
  bookingMobile: "Private booking mobile", earliestStart: "Earliest start date", bookingMinimum: "Minimum booking",
  personality: "Personality answer", hireableJobs: "Specific jobs clients can hire you for",
};

export interface ProfileTemplate {
  required: readonly ProfileFieldRule[];
  order: readonly ProfilePartId[];
  sections: readonly ProfileSectionId[];
}
const fields = Object.keys(profileFieldParts) as ProfileFieldRule[];
export const defaultProfileTemplate: ProfileTemplate = {
  // Credits are optional (client, 13 Nov 2026): plenty of good Gigsters have none to name yet.
  required: ["name", "position", "years", "services", "skills", "zip", "location", "dates", "about", "photo"],
  order: Object.keys(profileParts) as ProfilePartId[],
  sections: Object.keys(profileSections) as ProfileSectionId[],
};

export const templateKey = "bg2-profile-template-v1";
const enabled = process.env.NEXT_PUBLIC_DATA_SOURCE !== "api" && process.env.BG_BUILD !== "server";
const changeEvent = "bg2-profile-template-change";
let rawCache: string | null = null;
let cached: ProfileTemplate = defaultProfileTemplate;
let temporary: string | null = null;

/** Decode only known settings. Answers, profile records and account details never enter a review link. */
export function parseProfileTemplate(raw: string): ProfileTemplate | null {
  if (raw.length > 3500) return null;
  try {
    const x = JSON.parse(raw);
    if (!x || x.version !== 1) return null;
    const valid = (v: unknown, allowed: readonly string[], all: boolean): v is string[] =>
      Array.isArray(v) && v.length <= allowed.length && (!all || v.length === allowed.length) &&
      v.every((k) => typeof k === "string" && allowed.includes(k)) && new Set(v).size === v.length;
    if (!valid(x.required, fields, false) || !valid(x.order, defaultProfileTemplate.order, true) || !valid(x.sections, defaultProfileTemplate.sections, true)) return null;
    return { required: fields.filter((k) => x.required.includes(k)), order: x.order, sections: x.sections };
  } catch { return null; }
}

export function encodeProfileTemplate(template: ProfileTemplate) {
  return JSON.stringify({ version: 1, required: fields.filter((k) => template.required.includes(k)), order: template.order, sections: template.sections });
}

export function readProfileTemplate(): ProfileTemplate {
  if (!enabled || typeof window === "undefined") return defaultProfileTemplate;
  let raw = temporary;
  try {
    const thumbnail = window.parent !== window && window.frameElement?.hasAttribute("data-guide-thumbnail");
    raw = thumbnail
      ? window.frameElement?.getAttribute("data-profile-template") ?? window.parent.localStorage.getItem(templateKey)
      : temporary ?? localStorage.getItem(templateKey);
  } catch { /* Private browsing can still use an in-memory template. */ }
  if (raw !== rawCache) {
    rawCache = raw;
    cached = (raw && parseProfileTemplate(raw)) || defaultProfileTemplate;
  }
  return cached;
}

export function saveProfileTemplate(template: ProfileTemplate): boolean {
  if (!enabled || window.frameElement?.hasAttribute("data-guide-thumbnail")) return false;
  const raw = encodeProfileTemplate(template);
  let persistent = true;
  try { localStorage.setItem(templateKey, raw); temporary = null; }
  catch { temporary = raw; persistent = false; }
  window.dispatchEvent(new Event(changeEvent));
  return persistent;
}

export function subscribeProfileTemplate(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === templateKey) { temporary = null; listener(); }
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(changeEvent, listener);
  return () => { window.removeEventListener("storage", onStorage); window.removeEventListener(changeEvent, listener); };
}

export function requiredProfileParts(template: ProfileTemplate) {
  return template.order.filter((id) => template.required.some((k) => profileFieldParts[k] === id));
}
