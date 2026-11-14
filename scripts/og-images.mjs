// Social share images: a 1200×630 card for every page in lib/og-pages.json, so a pasted link previews the page itself
// (WhatsApp, iMessage, Slack, email). Each card is a plain, light (Day) screenshot of the page's first screen at a
// 1440px desktop width, scaled to 1200×630: the style the client liked (14 Nov 2026), no frame or overlay.
// Run after `pnpm build` (uses out/ and the preinstalled Chromium):
//   node scripts/og-images.mjs                 every page
//   node scripts/og-images.mjs canvas home     just those
//   OG_LIBS=dir node scripts/og-images.mjs     serve CDN scripts (three.js, React, Mermaid) from dir, offline
// Writes public/og/<name>.jpg. Commit them; re-run when a page changes enough that its card no longer matches.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { serve } from "./qa/serve.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "public/og");
const pages = JSON.parse(fs.readFileSync(path.join(ROOT, "lib/og-pages.json"), "utf8"));
const only = process.argv.slice(2);

if (!fs.existsSync(path.join(ROOT, "out/index.html"))) { console.error("No build in out/. Run pnpm build first."); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });
const libs = process.env.OG_LIBS;
const { server, url } = await serve(path.join(ROOT, "out"));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium", args: ["--use-gl=swiftshader", "--ignore-gpu-blocklist"] });
const setupFor = (as) => !as ? null : as === "reset" ? "window.bgSample.reset()"
  : `window.bgSample.reset().then(() => window.bgSample.signInAs(${JSON.stringify(as.split(":")[0])}, ${JSON.stringify(as.split(":")[1])}))`;
try {
  for (const [name, p] of Object.entries(pages).filter(([n]) => !only.length || only.includes(n))) {
    // 1440×756 CSS pixels at 1200/1440 scale: exactly 1200×630 image pixels, the desktop layout.
    const context = await browser.newContext({ viewport: { width: 1440, height: 756 }, deviceScaleFactor: 1200 / 1440, colorScheme: "light", reducedMotion: "reduce" });
    await context.addInitScript(() => { try { localStorage.setItem("bg-theme", "light"); localStorage.setItem("studio-tip-dismissed", "1"); } catch { /* ignore */ } });
    const page = await context.newPage();
    if (libs) await page.route(/cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net/, (r) => {
      const file = path.join(libs, path.basename(new URL(r.request().url()).pathname));
      return fs.existsSync(file) ? r.fulfill({ path: file, contentType: "text/javascript" }) : r.abort();
    });
    const setup = setupFor(p.as);
    if (setup) {
      await page.goto(`${url}/`);
      await page.waitForFunction(() => "bgSample" in window);
      await page.evaluate(setup);
    }
    await page.goto(`${url}${p.path}`);
    // Pages with live previews (the workspace's frames) may never go quiet; carry on after a while.
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    await page.locator("h1, canvas").first().waitFor({ timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(p.path.includes("build-map") ? 4000 : 1200);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(OUT, `${name}.jpg`), type: "jpeg", quality: 82 });
    await context.close();
    process.stdout.write(`og ${name} ✓\n`);
  }
} finally {
  await browser.close();
  server.close();
}
