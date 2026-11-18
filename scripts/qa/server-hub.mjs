// Browser check across the live server / gated sample-build boundary. Fictional local verifier only.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import net from "node:net";
import http from "node:http";
import path from "node:path";
import { chromium } from "playwright-core";

const port = await new Promise(resolve => { const server = net.createServer().listen(0, "127.0.0.1", () => { const port = server.address().port; server.close(() => resolve(port)); }); });
const base = "http://127.0.0.1:" + port;
const ADMIN="fixture-hub-admin-session",MEMBER="fixture-hub-member-session";
let adminAllowed=true,verifications=0;
const backend=http.createServer((req,res)=>{
  if(req.url!=="/t/fixture-hub/me"||req.method!=="GET"){res.writeHead(404).end();return;}
  verifications++;
  const token=req.headers.authorization;
  if(token==="Bearer fixture-hub-backend-down"){res.writeHead(503,{"content-type":"application/json"}).end(JSON.stringify({error:"unavailable"}));return;}
  if(!["Bearer "+ADMIN,"Bearer "+MEMBER].includes(token)){res.writeHead(401,{"content-type":"application/json"}).end(JSON.stringify({error:"unauthorized"}));return;}
  res.writeHead(200,{"content-type":"application/json"}).end(JSON.stringify({user:{id:"fictional-user",email:"fictional@example.test"},roleKeys:[],isSuperAdmin:token==="Bearer "+ADMIN&&adminAllowed}));
});
await new Promise(resolve=>backend.listen(0,"127.0.0.1",resolve));
const backendBase="http://127.0.0.1:"+backend.address().port;

const env = { ...process.env, PORT: String(port), HOSTNAME: "127.0.0.1", NODE_ENV: "production", APP_URL: base, COMPANY_OS_URL:backendBase,COMPANY_OS_TENANT:"fixture-hub", TEST_GATE_PASSPHRASE: "isolated browser test passphrase", COOKIE_SIGNING_SECRET: "isolated-browser-test-secret-0123456789" };
const server = spawn(process.execPath, ["server.js"], { cwd: ".next/standalone", env, stdio: "ignore" });
let browser;
try {
  const started = Date.now();
  for (;;) { try { await fetch(base + "/healthz/"); break; } catch { if (Date.now() - started > 30000) throw new Error("Standalone server did not start"); await new Promise(resolve => setTimeout(resolve, 200)); } }
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? (process.platform === "win32" ? "C:/Program Files/Google/Chrome/Application/chrome.exe" : "/usr/bin/google-chrome") });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
  await page.addInitScript(() => localStorage.setItem("bg-theme", "dark"));
  for(const route of ["/hub/","/hub/index.html","/hub/emails/","/hub/no-such-page/","/preview/","/preview/preview/"]){
    const r=await fetch(base+route,{redirect:"manual"});assert.equal(r.status,307,route);assert.equal(r.headers.get("location"),"/login/?next=%2Fowners%2Fdeveloper%2F");assert.match(r.headers.get("cache-control"),/no-store/);assert.match(r.headers.get("vary"),/Cookie/);assert.match(r.headers.get("vary"),/Authorization/);
  }
  for(const cookie of ["bg_preview=legacy-signed-or-forged","__session=%zzzzzzzzzz"]){const r=await fetch(base+"/hub/",{redirect:"manual",headers:{cookie}});assert.equal(r.status,307);}
  assert.equal((await fetch(base+"/hub/",{headers:{cookie:"__session="+MEMBER}})).status,403);
  assert.equal((await fetch(base+"/hub/",{headers:{cookie:"__session=fixture-hub-backend-down"}})).status,503);
  assert.equal((await fetch(base+"/hub/thumbs/home.jpg")).status,200,"non-sensitive Hub artwork stays readable");
  await page.context().addCookies([{name:"__session",value:ADMIN,url:base}]);
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  for (const route of ["/hub/", "/preview/", "/preview/preview/"]) {
    const response = await page.goto(base + route);
    assert.equal(response.status(), 200);
    assert.equal(new URL(page.url()).pathname, "/hub/");
    await page.getByRole("heading", { name: "Choose your experience" }).waitFor();
  }
  await page.getByRole("navigation", { name: "Preview workspace", exact: true }).getByRole("link", { name: "Wallpapers", exact: true }).click();
  await page.waitForURL("**/hub/preview/wallpapers/");
  await page.locator("h1").waitFor();
  assert.equal((await page.reload()).status(), 200);
  await page.goto(base + "/hub/");
  if (process.env.QA_SCREENSHOT_DIR) { await fs.mkdir(process.env.QA_SCREENSHOT_DIR, { recursive: true }); await page.evaluate(() => document.fonts.ready); await page.screenshot({ path: path.join(process.env.QA_SCREENSHOT_DIR, "hub.png") }); }
  for (const width of [390, 420]) {
    await page.setViewportSize({ width, height: 900 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth) <= 1, "Hub overflow at " + width);
  }
  // Authenticated Hub content remains fictional; sample diagnostic controls never send.
  assert.equal((await page.goto(base + "/hub/emails/")).status(), 200);
  await page.getByText("Nothing here sends email.", { exact: false }).waitFor();
  await page.getByRole("link", { name: "Diagnostic email", exact: true }).click();
  assert.equal(await page.getByRole("button", { name: "Send one diagnostic", exact: true }).isDisabled(), true, "sample diagnostic cannot send");
  assert.equal((await page.goto(base + "/owners/emails/")).status(), 401);
  assert.equal((await fetch(base + "/api/emails/sendDiagnostic/", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ args: [] }) })).status, 401);
  await page.goto(base + "/hub/emails/");
  assert.equal((await page.reload()).status(), 200);
  assert.equal((await page.goto(base + "/owners/staff/")).status(), 401);
  assert.equal((await fetch(base + "/api/staff/snapshot/", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })).status, 401);
  // Pass the passphrase gate while remaining signed out: now the route itself must reject sending.
  const unlocked = await page.request.post(base + "/test-gate/", { form: { passphrase: env.TEST_GATE_PASSPHRASE, next: "/hub/emails/" }, maxRedirects: 0 });
  assert.equal(unlocked.status(), 303);
  // The production cookie is Secure; forward the locally issued synthetic cookie explicitly on loopback HTTP.
  const gateCookie = unlocked.headers()["set-cookie"]?.split(";")[0];
  assert.ok(gateCookie?.startsWith("bg_test_gate="));
  const anonymousDiagnostic = await fetch(base + "/api/emails/sendDiagnostic/", { method: "POST", headers: { "content-type": "application/json", cookie: gateCookie }, body: JSON.stringify({ args: [] }) });
  assert.equal(anonymousDiagnostic.status, 401);
  assert.deepEqual(await anonymousDiagnostic.json(), { error: "unauthorized" });
  const before=verifications;
  adminAllowed=false;assert.equal((await page.goto(base+"/hub/")).status(),403,"current backend revocation takes effect without expiring a preview cookie");
  adminAllowed=true;assert.equal((await page.goto(base+"/hub/")).status(),200);assert.ok(verifications>=before+2);
  await page.context().clearCookies();
  assert.equal((await page.request.get(base+"/hub/",{maxRedirects:0})).status(),307,"sign-out removes Hub access");
  assert.deepEqual(errors, []);
  console.log("PASS: server Hub verifies current super-admin session; anonymous/legacy cookie redirects, member403, backend503, revocation/sign-out; verified sample navigation/refresh/390–420px; real staff/email routes remain protected. Fictional local verifier only.");
} finally { await browser?.close(); server.kill(); await new Promise(resolve=>backend.close(resolve)); }
