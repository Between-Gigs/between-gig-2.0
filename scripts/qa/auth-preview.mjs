// Honest sample authentication previews. Read real-entry hrefs only; never follow them or use real credentials.
import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright-core";
import { serve } from "./serve.mjs";
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const { server, url } = await serve("out", { base });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium" });
fs.mkdirSync("deliverables/auth-preview", { recursive: true });
try {
  for (const look of ["editorial", "friendly", "classic", "swiss", "call-sheet", "modern"]) for (const width of [390, 1440]) for (const theme of ["light", "dark"]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme, reducedMotion: "reduce" });
    await context.addInitScript(({ look, theme }) => { localStorage.setItem("bg2-site-look-v2", look); localStorage.setItem("bg-theme", theme); }, { look, theme });
    const origin = new URL(url).origin; const requests = [];
    await context.route("**/*", route => { requests.push(route.request().url()); return new URL(route.request().url()).origin === origin ? route.continue() : route.abort(); });
    const page = await context.newPage();
    for (const route of ["join", "login"]) {
      await page.goto(`${url}/${route}/`);
      await page.getByText("Sample account preview", { exact: true }).waitFor();
      assert.equal(await page.getByText("These forms use fictional profiles stored in this browser. They do not sign in to a real account or run Google authentication.", { exact: true }).count(), 1);
      for (const [name, path] of [["Real account sign up", "join"], ["Real account log in", "login"]]) {
        const link = page.getByRole("link", { name, exact: true });
        assert.equal(await link.getAttribute("href"), `${base === "/hub" ? "" : "https://test.between-gigs.com"}/${path}/`);
        assert.equal(await link.getAttribute("target"), "_blank");
        assert.match(await link.getAttribute("rel"), /noopener/);
        await link.focus(); assert.equal(await link.evaluate(el => el === document.activeElement), true);
        assert.ok((await link.boundingBox()).height >= 44);
      }
      assert.equal(await page.getByRole("button", { name: /^Continue with Google/ }).count(), 0, "no fake functional Google control");
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.addScriptTag({ content: fs.readFileSync("node_modules/axe-core/axe.min.js", "utf8") });
      const violations = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } })).violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })));
      assert.deepEqual(violations, []);
      if (look === "editorial") await page.screenshot({ path: `deliverables/auth-preview/${route}-${width}-${theme}.png`, fullPage: true });
    }
    assert.ok(!requests.some(request => /clerk\.(?:accounts|com|dev)/.test(request)), "sample preview never loads Clerk");
    await context.close();
    console.log(`PASS: truthful auth preview ${look}/${width}/${theme}: explicit sample behavior, real-entry links, no fake Google or Clerk load, keyboard/axe/fit`);
  }
  const guide = await browser.newPage(); await guide.goto(`${url}/hub/`);
  const journey = guide.getByRole("region", { name: "The Gigster journey", exact: true });
  await journey.getByText("Sample account preview", { exact: true }).waitFor();
  const realJoin = journey.getByRole("link", { name: "Real account sign up", exact: true });
  assert.equal(await realJoin.getAttribute("href"), `${base === "/hub" ? "" : "https://test.between-gigs.com"}/join/`);
  await realJoin.focus(); assert.equal(await realJoin.evaluate(el => el === document.activeElement), true);
  await guide.close(); console.log("PASS: parent Hub guide exposes accessible real-account links outside inert frames.");
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
