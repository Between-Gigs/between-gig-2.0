/*
 * 2.0's questionnaire (ProfileFields) as Company OS records: the `profile` fields (with the tenant fields
 * `home_city` and `services_other`) and its `profile_item` lists. Option values are the recipe's keys, made from the
 * taxonomy labels by `optionKey`; `fromProfile` reads them back. Mapping table: Company OS docs/customers/between-gigs/gap-analysis.md §13.4.
 */
import { publicReviewDetails, privateReviewDetails, REVIEW_PUBLIC_FIELD, REVIEW_PRIVATE_FIELD, REVIEW_PUBLIC_KEYS, REVIEW_PRIVATE_KEYS, cleanReviewFields } from "@/lib/profile/review";
import { laServiceAreas, offSetServices, onSetSkills } from "../taxonomy.ts";
import type { InsuranceAnswer, MonthStatus, ProfileFields, RateBasis, WorkMode } from "../types.ts";

/** A taxonomy label as the recipe's option key: "Wardrobe & costume" → "wardrobe_costume". */
export const optionKey = (label: string) =>
  label.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

const availability: Record<MonthStatus, string> = { available: "available", limited: "limited", away: "unavailable" };
const basis: Record<RateBasis, string> = { hourly: "hourly", project: "project", day: "daily" };
const insurance: Record<InsuranceAnswer, string> = { private: "discuss_privately", yes: "has_coverage", no: "no_coverage" };
const mode: Record<WorkMode, string> = { "on-site": "on_site", studio: "at_provider", both: "on_site_or_at_provider" };

export type ProfileItem = { kind: "credit" | "skill" | "service" | "area"; value: string; position: number; visible?: boolean };

/**
 * The Gigster editor's newer answers as tenant fields (Company OS recipe, docs/handoff/companyos-profile-extras.md).
 * Company OS refuses a field its recipe doesn't have, so they're sent only with `extras` (the server's
 * COMPANY_OS_PROFILE_EXTRAS=1, set once the recipe is applied). Until then the browser keeps them (lib/data/api.ts).
 */
export const EXTRA_FIELDS = { title: "professional_title", serviceLines: "service_lines", personalityQuestion: "personality_question", personality: "personality_answer" } as const;

function extrasOf(f: ProfileFields): Record<string, unknown> {
  const lines = Object.fromEntries(
    Object.entries(f.serviceLines ?? {}).map(([k, v]) => [k, String(v ?? "").trim()]).filter(([k, v]) => v && f.services.includes(k)),
  );
  return {
    [EXTRA_FIELDS.title]: (f.title ?? "").trim(),
    [EXTRA_FIELDS.serviceLines]: lines,
    [EXTRA_FIELDS.personalityQuestion]: f.personalityQuestion ?? "",
    [EXTRA_FIELDS.personality]: (f.personality ?? "").trim(),
  };
}

/** The profile's data (without `person`, `status` or the photo) and its items, in 2.0's order. */
export function toProfile(f: ProfileFields, opts: { extras?: boolean; review?: boolean } = {}): { data: Record<string, unknown>; items: ProfileItem[] } {
  const years = f.years.trim() === "" ? NaN : Number(f.years);
  const data: Record<string, unknown> = {
    display_name: f.name.trim(),
    ...(Number.isFinite(years) ? { years_experience: years } : {}),
    position: f.position.trim(),
    external_profile_url: f.imdb.trim(),
    home_market: f.market,
    home_city: f.market === "other" ? f.otherCity.trim() : "",
    postal_code: f.zip.trim(),
    travel_notes: f.travel.trim(),
    ...(/^\d{4}-\d{2}$/.test(f.month) ? { availability_month: f.month } : {}),
    availability_status: availability[f.monthStatus],
    availability_notes: f.dates.trim(),
    rate_text: f.rate.trim(),
    rate_basis: basis[f.basis],
    about: f.about.trim(),
    languages: f.languages.trim(),
    insurance_disclosure: insurance[f.insurance],
    tools: f.tools.trim(),
    transport: f.transport.trim(),
    work_mode: mode[f.mode],
    services_other: f.other.trim(),
    ...(opts.extras ? extrasOf(f) : {}),
    ...(opts.review ? { service_proposal: f.other.trim(), [REVIEW_PUBLIC_FIELD]: publicReviewDetails(f), [REVIEW_PRIVATE_FIELD]: privateReviewDetails(f) } : {}),
  };
  const credits = f.credits
    .map((value, i) => ({ value: value.trim(), visible: f.creditPins?.[i] !== false }))
    .filter((c) => c.value)
    .map((c, position) => ({ kind: "credit" as const, value: c.value, position, visible: c.visible }));
  const list = (kind: ProfileItem["kind"], labels: string[]) => labels.map((label, position) => ({ kind, value: optionKey(label), position }));
  const items: ProfileItem[] = [...credits, ...list("skill", opts.review ? f.skills.filter(s => onSetSkills.includes(s)) : f.skills), ...list("service", f.services), ...(f.market === "la" ? list("area", f.areas) : [])];
  return { data, items };
}

