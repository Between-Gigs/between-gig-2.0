// Client deliverable: every page, light and dark, desktop (1440) and phone (390), titled and grouped.
// Writes JPEGs to deliverables/screenshots/ (gitignored). Run after `pnpm build`.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { serve } from "./serve.mjs";
import { routes } from "./routes.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = path.join(ROOT, "deliverables/screenshots");

/* Client-facing titles, grouped by area, in the order a walkthrough would take. */
const plan = [
  ["01 Home", [["home", "Home - Coming soon (call sheet)"], ["proposal-visitor", "Home proposal - signed out"], ["proposal-gigster", "Home proposal - Gigster"], ["proposal-owner", "Home proposal - owner"]]],
  ["02 Public funnel", [["professionals", "For professionals"], ["call-sheet-dialog", "Get on the call sheet - dialog"], ["storyboard", "Storyboard"], ["storyboard-form", "Storyboard - offer your skills form"]]],
  ["03 Emails", [["emails", "Emails - overview and outbox"], ["email-invite", "Email - invite"], ["email-sign-in-code", "Email - sign-in code"], ["email-profile-submitted", "Email - profile submitted"], ["email-approved", "Email - profile approved"], ["email-changes-requested", "Email - changes requested"], ["email-welcome", "Email - welcome"], ["email-coming-soon", "Email - coming soon"]]],
  ["04 Join and sign in", [["join-valid", "Join from invite"], ["join-used", "Join - invite already used"], ["join-expired", "Join - invite expired"], ["join-unknown", "Join - invite not found"], ["login", "Sign in - email"], ["login-code", "Sign in - 6-digit code"]]],
  ["05 Profile builder", [["builder-start", "Profile builder - about you"], ["builder-where", "Profile builder - where and when"], ["builder-review", "Profile builder - review with owner notes"]]],
  ["06 My profile", [["profile-registered", "My profile - not started"], ["profile-draft", "My profile - draft"], ["profile-submitted", "My profile - submitted for review"], ["profile-changes", "My profile - changes requested"], ["profile-approved", "My profile - approved"]]],
  ["07 Public profile", [["public-maya", "Public profile - with photos"], ["public-monogram", "Public profile - no photos yet"], ["public-not-yet", "Public profile - not public yet"]]],
  ["08 Owners", [["owner-dashboard", "Owner dashboard"], ["owner-review-queue", "Review queue"], ["owner-review", "Review a profile"], ["owner-suggest-edits", "Suggest edits"], ["owner-people", "People - list"], ["owner-people-grid", "People - grid"], ["owner-person", "Person - changes requested"], ["owner-waitlist", "Waitlist and bulk invite"], ["owner-gate", "Owners only (signed out)"]]],
  ["09 Policies", [["privacy", "Privacy policy"], ["terms", "Terms of use"], ["provider-standards", "Provider standards"], ["licensing-insurance", "Licensing and insurance"]]],
];

const byName = Object.fromEntries(routes.map((r) => [r.name, r]));
fs.rmSync(OUT, { recursive: true, force: true });
const { server, url: base } = await serve(path.join(ROOT, "out"));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium" });
let n = 0;
try {
  for (const [group, items] of plan) {
    const dir = path.join(OUT, group);
    fs.mkdirSync(dir, { recursive: true });
    for (const [i, [name, title]] of items.entries()) {
      const route = byName[name];
      if (!route) throw new Error(`No QA route named ${name}`);
      for (const theme of ["light", "dark"]) {
        for (const width of [1440, 390]) {
          const context = await browser.newContext({ viewport: { width, height: width < 600 ? 844 : 900 }, reducedMotion: "reduce", deviceScaleFactor: width < 600 ? 2 : 1 });
          await context.addInitScript((t) => { try { localStorage.setItem("bg-theme", t); } catch { /* ignore */ } }, theme);
          const page = await context.newPage();
          if (route.setup) {
            await page.goto(`${base}/`);
            await page.waitForFunction(() => "bgSample" in window);
            await page.evaluate(route.setup);
          }
          await page.goto(`${base}${route.path}`);
          await page.waitForLoadState("networkidle");
          if (route.ready) await page.locator(route.ready).first().waitFor({ timeout: 8000 });
          await page.evaluate(async () => {
            for (const img of document.querySelectorAll("img[loading=lazy]")) img.loading = "eager";
            await Promise.all(Array.from(document.images).filter((im) => !im.complete).map((im) => new Promise((r) => { im.onload = im.onerror = r; setTimeout(r, 3000); })));
          });
          if (route.act) await route.act(page);
          await page.waitForTimeout(200);
          const file = `${String(i + 1).padStart(2, "0")} ${title} - ${theme} - ${width === 1440 ? "desktop" : "phone"}.jpg`;
          await page.screenshot({ path: path.join(dir, file), fullPage: true, type: "jpeg", quality: 82 });
          await context.close();
          n++;
        }
      }
      process.stdout.write(`${group} / ${title} ✓\n`);
    }
  }
} finally {
  await browser.close();
  server.close();
}
console.log(`\n${n} screenshots in deliverables/screenshots/`);
