// The homepage hero (the client's logo-led art, 14 Nov 2026) and the signed-out header title, at 7 widths × 2 modes.
// Isolated: no real accounts or submissions. Screenshots go to deliverables/home-hero/.
import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright-core";
import { serve } from "./serve.mjs";
const { server, url: base } = await serve("out");
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium" });
fs.mkdirSync("deliverables/home-hero", { recursive: true });
try {
  for (const width of [280, 320, 390, 640, 768, 1024, 1440]) {
    for (const theme of ["light", "dark"]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      await context.addInitScript(t => localStorage.setItem("bg-theme", t), theme);
      const page = await context.newPage();
      await page.goto(base + "/");
      await page.waitForLoadState("networkidle");
      await page.evaluate(() => document.fonts.ready);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${width} overflow`);
      for (const text of ["Coming soon", "Extraordinary talent. Everyday solutions.", "Put your behind-the-scenes skills to work beyond the set.", "It’s free to join!", "Let us connect you to", "businesses and individuals", "who need your expertise."]) {
        assert.equal(await page.locator("main").getByText(text, { exact: true }).count(), 1, `${width} ${text}`);
      }
      assert.equal(await page.getByRole("heading", { level: 1 }).count(), 1, "one h1 (the logo)");
      // The client's line breaks: three rows, none wrapping, only the last bold.
      const lines = page.locator("[data-home-connection] p");
      assert.equal(await lines.count(), 3);
      let previousBottom = 0;
      for (let i = 0; i < 3; i++) {
        const line = lines.nth(i);
        const box = await line.boundingBox();
        assert.ok(box.y >= previousBottom - 1, "connection rows stack");
        previousBottom = box.y + box.height;
        const { weight, rows } = await line.evaluate(el => {
          const range = document.createRange();
          range.selectNodeContents(el);
          const tops = new Set([...range.getClientRects()].filter(r => r.width > 2 && r.height > 4).map(r => Math.round(r.top)));
          return { weight: Number(getComputedStyle(el).fontWeight), rows: tops.size };
        });
        assert.equal(rows, 1, `${width} connection row ${i + 1} does not wrap`);
        assert.ok(i === 2 ? weight >= 700 : weight < 700, "only the final connection line is bold");
        assert.ok(box.x >= 0 && box.x + box.width <= width, "connection row fits");
      }
      const cta = page.locator("main").getByRole("link", { name: "Create your Gigster profile" });
      assert.equal(await cta.getAttribute("href"), "/join/");
      const box = await cta.boundingBox();
      assert.ok(box.height >= 44 && box.x >= 0 && box.x + box.width <= width, "CTA fits and has a touch target");
      // Signed out: the Los Angeles Call Sheet is centred in the header and fits.
      const header = page.locator("header").first();
      const title = header.locator("[data-header-title]:visible");
      assert.equal(await title.count(), 1);
      const t = await title.boundingBox();
      assert.ok(t.x >= 0 && t.x + t.width <= width, "header title stays in the viewport");
      if (width >= 640) assert.ok(Math.abs(t.x + t.width / 2 - width / 2) < 4, `${width} header title centred`);
      assert.ok((await header.boundingBox()).height <= (width >= 640 ? 81 : 100), "header keeps its height");
      await page.screenshot({ path: `deliverables/home-hero/${width}-${theme}.png`, fullPage: true });
      const toggle = header.getByRole("switch").first();
      await toggle.click();
      const next = theme === "light" ? "dark" : "light";
      await page.waitForFunction(t => document.documentElement.getAttribute("data-theme") === t, next, { timeout: 3000 }).catch(() => {});
      assert.equal(await page.locator("html").getAttribute("data-theme"), next, `${width} ${theme}: header theme toggle switches`);
      await context.close();
    }
  }
  // Signed in: the hero's button leads to the person's own page instead of sign-up, and "free to join" steps aside.
  for (const [role, who, label, href] of [["gigster", "maya", "Go to my profile", "/profile/"], ["owner", undefined, "Go to the dashboard", "/owners/"]]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 900 } });
    const page = await context.newPage();
    await page.goto(base + "/");
    await page.waitForFunction(() => "bgSample" in window);
    await page.evaluate(([r, w]) => window.bgSample.reset().then(() => window.bgSample.signInAs(r, w)), [role, who]);
    await page.goto(base + "/");
    const cta = page.locator("main").getByRole("link", { name: label });
    await cta.waitFor();
    assert.equal(await cta.getAttribute("href"), href, `${role} hero button`);
    assert.equal(await page.locator("main").getByRole("link", { name: "Create your Gigster profile" }).count(), 0);
    assert.equal(await page.locator("main").getByText("It’s free to join!", { exact: true }).count(), 0);
    await context.close();
  }
  console.log("PASS: homepage hero copy, line breaks, CTA, centred header title, theme toggle, no overflow at 7 widths × 2 modes; signed-in Gigster and owner buttons");
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
