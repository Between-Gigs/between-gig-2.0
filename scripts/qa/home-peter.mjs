// Isolated visual/interaction check. No real accounts or submissions.
import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright-core";
import { serve } from "./serve.mjs";
const { server, url: base } = await serve("out");
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium" });
fs.mkdirSync("deliverables/home-peter", { recursive: true });
try {
  for (const width of [280, 320, 390, 640, 768, 1024, 1440]) {
    for (const theme of ["light", "dark"]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "no-preference" });
      await context.addInitScript(t => localStorage.setItem("bg-theme", t), theme);
      const page = await context.newPage();
      await page.goto(base + "/preview/drafts/home-peter/");
      await page.waitForLoadState("networkidle");
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.locator('meta[name="robots"]').getAttribute("content"), "noindex, nofollow");
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${width} overflow`);
      for (const text of ["Coming soon", "It’s free to join!", "Put your behind-the-scenes skills to work beyond the set.", "Let us connect you to", "businesses and individuals who need your expertise."]) {
        assert.equal(await page.getByText(text, { exact: true }).count(), 1);
      }
      const title = await page.locator("[data-preview-title]").boundingBox();
      assert.ok(Math.abs(title.x + title.width / 2 - width / 2) < 2, "header title centered");
      assert.ok(title.x >= 0 && title.x + title.width <= width, "full header title stays in viewport");
      assert.ok(await page.locator("[data-preview-title]").evaluate(el => el.scrollWidth <= el.clientWidth + 1), "title not clipped");
      const connection = page.locator("[data-preview-connection]");
      assert.equal(await connection.locator('[aria-hidden="true"]').count(), 2);
      const lines = connection.locator("p");
      const firstLine = await lines.nth(0).boundingBox();
      const secondLine = await lines.nth(1).boundingBox();
      assert.ok(secondLine.y >= firstLine.y + firstLine.height, "connection wording stays on separate rows");
      const header = page.locator("header");
      assert.equal(await header.getByRole("link", { name: "Between Gigs home" }).getAttribute("href"), "/");
      const main = page.locator("main");
      const button = main.getByRole("link", { name: "Create your Gigster profile" });
      assert.equal(await button.getAttribute("href"), "/join/");
      const box = await button.boundingBox();
      assert.ok(box.height >= 44 && box.x >= 0 && box.x + box.width <= width, "CTA fits and has touch target");
      await page.screenshot({ path: `deliverables/home-peter/${width}-${theme}.png`, fullPage: true });
      assert.equal(await header.getByRole("link", { name: "Join / Sign in" }).getAttribute("href"), "/join/");
      await header.getByRole("switch", { name: "Night mode" }).click();
      assert.equal(await page.locator("html").getAttribute("data-theme"), theme === "light" ? "dark" : "light");
      await header.getByRole("switch", { name: "Night mode" }).click();
      assert.equal(await page.locator("html").getAttribute("data-theme"), theme);
      await page.goto(base + "/");
      assert.equal(await page.getByRole("heading", { name: "Los Angeles Call Sheet" }).count(), 1);
      assert.equal(await page.locator("[data-preview-title]").count(), 0);
      assert.equal(await page.getByText("Founding Gigsters are joining now.", { exact: false }).count(), 1);
      await context.close();
    }
  }
  console.log("PASS: disposable homepage preview, copy, centering, no overflow, CTA, theme toggle, current-home regression at 7 widths × 2 modes");
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
