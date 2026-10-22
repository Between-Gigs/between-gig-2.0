// Thumbnails for the Preview guide (/preview/): a small screenshot of every page its links open, so the
// links show where they go. Run after `pnpm build` (uses out/ and the preinstalled Chromium):
//   pnpm thumbs
// Writes public/thumbs/<name>.jpg (640×400, dark theme, the site's default). Commit them; re-run when a
// page changes enough that its thumbnail no longer matches.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { serve } from "./qa/serve.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "public/thumbs");
const as = (role, id) => `window.bgSample.reset().then(() => window.bgSample.signInAs(${JSON.stringify(role)}, ${JSON.stringify(id)}))`;

/** name → where it goes, and who to be first. Names match the Preview guide (components/home/Overview.tsx). */
export const thumbs = [
  { name: "home", path: "/" },
  { name: "proposals", path: "/proposals/home/" },
  { name: "professionals", path: "/professionals/" },
  { name: "storyboard", path: "/storyboard/" },
  { name: "crew-call", path: "/crew-call/" },
  { name: "login", path: "/login/", setup: "window.bgSample.reset()" },
  { name: "public-profile", path: "/p/maya/" },
  { name: "emails", path: "/emails/" },
  { name: "invite-email", path: "/emails/invite/" },
  { name: "owner", path: "/owners/", setup: as("owner") },
  { name: "invite", path: "/join/?invite=riley-7q2m", setup: "window.bgSample.reset()" },
  { name: "grace", path: "/profile/", setup: as("gigster", "grace-liu") },
  { name: "elena", path: "/profile/edit/", setup: as("gigster", "elena-petrova") },
  { name: "imani", path: "/profile/", setup: as("gigster", "imani-carter") },
  { name: "hana", path: "/profile/", setup: as("gigster", "hana-kim") },
  { name: "maya", path: "/profile/", setup: as("gigster", "maya") },
];

if (!fs.existsSync(path.join(ROOT, "out/index.html"))) { console.error("No build in out/. Run pnpm build first."); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });
const { server, url } = await serve(path.join(ROOT, "out"));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium" });
try {
  for (const t of thumbs) {
    // 1280×800 at half scale: a 640×400 image of what a laptop shows.
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 0.5, colorScheme: "dark", reducedMotion: "reduce" });
    await context.addInitScript(() => { try { localStorage.setItem("bg-theme", "dark"); } catch { /* ignore */ } });
    const page = await context.newPage();
    if (t.setup) {
      await page.goto(`${url}/`);
      await page.waitForFunction(() => "bgSample" in window);
      await page.evaluate(t.setup);
    }
    await page.goto(`${url}${t.path}`);
    await page.waitForLoadState("networkidle");
    await page.locator("h1").first().waitFor({ timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(OUT, `${t.name}.jpg`), type: "jpeg", quality: 72 });
    await context.close();
    process.stdout.write(`thumb ${t.name} ✓\n`);
  }
} finally {
  await browser.close();
  server.close();
}
