// The Hub and owner-to-Gigster journey, in the isolated sample only. Never sends a real invite.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";
import { serve } from "./serve.mjs";

const basePath = process.env.QA_BASE_PATH ?? "";
const local = process.env.QA_BASE_URL ? null : await serve(process.env.QA_OUT_DIR ?? "out", { base: basePath });
const base = process.env.QA_BASE_URL ?? local.url;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? (process.platform === "win32" ? "C:/Program Files/Google/Chrome/Application/chrome.exe" : "/opt/pw-browsers/chromium") });
const screenshots = process.env.QA_SCREENSHOT_DIR;
const failures = [];
const shot = async (page, name) => { if (screenshots) { await fs.mkdir(screenshots, { recursive: true }); await page.screenshot({ path: path.join(screenshots, name + ".png") }); } };
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
  await context.addInitScript(() => localStorage.setItem("bg-theme", "dark"));
  const page = await context.newPage();
  page.on("pageerror", error => failures.push(error.message));
  for (const route of ["/hub/", "/preview/"]) {
    const response = await page.goto(base + route);
    assert.equal(response.status(), 200, route);
    await page.getByRole("heading", { name: "Choose your experience" }).waitFor();
  }
  await page.goto(base + "/hub/");
  await page.waitForTimeout(350);
  await shot(page, "hub");
  await page.waitForFunction(() => !!window.bgSample);
  await page.evaluate(async () => { await window.bgSample.reset(); await window.bgSample.signInAs("owner"); });
  await page.goto(base + "/owners/staff/");
  await page.getByRole("heading", { name: "Staff", exact: true }).waitFor();
  await page.getByText("Reviewer (sample)", { exact: true }).waitFor();
  const member = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "Staff (sample)", exact: true }) });
  await member.getByRole("button", { name: "Manage roles" }).click();
  await member.getByRole("checkbox", { name: "Gigster", exact: true }).check();
  await page.getByRole("status").filter({ hasText: "Role assignments saved" }).waitFor();
  assert.equal(await member.getByRole("checkbox", { name: "Reviewer", exact: true }).isChecked(), true);
  await shot(page, "staff");
  await page.reload();
  await page.getByText("Reviewer (sample)", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Role access", exact: true }).click();
  await page.getByLabel("Choose a role").selectOption("reviewer");
  await page.getByRole("combobox", { name: "Update Profile", exact: true }).selectOption("own");
  await page.getByRole("button", { name: "Save role access" }).click();
  await page.getByRole("status").filter({ hasText: "Role access saved" }).waitFor();
  await shot(page, "staff-access");
  await page.getByRole("button", { name: "Team members", exact: true }).click();
  await page.getByRole("button", { name: "Invite staff", exact: true }).click();
  await page.getByRole("textbox", { name: "Name", exact: true }).fill("Alex Sample");
  await page.getByRole("textbox", { name: "Email address", exact: true }).fill("alex@example.test");
  const invite = page.getByRole("group", { name: "Roles for this person" });
  await invite.getByRole("checkbox", { name: "Gigster", exact: true }).check();
  await invite.getByRole("checkbox", { name: "Reviewer", exact: true }).check();
  await page.getByRole("button", { name: "Create invitation link", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "No invitation or email was sent" }).waitFor();
  await page.goto(base + "/profile/canvas/");
  await page.getByRole("heading", { name: "Build your own Gigster profile" }).waitFor();
  assert.equal(await page.getByRole("checkbox").isChecked(), false);
  await shot(page, "gigster-setup");
  await page.getByLabel("Full name").fill("Sample Owner");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create my Gigster profile" }).click();
  await page.getByRole("button", { name: "Send for review", exact: true }).waitFor();
  const session = await page.evaluate(() => JSON.parse(localStorage.getItem("bg2-sample-v2")).session);
  assert.equal(session.role, "owner");
  assert.ok(session.personId);
  await shot(page, "gigster-editor");
  await page.goto(base + "/owners/");
  await page.getByRole("button", { name: "Switch experience" }).waitFor();
  await page.getByRole("button", { name: "Switch experience" }).click();
  await page.getByRole("menuitem", { name: /Gigster Experience/ }).click();
  await page.getByRole("button", { name: "Send for review", exact: true }).waitFor();
  for (const width of [390, 420, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(base + "/owners/staff/");
    await page.getByRole("heading", { name: "Staff", exact: true }).waitFor();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(overflow <= 1, "Staff overflow at " + width + ": " + overflow);
    if (width === 390) await shot(page, "staff-mobile");
  }
  assert.deepEqual(failures, []);
  console.log("PASS: public Hub aliases; staff roles/access/invite sample; owner personal signup/editor; 390/420/768px.");
} finally {
  await browser.close();
  await new Promise(resolve => local?.server.close(resolve) ?? resolve());
}
