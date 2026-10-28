// Social share images: a 1200×630 card for every page in lib/og-pages.json, so a pasted link previews the page itself
// (WhatsApp, iMessage, Slack, email). Each card is the page's real screenshot (1440×900, Night) in a branded frame
// with its title. Run after `pnpm build` (uses out/ and the preinstalled Chromium):
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
const b64 = (f, type) => `data:${type};base64,${fs.readFileSync(path.join(ROOT, f)).toString("base64")}`;
const sora = b64("public/artifacts/showcase/fonts/Sora-Variable.woff2", "font/woff2");
const figtree = b64("public/artifacts/showcase/fonts/Figtree-Variable.woff2", "font/woff2");
const logo = b64("public/email/between-gigs-wide-on-dark.png", "image/png");
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// The frame: forest ground with a faint dot grid and a mint horizon, the title on top, the page as a window below.
const frame = (shot, p) => `<!doctype html><html><head><style>
@font-face{font-family:Sora;src:url(${sora}) format("woff2");font-weight:400 700}
@font-face{font-family:Figtree;src:url(${figtree}) format("woff2");font-weight:400 700}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;overflow:hidden;background:#071a11;font-family:Figtree,sans-serif;color:#eaf4ee;position:relative}
body:before{content:"";position:absolute;inset:0;background-image:radial-gradient(rgba(234,244,238,.07) 1px,transparent 1.4px);background-size:14px 14px}
.glow{position:absolute;left:-10%;right:-10%;top:400px;height:420px;border-radius:50%;border-top:2px solid rgba(61,235,160,.55);box-shadow:0 -30px 90px rgba(31,220,140,.22)}
header{position:absolute;left:56px;right:56px;top:40px;display:flex;align-items:flex-end;justify-content:space-between;gap:32px}
.eyebrow{font:700 14px/1 Figtree;letter-spacing:.16em;text-transform:uppercase;color:#3deba0}
h1{font:600 ${p.title.length > 34 ? 40 : 46}px/1.08 Sora;letter-spacing:-.02em;margin-top:12px;max-width:820px}
.logo{height:34px;flex:none;margin-bottom:6px}
.win{position:absolute;left:56px;right:56px;top:${p.title.length > 34 ? 160 : 166}px;border-radius:18px;overflow:hidden;border:1px solid rgba(234,244,238,.16);box-shadow:0 30px 80px rgba(0,0,0,.6);background:#0e2419}
.bar{height:34px;display:flex;align-items:center;gap:8px;padding:0 14px;background:#143024;border-bottom:1px solid rgba(234,244,238,.1)}
.bar i{width:11px;height:11px;border-radius:50%;background:rgba(234,244,238,.22)}
.url{margin-left:14px;font:500 14px/1 Figtree;color:#a9c2b3;background:#0b2016;border-radius:8px;padding:6px 12px}
.win img{display:block;width:100%}
</style></head><body><span class="glow"></span>
<header><div><p class="eyebrow">Between Gigs 2.0 · Preview</p><h1>${esc(p.title)}</h1></div><img class="logo" src="${logo}" alt=""></header>
<div class="win"><div class="bar"><i></i><i></i><i></i><span class="url">between-gigs.github.io/between-gig-2.0${esc(p.path.split("?")[0])}</span></div><img src="${shot}" alt=""></div>
</body></html>`;

if (!fs.existsSync(path.join(ROOT, "out/index.html"))) { console.error("No build in out/. Run pnpm build first."); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });
const libs = process.env.OG_LIBS;
const { server, url } = await serve(path.join(ROOT, "out"));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium", args: ["--use-gl=swiftshader", "--ignore-gpu-blocklist"] });
const setupFor = (as) => !as ? null : as === "reset" ? "window.bgSample.reset()"
  : `window.bgSample.reset().then(() => window.bgSample.signInAs(${JSON.stringify(as.split(":")[0])}, ${JSON.stringify(as.split(":")[1])}))`;
try {
  for (const [name, p] of Object.entries(pages).filter(([n]) => !only.length || only.includes(n))) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "dark", reducedMotion: "reduce" });
    await context.addInitScript(() => { try { localStorage.setItem("bg-theme", "dark"); localStorage.setItem("studio-tip-dismissed", "1"); } catch { /* ignore */ } });
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
    const shot = `data:image/jpeg;base64,${(await page.screenshot({ type: "jpeg", quality: 82 })).toString("base64")}`;
    const card = await context.newPage();
    await card.setViewportSize({ width: 1200, height: 630 });
    await card.setContent(frame(shot, p), { waitUntil: "load" });
    await card.evaluate(() => document.fonts.ready);
    await card.screenshot({ path: path.join(OUT, `${name}.jpg`), type: "jpeg", quality: 80 });
    await context.close();
    process.stdout.write(`og ${name} ✓\n`);
  }
} finally {
  await browser.close();
  server.close();
}
