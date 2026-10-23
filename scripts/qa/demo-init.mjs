// Clerk-enabled Pages build: a slow previous-session cleanup must finish before the direct signup link exists.
import assert from "node:assert/strict";
import { chromium } from "playwright-core";
import { serve } from "./serve.mjs";
const { server, url } = await serve("out", { base: "/between-gig-2.0" });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium" });
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    await context.route(/clerk\.(accounts\.dev|com)/, (route) => route.abort());
    await context.addInitScript(() => {
      window.Clerk = {
        user: sessionStorage.getItem("qa-demo-signout") ? null : { id: "previous-test-identity" },
        signOut: () => new Promise((resolve) => {
          window.releaseDemoSignOut = () => {
            window.Clerk.user = null;
            sessionStorage.setItem("qa-demo-signout", "done");
            resolve();
          };
        }),
      };
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    await page.goto(`${url}/preview/`);
    await page.waitForFunction(() => !!window.bgSample);
    await page.evaluate(() => window.bgSample.signInAs("owner"));
    await page.goto(`${url}/demo/`);
    await page.waitForFunction(() => typeof window.releaseDemoSignOut === "function");
    assert.equal(await page.getByRole("link", { name: "Sign up without an invite", exact: true }).count(), 0);
    assert.equal(await page.getByRole("button", { name: /Preparing signup/ }).isDisabled(), true);
    assert.equal(await page.getByRole("button", { name: /Send the invite/ }).isDisabled(), true);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("bg2-sample-v2")).session.role), "owner");
    await page.evaluate(() => window.releaseDemoSignOut());
    const link = page.getByRole("link", { name: "Sign up without an invite", exact: true });
    await link.waitFor();
    assert.equal(await page.evaluate(() => localStorage.getItem("bg2-demo-flow")), "1");
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("bg2-sample-v2")).session), null);
    assert.equal(await page.evaluate(() => window.Clerk.user), null);
    await link.click();
    await page.getByLabel("Email", { exact: true }).fill("demo-init@example.test");
    await page.getByLabel("Full name").fill("Demo Init");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Continue to password", exact: true }).click();
    await page.getByRole("heading", { name: "Create your password", exact: true }).waitFor();
    await page.getByRole("button", { name: "Skip sign-in and continue", exact: true }).waitFor();
    await context.close();
    console.log(`Demo initialization passed at ${width}px: signup waits for cleanup; demo state and fallback survive navigation.`);
  }
} finally {
  await browser.close();
  server.close();
}
