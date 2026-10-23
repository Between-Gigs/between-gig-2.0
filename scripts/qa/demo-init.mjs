// Clerk-enabled Pages build with the SDK blocked: no active signup controls may appear before SDK readiness.
import assert from "node:assert/strict";
import { chromium } from "playwright-core";
import { serve } from "./serve.mjs";
const { server, url } = await serve("out", { base: "/between-gig-2.0" });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium" });
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    await context.route(/clerk\.(accounts\.dev|com)/, (route) => route.abort());
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    await page.goto(`${url}/demo/`);
    await page.getByText("Signup setup couldn't finish", { exact: true }).waitFor();
    assert.equal(await page.getByRole("link", { name: "Sign up without an invite", exact: true }).count(), 0);
    assert.equal(await page.getByRole("button", { name: /Preparing signup/ }).isDisabled(), true);
    assert.equal(await page.getByRole("button", { name: /Send the invite/ }).isDisabled(), true);
    assert.equal(await page.evaluate(() => localStorage.getItem("bg2-demo-flow")), null);
    await page.getByRole("button", { name: "Retry setup", exact: true }).waitFor();
    await context.close();
    console.log(`Unavailable SDK passed at ${width}px: signup stays disabled, no demo identity initialized, retry is available.`);
  }
} finally {
  await browser.close();
  server.close();
}
