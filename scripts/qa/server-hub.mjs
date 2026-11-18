// Browser check across the live server / public sample-build boundary, with the test gate enabled.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { chromium } from "playwright-core";

const port = await new Promise(resolve => { const server = net.createServer().listen(0, "127.0.0.1", () => { const port = server.address().port; server.close(() => resolve(port)); }); });
const base = "http://127.0.0.1:" + port;
const env = { ...process.env, PORT: String(port), HOSTNAME: "127.0.0.1", NODE_ENV: "production", APP_URL: base, TEST_GATE_PASSPHRASE: "isolated browser test passphrase", COOKIE_SIGNING_SECRET: "isolated-browser-test-secret-0123456789" };
const server = spawn(process.execPath, ["server.js"], { cwd: ".next/standalone", env, stdio: "ignore" });
let browser;
try {
  const started = Date.now();
  for (;;) { try { await fetch(base + "/healthz/"); break; } catch { if (Date.now() - started > 30000) throw new Error("Standalone server did not start"); await new Promise(resolve => setTimeout(resolve, 200)); } }
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? (process.platform === "win32" ? "C:/Program Files/Google/Chrome/Application/chrome.exe" : "/usr/bin/google-chrome") });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
  await page.addInitScript(() => localStorage.setItem("bg-theme", "dark"));
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
  // Template previews remain public samples; the diagnostic sends only from the protected live owner area.
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
  assert.deepEqual(errors, []);
  console.log("PASS: server Hub public without cookies; canonical aliases, client navigation, refresh and 390/420px; real staff routes remain protected.");
} finally { await browser?.close(); server.kill(); }
