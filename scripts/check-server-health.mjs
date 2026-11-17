// check-server starts the built server with no Company OS, by design. With a profile flag built in, /healthz/ then
// answers 503 (lib/server/backend-readiness.ts stays fail-closed; there is no bypass). That one answer is accepted here;
// the real gate is Railway's deploy healthcheck against the real backend.
const FLAGS = [
  ["NEXT_PUBLIC_PROFILE_NO_DEPARTMENT", "departmentRetirement"], ["NEXT_PUBLIC_CUSTOM_SERVICE_REVIEW", "customServiceReview"],
  ["CUSTOM_SERVICE_REVIEW_ENABLED", "customServiceReview"], ["NEXT_PUBLIC_PROFILE_LOCATION_CONTROLS", "locationControls"],
  ["NEXT_PUBLIC_PROFILE_CUSTOM_SKILLS", "customSkills"], ["NEXT_PUBLIC_PROFILE_TRAVEL_PREFERENCE", "travelPreference"],
  ["NEXT_PUBLIC_PROFILE_PUBLISH_GATE", "publishGate"], ["NEXT_PUBLIC_PROFILE_DETAILS", "profileDetails"], ["NEXT_PUBLIC_PROFILE_VIDEO_LINKS", "videoLinks"],
];

/** The features this build turns on (same rule as enabledFeatures in lib/server/backend-readiness.ts; a test keeps them equal). */
export function buildEnabledFeatures(env) {
  return [...new Set(FLAGS.filter(([name]) => env[name] === "1").map(([, feature]) => feature))].sort();
}

/** 200 "ok", or a 503 whose body is exactly {ok:false, missing:[...]} naming only features built into this build. */
export function judgeHealth(status, body, env) {
  if (status === 200) return body === "ok" ? { ok: true } : { ok: false, why: "200 with an unexpected body" };
  if (status !== 503) return { ok: false, why: `answered ${status}` };
  let parsed;
  try { parsed = JSON.parse(body); } catch { return { ok: false, why: "503 with a body that is not JSON" }; }
  const keys = parsed && typeof parsed === "object" ? Object.keys(parsed).sort().join() : "";
  const built = buildEnabledFeatures(env);
  if (keys !== "missing,ok" || parsed.ok !== false || !Array.isArray(parsed.missing) || !parsed.missing.length || !parsed.missing.every(m => built.includes(m))) {
    return { ok: false, why: "503 that is not the readiness refusal for features built into this build" };
  }
  return { ok: true };
}
