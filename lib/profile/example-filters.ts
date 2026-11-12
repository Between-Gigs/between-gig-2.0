import type { Profile, RateBasis } from "../data/types";

export interface ExampleFilters { q: string; service: string; area: string; availability: string; basis: "" | RateBasis; max: string }
export const clearExampleFilters: ExampleFilters = { q: "", service: "", area: "", availability: "", basis: "", max: "" };

export function matchesExample(profile: Profile, filters: ExampleFilters) {
  const f = profile.fields;
  if (filters.service && !f.services.includes(filters.service)) return false;
  if (filters.area && !f.areas.includes(filters.area)) return false;
  if (filters.availability && f.monthStatus !== filters.availability) return false;
  if (filters.basis) {
    if (f.basis !== filters.basis || !Number.isFinite(Number(f.rate)) || Number(f.rate) <= 0) return false;
    if (filters.max.trim() && Number(f.rate) > Number(filters.max)) return false;
  }
  const haystack = [f.name, f.position, f.hireableJobs ?? "", f.about, ...f.services, ...f.skills, ...f.areas, ...(profile.extras?.helps ?? [])].join(" ").toLowerCase();
  return filters.q.toLowerCase().trim().split(/\s+/).every((word) => haystack.includes(word));
}
