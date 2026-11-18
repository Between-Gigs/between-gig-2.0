import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";
import { CompanyOsError, type Me } from "./companyos";
import { PREVIEW_COOKIE, grantPreview, previewCookieValue, resolveInside, servePreview } from "./preview";

// /preview/ on the server builds (owner, 2026-11-02): the sample-data export of the whole site, for super admins only.
const SECRET = "p".repeat(64);
const NOW = Date.UTC(2026, 10, 2, 12);
const HOUR = 3_600_000;

const top = mkdtempSync(path.join(tmpdir(), "bg-preview-"));
const ROOT = path.join(top, "preview-site");
const file = (rel: string, text: string) => { mkdirSync(path.dirname(path.join(ROOT, rel)), { recursive: true }); writeFileSync(path.join(ROOT, rel), text); };
file("index.html", "<html>hub guide</html>");
file("home/index.html", "<html>sample home</html>");
file("preview/index.html", "<html>preview guide</html>");
file("scripted/index.html", '<html><script>self.__next_f.push([1])</script><script src="/preview/_next/static/chunks/app.js"></script><script id="t">document.documentElement.dataset.theme="dark"</script></html>');
file("emails/invite/index.html", "<html>invite email</html>");
file("_next/static/chunks/app.js", "console.log(1)");
file("thumbs/home.jpg", "jpg");
file("index.txt", "rsc");
file("data.json", '{"privateSampleDocument":true}');
symlinkSync(path.join(ROOT,"index.html"),path.join(ROOT,"html-as-image.png"));
file("404.html", "<html>sample not found</html>");
writeFileSync(path.join(top, "outside.txt"), "must never be served");
symlinkSync(path.join(top, "outside.txt"), path.join(ROOT, "linked.txt"));
symlinkSync(top, path.join(ROOT, "linked-dir"));
afterAll(() => rmSync(top, { recursive: true, force: true }));

const cookie = (exp = NOW + HOUR, secret = SECRET, user = "u1") => `${PREVIEW_COOKIE}=${previewCookieValue(secret, user, exp)}`;
const get = (p: string, c?: string, method = "GET") => new Request(`https://web.example${p}`, { method, headers: c ? { cookie: c } : {} });
// null, not undefined, for "none": a default parameter would replace undefined.
const SESSION="__session=verified-admin-session";
const ADMIN:Me={user:{id:"verified-admin",email:"admin@example.test"},roleKeys:[],isSuperAdmin:true};
const backend=(answer:unknown=ADMIN)=>({me:vi.fn(async()=>{if(answer instanceof Error)throw answer;return answer as Me;})});
const serve = (p: string, c: string | null = SESSION, secret: string | null = SECRET) =>
  servePreview(get(p, c ?? undefined), { root: ROOT, secret: secret ?? undefined, now: NOW,cos:backend() });

