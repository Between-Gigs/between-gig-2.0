// Fictional sample identities only. Mode visibility never authorizes live data or changes memberships.
import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright-core";
import { serve } from "./serve.mjs";
const local = await serve("out");
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium" });
fs.mkdirSync("deliverables/navigation-modes", { recursive: true });
try {
  // Real DS controls: a saved account Night preference must beat the older Day fallback even
  // before Settings opens, after reload, and when the optional navigation toggle mounts.
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
    await context.addInitScript(() => localStorage.setItem("bg-theme", "light"));
    const page = await context.newPage(); await page.goto(local.url + "/"); await page.waitForFunction(() => !!window.bgSample);
    await page.evaluate(async () => {
      await window.bgSample.signInAs("owner");
      const session = JSON.parse(localStorage.getItem("bg2-sample-v2")).session;
      localStorage.setItem("bg2-navigation-preferences-v1:sample:" + encodeURIComponent(session.email.toLowerCase()), JSON.stringify({ showThemeChooser: false, theme: "dark" }));
    });
    const assertNight = async () => {
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      assert.equal(await page.locator("html").getAttribute("data-theme"), "dark", "controlled DS toggle never reapplies captured legacy Day");
      assert.equal(await page.evaluate(() => localStorage.getItem("bg-theme")), "light", "personal Night leaves legacy Day intact");
    };
    await page.goto(local.url + "/owners/");
    const header = page.locator("header").first(); const account = header.getByRole("button", { name: /^Account:/ });
    await account.waitFor(); await page.waitForFunction(() => document.documentElement.dataset.theme === "dark"); await assertNight();
    await page.reload(); await account.waitFor(); await page.waitForFunction(() => document.documentElement.dataset.theme === "dark"); await assertNight();
    await account.click(); await page.getByRole("menuitem", { name: "My Settings", exact: true }).click();
    const settings = page.getByRole("dialog", { name: "My Settings", exact: true }); await settings.waitFor(); await assertNight();
    assert.equal(await settings.getByRole("switch", { name: "Night mode" }).getAttribute("aria-checked"), "true");
    await settings.getByLabel("Show theme chooser in navigation").check();
    await page.keyboard.press("Escape"); await settings.waitFor({ state: "hidden" });
    await header.getByRole("switch", { name: "Night mode" }).waitFor(); await assertNight();
    assert.equal(await header.getByRole("switch", { name: "Night mode" }).getAttribute("aria-checked"), "true");
    await page.screenshot({ path: `deliverables/navigation-modes/saved-night-legacy-day-${width}.png` });
    await context.close(); console.log(`PASS saved Night / legacy Day real DS controls ${width}`);
  }
  for (const width of [320, 390, 768, 1440]) for (const theme of ["light", "dark"]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme, reducedMotion: "reduce" });
    await context.addInitScript(theme => localStorage.setItem("bg-theme", theme), theme);
    const page = await context.newPage(); const errors = []; page.on("pageerror", error => errors.push(error.message));
    const shot = async name => { await page.evaluate(() => document.fonts.ready); await page.screenshot({ path: `deliverables/navigation-modes/${name}-${width}-${theme}.png` }); };
    await page.goto(local.url + "/"); await page.waitForFunction(() => !!window.bgSample);
    await page.locator("header").first().getByRole("switch", { name: "Night mode" }).waitFor(); // anonymous appearance remains accessible
    await page.evaluate(() => window.bgSample.signInAs("owner")); await page.goto(local.url + "/owners/");
    const header = page.locator("header").first();
    const account = header.getByRole("button", { name: /^Account:/ }); await account.waitFor();
    assert.equal(await header.getByRole("switch", { name: "Night mode" }).count(), 0, "authenticated appearance defaults to My Settings");
    const nav = async () => { if (width < 1024) { await page.getByRole("button", { name: /Open owner menu|More owner pages/ }).filter({ visible: true }).first().click(); return page.getByRole("dialog").filter({ has: page.getByRole("button", { name: "Collapse all", exact: true }) }); } return page.getByRole("navigation", { name: /^(Owner|Preview) workspace$/, exact: true }); };
    let sidebar = await nav();
    assert.deepEqual(await sidebar.locator("[data-owner-section] > button").allTextContents(), ["Overview", "Gigsters"]);
    assert.equal(await sidebar.getByRole("link", { name: "Staff", exact: true }).count(), 0);
    await shot("owner"); if (width < 1024) await page.keyboard.press("Escape");
    await page.goto(local.url + "/owners/developer/");
    await page.getByText("The Hub below is a fictional sample workspace.", { exact: false }).waitFor();
    const embedded = page.frameLocator('iframe[data-developer-hub]');
    await embedded.getByRole("heading", { name: "Choose your experience" }).waitFor();
    assert.equal(await embedded.locator("[data-admin-shell]").count(), 0, "embedded sample has no second sidebar");
    assert.equal(await embedded.locator("header").filter({ visible: true }).count(), 0, "embedded sample has no duplicate top navigation");
    const parentIdentity = await page.evaluate(() => JSON.parse(localStorage.getItem("bg2-sample-v2")).session);
    const outerAppearance = await page.evaluate(() => ({ look: document.documentElement.dataset.look, theme: document.documentElement.dataset.theme, legacyLook: localStorage.getItem("bg2-site-look-v2"), legacyTheme: localStorage.getItem("bg-theme"), unstyled: document.documentElement.hasAttribute("data-unstyled"), legacyPlain: localStorage.getItem("bg2-unstyled") }));
    const child = await (await page.locator('iframe[data-developer-hub]').elementHandle()).contentFrame();
    await child.evaluate(async () => {
      window.name = "bg-preview:gigster:grace-liu";
      const session = JSON.parse(localStorage.getItem("bg2-sample-v2")).people.find(person => person.id === "grace-liu");
      localStorage.setItem("bg2-navigation-preferences-v1:sample:" + encodeURIComponent(session.email.toLowerCase()), JSON.stringify({ showThemeChooser: false, look: "friendly", unstyled: true, theme: document.documentElement.dataset.theme === "dark" ? "light" : "dark" }));
    });
    await child.goto(child.url()); await child.waitForFunction(() => document.documentElement.dataset.look === "friendly" && document.documentElement.hasAttribute("data-unstyled"));
    await child.getByRole("button", { name: "Crisp modern app", exact: true }).click();
    await child.waitForFunction(() => document.documentElement.dataset.look === "modern");
    assert.deepEqual(await page.evaluate(() => ({ look: document.documentElement.dataset.look, theme: document.documentElement.dataset.theme, legacyLook: localStorage.getItem("bg2-site-look-v2"), legacyTheme: localStorage.getItem("bg-theme"), unstyled: document.documentElement.hasAttribute("data-unstyled"), legacyPlain: localStorage.getItem("bg2-unstyled") })), outerAppearance, "another sample account in the same-origin iframe cannot change outer appearance or legacy keys");
    await child.evaluate(() => window.bgSample.signInAs("owner"));
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem("bg2-sample-v2")).session), parentIdentity, "fictional iframe role changes never replace parent identity");
    await shot("private-hub");
    await page.goto(local.url + "/owners/"); await account.waitFor();
    await header.getByRole("button", { name: "Switch experience" }).press("ArrowDown");
    await page.getByRole("menuitemradio", { name: "Developer Mode", exact: true }).click();
    await page.waitForURL("**/hub/");
    sidebar = await nav(); await sidebar.getByRole("link", { name: "Staff", exact: true }).waitFor();
    await sidebar.getByRole("link", { name: "Hub", exact: true }).waitFor(); await shot("developer");
    if (width < 1024) await page.keyboard.press("Escape");
    await page.reload(); assert.equal(await page.locator("[data-navigation-mode]").getAttribute("data-navigation-mode"), "developer");
    await account.click(); await page.getByRole("menuitem", { name: "My Settings", exact: true }).click();
    let settings = page.getByRole("dialog", { name: "My Settings", exact: true }); await settings.waitFor();
    assert.equal(await settings.getByLabel("Show theme chooser in navigation").isChecked(), false);
    await settings.getByLabel("Theme", { exact: true }).selectOption("swiss");
    await settings.getByLabel("Show theme chooser in navigation").check(); await shot("settings");
    await page.keyboard.press("Escape"); await settings.waitFor({ state: "hidden" });
    assert.equal(await account.evaluate(button => document.activeElement === button), true, "Settings Escape restores focus to Account");
    await header.getByRole("switch", { name: "Night mode" }).waitFor();
    await page.reload(); await account.waitFor(); await header.getByRole("switch", { name: "Night mode" }).waitFor();
    assert.equal(await page.locator("html").getAttribute("data-look"), "swiss");
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("bg2-sample-v2")).session.role), "owner");
    await page.goto(local.url + "/owners/?look=modern&unstyled=1");
    await page.waitForFunction(() => document.documentElement.dataset.look === "modern");
    assert.equal(await page.locator("html").getAttribute("data-unstyled"), "");
    assert.equal(new URL(page.url()).searchParams.get("look"), "modern", "personal sync preserves explicit shared-look entry");
    const entryNav = await nav();
    await entryNav.getByRole("link", { name: "People", exact: true }).click();
    await page.waitForURL("**/owners/people/");
    assert.equal(await page.locator("html").getAttribute("data-look"), "modern", "shared look remains in this document after ordinary navigation removes its query");
    assert.equal(await page.locator("html").getAttribute("data-unstyled"), "", "explicit wireframe entry also survives ordinary navigation");
    await account.click(); await page.getByRole("menuitem", { name: "My Settings", exact: true }).click();
    settings = page.getByRole("dialog", { name: "My Settings", exact: true });
    await settings.getByLabel("Theme", { exact: true }).selectOption("swiss");
    await page.waitForFunction(() => document.documentElement.dataset.look === "swiss");
    assert.equal(new URL(page.url()).searchParams.has("look"), false, "manual personal choice consumes the shared entry");
    await page.keyboard.press("Escape");
    await header.getByRole("button", { name: /^Theme:/ }).filter({ visible: true }).click();
    await page.getByRole("menuitemradio", { name: "Styled", exact: true }).click();
    assert.equal(new URL(page.url()).searchParams.has("unstyled"), false, "manual Styled choice consumes the explicit unstyled entry");
    await page.waitForFunction(() => !document.documentElement.hasAttribute("data-unstyled"));
    await page.evaluate(() => window.bgSample.signInAs("gigster", "grace-liu")); await page.goto(local.url + "/profile/canvas/");
    await account.waitFor(); assert.equal(await header.getByRole("switch", { name: "Night mode" }).count(), 0, "another account does not inherit navigation preference");
    await page.waitForFunction(() => document.documentElement.dataset.look === "modern");
    await page.waitForFunction(expected => document.documentElement.dataset.theme === expected, outerAppearance.theme === "dark" ? "light" : "dark");
    assert.equal(await page.locator("html").getAttribute("data-look"), "modern", "another account restores its own iframe-selected preference instead of inheriting the owner theme");
    await page.goto(local.url + "/hub/"); await account.waitFor();
    const previewNav = await nav();
    await previewNav.getByRole("link", { name: "Staff", exact: true }).waitFor();
    await previewNav.getByRole("link", { name: "People", exact: true }).waitFor();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("bg2-sample-v2")).session.role), "gigster", "complete Developer directory does not promote a fictional Gigster");
    if (width < 1024) await page.keyboard.press("Escape");
    await page.goto(local.url + "/owners/developer/"); await page.getByText("Owners only", { exact: true }).waitFor();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    assert.deepEqual(errors, []); await context.close(); console.log(`PASS navigation modes/settings ${width}/${theme}`);
  }
} finally { await browser.close(); await new Promise(resolve => local.server.close(resolve)); }
