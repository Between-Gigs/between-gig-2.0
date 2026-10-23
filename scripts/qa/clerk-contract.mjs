// Isolated mock-SDK integration test. No production alias, real accounts, email, or provider settings.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { chromium } from "playwright-core";
import { serve } from "./serve.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const preset = process.env.BG_CONTRACT_DIR;
const isolated = preset ?? fs.mkdtempSync(path.join(path.dirname(root), ".bg-clerk-contract-"));
const basePath = "/between-gig-2.0";
async function build() {
  for (const name of ["app", "components", "content", "emails", "lib", "packages", "public", "scripts", "package.json", "tsconfig.json", "postcss.config.mjs", "pnpm-lock.yaml"])
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
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Full name").fill("New Account");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Continue to password", exact: true }).click();
    await page.getByRole("form", { name: "Mock native Clerk signup" }).waitFor();
    await page.getByLabel("Password", { exact: true }).fill("seven7!");
    await page.getByRole("button", { name: "Create test account" }).click();
    await page.getByRole("alert").getByText("Password must have at least 8 characters", { exact: true }).waitFor();
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Create test account" }).click();
    await page.waitForURL(new RegExp(`${basePath}/profile/edit/$`));
    await page.locator("[data-step=welcome]").waitFor();
    await page.waitForTimeout(450); // allow delayed SDK initialization and role effects to settle
    assert.equal(new URL(page.url()).pathname, `${basePath}/profile/edit/`, "signup callback must reach profile creation without a login bounce");
    assert.equal(navigations.includes(`${basePath}/login/`), false, "role gate must wait for SDK/session initialization");
    const state = await page.evaluate(() => JSON.parse(localStorage.getItem("bg2-sample-v2")));
    assert.equal(state.session.role, "gigster");
    assert.equal(state.session.email, email);
    assert.equal(state.session.via, "clerk");
    assert.equal(state.people.filter((p) => p.email === email).length, 1);
    const personId = state.session.personId;
    await page.getByRole("button", { name: /Account: New Account/ }).click();
    await page.getByRole("menuitem", { name: "Sign out", exact: true }).click();
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
    await page.getByRole("menuitem", { name: "Sign out", exact: true }).click();
    await page.waitForURL((url) => url.pathname === `${basePath}/login/`);
    await page.getByRole("button", { name: "Continue with test Google" }).click();
    await page.waitForURL(new RegExp(`${basePath}/join/$`));
    await page.getByRole("heading", { name: "Finish your account setup", exact: true }).waitFor();
    assert.equal(await page.getByLabel("Email", { exact: true }).inputValue(), "existing-google@example.test");
    assert.equal(await page.getByLabel("Email", { exact: true }).isEditable(), false);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("bg2-sample-v2")).people.some((p) => p.email === "existing-google@example.test")), false);
    await page.getByRole("button", { name: "Finish setup", exact: true }).click();
    await page.getByText("Agree to the Terms of Use and Privacy Policy to continue.", { exact: true }).waitFor();
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Finish setup", exact: true }).click();
    await page.waitForURL(new RegExp(`${basePath}/profile/edit/$`));
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
    console.log(`Mock SDK contract passed: ${password.length}-character signup, cold callback, profile creation, returning login, role gate, existing Google identity.`);
  }
  // The production demo must wait for SDK readiness even when window.Clerk never exists.
  for (const mode of ["hold", "reject"]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 900 }, reducedMotion: "reduce" });
    await context.route("**/*", (route) => new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort());
    await context.addInitScript((initialMode) => {
      if (sessionStorage.getItem("qa-demo-configured")) return;
      sessionStorage.setItem("qa-demo-configured", "1");
      sessionStorage.setItem("qa-sdk-delay", "700");
      sessionStorage.setItem("qa-signout-mode", initialMode);
      localStorage.setItem("qa-clerk-active", JSON.stringify({ id: "existing-google-id", fullName: "Existing Google", primaryEmailAddress: { emailAddress: "existing-google@example.test" }, unsafeMetadata: {}, publicMetadata: {}, password: null, provider: "google" }));
    }, mode);
    const page = await context.newPage();
    page.setDefaultTimeout(12000);
    await page.goto(`${hosted.url}/demo/`);
    await page.getByRole("button", { name: /Preparing signup/ }).waitFor();
    assert.equal(await page.getByRole("link", { name: "Sign up without an invite", exact: true }).count(), 0);
    assert.equal(await page.evaluate(() => typeof window.Clerk), "undefined");
    if (mode === "hold") {
      await page.waitForFunction(() => typeof window.qaReleaseDemoSignOut === "function");
      assert.equal(await page.getByRole("link", { name: "Sign up without an invite", exact: true }).count(), 0);
      await page.evaluate(() => window.qaReleaseDemoSignOut());
    } else {
      await page.getByText("Signup setup couldn't finish", { exact: true }).waitFor();
      assert.equal(await page.getByRole("link", { name: "Sign up without an invite", exact: true }).count(), 0);
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("qa-clerk-active")).id), "existing-google-id");
      await page.evaluate(() => sessionStorage.removeItem("qa-signout-mode"));
      await page.getByRole("button", { name: "Retry setup", exact: true }).click();
    }
    const signup = page.getByRole("link", { name: "Sign up without an invite", exact: true });
    await signup.waitFor();
    assert.equal(await page.evaluate(() => localStorage.getItem("qa-clerk-active")), null);
    assert.equal(await page.evaluate(() => localStorage.getItem("bg2-demo-flow")), "1");
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("bg2-sample-v2")).session), null);
    await signup.click();
    await page.getByLabel("Email", { exact: true }).fill(`sample-${mode}@example.test`);
    await page.getByLabel("Full name").fill("Sample Preview");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Continue to password", exact: true }).click();
    await page.getByRole("button", { name: "Skip sign-in and continue", exact: true }).click();
    await page.waitForURL(new RegExp(`${basePath}/profile/edit/$`));
    await page.locator("[data-step=welcome]").waitFor();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("bg2-sample-v2")).session.role), "gigster");
    assert.equal(await page.evaluate(() => localStorage.getItem("qa-clerk-active")), null);
    await context.close();
    console.log(`Demo SDK contract passed: ${mode} sign-out, absent global, readiness gating, retry and explicit browser-only fallback.`);
  }
} finally {
  if (browser) await browser.close();
  if (server) server.close();
  if (!preset) fs.rmSync(isolated, { recursive: true, force: true });
}