describe("verified Hub sandbox", () => {
  it("serves the Hub only after current verified super-admin authentication, independently of signing-secret availability", async () => {
    const res = await serve("/hub/", SESSION, null);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("<html>hub guide</html>");
    expect(await (await serve("/hub/home/", SESSION, null)).text()).toBe("<html>sample home</html>");
  });
  it.each([["/hub", "/hub/"], ["/preview/", "/hub/"], ["/preview/preview/", "/hub/"], ["/preview/wallpapers/?download=1", "/hub/preview/wallpapers/?download=1"], ["/preview/preview/cursors/", "/hub/preview/cursors/"], ["/preview/emails/", "/hub/emails/"]])("redirects %s to %s", async (from, target) => {
    const res = await serve(from);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(target);
  });
  it("retains the sandbox framing and hashed inline script policy", async () => {
    const { createHash } = await import("node:crypto");
    const res = await serve("/hub/scripted/");
    const csp = res.headers.get("content-security-policy")!;
    expect(csp).toContain("'sha256-" + createHash("sha256").update("self.__next_f.push([1])").digest("base64") + "'");
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    expect(csp).toContain("frame-ancestors 'self'");
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("https://fonts.gstatic.com");
    expect(res.headers.get("x-frame-options")).toBe("SAMEORIGIN");
    expect(res.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(res.headers.get("cache-control")).toContain("no-store");
    expect(res.headers.get("vary")).toContain("Cookie");
    expect(res.headers.get("vary")).toContain("Authorization");
  });
  it("serves files and Next RSC data with their correct types", async () => {
    expect((await serve("/hub/_next/static/chunks/app.js")).headers.get("content-type")).toBe("text/javascript; charset=utf-8");
    expect((await serve("/hub/thumbs/home.jpg")).headers.get("content-type")).toBe("image/jpeg");
    expect((await serve("/hub/index.txt")).headers.get("content-type")).toBe("text/plain; charset=utf-8");
  });
  it("supports HEAD and refuses writes", async () => {
    const head = await servePreview(get("/hub/", SESSION, "HEAD"), { root: ROOT,cos:backend() });
    expect(head.status).toBe(200); expect(await head.text()).toBe("");
    expect((await servePreview(get("/hub/", undefined, "POST"), { root: ROOT })).status).toBe(405);
  });
  it.each(["/hub/../outside.txt", "/hub/%2e%2e/outside.txt", "/hub/emails/%2F..%2Foutside.txt", "/hub/..%5Coutside.txt", "/hub/a%00b", "/hub/%zz", "/hubx/", "/hub/a\\..\\b"])("rejects unsafe path %s", raw => { expect(resolveInside(ROOT, raw)).toBeNull(); });
  it.each(["/hub/linked.txt", "/hub/linked-dir/outside.txt", "/hub/nope/"])("keeps missing and linked files inside the sandbox: %s", async raw => {
    const res = await serve(raw); expect(res.status).toBe(404); expect(await res.text()).not.toContain("must never be served");
  });
  it.each(["/hub","/hub/","/hub/index.html","/hub/home/","/hub/home/index.html","/hub//home/","/hub/%68ome/","/hub/html-as-image.png","/hub/index.txt","/hub/data.json","/hub/missing/","/preview/","/preview/preview/","/preview/emails/","/hub/hub/","/hub/preview/"])("gates document and alias %s without a real session",async path=>{
    const cos=backend();const res=await servePreview(get(path),{root:ROOT,cos});
    expect(res.status).toBe(307);expect(res.headers.get("location")).toBe("/login/?next=%2Fowners%2Fdeveloper%2F");
    expect(await res.text()).toBe("");expect(cos.me).not.toHaveBeenCalled();
    expect(res.headers.get("cache-control")).toContain("no-store");expect(res.headers.get("vary")).toBe("Cookie, Authorization");
  });
  it("does not treat a legacy signed preview cookie or sample/dev role as authorization",async()=>{
    for(const value of [cookie(),cookie(NOW-HOUR),"bg_role=owner; bg_session=sample-owner",cookie()+"; role=super_admin"]){expect((await serve("/hub/",value)).status).toBe(307);}
  });
  it("uses real Clerk cookies or Bearer tokens only through current backend verification",async()=>{
    for(const headers of [{cookie:SESSION},{authorization:"Bearer verified-header-session"},{authorization:"Bearer header-wins-session",cookie:SESSION}] as Record<string,string>[]){
      const cos=backend();const res=await servePreview(new Request("https://web.example/hub/?embedded=developer",{headers}),{root:ROOT,cos});expect(res.status).toBe(200);
      expect(cos.me).toHaveBeenCalledTimes(1);expect(cos.me).toHaveBeenCalledWith({kind:"session",token:headers.authorization?.slice(7)??"verified-admin-session"});
    }
  });
  it("requires strict verified isSuperAdmin and rechecks every request after role change",async()=>{
    let admin=true;const cos={me:vi.fn(async()=>({...ADMIN,roleKeys:["super_admin"],isSuperAdmin:admin}))};
    expect((await servePreview(get("/hub/",SESSION),{root:ROOT,cos})).status).toBe(200);admin=false;
    const refused=await servePreview(get("/hub/",SESSION),{root:ROOT,cos});expect(refused.status).toBe(403);expect(cos.me).toHaveBeenCalledTimes(2);
    expect(refused.headers.get("cache-control")).toContain("no-store");expect(refused.headers.get("vary")).toBe("Cookie, Authorization");
  });
  it("fails closed on invalid tokens, malformed cookies, backend/configuration failures and invalid identity payloads",async()=>{
    const expired=await servePreview(get("/hub/",SESSION),{root:ROOT,cos:backend(new CompanyOsError(401,"expired"))});expect(expired.status).toBe(307);
    for(const value of ["__session=%zzzzzzzzzz","__session=short"]){const cos=backend();expect((await servePreview(get("/hub/",value),{root:ROOT,cos})).status).toBe(307);expect(cos.me).not.toHaveBeenCalled();}
    for(const answer of [new CompanyOsError(502,"unavailable"),new Error("private upstream details"),null,{isSuperAdmin:true},{...ADMIN,isSuperAdmin:"true"},{...ADMIN,user:null}]){
      const res=await servePreview(get("/hub/",SESSION),{root:ROOT,cos:backend(answer)});expect(res.status).toBe(503);expect(await res.text()).not.toContain("private");expect(res.headers.get("cache-control")).toContain("no-store");
    }
    vi.stubEnv("COMPANY_OS_URL","");try{expect((await servePreview(get("/hub/",SESSION),{root:ROOT})).status).toBe(503);}finally{vi.unstubAllEnvs();}
  });
  it("preserves only nonsensitive static assets without session authority",async()=>{
    for(const path of ["/hub/_next/static/chunks/app.js","/hub/thumbs/home.jpg"]){const cos=backend();expect((await servePreview(get(path),{root:ROOT,cos})).status).toBe(200);expect(cos.me).not.toHaveBeenCalled();}
  });
  it("protects HEAD, fallback HTML and explicit aliases with the same permissions",async()=>{
    for(const path of ["/hub/","/hub/index.html","/hub/nope/","/preview/"]){
      const cos=backend({...ADMIN,isSuperAdmin:false});const res=await servePreview(get(path,SESSION,"HEAD"),{root:ROOT,cos});expect(res.status).toBe(403);expect(await res.text()).toBe("");
    }
    expect((await serve("/hub/nope/")).status).toBe(404);
    expect((await serve("/preview/emails/?embedded=developer&x=1")).headers.get("location")).toBe("/hub/emails/?embedded=developer&x=1");
    expect((await serve("/hub/?next=https://evil.example",null)).headers.get("location")).toBe("/login/?next=%2Fowners%2Fdeveloper%2F");
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
    expect((await serve("/hub/", value)).status).toBe(307);
  });

  it("a cookie signed for another site (test's, on production) doesn't open the preview", async () => {
    const other = `${PREVIEW_COOKIE}=${previewCookieValue(SECRET, "u1", NOW + HOUR, "https://web-test.example")}`;
    // A legacy preview cookie never authorizes a Hub document.
    expect((await serve("/hub/", other)).status).toBe(307);
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
