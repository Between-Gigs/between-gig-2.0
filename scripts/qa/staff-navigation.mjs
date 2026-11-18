// Fictional local browser storage only. External requests are blocked; no Company OS setup or saves.
import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright-core";
import { serve } from "./serve.mjs";
const local = await serve("out"), origin = new URL(local.url).origin;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium" });
fs.mkdirSync("deliverables/staff-navigation", { recursive: true });
try {
  for (const width of [320, 390, 1440]) for (const theme of ["light", "dark"]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, colorScheme: theme, reducedMotion: "reduce" });
    await context.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    await context.addInitScript(theme => localStorage.setItem("bg-theme", theme), theme);
    const page = await context.newPage(), errors = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.goto(local.url + "/hub/"); await page.waitForFunction(() => !!window.bgSample);
    await page.evaluate(async () => {
      await window.bgSample.signInAs("owner");
      const owner = JSON.parse(localStorage.getItem("bg2-sample-v2")).session;
      const member = (userId, roleKey) => ({ membershipId: userId + ":" + roleKey, roleKey, roleName: roleKey === "super_admin" ? "Super admin" : "Reviewer" });
      localStorage.setItem("bg2-staff-sample-v1", JSON.stringify({ currentUserId: "sample-owner", roles: [{ key: "super_admin", name: "Super admin", isSystem: true, permissions: [] }, { key: "reviewer", name: "Reviewer", isSystem: false, permissions: [] }], users: [
        { userId: "sample-owner", email: owner.email, name: owner.name, signedUp: true, memberships: [member("sample-owner", "super_admin")] },
        { userId: "sample-admin-second", email: "second@example.test", name: "Second admin (sample)", signedUp: true, memberships: [member("sample-admin-second", "super_admin")] },
        { userId: "sample-reviewer", email: "reviewer@example.test", name: "Reviewer (sample)", signedUp: true, memberships: [member("sample-reviewer", "reviewer")] },
      ] }));
    });
    await page.goto(local.url + "/owners/staff/?view=navigation");
    const panel = page.getByRole("region", { name: "Staff navigation menus" });
    await panel.getByRole("heading", { name: "Navigation menus" }).waitFor();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "Staff view controls fit before setup");
    await panel.getByLabel("Staff account", { exact: true }).selectOption("sample-admin-second");
    await panel.getByRole("button", { name: "Set up navigation settings", exact: true }).click();
    await panel.getByRole("button", { name: "Save menus", exact: true }).waitFor();
    assert.equal(await panel.getByLabel("Staff account", { exact: true }).inputValue(), "sample-admin-second", "setup keeps the selected other admin rather than switching to the caller");
    await panel.getByLabel("Staff account", { exact: true }).selectOption("sample-owner");
    await panel.getByRole("button", { name: "Save menus", exact: true }).waitFor();
    await panel.getByRole("checkbox", { name: "Developer Mode", exact: true }).uncheck();
    await panel.getByRole("checkbox", { name: "Staff", exact: true }).uncheck();
    await panel.getByRole("button", { name: "Save menus", exact: true }).click();
    await panel.getByText("Sample menu settings saved in this browser.", { exact: true }).waitFor();
    const header = page.locator("header").filter({ visible: true }).first();
    const account = header.getByRole("button", { name: /^Account:/ });
    await header.getByRole("button", { name: /^Switch experience:/ }).click();
    assert.equal(await page.getByRole("menuitemradio", { name: "Developer Mode", exact: true }).count(), 0);
    await page.getByRole("menuitemradio", { name: "Owner Mode", exact: true }).waitFor(); await page.keyboard.press("Escape");
    await account.click(); await page.getByRole("menuitem", { name: "Manage team menus", exact: true }).click();
    await page.waitForURL("**/owners/staff/?view=navigation");
    await panel.getByRole("button", { name: "Save menus", exact: true }).waitFor();
    assert.equal(await panel.getByRole("checkbox", { name: "Developer Mode", exact: true }).isChecked(), false, "real reload reads persisted fictional menus");
    assert.equal(await panel.getByRole("checkbox", { name: "Staff", exact: true }).isChecked(), false);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("bg2-sample-v2")).session.role), "owner", "menu settings never change identity");
    await panel.getByRole("button", { name: "Use default menus", exact: true }).click();
    await panel.getByRole("button", { name: "Save menus", exact: true }).click();
    await panel.getByText("Sample menu settings saved in this browser.", { exact: true }).waitFor();
    // Corrupt only this fictional browser fixture to exercise the complete narrow conflict state.
    await page.evaluate(() => {
      const state = JSON.parse(localStorage.getItem("bg2-staff-navigation-sample-v1"));
      const original = state.rows.find(row => row.data.user === "sample-owner" && row.data.active);
      state.rows.push({ ...structuredClone(original), id: crypto.randomUUID() });
      localStorage.setItem("bg2-staff-navigation-sample-v1", JSON.stringify(state));
      window.dispatchEvent(new Event("bg2-staff-menus-changed"));
    });
    await panel.getByRole("button", { name: "Refresh menu settings", exact: true }).click();
    await panel.getByText("Conflicting active settings — choose one record to keep", { exact: true }).waitFor();
    await panel.getByRole("radio").first().check();
    const repair = panel.getByRole("button", { name: "Repair duplicate menus", exact: true });
    const box = await repair.boundingBox();
    assert.ok(box && box.x >= 0 && box.x + box.width <= width, "conflict repair fits the actual phone viewport");
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "conflict state has no narrow overflow");
    await page.screenshot({ path: `deliverables/staff-navigation/conflict-${width}-${theme}.png`, fullPage: true });
    await repair.click();
    await panel.getByText("Conflicting menu records repaired. Permissions are unchanged.", { exact: true }).waitFor();
    assert.deepEqual(await page.evaluate(() => {
      const rows = JSON.parse(localStorage.getItem("bg2-staff-navigation-sample-v1")).rows.filter(row => row.data.user === "sample-owner");
      return { active: rows.filter(row => row.data.active).length, inactive: rows.filter(row => !row.data.active).length };
    }), { active: 1, inactive: 1 }, "repair deactivates the duplicate rather than deleting data");
    await panel.getByLabel("Staff account", { exact: true }).selectOption("sample-reviewer");
    await panel.getByText("This account currently has Gigster menus.", { exact: false }).waitFor();
    assert.equal(await panel.getByRole("button", { name: "Save menus", exact: true }).count(), 0, "ordinary roles cannot be configured into admin menus");
    await page.screenshot({ path: `deliverables/staff-navigation/unsupported-${width}-${theme}.png`, fullPage: true });
    await panel.getByLabel("Staff account", { exact: true }).selectOption("sample-owner");
    await panel.getByRole("button", { name: "Save menus", exact: true }).waitFor();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.addScriptTag({ content: fs.readFileSync("node_modules/axe-core/axe.min.js", "utf8") });
    const violations = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } })).violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })));
    assert.deepEqual(violations, []); assert.deepEqual(errors, []);
    await page.screenshot({ path: `deliverables/staff-navigation/settings-${width}-${theme}.png`, fullPage: true });
    await context.close(); console.log(`PASS fictional Staff navigation ${width}/${theme}`);
  }
} finally { await browser.close(); await new Promise(resolve => local.server.close(resolve)); }
