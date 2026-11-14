// Isolated mock-SDK integration test. No production alias, real accounts, email, or provider settings.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { chromium } from "playwright-core";
import { serve } from "./serve.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
// Structural safety checks cover the live InviteJoin branch, which the sample SDK
// integration below does not exercise. They do not prove live server behavior.
const inviteJoin = fs.readFileSync(path.join(root, "components/auth/InviteJoin.tsx"), "utf8");
assert.ok(inviteJoin.indexOf("if (gate === undefined)") < inviteJoin.indexOf("if (resume)"), "wait for live app session before callback resume");
assert.ok(inviteJoin.indexOf("if (gate)") < inviteJoin.indexOf("if (resume)"), "known identity wins over callback widget");
assert.match(inviteJoin, /return ticket \? <Details ticket \/> : <NativeSignup \/>/, "tickets retain pre-widget consent form");
assert.ok(inviteJoin.indexOf("if (!terms)") < inviteJoin.indexOf("if (!finish) { setNext(true)"), "ticket progression follows consent validation");
assert.ok(inviteJoin.indexOf("if (Object.keys(found).length) return") < inviteJoin.indexOf("if (!finish) { setNext(true)"), "invalid consent blocks ticket progression");
console.log("Live InviteJoin structural consent/session checks passed (not a browser or server test).");
if (process.argv.includes("--source-only")) process.exit(0);
const preset = process.env.BG_CONTRACT_DIR;
const isolated = preset ?? fs.mkdtempSync(path.join(path.dirname(root), ".bg-clerk-contract-"));
const basePath = "/between-gig-2.0";
async function build() {
  for (const name of ["app", "components", "content", "emails", "lib", "packages", "public", "scripts", "styles", "package.json", "tsconfig.json", "postcss.config.mjs", "pnpm-lock.yaml"])
    fs.cpSync(path.join(root, name), path.join(isolated, name), { recursive: true });
  fs.symlinkSync(path.join(root, "node_modules"), path.join(isolated, "node_modules"), "dir");
  fs.writeFileSync(path.join(isolated, "next.config.ts"), `import type { NextConfig } from "next";
const config: NextConfig = { output: "export", trailingSlash: true, images: { unoptimized: true }, basePath: ${JSON.stringify(basePath)}, turbopack: { root: ${JSON.stringify(path.dirname(root))}, resolveAlias: { "@clerk/react": ${JSON.stringify("./scripts/qa/fixtures/clerk-mock.tsx")} } } };
export default config;`);
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(root, "node_modules/next/dist/bin/next"), "build", isolated], {
      cwd: isolated, stdio: "inherit", env: { ...process.env, NEXT_PUBLIC_BASE_PATH: basePath, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_Z2xhZC1tb25rZXktNjkwOC5jbGVyay5hY2NvdW50cy5kZXYk" },
    });
    child.on("error", reject);
    child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`Contract build failed (${code})`)));
  });
}
let browser, server;
try {
  if (!preset) await build();
  const hosted = await serve(path.join(isolated, "out"), { base: basePath });
  server = hosted.server;
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium" });
  for (const [index, password] of ["Qa82!xKz", "Qa-longer-password!48"].entries()) {
    const context = await browser.newContext({ viewport: { width: index === 0 ? 390 : 1440, height: 900 }, reducedMotion: "reduce" });
    // The mock lives in the isolated build. Refuse external requests even if the alias were accidentally absent.
    await context.route("**/*", (route) => new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort());
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    const navigations = [];
    page.on("framenavigated", (frame) => { if (frame === page.mainFrame()) navigations.push(new URL(frame.url()).pathname); });
    const email = `new-user-${index}@example.test`;
    await page.goto(`${hosted.url}/join/`);
    await page.getByRole("form", { name: "Mock native Clerk signup" }).waitFor();
    assert.equal(await page.getByRole("checkbox").count(), 0, "native Clerk is the first signup step");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Full name").fill("New Account");
    await page.getByLabel("Password", { exact: true }).fill("seven7!");
    await page.getByRole("button", { name: "Create test account" }).click();
    await page.getByRole("alert").getByText("Password must have at least 8 characters", { exact: true }).waitFor();
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Create test account" }).click();
    await page.getByRole("button", { name: "Verify test email", exact: true }).waitFor();
    assert.equal(await page.evaluate(() => localStorage.getItem("qa-clerk-active")), null, "unverified identity must not become an app session");
    assert.equal(await page.evaluate((email) => JSON.parse(localStorage.getItem("bg2-sample-v2")).people.some((p) => p.email === email), email), false);
    await page.getByRole("button", { name: "Verify test email", exact: true }).click();
    await page.waitForURL(new RegExp(`${basePath}/join/$`));
    await page.getByRole("heading", { name: "Finish your account setup", exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.qaSignedInSignupMounts ?? 0), 0);
    // Identity exists now; app registration must not exist until explicit consent.
    assert.equal(await page.evaluate(() => !!JSON.parse(localStorage.getItem("qa-clerk-active"))), true);
    assert.equal(await page.evaluate((email) => JSON.parse(localStorage.getItem("bg2-sample-v2")).people.some((p) => p.email === email), email), false);
    await page.getByRole("button", { name: "Finish setup", exact: true }).click();
    await page.getByText("Agree to the Terms and Privacy Policy to continue.", { exact: true }).waitFor();
    assert.equal(await page.evaluate((email) => JSON.parse(localStorage.getItem("bg2-sample-v2")).people.some((p) => p.email === email), email), false);
    // A callback reload must preserve the same identity and keep consent unchecked.
    await page.reload();
    await page.getByRole("heading", { name: "Finish your account setup", exact: true }).waitFor();
    assert.equal(await page.getByRole("checkbox").isChecked(), false);
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Finish setup", exact: true }).click();
    await page.waitForURL(new RegExp(`${basePath}/profile/canvas/$`));
    // A new account lands on its own blank profile (Edit on your profile), with the welcome on the page.
    await page.getByRole("heading", { name: /This is your page\./ }).first().waitFor();
    await page.locator("[data-gigster-editor]").first().waitFor();
    await page.waitForTimeout(450); // allow delayed SDK initialization and role effects to settle
    assert.equal(new URL(page.url()).pathname, `${basePath}/profile/canvas/`, "signup callback must reach profile creation without a login bounce");
    assert.equal(navigations.includes(`${basePath}/login/`), false, "role gate must wait for SDK/session initialization");
    const state = await page.evaluate(() => JSON.parse(localStorage.getItem("bg2-sample-v2")));
    assert.equal(state.session.role, "gigster");
    assert.equal(state.session.email, email);
    assert.equal(state.session.via, "clerk");
    assert.equal(state.people.filter((p) => p.email === email).length, 1);
    const personId = state.session.personId;
    // A returning identity must never mount SignUp while the app bridge resolves.
    for (const suffix of ["", "#/sso-callback"]) {
      await page.goto(`${hosted.url}/join/${suffix}`);
      if (suffix) await page.waitForURL(new RegExp(`${basePath}/profile/$`));
      else await page.getByRole("heading", { name: "You're already signed in" }).waitFor();
      assert.equal(await page.evaluate(() => window.qaSignedInSignupMounts ?? 0), 0);
      assert.equal(await page.getByRole("form", { name: "Mock native Clerk signup" }).count(), 0);
    }

    // Native SignIn cannot render for an existing single-session user. Cold /login
    // must route through app state, even with a stale self-returning next URL.
    await page.goto(`${hosted.url}/login/?next=${encodeURIComponent(`${basePath}/login/`)}`);
    await page.waitForURL(new RegExp(`${basePath}/profile/$`));
    await page.getByRole("button", { name: /Account: New Account/ }).waitFor();
    assert.equal(await page.evaluate(() => window.qaSignedInWidgetMounts ?? 0), 0);
    assert.equal(await page.getByRole("form", { name: "Mock native Clerk login" }).count(), 0);
    await page.getByRole("button", { name: /Account: New Account/ }).click();
    await page.getByRole("menuitem", { name: "Log out", exact: true }).click();
    await page.waitForURL((url) => url.pathname === `${basePath}/login/`);
    await page.getByLabel("Login email").fill(email);
    await page.getByLabel("Login password").fill("incorrect-test-password");
    await page.getByRole("button", { name: "Sign in to test account" }).click();
    await page.getByRole("alert").getByText("Incorrect email or password", { exact: true }).waitFor();
    await page.getByLabel("Login password").fill(password);
    await page.getByRole("button", { name: "Sign in to test account" }).click();
    await page.waitForURL(new RegExp(`${basePath}/profile/(edit/)?$`));
    await page.getByRole("button", { name: /Account: New Account/ }).waitFor();
    const returning = await page.evaluate(() => JSON.parse(localStorage.getItem("bg2-sample-v2")));
    assert.equal(returning.session.personId, personId);
    assert.equal(returning.session.role, "gigster");
    assert.equal(returning.people.filter((p) => p.email === email).length, 1);
    await page.goto(`${hosted.url}/owners/`);
    await page.getByText("Owners only", { exact: true }).waitFor();
    const accounts = await page.evaluate(() => JSON.parse(localStorage.getItem("qa-clerk-identities")));
    const googleBefore = accounts.find((user) => user.id === "existing-google-id") ?? { id: "existing-google-id", password: null };
    await page.getByRole("button", { name: /Account: New Account/ }).click();
    await page.getByRole("menuitem", { name: "Log out", exact: true }).click();
    await page.waitForURL((url) => url.pathname === `${basePath}/login/`);
    await page.getByRole("button", { name: "Continue with test Google" }).click();
    await page.waitForURL(new RegExp(`${basePath}/join/$`));
    await page.getByRole("heading", { name: "Finish your account setup", exact: true }).waitFor();
    // Existing identity without app consent must leave login for setup, without
    // mounting the widget and competing with Clerk's automatic redirect.
    await page.goto(`${hosted.url}/login/?__clerk_status=client_mismatch`);
    await page.waitForURL(new RegExp(`${basePath}/join/$`));
    await page.getByRole("heading", { name: "Finish your account setup", exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.qaSignedInWidgetMounts ?? 0), 0);
    assert.equal(await page.getByLabel("Email", { exact: true }).inputValue(), "existing-google@example.test");
    assert.equal(await page.getByLabel("Email", { exact: true }).isEditable(), false);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("bg2-sample-v2")).people.some((p) => p.email === "existing-google@example.test")), false);
    await page.getByRole("button", { name: "Finish setup", exact: true }).click();
    await page.getByText("Agree to the Terms and Privacy Policy to continue.", { exact: true }).waitFor();
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Finish setup", exact: true }).click();
    await page.waitForURL(new RegExp(`${basePath}/profile/canvas/$`));
    await page.getByRole("button", { name: /Account: Existing Google/ }).waitFor();
    const googleAfter = await page.evaluate(() => ({ active: JSON.parse(localStorage.getItem("qa-clerk-active")), users: JSON.parse(localStorage.getItem("qa-clerk-identities")) }));
    assert.equal(googleAfter.active.id, googleBefore.id);
    assert.equal(googleAfter.active.password, null);
    assert.deepEqual(googleAfter.users.find((user) => user.id === googleBefore.id), googleBefore);
    // A user can decline this browser's first-use setup and switch accounts without creating a person.
    await page.evaluate(() => window.bgSample.reset());
    await page.getByRole("heading", { name: "Finish your account setup", exact: true }).waitFor();
    await page.getByRole("button", { name: "Use a different account", exact: true }).click();
    await page.waitForURL((url) => url.pathname === `${basePath}/login/`);
    assert.equal(await page.evaluate(() => localStorage.getItem("qa-clerk-active")), null);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("bg2-sample-v2")).people.some((p) => p.email === "existing-google@example.test")), false);
    await context.close();
    const social = await browser.newContext();
    await social.route("**/*", (r) => new URL(r.request().url()).hostname === "127.0.0.1" ? r.continue() : r.abort());
    const socialPage = await social.newPage();
    const invite = index === 1 ? "riley-7q2m" : "";
    await socialPage.goto(hosted.url + "/join/" + (invite ? "?invite=" + invite : ""));
    const continueGoogle = socialPage.getByRole("button", { name: "Continue with Google", exact: true });
    await socialPage.evaluate(() => sessionStorage.setItem("qa-google-unavailable", "1"));
    await continueGoogle.click();
    await socialPage.getByRole("alert").filter({ hasText: "Couldn't open Google" }).waitFor();
    await socialPage.evaluate(() => sessionStorage.removeItem("qa-google-unavailable"));
    await continueGoogle.click();
    await socialPage.getByRole("heading", { name: "Finish your account setup" }).waitFor();
    const request = await socialPage.evaluate(() => JSON.parse(sessionStorage.getItem("qa-google-request")));
    assert.equal(request.strategy, "oauth_google");
    assert.equal(request.unsafeMetadata?.inviteToken, invite || undefined);
    assert.equal(request.unsafeMetadata?.acceptedTerms, undefined);
    assert.equal(await socialPage.getByLabel("Email", { exact: true }).inputValue(), "existing-google@example.test");
    await socialPage.getByRole("button", { name: "Finish setup" }).click();
    await socialPage.getByText("Agree to the Terms and Privacy Policy to continue.", { exact: true }).waitFor();
    await socialPage.getByRole("checkbox").check();
    await socialPage.getByRole("button", { name: "Finish setup" }).click();
    await socialPage.waitForURL((u) => u.pathname === basePath + "/profile/canvas/");
    await social.close();
    const ownerContext = await browser.newContext();
    await ownerContext.route("**/*", (route) => new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort());
    await ownerContext.addInitScript(() => localStorage.setItem("qa-clerk-active", JSON.stringify({
      id: "existing-owner-id", fullName: "Existing Owner", primaryEmailAddress: { emailAddress: "owner@example.test" },
      publicMetadata: { role: "owner" }, unsafeMetadata: {}, password: null, provider: "google",
    })));
    const ownerPage = await ownerContext.newPage();
    await ownerPage.goto(`${hosted.url}/login/?next=${encodeURIComponent(`${basePath}/profile/`)}`);
    await ownerPage.waitForURL(new RegExp(`${basePath}/owners/$`));
    assert.equal(await ownerPage.evaluate(() => window.qaSignedInWidgetMounts ?? 0), 0);
    // A preview choice is local to the sample, even when Clerk already has an authenticated owner.
    await ownerPage.goto(`${hosted.url}/preview/profiles/`);
    await ownerPage.getByRole("button", { name: "Edit Simone on the page" }).click();
    await ownerPage.waitForURL(new RegExp(`${basePath}/profile/canvas/$`));
    await ownerPage.getByRole("button", { name: /Account: Simone/ }).waitFor();
    assert.equal(await ownerPage.evaluate(() => JSON.parse(localStorage.getItem("bg2-sample-v2")).session.personId), "simone");
    assert.equal(await ownerPage.evaluate(() => JSON.parse(localStorage.getItem("qa-clerk-active")).id), "existing-owner-id");
    await ownerPage.goto(`${hosted.url}/join/#/sso-callback`);
    await ownerPage.getByRole("heading", { name: "You're already signed in" }).waitFor();
    await ownerPage.getByText(/You're signed in as Simone/).waitFor();
    assert.equal(await ownerPage.evaluate(() => window.qaSignedInSignupMounts ?? 0), 0, "local demo session must not mount Clerk signup or hang on its skeleton");
    assert.equal(await ownerPage.evaluate(() => JSON.parse(localStorage.getItem("bg2-sample-v2")).session.personId), "simone");
    await ownerContext.close();
    console.log(`Mock SDK contract passed: ${password.length}-character signup, cold callback, profile creation, returning login, role gate, existing Google identity.`);
  }
} finally {
  if (browser) await browser.close();
  if (server) server.close();
  if (!preset) fs.rmSync(isolated, { recursive: true, force: true });
}
