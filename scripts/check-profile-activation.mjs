// Deployment preflight only: declarations are not a runtime capability or tenant-settings probe.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkRequirement } from "./check-company-os.mjs";

function settingsDeclared(feature, environment) {
  return ["test", "production"].includes(environment) && typeof feature?.apiCommit === "string" && /^[0-9a-f]{40}$/.test(feature.apiCommit) &&
    typeof feature?.settingsEvidence?.[environment] === "string" && /^libfile_[A-Za-z0-9_-]+$/.test(feature.settingsEvidence[environment]);
}

export function checkProfileActivation(env, manifest) {
  for (const name of ["NEXT_PUBLIC_PROFILE_NO_DEPARTMENT", "NEXT_PUBLIC_CUSTOM_SERVICE_REVIEW", "NEXT_PUBLIC_PROFILE_LOCATION_CONTROLS", "NEXT_PUBLIC_PROFILE_CUSTOM_SKILLS", "NEXT_PUBLIC_PROFILE_TRAVEL_PREFERENCE", "NEXT_PUBLIC_PROFILE_DETAILS"]) {
    if (![undefined, "", "0", "1"].includes(env[name])) return { ok: false, error: `${name} must be absent, 0 or 1` };
  }
  // Do not turn off a previously activated runtime guard during an ordinary UI rollback.
  if (![undefined, "", "1"].includes(env.CUSTOM_SERVICE_REVIEW_ENABLED)) return { ok: false, error: "CUSTOM_SERVICE_REVIEW_ENABLED must be absent (preserve) or 1; disabling an installed guard needs a separate reviewed drain/rollback" };
  if (env.NEXT_PUBLIC_CUSTOM_SERVICE_REVIEW === "1" && env.CUSTOM_SERVICE_REVIEW_ENABLED !== "1") return { ok: false, error: "Custom-service UI activation requires its explicit runtime guard" };
  let declaration;
  try { declaration = JSON.parse(manifest); } catch { return { ok: false, error: "company-os.json is not JSON" }; }
  if (env.CUSTOM_SERVICE_REVIEW_ENABLED === "1") {
    const release = checkRequirement(manifest, { customServiceReview: true });
    if (!release.ok) return release;
    if (!settingsDeclared(declaration?.profileFeatures?.customServiceReview, env.RAILWAY_ENV)) return { ok: false, error: "Custom-service activation needs this environment's private settings-verification receipt and deployed API commit declaration" };
  }
  if (env.NEXT_PUBLIC_PROFILE_LOCATION_CONTROLS === "1") {
    const release = checkRequirement(manifest, { locationControls: true });
    if (!release.ok) return release;
    const cutoff = declaration?.profileFeatures?.locationControls?.travelRequiredAfter?.[env.RAILWAY_ENV];
    const utc = value => typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
    if (!utc(cutoff) || cutoff !== env.NEXT_PUBLIC_PROFILE_TRAVEL_REQUIRED_AFTER) return { ok: false, error: "Location cohort activation needs one reviewed UTC cutoff matching its public build configuration and verified API setting" };
  }
  if (env.NEXT_PUBLIC_PROFILE_CUSTOM_SKILLS === "1") {
    const release = checkRequirement(manifest, { customSkills: true });
    if (!release.ok) return release;
  }
  if (env.NEXT_PUBLIC_PROFILE_TRAVEL_PREFERENCE === "1") {
    const release = checkRequirement(manifest, { travelPreference: true });
    if (!release.ok) return release;
  }
  if (env.NEXT_PUBLIC_PROFILE_DETAILS === "1") {
    const release = checkRequirement(manifest, { profileDetails: true });
    if (!release.ok) return release;
  }
  const enabled = [
    ...(env.NEXT_PUBLIC_PROFILE_NO_DEPARTMENT === "1" ? ["departmentRetirement"] : []),
    ...(env.CUSTOM_SERVICE_REVIEW_ENABLED === "1" ? ["customServiceReview"] : []),
    ...(env.NEXT_PUBLIC_PROFILE_LOCATION_CONTROLS === "1" ? ["locationControls"] : []),
    ...(env.NEXT_PUBLIC_PROFILE_CUSTOM_SKILLS === "1" ? ["customSkills"] : []),
    ...(env.NEXT_PUBLIC_PROFILE_TRAVEL_PREFERENCE === "1" ? ["travelPreference"] : []),
    ...(env.NEXT_PUBLIC_PROFILE_DETAILS === "1" ? ["profileDetails"] : []),
  ];
  for (const name of enabled) if (!settingsDeclared(declaration?.profileFeatures?.[name], env.RAILWAY_ENV)) return { ok: false, error: `${name} needs this environment's private settings-verification receipt and deployed API commit declaration` };
  if (new Set(enabled.map(name => declaration.profileFeatures[name].apiCommit)).size > 1) return { ok: false, error: "Enabled profile features must identify the same deployed API source commit" };
  return { ok: true };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = checkProfileActivation(process.env, fs.readFileSync(new URL("../company-os.json", import.meta.url), "utf8"));
  if (!result.ok) { console.error(`::error::${result.error}`); process.exit(1); }
  console.log("Profile activation declarations checked; runtime capability and tenant-settings acceptance remain separate gates");
}
