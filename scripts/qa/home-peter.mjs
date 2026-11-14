// Isolated visual/interaction check. No real accounts or submissions.
import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright-core";
import { serve } from "./serve.mjs";
const { server, url: base } = await serve("out");
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium" });
fs.mkdirSync("deliverables/home-peter", { recursive: true });
try {
  for (const width of [320, 390, 640, 768, 1440]) {
    for (const theme of ["light", "dark"]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
      await context.addInitScript(t => localStorage.setItem("bg-theme", t), theme);
      const page = await context.newPage();
      await page.goto(base + "/preview/drafts/home-peter/");
      await page.waitForLoadState("networkidle");
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.locator('meta[name="robots"]').getAttribute("content"), "noindex, nofollow");
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${width} overflow`);
      for (const text of ["Coming soon", "It’s free to join!", "Put your behind-the-scenes skills to work beyond the set.", "Let us connect you to businesses and individuals who need your expertise."]) {
        assert.equal(await page.getByText(text, { exact: true }).count(), 1);
      }
      const title = await page.locator("[data-preview-title]").boundingBox();
      assert.ok(Math.abs(title.x + title.width / 2 - width / 2) < 2, "header title centered");
      const header = page.locator("header");
      assert.equal(await header.getByRole("link", { name: "Between Gigs home" }).getAttribute("href"), "/");
      const main = page.locator("main");
      const button = main.getByRole("link", { name: "Create your Gigster profile" });
      assert.equal(await button.getAttribute("href"), "/join/");
      const box = await button.boundingBox();
      assert.ok(box.height >= 44 && box.x >= 0 && box.x + box.width <= width, "CTA fits and has touch target");
      await page.screenshot({ path: `deliverables/home-peter/${width}-${theme}.png`, fullPage: true });
      await header.getByRole("switch", { name: "Night mode" }).click();
      assert.equal(await page.locator("html").getAttribute("data-theme"), theme === "light" ? "dark" : "light");
      await page.goto(base + "/");
      assert.equal(await page.getByRole("heading", { name: "Los Angeles Call Sheet" }).count(), 1);
      assert.equal(await page.locator("[data-preview-title]").count(), 0);
      assert.equal(await page.getByText("Founding Gigsters are joining now.", { exact: false }).count(), 1);
      await context.close();
    }
  }
  console.log("PASS: disposable homepage preview, copy, centering, no overflow, CTA, theme toggle, current-home regression at 5 widths × 2 modes");
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
