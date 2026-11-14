// Own-profile entry only. Fresh fictional sample contexts; no real identities or backend mutations.
import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright-core";
import { serve } from "./serve.mjs";
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const { server, url } = await serve("out", { base });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium" });
fs.mkdirSync("deliverables/profile-entry", { recursive: true });
try {
  for (const width of [390, 1440]) {
    for (const [id, editor] of [["grace-liu", true], ["ava-sinclair", true], ["elena-petrova", false], ["imani-carter", false], ["hana-kim", false], ["maya", false]]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
      const origin = new URL(url).origin;
      await context.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
      const page = await context.newPage(); await page.goto(`${url}/hub/`);
      await page.waitForFunction(() => !!window.bgSample);
      await page.evaluate(id => window.bgSample.signInAs("gigster", id), id);
      const before = await page.evaluate(() => JSON.parse(localStorage.getItem("bg2-sample-v2")));
      await page.goto(`${url}/profile/`);
      await page.waitForURL(location => location.pathname === `${base}/profile/${editor ? "canvas/" : ""}`);
      if (editor) await page.getByText("How I can help", { exact: false }).first().waitFor();
      else await page.getByRole("link", { name: /Edit profile|Continue your profile|Make the changes/ }).first().waitFor();
      assert.equal(await page.getByRole("heading", { name: "Let's build your profile", exact: true }).count(), 0);
      const after = await page.evaluate(() => JSON.parse(localStorage.getItem("bg2-sample-v2")));
      assert.deepEqual(after.session, before.session, "entry preserves identity and role");
      const status = after.people.find(person => person.id === id).status;
      if (editor) assert.ok(["invited", "registered", "draft"].includes(status), "editor entry never submits or publishes");
      else assert.equal(status, before.people.find(person => person.id === id).status, "existing review/live status is unchanged");
      assert.deepEqual(after.profiles, before.profiles, "submitted/public snapshots are unchanged");
      if (id === "grace-liu" || id === "imani-carter") await page.screenshot({ path: `deliverables/profile-entry/${id}-${width}.png`, fullPage: true });
      await context.close();
    }
  }
  for (const [email, next, expected] of [
    ["grace.liu@example.com", "", "/profile/canvas/"],
    ["grace.liu@example.com", "/privacy/?source=entry#privacy", "/privacy/"],
    ["grace.liu@example.com", "//outside.example/", "/profile/canvas/"],
    ["owners@between-gigs.example", "/profile/", "/owners/"],
  ]) {
    const context = await browser.newContext(); const page = await context.newPage();
    await page.goto(`${url}/login/${next ? `?next=${encodeURIComponent(`${base}${next}`)}` : ""}`);
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByRole("button", { name: "Email me a code", exact: true }).click();
    await page.getByLabel("6-digit code").waitFor();
    const code = await page.evaluate(email => window.bgSample.peekCode(email), email);
    await page.getByLabel("6-digit code").fill(code);
    await page.waitForURL(location => location.pathname === `${base}${expected}`);
    if (next.startsWith("/privacy")) assert.ok(page.url().endsWith("/privacy/?source=entry#privacy"), "explicit safe next including query/hash wins");
    await context.close();
  }
  const context = await browser.newContext(); const page = await context.newPage();
  await page.goto(`${url}/profile/`);
  await page.waitForURL(location => location.pathname === `${base}/login/` && location.searchParams.has("next"));
  await context.close();
  console.log("PASS: new/empty profiles open editor, existing draft/review/live profiles keep status+Edit, identities/snapshots unchanged, safe next and owner/signed-out guards; 390/1440px, fictional data only");
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
