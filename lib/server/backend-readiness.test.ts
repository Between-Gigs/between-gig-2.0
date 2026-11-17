import { beforeEach, describe, expect, it, vi } from "vitest";
import { FEATURE_MARKERS, backendReadiness, checkReadiness, enabledFeatures, resetReadinessCache, type Entities } from "./backend-readiness";

const entities = (...markers: string[]): Entities => {
  const by = new Map<string, string[]>([["profile", ["display_name"]], ["profile_item", ["kind"]]]);
  for (const m of markers) { const [e, f] = m.split("."); by.set(e, [...(by.get(e) ?? []), f]); }
  return [...by].map(([key, fields]) => ({ key, fields: fields.map(k => ({ key: k })) }));
};
const ALL = Object.values(FEATURE_MARKERS).flat();
const URL_ = "http://cos.internal:4000";
const env = (extra: Record<string, string> = {}) => ({ COMPANY_OS_URL: URL_, COMPANY_OS_READ_TOKEN: "cos_svc_reader_secret", ...extra });
const flags = { NEXT_PUBLIC_PROFILE_DETAILS: "1" };

beforeEach(() => resetReadinessCache());

describe("enabledFeatures", () => {
  it("maps flags to features, the custom-service runtime guard too", () => {
    expect(enabledFeatures({})).toEqual([]);
    expect(enabledFeatures({ NEXT_PUBLIC_PROFILE_DETAILS: "0", NEXT_PUBLIC_PROFILE_VIDEO_LINKS: "" })).toEqual([]);
    expect(enabledFeatures({ NEXT_PUBLIC_PROFILE_DETAILS: "1", CUSTOM_SERVICE_REVIEW_ENABLED: "1" }).sort()).toEqual(["customServiceReview", "profileDetails"]);
  });
});

describe("checkReadiness", () => {
  it("is ready when the markers are present", () => {
    expect(checkReadiness(["profileDetails", "videoLinks", "publishGate", "travelPreference"], entities(...ALL))).toEqual({ ready: true, missing: [] });
  });
  it("names the feature whose marker is missing", () => {
    const only18 = entities("profile.extended_travel_available");
    expect(checkReadiness(["travelPreference", "profileDetails", "videoLinks"], only18)).toEqual({ ready: false, missing: ["profileDetails", "videoLinks"] });
  });
  it("is ready with nothing enabled", () => expect(checkReadiness([], [])).toEqual({ ready: true, missing: [] }));
});

describe("backendReadiness", () => {
  it("makes no call when no flag is on", async () => {
    const fetch = vi.fn();
    expect(await backendReadiness({ flags: {}, env: env(), fetch: fetch as never })).toEqual({ ready: true, missing: [] });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("reads the public meta with the reader token and is ready when the markers exist", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ entities: entities(...ALL) }), { status: 200 }));
    expect(await backendReadiness({ flags, env: env(), fetch: fetch as never })).toEqual({ ready: true, missing: [] });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`${URL_}/t/between-gigs/me`);
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer cos_svc_reader_secret");
  });
  it("is not ready, naming the feature, when a marker is missing", async () => {
    const fetch = async () => new Response(JSON.stringify({ entities: entities("profile.extended_travel_available") }), { status: 200 });
    expect(await backendReadiness({ flags, env: env(), fetch: fetch as never })).toEqual({ ready: false, missing: ["profileDetails"] });
  });
  it.each([
    ["a Company OS error", async () => new Response("{}", { status: 500 })],
    ["a refusal", async () => new Response("{}", { status: 401 })],
    ["a network failure", async () => { throw new Error("down"); }],
    ["a body that is not the meta", async () => new Response("<html>", { status: 200 })],
  ])("is not ready on %s, with every enabled feature missing", async (_l, fetch) => {
    expect(await backendReadiness({ flags: { ...flags, NEXT_PUBLIC_PROFILE_VIDEO_LINKS: "1" }, env: env(), fetch: fetch as never })).toEqual({ ready: false, missing: ["videoLinks", "profileDetails"].sort() });
  });
  it("is not ready when Company OS does not answer within the timeout", async () => {
    const fetch = (_u: unknown, init?: RequestInit) => new Promise<Response>((_r, reject) => init?.signal?.addEventListener("abort", () => reject(new Error("aborted"))));
    const started = Date.now();
    expect((await backendReadiness({ flags, env: env(), fetch: fetch as never, timeoutMs: 50 })).ready).toBe(false);
    expect(Date.now() - started).toBeLessThan(2000);
  });
  it("is not ready without a Company OS address or token", async () => {
    const fetch = vi.fn();
    expect((await backendReadiness({ flags, env: {}, fetch: fetch as never })).ready).toBe(false);
    expect((await backendReadiness({ flags, env: { COMPANY_OS_URL: URL_ }, fetch: fetch as never })).ready).toBe(false);
  });
  it("caches a ready answer for about a minute", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ entities: entities(...ALL) }), { status: 200 }));
    let now = 1000;
    const o = { flags, env: env(), fetch: fetch as never, now: () => now };
    await backendReadiness(o); await backendReadiness(o);
    expect(fetch).toHaveBeenCalledTimes(1);
    now += 61_000;
    await backendReadiness(o);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("never puts the address or token in what it returns", async () => {
    const fetch = async () => { throw new Error(`${URL_} cos_svc_reader_secret`); };
    const out = JSON.stringify(await backendReadiness({ flags, env: env(), fetch: fetch as never }));
    expect(out).not.toContain("cos.internal"); expect(out).not.toContain("secret");
  });
});
