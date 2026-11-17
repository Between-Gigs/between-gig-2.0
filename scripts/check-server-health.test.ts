import { describe, expect, it } from "vitest";
import { enabledFeatures } from "../lib/server/backend-readiness";
import { buildEnabledFeatures, judgeHealth } from "./check-server-health.mjs";

// check-server starts the built server with no Company OS by design, so a feature built in makes /healthz/ answer 503.
// That is accepted there only when the body is exactly the readiness refusal naming features enabled in this build.
const env = { NEXT_PUBLIC_PROFILE_DETAILS: "1", NEXT_PUBLIC_PROFILE_VIDEO_LINKS: "1" };
const refusal = (missing: string[]) => JSON.stringify({ ok: false, missing });

describe("judgeHealth", () => {
  it("accepts 200 ok", () => expect(judgeHealth(200, "ok", {}).ok).toBe(true));
  it("accepts a 503 naming only features built in", () => {
    expect(judgeHealth(503, refusal(["profileDetails"]), env).ok).toBe(true);
    expect(judgeHealth(503, refusal(["profileDetails", "videoLinks"]), env).ok).toBe(true);
  });
  it.each([
    ["a 500", 500, refusal(["profileDetails"])],
    ["a 503 naming a feature not built in", 503, refusal(["publishGate"])],
    ["a 503 with nothing built in", 503, refusal(["profileDetails"]), {}],
    ["a 503 with an empty list", 503, refusal([])],
    ["a 503 with an unexpected body", 503, "Service Unavailable"],
    ["a 503 with extra keys", 503, JSON.stringify({ ok: false, missing: ["profileDetails"], url: "http://x" })],
    ["a 503 with ok true", 503, JSON.stringify({ ok: true, missing: ["profileDetails"] })],
    ["a 200 with another body", 200, "{}"],
  ] as [string, number, string, Record<string, string>?][])("refuses %s", (_l, status, body, e) => {
    expect(judgeHealth(status, body, e ?? env).ok).toBe(false);
  });
});

it("the build-time feature list matches the server's own", () => {
  for (const e of [{}, env, { CUSTOM_SERVICE_REVIEW_ENABLED: "1" }, { NEXT_PUBLIC_PROFILE_NO_DEPARTMENT: "1", NEXT_PUBLIC_PROFILE_PUBLISH_GATE: "1", NEXT_PUBLIC_PROFILE_LOCATION_CONTROLS: "1", NEXT_PUBLIC_PROFILE_CUSTOM_SKILLS: "1", NEXT_PUBLIC_PROFILE_TRAVEL_PREFERENCE: "1", NEXT_PUBLIC_CUSTOM_SERVICE_REVIEW: "1" }])
    expect(buildEnabledFeatures(e)).toEqual(enabledFeatures(e));
});

describe("judgeHealth with a required feature (the runtime-guard start)", () => {
  const e = { NEXT_PUBLIC_PROFILE_DETAILS: "1", CUSTOM_SERVICE_REVIEW_ENABLED: "1" };
  it("passes when the required feature is listed alongside built-in ones", () => {
    expect(judgeHealth(503, refusal(["customServiceReview", "profileDetails"]), e, ["customServiceReview"]).ok).toBe(true);
    expect(judgeHealth(503, refusal(["customServiceReview"]), e, ["customServiceReview"]).ok).toBe(true);
  });
  it("fails when the required feature is missing from the list, or the body is wrong", () => {
    expect(judgeHealth(503, refusal(["profileDetails"]), e, ["customServiceReview"]).ok).toBe(false);
    expect(judgeHealth(200, "ok", e, ["customServiceReview"]).ok).toBe(false);
    expect(judgeHealth(503, "nope", e, ["customServiceReview"]).ok).toBe(false);
    expect(judgeHealth(503, refusal(["customServiceReview", "publishGate"]), e, ["customServiceReview"]).ok).toBe(false);
  });
});
