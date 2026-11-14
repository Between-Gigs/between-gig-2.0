// Full-page captures for the client deck (scratch, not committed).
import { chromium } from "playwright-core"; import { serve } from "./serve.mjs";
const D = process.argv[2];
const { server, url } = await serve("out"); const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const work = ["devon-2.jpg", "devon-3.jpg", "devon-4.jpg"].map((f) => `public/art/samples/work/${f}`);
const shots = [
  ["home", "/", ["light", "dark"]],
  ["crew-call", "/crew-call/", ["light", "dark"]],
  ["design-system", "/preview/design-system/", ["light"]],
  ["home-gigster", "/", ["light"], "maya"],
  ["editor", "/profile/canvas/", ["light"], "maya", true],
];
for (const [name, route, themes, as, samples] of shots) for (const t of themes) for (const w of [1440, 390]) {
  if (name === "home-gigster" && w === 1440) continue;
  const c = await b.newContext({ viewport: { width: w, height: w === 1440 ? 900 : 844 }, deviceScaleFactor: w === 1440 ? 1 : 2 });
  await c.addInitScript((x) => { localStorage.setItem("bg-theme", x); localStorage.setItem("studio-tip-dismissed", "1"); }, t);
  const p = await c.newPage();
  await p.goto(url + "/"); await p.waitForFunction(() => "bgSample" in window);
  await p.evaluate((who) => window.bgSample.reset().then(() => who ? window.bgSample.signInAs("gigster", who) : null), as ?? null);
  await p.goto(url + route); await p.waitForLoadState("networkidle"); await p.waitForTimeout(600);
  if (samples) { await p.locator("#sec-work input[type=file]").setInputFiles(work); await p.waitForTimeout(1500); }
  await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 100)); } scrollTo(0, 0); });
  await p.waitForTimeout(800);
  await p.screenshot({ path: `${D}/${name}-${t}-${w}.png`, fullPage: true });
  if (samples && w === 1440) { await p.locator("#sec-work").scrollIntoViewIfNeeded(); await p.locator("#sec-work").screenshot({ path: `${D}/editor-samples.png` }); }
  if (name === "home" && w === 390 && t === "light") await p.screenshot({ path: `${D}/hdr-out-390.png`, clip: { x: 0, y: 0, width: 390, height: 420 } });
  if (name === "home-gigster" && w === 390) { await p.locator("header button[aria-label^='Account']").click(); await p.waitForTimeout(400); await p.screenshot({ path: `${D}/hdr-in-390.png`, clip: { x: 0, y: 0, width: 390, height: 420 } }); }
  console.log(name, t, w); await c.close();
}
await b.close(); server.close();
