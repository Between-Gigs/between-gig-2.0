import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { CompanyOsError, type Me } from "./companyos";
import { PREVIEW_COOKIE, grantPreview, previewCookieValue, resolveInside, servePreview } from "./preview";

// /preview/ on the server builds (owner, 2026-11-02): the sample-data export of the whole site, for super admins only.
const SECRET = "p".repeat(64);
const NOW = Date.UTC(2026, 10, 2, 12);
const HOUR = 3_600_000;

const top = mkdtempSync(path.join(tmpdir(), "bg-preview-"));
const ROOT = path.join(top, "preview-site");
const file = (rel: string, text: string) => { mkdirSync(path.dirname(path.join(ROOT, rel)), { recursive: true }); writeFileSync(path.join(ROOT, rel), text); };
file("index.html", "<html>sample home</html>");
file("preview/index.html", "<html>preview guide</html>");
file("scripted/index.html", '<html><script>self.__next_f.push([1])</script><script src="/preview/_next/static/chunks/app.js"></script><script id="t">document.documentElement.dataset.theme="dark"</script></html>');
file("emails/invite/index.html", "<html>invite email</html>");
file("_next/static/chunks/app.js", "console.log(1)");
file("thumbs/home.jpg", "jpg");
file("index.txt", "rsc");
file("404.html", "<html>sample not found</html>");
writeFileSync(path.join(top, "outside.txt"), "must never be served");
symlinkSync(path.join(top, "outside.txt"), path.join(ROOT, "linked.txt"));
symlinkSync(top, path.join(ROOT, "linked-dir"));
afterAll(() => rmSync(top, { recursive: true, force: true }));

const cookie = (exp = NOW + HOUR, secret = SECRET, user = "u1") => `${PREVIEW_COOKIE}=${previewCookieValue(secret, user, exp)}`;
const get = (p: string, c?: string, method = "GET") => new Request(`https://web.example${p}`, { method, headers: c ? { cookie: c } : {} });
// null, not undefined, for "none": a default parameter would replace undefined.
const serve = (p: string, c: string | null = cookie(), secret: string | null = SECRET) =>
  servePreview(get(p, c ?? undefined), { root: ROOT, secret: secret ?? undefined, now: NOW });

