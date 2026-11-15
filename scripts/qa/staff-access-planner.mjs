// Checks a proposal-only UI against the fictional sample build. Never runs permission mutations.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import { chromium } from "playwright-core";
import { serve } from "./serve.mjs";
const require = createRequire(import.meta.url);
const local = await serve(process.env.QA_OUT_DIR ?? "out");
const output = process.env.QA_OUTPUT ?? "/tmp/bg-staff-access-qa";
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium" });
try {
  for (const theme of ["light", "dark"]) for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, colorScheme: theme, reducedMotion: "reduce" });
    await context.addInitScript(value => localStorage.setItem("bg-theme", value), theme);
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`${local.url}/owners/staff/`);
    const login = page.getByRole("button", { name: "Continue as owner (sample)" });
    await login.or(page.getByRole("heading", { name: "Staff", exact: true })).first().waitFor();
    if (await login.isVisible()) await login.click();
    await page.getByRole("heading", { name: "Staff", exact: true }).waitFor();
    await page.getByRole("button", { name: "Access planner", exact: true }).click();
    const planner = page.getByRole("region", { name: "The right tools for each teammate." });
    await planner.waitFor();
    const requests = [];
    page.on("request", request => { if (!["GET", "HEAD"].includes(request.method())) requests.push(`${request.method()} ${request.url()}`); });
    const nav = page.getByRole("navigation", { name: "Owner workspace", exact: true, includeHidden: true });
    const sidebarBefore = await nav.textContent();
    const input = name => planner.getByRole("checkbox", { name, exact: true });
    for (const [label, approve, publish, send, manage] of [
      ["Simple · Peter", true, false, false, false], ["Medium · Patti", false, true, true, false],
      ["Advanced · Anowar", false, false, false, false], ["Advanced · Anuraag", false, false, false, true],
      ["Advanced · Justin", false, false, false, true],
    ]) {
      await planner.getByRole("button", { name: new RegExp(`^${label}`) }).click();
      assert.equal(await input("Approve profiles A review decision; publication is tracked separately.").isChecked(), approve);
      assert.equal(await input("Publish profiles Make a profile public; separate from draft editing.").isChecked(), publish);
      assert.equal(await input("Send email or invitations Previewing an email never authorizes delivery.").isChecked(), send);
      assert.equal(await input("Manage team access No self-elevation, self-lockout or removal of the last administrator.").isChecked(), manage);
    }
    await planner.getByRole("button", { name: /^Simple/ }).click();
    await input("Proposed Edit Review queue").check();
    assert.equal(await input("Proposed View Review queue").isChecked(), true);
    await input("Proposed View People").uncheck();
    assert.equal(await input("Proposed View Review queue").isChecked(), false);
    assert.equal(await input("Proposed Edit Review queue").isChecked(), false);
    await input("Approve profiles A review decision; publication is tracked separately.").check();
    assert.equal(await input("Proposed View People").isChecked(), true);
    assert.equal(await input("Proposed View Review queue").isChecked(), true);
    await input("Proposed View Review queue").uncheck();
    assert.equal(await input("Approve profiles A review decision; publication is tracked separately.").isChecked(), false);
    assert.equal(await input("Proposed View Finance").isDisabled(), true);
    assert.equal(await planner.getByRole("button", { name: "Apply access" }).isDisabled(), true);
    await planner.getByRole("button", { name: "Reset proposal" }).click();
    assert.equal(await nav.textContent(), sidebarBefore, "Real sidebar remains unchanged");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "No horizontal page overflow");
    await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
    const violations = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } })).violations);
    await fs.writeFile(`${output}/axe-${width}-${theme}.json`, JSON.stringify(violations, null, 2));
    assert.deepEqual(violations.map(v => v.id), [], "Accessible planning preview");
    await planner.evaluate(element => { const main = document.getElementById("main"); main.scrollTop += element.getBoundingClientRect().top - main.getBoundingClientRect().top - 120; });
    await page.screenshot({ path: `${output}/staff-access-${width}-${theme}.png` });
    await planner.getByRole("heading", { name: "Simple · Peter: proposed access", exact: true }).evaluate(element => { const main = document.getElementById("main"); main.scrollTop += element.getBoundingClientRect().top - main.getBoundingClientRect().top - 120; });
    await page.screenshot({ path: `${output}/staff-access-matrix-${width}-${theme}.png` });
    await input("Proposed View People").uncheck();
    await page.getByRole("button", { name: "Team members", exact: true }).click();
    await page.getByRole("button", { name: "Access planner", exact: true }).click();
    assert.equal(await input("Proposed View People").isChecked(), false, "Changing tabs preserves proposed draft");
    assert.deepEqual(requests, [], "Planner causes no network mutations");
    assert.deepEqual(errors, [], "No browser errors");
    console.log(`Staff access proposal workflow passed: ${width}px ${theme}`);
    await context.close();
  }
} finally { await browser.close(); local.server.close(); }