const invert = <K extends string>(m: Record<K, string>) => Object.fromEntries(Object.entries(m).map(([k, v]) => [v, k])) as Record<string, K>;
const labelOf = Object.fromEntries([...onSetSkills, ...offSetServices, ...laServiceAreas].map((l) => [optionKey(l), l]));
const text = (v: unknown) => (typeof v === "string" ? v : "");

/**
 * A Company OS profile (its data and items) as the questionnaire, the reverse of `toProfile`. `photo` is the photo's
 * link (2.0's /media route), or "". Fields a reader can't see (a public read has no ZIP or insurance) come back empty
 * or as the builder's default. Company OS values 2.0 has no answer for read as the nearest one (remote → on site).
 */
export function fromProfile(data: Record<string, unknown>, items: ProfileItem[], photo: string): ProfileFields {
  const of = (kind: ProfileItem["kind"]) => items.filter((i) => i.kind === kind).sort((a, b) => a.position - b.position);
  const labels = (kind: ProfileItem["kind"]) => of(kind).map((i) => labelOf[i.value] ?? i.value);
  const credits = of("credit");
  const years = data.years_experience;
  return {
    photo,
    name: text(data.display_name),
    years: typeof years === "number" ? String(years) : "",
    position: text(data.position),
    imdb: text(data.external_profile_url),
    credits: credits.length ? credits.map((c) => c.value) : [""],
    ...(credits.length ? { creditPins: credits.map((c) => c.visible !== false) } : {}),
    skills: labels("skill"),
    services: labels("service"),
    other: text(data.service_proposal) || text(data.services_other),
    market: data.home_market === "la" || data.home_market === undefined ? "la" : "other",
    otherCity: text(data.home_city),
    zip: text(data.postal_code),
    areas: labels("area"),
    travel: text(data.travel_notes),
    month: text(data.availability_month),
    monthStatus: invert(availability)[text(data.availability_status)] ?? "available",
    dates: text(data.availability_notes),
    rate: text(data.rate_text),
    basis: invert(basis)[text(data.rate_basis)] ?? "hourly",
    about: text(data.about),
    languages: text(data.languages),
    insurance: invert(insurance)[text(data.insurance_disclosure)] ?? "private",
    tools: text(data.tools),
    transport: text(data.transport),
    mode: invert(mode)[text(data.work_mode)] ?? "on-site",
    ...extrasFrom(data),
    ...reviewFrom(data),
  };
}

/** The tenant-field answers Company OS returned, leaving out any it has none for (the browser copy fills those). */
function extrasFrom(data: Record<string, unknown>): Partial<ProfileFields> {
  const out: Partial<ProfileFields> = {};
  const t = (k: string) => (typeof data[k] === "string" && data[k] !== "" ? (data[k] as string) : undefined);
  if (t(EXTRA_FIELDS.title)) out.title = t(EXTRA_FIELDS.title);
  if (t(EXTRA_FIELDS.personalityQuestion)) out.personalityQuestion = t(EXTRA_FIELDS.personalityQuestion);
  if (t(EXTRA_FIELDS.personality)) out.personality = t(EXTRA_FIELDS.personality);
  const raw = data[EXTRA_FIELDS.serviceLines];
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const lines = Object.fromEntries(Object.entries(raw).filter(([, v]) => typeof v === "string" && v));
    if (Object.keys(lines).length) out.serviceLines = lines as Record<string, string>;
  }
  return out;
}

function reviewFrom(data: Record<string, unknown>): Partial<ProfileFields> {
  const raw = data[REVIEW_PUBLIC_FIELD], priv = data[REVIEW_PRIVATE_FIELD];
  const pub = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string,unknown> : {};
  const p = priv && typeof priv === "object" && !Array.isArray(priv) ? priv as Record<string,unknown> : {};
  const out: Partial<ProfileFields> = { ...cleanReviewFields(Object.fromEntries(REVIEW_PUBLIC_KEYS.map(k=>[k,pub[k]]).filter(([,v])=>v!==undefined))), ...cleanReviewFields(Object.fromEntries(REVIEW_PRIVATE_KEYS.map(k=>[k,p[k]]).filter(([,v])=>v!==undefined))) };
  for (const k of ["title","personalityQuestion","personality","resumeUrl","earliestStart","hireableJobs"] as const) if (typeof pub[k] === "string") out[k] = pub[k].slice(0,600);
  if (Array.isArray(pub.skills)) out.skills = pub.skills.filter((s):s is string=>typeof s==="string").slice(0,20);
  if (pub.serviceLines && typeof pub.serviceLines === "object" && !Array.isArray(pub.serviceLines)) out.serviceLines = Object.fromEntries(Object.entries(pub.serviceLines).filter(([,v])=>typeof v==="string")) as Record<string,string>;
  if (typeof p.bookingMobile === "string") out.bookingMobile = p.bookingMobile.slice(0,32);
  return out;
}
