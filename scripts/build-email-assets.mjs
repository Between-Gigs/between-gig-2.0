// Renders the approved logo SVGs to PNGs for email (Gmail and Outlook don't show SVG). Output goes to
// public/email/, which production serves at https://between-gigs.com/email/. Uses the preinstalled
// Chromium; set CHROMIUM_PATH to override.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(ROOT, "public/email");
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ deviceScaleFactor: 2 });
for (const theme of ["light", "dark"]) {
  const svg = fs.readFileSync(path.join(ROOT, `packages/design-system/logos/between-gigs-wide-on-${theme}.svg`), "utf8");
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg.replace("<svg", '<svg id="logo" width="136" height="42"')}</body></html>`);
  await page.locator("#logo").screenshot({ path: path.join(out, `between-gigs-wide-on-${theme}.png`), omitBackground: true });
}
await browser.close();
console.log("Wrote public/email/between-gigs-wide-on-{light,dark}.png");
