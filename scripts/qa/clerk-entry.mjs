// Run after a Clerk-enabled Pages build. Deterministically block Clerk network access:
// this verifies the app's password handoff and failure recovery, not Clerk authentication.
import assert from "node:assert/strict";
import { chromium } from "playwright-core";
import { serve } from "./serve.mjs";
const base = "/between-gig-2.0";
const { server, url } = await serve("out", { base });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium" });
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    // Prevent real sessions, account creation or email; all Clerk requests fail locally.
    await context.route(/clerk\.(accounts\.dev|com)/, (route) => route.abort());
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    await page.goto(`${url}/join/`);
    await page.getByLabel("Email", { exact: true }).fill("password-check@example.com");
    await page.getByLabel("Full name").fill("Password Check");
    await page.getByRole("button", { name: "Continue to password", exact: true }).click();
    await page.getByText("Agree to the Terms of Use and Privacy Policy to continue.", { exact: true }).waitFor();
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Continue to password", exact: true }).click();
    await page.getByRole("heading", { name: "Create your password", exact: true }).waitFor();
    await page.getByText(/If Clerk asks for a 6-digit code afterward/).waitFor();
    await page.getByText("Sign-in couldn't load", { exact: true }).waitFor();
    assert.equal(await page.locator("input[type=password]").count(), 0); // never pretend an unavailable SDK is working
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.getByRole("button", { name: "Back", exact: true }).click();
    assert.equal(await page.getByLabel("Email", { exact: true }).inputValue(), "password-check@example.com");
    await page.goto(`${url}/login/?notInvited=old@example.com`);
    await page.locator("p:visible").filter({ hasText: "Use the email and password you created" }).first().waitFor();
    assert.equal(await page.getByText("That email isn't on the call sheet yet", { exact: true }).count(), 0);
    await page.getByRole("link", { name: "Create an account", exact: true }).click();
    await page.getByRole("button", { name: "Continue to password", exact: true }).waitFor();
    assert.equal(new URL(page.url()).pathname, `${base}/join/`);
    await context.close();
    console.log(`Clerk entry passed at ${width}px: terms, password handoff, verification explanation, offline recovery, Pages routing.`);
  }
} finally {
  await browser.close();
  server.close();
}
