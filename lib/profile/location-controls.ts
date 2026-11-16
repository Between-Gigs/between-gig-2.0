/** Explicit build switch: legacy live/sample behavior stays unchanged until selected for local preview or activation. */
export const locationControlsEnabled = () => process.env.NEXT_PUBLIC_PROFILE_LOCATION_CONTROLS === "1";
export const travelRadiusChoices = ["Up to 5 miles", "Up to 15 miles", "Up to 25 miles", "Up to 50 miles"] as const;
/** Keep a previously saved free-text answer readable until its owner explicitly replaces it. */
export function travelRadiusOptions(value: string) {
  const choices = travelRadiusChoices.map(value => ({ value, label: value, disabled: false }));
  return value.trim() && !travelRadiusChoices.some(v => v === value)
    ? [{ value, label: `Previously saved: ${value}`, disabled: true }, ...choices] : choices;
}

/** Public cutover policy only; the API independently enforces its trusted profile-row cohort. */
export function isUtcCutoff(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
}

export function travelRequiredForProfile(profileCreatedAt: string | null | undefined, cutoff = process.env.NEXT_PUBLIC_PROFILE_TRAVEL_REQUIRED_AFTER): boolean {
  if (!isUtcCutoff(cutoff)) return false; // An unallocated policy must not block an existing profile.
  if (profileCreatedAt === null) return true; // No stored profile yet: a genuinely new working copy.
  if (!isUtcCutoff(profileCreatedAt)) return false; // Older sample/client metadata is not an invented creation date.
  return Date.parse(profileCreatedAt) >= Date.parse(cutoff);
}

export function withTravelRequirement<T extends { required: readonly string[] }>(template: T, profileCreatedAt: string | null | undefined): T & { travelRequirement?: "required" | "legacy-optional" } {
  return locationControlsEnabled() ? { ...template, travelRequirement: travelRequiredForProfile(profileCreatedAt) ? "required" : "legacy-optional" } : template;
}
