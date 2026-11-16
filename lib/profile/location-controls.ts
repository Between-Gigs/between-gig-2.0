/** Explicit build switch: legacy live/sample behavior stays unchanged until selected for local preview or activation. */
export const locationControlsEnabled = () => process.env.NEXT_PUBLIC_PROFILE_LOCATION_CONTROLS === "1";
export const travelRadiusChoices = ["Up to 5 miles", "Up to 15 miles", "Up to 25 miles", "Up to 50 miles"] as const;
/** Keep a previously saved free-text answer readable until its owner explicitly replaces it. */
export function travelRadiusOptions(value: string) {
  const choices = travelRadiusChoices.map(value => ({ value, label: value, disabled: false }));
  return value.trim() && !travelRadiusChoices.some(v => v === value)
    ? [{ value, label: `Previously saved: ${value}`, disabled: true }, ...choices] : choices;
}
