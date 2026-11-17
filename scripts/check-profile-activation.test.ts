import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { checkProfileActivation } from "./check-profile-activation.mjs";

// The deploy no longer asks for receipts: the backend is checked automatically (lib/server/backend-readiness.ts).
// This preflight keeps only what no backend can answer: flag format, the publish-gate acknowledgement, the location cutoff.
const CUTOFF = "2026-12-01T00:00:00.000Z";
const manifest = (extra: object = {}) => JSON.stringify({ requires: ">=1.17.0", travelRequiredAfter: { test: CUTOFF, production: null }, ...extra });
const ALL_ON = {
  NEXT_PUBLIC_PROFILE_NO_DEPARTMENT: "1", NEXT_PUBLIC_CUSTOM_SERVICE_REVIEW: "1", CUSTOM_SERVICE_REVIEW_ENABLED: "1",
  NEXT_PUBLIC_PROFILE_LOCATION_CONTROLS: "1", NEXT_PUBLIC_PROFILE_TRAVEL_REQUIRED_AFTER: CUTOFF, NEXT_PUBLIC_PROFILE_CUSTOM_SKILLS: "1",
  NEXT_PUBLIC_PROFILE_TRAVEL_PREFERENCE: "1", NEXT_PUBLIC_PROFILE_PUBLISH_GATE: "1", PROFILE_PUBLISH_GATE_ACK_NO_PUBLISH: "1",
  NEXT_PUBLIC_PROFILE_VIDEO_LINKS: "1", NEXT_PUBLIC_PROFILE_DETAILS: "1",
};
const FLAGS = ["NEXT_PUBLIC_PROFILE_NO_DEPARTMENT", "NEXT_PUBLIC_CUSTOM_SERVICE_REVIEW", "NEXT_PUBLIC_PROFILE_LOCATION_CONTROLS", "NEXT_PUBLIC_PROFILE_CUSTOM_SKILLS", "NEXT_PUBLIC_PROFILE_TRAVEL_PREFERENCE", "NEXT_PUBLIC_PROFILE_PUBLISH_GATE", "NEXT_PUBLIC_PROFILE_VIDEO_LINKS", "NEXT_PUBLIC_PROFILE_DETAILS"];

