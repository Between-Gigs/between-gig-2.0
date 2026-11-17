// Deployment preflight, offline. It checks only what no backend can answer: the flag values, the publish-gate
// acknowledgement and the reviewed location cutoff. Whether the backend has the profiles-module version a flag needs is
// checked automatically by the server itself (lib/server/backend-readiness.ts, served as /healthz/), not by a receipt.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkRequirement } from "./check-company-os.mjs";

export function checkProfileActivation(env, manifest) {
  for (const name of ["NEXT_PUBLIC_PROFILE_NO_DEPARTMENT", "NEXT_PUBLIC_CUSTOM_SERVICE_REVIEW", "NEXT_PUBLIC_PROFILE_LOCATION_CONTROLS", "NEXT_PUBLIC_PROFILE_CUSTOM_SKILLS", "NEXT_PUBLIC_PROFILE_TRAVEL_PREFERENCE", "NEXT_PUBLIC_PROFILE_PUBLISH_GATE", "NEXT_PUBLIC_PROFILE_VIDEO_LINKS", "NEXT_PUBLIC_PROFILE_DETAILS"]) {
    if (![undefined, "", "0", "1"].includes(env[name])) return { ok: false, error: `${name} must be absent, 0 or 1` };
  }
  // Do not turn off a previously activated runtime guard during an ordinary UI rollback.
  if (![undefined, "", "1"].includes(env.CUSTOM_SERVICE_REVIEW_ENABLED)) return { ok: false, error: "CUSTOM_SERVICE_REVIEW_ENABLED must be absent (preserve) or 1; disabling an installed guard needs a separate reviewed drain/rollback" };
  if (env.NEXT_PUBLIC_CUSTOM_SERVICE_REVIEW === "1" && env.CUSTOM_SERVICE_REVIEW_ENABLED !== "1") return { ok: false, error: "Custom-service UI activation requires its explicit runtime guard" };
  const release = checkRequirement(manifest);
  if (!release.ok) return release;
  const declaration = JSON.parse(manifest);
  if (env.NEXT_PUBLIC_PROFILE_LOCATION_CONTROLS === "1") {
    const cutoff = declaration?.travelRequiredAfter?.[env.RAILWAY_ENV];
    const utc = value => typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
    if (!utc(cutoff) || cutoff !== env.NEXT_PUBLIC_PROFILE_TRAVEL_REQUIRED_AFTER) return { ok: false, error: "Location cohort activation needs one reviewed UTC cutoff in company-os.json (travelRequiredAfter) matching its public build configuration" };
  }
  if (env.NEXT_PUBLIC_PROFILE_PUBLISH_GATE === "1" && env.PROFILE_PUBLISH_GATE_ACK_NO_PUBLISH !== "1") {
    // With the gate on, approval is private and nothing becomes public until the tenant's publish step exists.
    // Turning it on is therefore deliberate: the deploy must say so.
    return { ok: false, error: "The publish gate keeps approved profiles private until the tenant's publish_after_approval step is done: set PROFILE_PUBLISH_GATE_ACK_NO_PUBLISH=1 to confirm that nothing should go public at launch" };
  }
  return { ok: true };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = checkProfileActivation(process.env, fs.readFileSync(new URL("../company-os.json", import.meta.url), "utf8"));
  if (!result.ok) { console.error(`::error::${result.error}`); process.exit(1); }
  console.log("Profile activation flags checked; the server checks the backend's profiles module itself at deploy (/healthz/)");
}
