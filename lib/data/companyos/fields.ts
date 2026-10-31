/*
 * 2.0's questionnaire (ProfileFields) as Company OS records: the `profile` fields (with the tenant fields
 * `home_city` and `services_other`) and its `profile_item` lists. Option values are the recipe's keys, made from the
 * taxonomy labels by `optionKey`; `fromProfile` reads them back. Mapping table: Company OS docs/customers/between-gigs/gap-analysis.md §13.4.
 */
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

/** The profile's data (without `person`, `status` or the photo) and its items, in 2.0's order. */
export function toProfile(f: ProfileFields): { data: Record<string, unknown>; items: ProfileItem[] } {
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
  };
  const credits = f.credits
    .map((value, i) => ({ value: value.trim(), visible: f.creditPins?.[i] !== false }))
    .filter((c) => c.value)
    .map((c, position) => ({ kind: "credit" as const, value: c.value, position, visible: c.visible }));
  const list = (kind: ProfileItem["kind"], labels: string[]) => labels.map((label, position) => ({ kind, value: optionKey(label), position }));
  const items: ProfileItem[] = [...credits, ...list("skill", f.skills), ...list("service", f.services), ...(f.market === "la" ? list("area", f.areas) : [])];
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
    other: text(data.services_other),
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
  };
}
