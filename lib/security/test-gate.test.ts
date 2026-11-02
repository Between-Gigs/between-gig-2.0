import { beforeEach, describe, expect, it } from "vitest";
import { GATE_COOKIE, gateCookieValue, resetGateLimits, safeNext, testGate, type GateEnv } from "./test-gate";

// The test environment's passphrase gate (playbook rule D5): on only when TEST_GATE_PASSPHRASE is set.
const ENV: GateEnv = { passphrase: "correct horse battery", secret: "s".repeat(64) };
const NOW = Date.UTC(2026, 10, 2, 12);
const DAY = 86_400_000;

const req = (path: string, init: RequestInit & { ip?: string; cookie?: string } = {}) => {
  const headers = new Headers(init.headers);
  if (init.ip !== undefined) headers.set("x-real-ip", init.ip);
  if (init.cookie) headers.set("cookie", init.cookie);
  return new Request(`https://web-test.example${path}`, { ...init, headers });
};
const post = (body: Record<string, string>, ip = "203.0.113.7") =>
  req("/test-gate/", { method: "POST", ip, headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(body).toString() });
const cookieFor = (env: GateEnv, exp: number) => `${GATE_COOKIE}=${gateCookieValue(env, exp)}`;

beforeEach(() => resetGateLimits());

describe("off", () => {
  it("lets everything through when no passphrase is set", async () => {
    expect(await testGate(req("/"), {}, NOW)).toBeNull();
    expect(await testGate(req("/api/funnel/joinWaitlist/", { method: "POST" }), { secret: ENV.secret }, NOW)).toBeNull();
  });
});

describe("without a valid cookie", () => {
  it("answers a page with 401 and the passphrase form, never cached or indexed", async () => {
    const res = (await testGate(req("/join/?invite=abc"), ENV, NOW))!;
    expect(res.status).toBe(401);
    expect(res.headers.get("content-type")).toMatch(/^text\/html/);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(res.headers.get("content-security-policy")).toBe("default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
    const html = await res.text();
    expect(html).toContain('action="/test-gate/"');
    expect(html).toContain('name="next" value="/join/?invite=abc"');
    expect(html).not.toMatch(/<script/i);
  });

  it("answers the site's own API with 401 JSON", async () => {
    const res = (await testGate(req("/api/funnel/joinWaitlist/", { method: "POST" }), ENV, NOW))!;
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "test_gate" });
  });

  it("escapes the page address it writes into the form", async () => {
    const html = await (await testGate(req('/p/"><script>x</script>/'), ENV, NOW))!.text();
    expect(html).not.toContain("<script>x");
  });
});

describe("exempt paths (providers and mail clients have no cookie)", () => {
  for (const path of ["/webhooks/resend", "/webhooks/resend/", "/email/between-gigs-wide-on-light.png", "/email/storyboard-opening.jpg", "/healthz", "/healthz/"]) {
    it(`passes ${path}`, async () => {
      expect(await testGate(req(path, { method: path.startsWith("/webhooks") ? "POST" : "GET" }), ENV, NOW)).toBeNull();
    });
  }
  for (const path of ["/webhooks/other/", "/webhooks/resend/x/", "/emails/", "/email", "/healthz/x/", "/api/healthz/"]) {
    it(`still gates ${path}`, async () => {
      expect((await testGate(req(path), ENV, NOW))?.status).toBe(401);
    });
  }
});

describe("the passphrase form", () => {
  it("with the right passphrase: 303 to next and a 30-day signed cookie", async () => {
    const res = (await testGate(post({ passphrase: ENV.passphrase!, next: "/join/?invite=abc" }), ENV, NOW))!;
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("/join/?invite=abc");
    const cookie = res.headers.get("set-cookie")!;
    expect(cookie).toMatch(new RegExp(`^${GATE_COOKIE}=`));
    for (const flag of ["HttpOnly", "Secure", "SameSite=Lax", "Path=/", `Max-Age=${30 * 86_400}`]) expect(cookie).toContain(flag);
    const value = cookie.split(";")[0]!;
    expect(await testGate(req("/", { cookie: value }), ENV, NOW + DAY)).toBeNull();
  });

  it("with the wrong passphrase: 401, the form again, no cookie", async () => {
    const res = (await testGate(post({ passphrase: "nope", next: "/" }), ENV, NOW))!;
    expect(res.status).toBe(401);
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(await res.text()).toContain("That passphrase didn't work");
  });

  it("after 5 wrong tries in 15 minutes, 429 even with the right one; another address is not affected", async () => {
    for (let i = 0; i < 5; i++) expect((await testGate(post({ passphrase: "nope" }), ENV, NOW + i))!.status).toBe(401);
    expect((await testGate(post({ passphrase: ENV.passphrase! }), ENV, NOW + 10))!.status).toBe(429);
    expect((await testGate(post({ passphrase: ENV.passphrase! }, "198.51.100.9"), ENV, NOW + 10))!.status).toBe(303);
    expect((await testGate(post({ passphrase: ENV.passphrase! }), ENV, NOW + 15 * 60_000 + 10))!.status).toBe(303);
  });

  it("refuses a body that is too large", async () => {
    expect((await testGate(post({ passphrase: "x".repeat(10_000) }), ENV, NOW))!.status).toBe(413);
  });

  it("answers GET on the form's address with the form", async () => {
    expect((await testGate(req("/test-gate/"), ENV, NOW))!.status).toBe(401);
  });
});

describe("next", () => {
  it.each([
    ["/join/?invite=abc", "/join/?invite=abc"],
    ["/owners/people/x/", "/owners/people/x/"],
    ["//evil.example/", "/"],
    ["/\\evil.example/", "/"],
    ["https://evil.example/", "/"],
    ["javascript:alert(1)", "/"],
    ["/%2F%2Fevil.example/", "/"],
    ["/%5Cevil.example/", "/"],
    ["/a\r\nSet-Cookie: x=1", "/"],
    ["", "/"],
    [undefined, "/"],
  ])("%j becomes %j", (raw, want) => {
    expect(safeNext(raw)).toBe(want);
  });
});

describe("cookies that don't count", () => {
  it.each([
    ["no cookie", ""],
    ["expired", cookieFor(ENV, NOW - 1)],
    ["signed under an old passphrase", cookieFor({ ...ENV, passphrase: "old passphrase" }, NOW + DAY)],
    ["signed with another secret", cookieFor({ ...ENV, secret: "t".repeat(64) }, NOW + DAY)],
    ["tampered expiry", cookieFor(ENV, NOW + DAY).replace(/=(\d+)\./, (_, d) => `=${Number(d) + 1}.`)],
    ["garbage", `${GATE_COOKIE}=not-a-cookie`],
  ])("%s → the gate", async (_, cookie) => {
    expect((await testGate(req("/", { cookie }), ENV, NOW))?.status).toBe(401);
  });

  it("a valid one among other cookies passes", async () => {
    expect(await testGate(req("/", { cookie: `a=1; ${cookieFor(ENV, NOW + DAY)}; b=2` }), ENV, NOW)).toBeNull();
  });
});

describe("half configured", () => {
  it("a passphrase without the signing secret fails closed with 503 (exempt paths still pass)", async () => {
    const env = { passphrase: ENV.passphrase };
    expect((await testGate(req("/"), env, NOW))!.status).toBe(503);
    expect((await testGate(post({ passphrase: ENV.passphrase! }), env, NOW))!.status).toBe(503);
    expect(await testGate(req("/healthz/"), env, NOW)).toBeNull();
  });
});
