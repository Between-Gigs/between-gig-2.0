// Captures each Live site page's four Studio tools (Design, Code, Data, API) for the 3D build map's stacks: the
// working area only (no tool bar or page list), in Night, at 1440 × 900. Run after `pnpm build` (uses out/):
//   node scripts/studio-stack.mjs [outDir] [page,page,...]
// Writes <page>-<tab>.jpg to outDir (default deliverables/studio-stack, gitignored).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { serve } from "./qa/serve.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.resolve(process.argv[2] ?? path.join(ROOT, "deliverables/studio-stack"));
// The page ids, read from the registry the Live site uses.
const all = [...fs.readFileSync(path.join(ROOT, "lib/studio/app-pages.ts"), "utf8").matchAll(/^\s*\{ id: "([a-z-]+)", lane:/gm)].map((m) => m[1]);
const ids = process.argv[3] ? process.argv[3].split(",") : all;
const tabs = ["design", "code", "data", "api"];

if (!fs.existsSync(path.join(ROOT, "out/index.html"))) { console.error("No build in out/. Run pnpm build first."); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });
const { server, url } = await serve(path.join(ROOT, "out"));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium" });
const problems = [];
for (const id of ids) {
  for (const tab of tabs) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
    await context.addInitScript(() => { try { localStorage.setItem("studio-tip-dismissed", "1"); localStorage.setItem("bg-theme", "dark"); } catch { /* ignore */ } });
    const page = await context.newPage();
    page.on("pageerror", (e) => problems.push(`${id}/${tab}: ${e.message}`));
    await page.goto(`${url}/studio/?site=${id}&tab=${tab}`);
    await page.waitForLoadState("networkidle");
    // Close the page list: the layer shows the tool, not the panel.
    const panel = page.getByRole("button", { name: "Live site (G)", exact: true });
    if (await page.locator("aside[aria-label='Live site']").count()) await panel.click();
    if (tab === "design") {
      await page.locator("[role=tree] [role=treeitem]").first().waitFor({ timeout: 15000 }).catch(() => problems.push(`${id}: no structure`));
      await page.waitForTimeout(1200);
      // Select the first heading, to show its style card.
      const rows = page.locator("[role=tree] [role=treeitem]");
      for (let i = 0, n = await rows.count(); i < n; i++) if (/Heading/.test(await rows.nth(i).innerText())) { await rows.nth(i).click(); break; }
      await page.waitForTimeout(900);
    } else await page.waitForTimeout(tab === "code" ? 1200 : 700);
    await page.locator("main").screenshot({ path: path.join(OUT, `${id}-${tab}.jpg`), type: "jpeg", quality: 78 });
    await context.close();
  }
  console.log(`${id} ✓`);
}
await browser.close();
server.close();
if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
console.log(`${ids.length * tabs.length} captures in ${path.relative(ROOT, OUT) || OUT}`);
