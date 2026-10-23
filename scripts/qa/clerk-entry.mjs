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
    assert.equal(await page.getByRole("button", { name: "Back", exact: true }).count(), 0); // no Back on the password step
    // A cold hash callback must mount native SignUp even when the initial details
    // form no longer exists. This checks the app boundary with SDK network blocked,
    // not whether Clerk accepts an actual OAuth callback or verification code.
    for (const hash of ["#/sso-callback", "#/verify-email-address", "#verify-email-address"]) {
      await page.goto("about:blank");
      await page.goto(`${url}/join/${hash}`);
      await page.getByRole("heading", { name: "Continue your signup", exact: true }).waitFor();
      assert.equal(await page.getByRole("button", { name: "Continue to password", exact: true }).count(), 0);
      await page.reload();
      await page.getByRole("heading", { name: "Continue your signup", exact: true }).waitFor();
    }
    await page.goto(`${url}/login/?__clerk_status=client_mismatch&notInvited=old@example.com`);
    await page.getByText("This sign-in link is out of date", { exact: true }).waitFor();
    assert.equal(await page.getByRole("link", { name: "Reload sign-in" }).getAttribute("href"), `${base}/login/`);
    await page.locator("p:visible").filter({ hasText: "Use the email and password you created" }).first().waitFor();
    assert.equal(await page.getByText("That email isn't on the call sheet yet", { exact: true }).count(), 0);
    assert.equal(await page.getByText("Need to create a password?", { exact: false }).count(), 0);
    await page.locator("p:visible").filter({ hasText: "Already joined with Google or an email code? Use that same sign-in method" }).first().waitFor();
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
