/*
 * 2.0's questionnaire (ProfileFields) as Company OS records: the `profile` fields (with the tenant fields
 * `home_city` and `services_other`) and its `profile_item` lists. Option values are the recipe's keys, made from the
 * taxonomy labels by `optionKey`. Mapping table: Company OS docs/customers/between-gigs/gap-analysis.md §13.4.
 */
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