describe("profile activation preflight without receipts", () => {
  it("passes with every flag on and no receipt, commit or module version in company-os.json", () => {
    expect(checkProfileActivation({ RAILWAY_ENV: "test", ...ALL_ON }, manifest()).ok).toBe(true);
  });
  it.each([{}, { NEXT_PUBLIC_CUSTOM_SERVICE_REVIEW: "0" }, { NEXT_PUBLIC_PROFILE_NO_DEPARTMENT: "0" }])("permits a dormant build (%j)", env => {
    expect(checkProfileActivation(env, manifest()).ok).toBe(true);
  });
  it.each(FLAGS)("refuses a bad value for %s without echoing it", name => {
    const result = checkProfileActivation({ [name]: "true" }, manifest());
    expect(result.ok).toBe(false);
    expect(checkProfileActivation({ [name]: "\n::notice::untrusted" }, manifest()).error).not.toContain("untrusted");
  });
  it.each(["", "0"])("refuses disabling the runtime guard (%j) and a malformed one", runtime => {
    expect(checkProfileActivation({ CUSTOM_SERVICE_REVIEW_ENABLED: runtime || "0" }, manifest()).ok).toBe(false);
    expect(checkProfileActivation({ CUSTOM_SERVICE_REVIEW_ENABLED: "\n::notice::untrusted" }, manifest()).error ?? "").not.toContain("untrusted");
  });
  it("lets the guard be absent or empty (preserve)", () => {
    expect(checkProfileActivation({ CUSTOM_SERVICE_REVIEW_ENABLED: "" }, manifest()).ok).toBe(true);
    expect(checkProfileActivation({}, manifest()).ok).toBe(true);
  });
  it("custom-service UI needs its explicit runtime guard; hiding the UI with the guard on is fine", () => {
    expect(checkProfileActivation({ NEXT_PUBLIC_CUSTOM_SERVICE_REVIEW: "1" }, manifest()).ok).toBe(false);
    expect(checkProfileActivation({ NEXT_PUBLIC_CUSTOM_SERVICE_REVIEW: "0", CUSTOM_SERVICE_REVIEW_ENABLED: "1" }, manifest()).ok).toBe(true);
  });
  it("still refuses the publish gate without the acknowledgement", () => {
    const env = { RAILWAY_ENV: "test", NEXT_PUBLIC_PROFILE_PUBLISH_GATE: "1" };
    const refused = checkProfileActivation(env, manifest());
    expect(refused.ok).toBe(false);
    expect(refused.error).toMatch(/PROFILE_PUBLISH_GATE_ACK_NO_PUBLISH/);
    expect(checkProfileActivation({ ...env, PROFILE_PUBLISH_GATE_ACK_NO_PUBLISH: "0" }, manifest()).ok).toBe(false);
    expect(checkProfileActivation({ ...env, PROFILE_PUBLISH_GATE_ACK_NO_PUBLISH: "1" }, manifest()).ok).toBe(true);
    expect(checkProfileActivation({ RAILWAY_ENV: "test" }, manifest()).ok).toBe(true);
  });
  it("still needs the reviewed location cutoff to equal the build's, per environment", () => {
    const env = { RAILWAY_ENV: "test", NEXT_PUBLIC_PROFILE_LOCATION_CONTROLS: "1", NEXT_PUBLIC_PROFILE_TRAVEL_REQUIRED_AFTER: CUTOFF };
    expect(checkProfileActivation(env, manifest()).ok).toBe(true);
    expect(checkProfileActivation({ ...env, NEXT_PUBLIC_PROFILE_TRAVEL_REQUIRED_AFTER: "2026-12-02T00:00:00.000Z" }, manifest()).ok).toBe(false);
    expect(checkProfileActivation({ ...env, RAILWAY_ENV: "production" }, manifest()).ok).toBe(false);
    expect(checkProfileActivation({ ...env, NEXT_PUBLIC_PROFILE_TRAVEL_REQUIRED_AFTER: "2026-12-01" }, manifest({ travelRequiredAfter: { test: "2026-12-01", production: null } })).ok).toBe(false);
    expect(checkProfileActivation(env, JSON.stringify({ requires: ">=1.17.0" })).ok).toBe(false);
  });
  it("does not move a test cutoff to production", () => {
    const prod = "2026-12-15T00:00:00.000Z";
    const m = manifest({ travelRequiredAfter: { test: CUTOFF, production: prod } });
    const env = { RAILWAY_ENV: "production", NEXT_PUBLIC_PROFILE_LOCATION_CONTROLS: "1" };
    expect(checkProfileActivation({ ...env, NEXT_PUBLIC_PROFILE_TRAVEL_REQUIRED_AFTER: CUTOFF }, m).ok).toBe(false);
    expect(checkProfileActivation({ ...env, NEXT_PUBLIC_PROFILE_TRAVEL_REQUIRED_AFTER: prod }, m).ok).toBe(true);
  });
  it("still checks the top-level requires and that the file is JSON", () => {
    expect(checkProfileActivation(ALL_ON, "{").ok).toBe(false);
    expect(checkProfileActivation({ ...ALL_ON, RAILWAY_ENV: "test" }, JSON.stringify({ travelRequiredAfter: { test: CUTOFF } })).ok).toBe(false);
    expect(checkProfileActivation({ ...ALL_ON, RAILWAY_ENV: "test" }, manifest({ requires: "^1.17" })).ok).toBe(false);
  });
});

describe("the shipped company-os.json", () => {
  const SHIPPED_CUTOFF = "2026-11-18T01:00:00.000Z";
  const shipped = readFileSync(new URL("../company-os.json", import.meta.url), "utf8");
  it.each(["test", "production"])("lets every feature switch on in %s with the agreed travel cutoff", env => {
    expect(checkProfileActivation({ ...ALL_ON, RAILWAY_ENV: env, NEXT_PUBLIC_PROFILE_TRAVEL_REQUIRED_AFTER: SHIPPED_CUTOFF }, shipped).ok).toBe(true);
  });
});
