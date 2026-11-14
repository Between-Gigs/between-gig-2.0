// Isolated browser checks; no real sign-in, account creation, or user data.
import assert from "node:assert/strict";
import { chromium } from "playwright-core";
import { serve } from "./serve.mjs";

const basePath = process.env.QA_BASE_PATH ?? "";
const local = process.env.QA_BASE_URL ? null : await serve(process.env.QA_OUT_DIR ?? "out", { base: basePath });
const base = process.env.QA_BASE_URL ?? local.url;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium" });
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["/", "/professionals/", "/login/", "/join/"]) {
      await page.goto(base + route);
      const header = page.locator("header").first();
      const signIn = header.getByRole("link", { name: "Sign in", exact: true });
      await signIn.waitFor({ state: "visible" });
      assert.equal(await signIn.count(), 1);
      assert.equal(await header.getByRole("navigation", { name: "Main", exact: true }).count(), 0);
      assert.equal(await header.getByRole("button", { name: "Menu", exact: true }).count(), 0);
      assert.ok((await signIn.boundingBox()).height >= 44);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await header.getByRole("link", { name: "Between Gigs home", exact: true }).click();
      await page.waitForURL(base + "/");
      await page.goto(base + route);
      await page.locator("footer").getByRole("link", { name: "Between Gigs home", exact: true }).click();
      await page.waitForURL(base + "/");
      await page.locator("header").first().getByRole("link", { name: "Sign in", exact: true }).click();
      await page.waitForURL(base + "/login/");
      await page.getByRole("link", { name: /Create an account/i }).first().click();
      await page.waitForURL(base + "/join/");
    }
  }
  await context.close();
  console.log("PASS: signed-out navigation, logo home targets, sign-in/create-account access, no overflow at 390/768/1440px.");
} finally {
  await browser.close();
  await new Promise(resolve => local?.server.close(resolve) ?? resolve());
}