describe("serving the export", () => {
  it("serves the sample site's home at /preview/ (its logo links there); /preview gets its slash", async () => {
    const res = await serve("/preview/");
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("<html>sample home</html>");
    expect((await serve("/preview")).headers.get("location")).toBe("/preview/");
  });

  it("without a cookie, the bare /preview/ opens the guide after the door", async () => {
    expect((await serve("/preview/", null)).headers.get("location")).toBe("/preview-access/?next=%2Fpreview%2Fpreview%2F");
  });

  it("lets the email previews load the emails' Google fonts", async () => {
    const csp = (await serve("/preview/preview/")).headers.get("content-security-policy")!;
    expect(csp).toContain("style-src 'self' 'unsafe-inline' https://fonts.googleapis.com");
    expect(csp).toContain("font-src 'self' data: https://fonts.gstatic.com");
  });

  it("serves a page's index.html with the preview's own headers", async () => {
    const res = await serve("/preview/preview/");
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("<html>preview guide</html>");
    expect(res.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(res.headers.get("x-frame-options")).toBe("SAMEORIGIN");
    const csp = res.headers.get("content-security-policy")!;
    expect(csp).toMatch(/script-src 'self'(;|$| )/);
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    expect(csp).toContain("frame-ancestors 'self'");
    expect(csp).toContain("connect-src 'self'");
  });

  it("allows exactly the page's own inline scripts, by hash (the export has no nonce)", async () => {
    const { createHash } = await import("node:crypto");
    const h = (t: string) => `'sha256-${createHash("sha256").update(t).digest("base64")}'`;
    const csp = (await serve("/preview/scripted/")).headers.get("content-security-policy")!;
    const scriptSrc = csp.split("; ").find((d) => d.startsWith("script-src "))!;
    expect(scriptSrc).toBe(`script-src 'self' ${h("self.__next_f.push([1])")} ${h('document.documentElement.dataset.theme="dark"')}`);
  });

  it("serves nested pages, static chunks (long cache) and files with their types", async () => {
    expect(await (await serve("/preview/emails/invite/")).text()).toBe("<html>invite email</html>");
    const js = await serve("/preview/_next/static/chunks/app.js");
    expect(js.headers.get("content-type")).toBe("text/javascript; charset=utf-8");
    // private: a shared cache must never hand a gated file to someone without the cookie.
    expect(js.headers.get("cache-control")).toBe("private, max-age=31536000, immutable");
    expect((await serve("/preview/thumbs/home.jpg")).headers.get("content-type")).toBe("image/jpeg");
    expect((await serve("/preview/index.txt")).headers.get("content-type")).toBe("text/plain; charset=utf-8");
  });

  it("answers HEAD without a body", async () => {
    const res = await servePreview(get("/preview/preview/", cookie(), "HEAD"), { root: ROOT, secret: SECRET, now: NOW });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("");
  });

  it("refuses other methods", async () => {
    expect((await servePreview(get("/preview/preview/", cookie(), "POST"), { root: ROOT, secret: SECRET, now: NOW })).status).toBe(405);
  });

  it("answers a missing page with the export's 404 page", async () => {
    const res = await serve("/preview/nope/");
    expect(res.status).toBe(404);
    expect(await res.text()).toBe("<html>sample not found</html>");
  });

  // A URL already normalises "..", so these reach resolveInside as written only when called directly.
  it.each([
    "/preview/../outside.txt", "/preview/%2e%2e/outside.txt", "/preview/emails/%2F..%2F..%2Foutside.txt", "/preview/..%5Coutside.txt",
    "/preview/a%00b", "/preview/%zz", "/previewx/", "/preview/a\\..\\b",
  ])("resolveInside refuses %s", (p) => {
    expect(resolveInside(ROOT, p)).toBeNull();
  });

  it("resolveInside keeps plain paths inside the export", () => {
    expect(resolveInside(ROOT, "/preview/emails/invite/")).toBe(path.join(ROOT, "emails/invite"));
  });

  it.each(["/preview/linked.txt", "/preview/linked-dir/outside.txt"])("never follows a link out of the export: %s → 404", async (p) => {
    const res = await serve(p);
    expect(res.status).toBe(404);
    expect(await res.text()).not.toContain("must never be served");
  });

  it.each([
    "/preview/../outside.txt",
    "/preview/%2e%2e/outside.txt",
    "/preview/%2E%2E/outside.txt",
    "/preview/emails%2F..%2F..%2Foutside.txt",
    "/preview/..%5Coutside.txt",
    "/preview/thumbs/home.jpg%00.html",
    "/preview/%zz/",
    "/previewx/",
  ])("never leaves the export: %s → 404", async (p) => {
    const res = await serve(p);
    expect(res.status).toBe(404);
    expect(await res.text()).not.toContain("must never be served");
  });
});

describe("access", () => {
  it.each([
    ["no cookie", null],
    ["expired", cookie(NOW - 1)],
    ["another secret", cookie(NOW + HOUR, "q".repeat(64))],
    ["tampered", cookie().replace(/=(\d+)\./, (_, d) => `=${Number(d) + 1}.`)],
    ["garbage", `${PREVIEW_COOKIE}=x.y.z`],
  ])("%s → the access page, with where to come back", async (_, c) => {
    const res = await serve("/preview/emails/invite/", c);
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/preview-access/?next=%2Fpreview%2Femails%2Finvite%2F");
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("without the signing secret, fails closed with 503", async () => {
    expect((await serve("/preview/preview/", cookie(), null)).status).toBe(503);
  });
});

describe("granting access", () => {
  const me = (isSuperAdmin: boolean): Me => ({ user: { id: "u1", email: "o@example.com" }, roleKeys: [], isSuperAdmin });
  const cos = (answer: Me | Error) => ({ me: async () => { if (answer instanceof Error) throw answer; return answer; } });
  const post = (headers: Record<string, string> = { authorization: "Bearer tok_0123456789", "content-type": "application/json" }, method = "POST") =>
    new Request("https://web.example/api/preview/grant/", { method, headers, body: method === "POST" ? "{}" : undefined });

  it("a super admin gets a 1-hour cookie scoped to /preview", async () => {
    const res = await grantPreview(post(), { secret: SECRET, cos: cos(me(true)), now: NOW });
    expect(res.status).toBe(204);
    const set = res.headers.get("set-cookie")!;
    for (const flag of ["HttpOnly", "Secure", "SameSite=Lax", "Path=/preview", "Max-Age=3600"]) expect(set).toContain(flag);
    const value = set.split(";")[0]!;
    expect((await serve("/preview/preview/", value)).status).toBe(200);
    expect((await servePreview(get("/preview/preview/", value), { root: ROOT, secret: SECRET, now: NOW + HOUR + 1 })).status).toBe(302);
  });

  it("a cookie signed for another site (test's, on production) doesn't open the preview", async () => {
    const other = `${PREVIEW_COOKIE}=${previewCookieValue(SECRET, "u1", NOW + HOUR, "https://web-test.example")}`;
    expect((await serve("/preview/preview/", other)).status).toBe(302);
  });

  it("reads Clerk's __session cookie when there is no header", async () => {
    const res = await grantPreview(post({ cookie: "__session=tok_0123456789", "content-type": "application/json" }), { secret: SECRET, cos: cos(me(true)), now: NOW });
    expect(res.status).toBe(204);
  });

  it("signed out: 401", async () => {
    expect((await grantPreview(post({ "content-type": "application/json" }), { secret: SECRET, cos: cos(me(true)), now: NOW })).status).toBe(401);
  });

  it("not a super admin: 404, no cookie", async () => {
    const res = await grantPreview(post(), { secret: SECRET, cos: cos(me(false)), now: NOW });
    expect(res.status).toBe(404);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("a token Company OS refuses: 401; Company OS down: 503", async () => {
    expect((await grantPreview(post(), { secret: SECRET, cos: cos(new CompanyOsError(401, "unauthorized")), now: NOW })).status).toBe(401);
    expect((await grantPreview(post(), { secret: SECRET, cos: cos(new CompanyOsError(502, "unavailable")), now: NOW })).status).toBe(503);
  });

  it("only POST with JSON (a plain cross-site form can't send it); no secret: 503", async () => {
    expect((await grantPreview(post(undefined, "GET"), { secret: SECRET, cos: cos(me(true)), now: NOW })).status).toBe(405);
    expect((await grantPreview(post({ authorization: "Bearer tok_0123456789", "content-type": "text/plain" }), { secret: SECRET, cos: cos(me(true)), now: NOW })).status).toBe(415);
    expect((await grantPreview(post(), { secret: undefined, cos: cos(me(true)), now: NOW })).status).toBe(503);
  });
});
