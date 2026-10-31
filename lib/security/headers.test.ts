import { describe, expect, it } from "vitest";
import { clerkFrontendApi, contentSecurityPolicy, securityHeaders } from "./headers.ts";

// The server build's response headers (decision N-03): a nonce-based CSP that Clerk can live with, plus the
// static hardening headers. Made-up keys only: the "key" below is the base64 of a fictional Clerk host.
const devKey = `pk_test_${Buffer.from("fictional-otter-1.clerk.accounts.dev$").toString("base64")}`;
const liveKey = `pk_live_${Buffer.from("clerk.example.test$").toString("base64")}`;
const directives = (csp: string) => new Map(csp.split(";").map((d) => d.trim()).filter(Boolean).map((d) => {
  const [name, ...values] = d.split(/\s+/);
  return [name, values] as const;
}));

describe("clerkFrontendApi", () => {
  it("reads the Frontend API host from a publishable key", () => {
    expect(clerkFrontendApi(devKey)).toBe("fictional-otter-1.clerk.accounts.dev");
    expect(clerkFrontendApi(liveKey)).toBe("clerk.example.test");
  });

  it("refuses anything that isn't a well-formed key, so a hostile value can't widen the policy", () => {
    expect(clerkFrontendApi(undefined)).toBeNull();
    expect(clerkFrontendApi("")).toBeNull();
    expect(clerkFrontendApi("sk_test_abc")).toBeNull();
    expect(clerkFrontendApi(`pk_test_${Buffer.from("evil.test; script-src *$").toString("base64")}`)).toBeNull();
    expect(clerkFrontendApi(`pk_test_${Buffer.from("no-dollar.clerk.accounts.dev").toString("base64")}`)).toBeNull();
  });
});

describe("contentSecurityPolicy", () => {
  const csp = contentSecurityPolicy({ nonce: "bm9uY2UtMTIz", clerkPublishableKey: devKey });
  const d = directives(csp);

  it("allows scripts only by this request's nonce (strict-dynamic), never inline or eval", () => {
    const script = d.get("script-src")!;
    expect(script).toContain("'nonce-bm9uY2UtMTIz'");
    expect(script).toContain("'strict-dynamic'");
    expect(script).not.toContain("'unsafe-inline'");
    expect(script).not.toContain("'unsafe-eval'");
    expect(script.join(" ")).not.toMatch(/(^|\s)(\*|https:|http:)(\s|$)/);
  });

  it("lets Clerk load: its Frontend API, bot protection, images, workers and runtime styles", () => {
    expect(d.get("script-src")).toEqual(expect.arrayContaining(["https://fictional-otter-1.clerk.accounts.dev", "https://challenges.cloudflare.com"]));
    expect(d.get("connect-src")).toEqual(expect.arrayContaining(["'self'", "https://fictional-otter-1.clerk.accounts.dev", "https://*.protect.clerk.com:*"]));
    expect(d.get("img-src")).toEqual(expect.arrayContaining(["'self'", "https://img.clerk.com"]));
    expect(d.get("worker-src")).toEqual(["'self'", "blob:"]);
    expect(d.get("style-src")).toEqual(["'self'", "'unsafe-inline'"]);
    expect(d.get("frame-src")).toEqual(expect.arrayContaining(["https://challenges.cloudflare.com", "https://*.protect.clerk.com"]));
  });

  it("locks everything else down", () => {
    expect(d.get("default-src")).toEqual(["'self'"]);
    expect(d.get("object-src")).toEqual(["'none'"]);
    expect(d.get("base-uri")).toEqual(["'self'"]);
    expect(d.get("form-action")).toEqual(["'self'"]);
    expect(d.get("frame-ancestors")).toEqual(["'none'"]);
    expect(d.has("upgrade-insecure-requests")).toBe(true);
  });

  it("without a Clerk key, names no third-party Clerk host", () => {
    const plain = contentSecurityPolicy({ nonce: "abc", clerkPublishableKey: undefined });
    expect(plain).not.toContain("clerk.accounts.dev");
    expect(directives(plain).get("connect-src")).toEqual(["'self'", "https://*.protect.clerk.com:*"]);
  });

  it("adds 'unsafe-eval' in development only (React's dev tooling needs it)", () => {
    expect(directives(contentSecurityPolicy({ nonce: "abc", clerkPublishableKey: devKey, dev: true })).get("script-src")).toContain("'unsafe-eval'");
  });

  it("refuses a nonce that could break out of the header", () => {
    expect(() => contentSecurityPolicy({ nonce: "abc'; script-src *", clerkPublishableKey: devKey })).toThrow();
    expect(() => contentSecurityPolicy({ nonce: "", clerkPublishableKey: devKey })).toThrow();
  });
});

describe("securityHeaders", () => {
  const h = Object.fromEntries(securityHeaders().map(({ key, value }) => [key.toLowerCase(), value]));

  it("sets the hardening headers on every response", () => {
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["strict-transport-security"]).toMatch(/^max-age=\d{8,}; includeSubDomains$/);
    expect(h["permissions-policy"]).toContain("camera=()");
    expect(h["permissions-policy"]).toContain("geolocation=()");
    // Clerk's popup sign-in (OAuth, later) needs its popup to keep an opener.
    expect(h["cross-origin-opener-policy"]).toBe("same-origin-allow-popups");
    // Obsolete features only produce console warnings.
    expect(h["permissions-policy"]).not.toContain("interest-cohort");
  });

  it("does not carry the CSP itself (the proxy sets it per request, with the nonce)", () => {
    expect(h["content-security-policy"]).toBeUndefined();
  });
});
