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
    console.log(`START navigation modes/settings ${width}/${theme}`);
    const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme, reducedMotion: "reduce" });
    await context.addInitScript(theme => localStorage.setItem("bg-theme", theme), theme);
    const page = await context.newPage(); const errors = []; page.on("pageerror", error => errors.push(error.message));
    const shot = async name => { await page.evaluate(() => document.fonts.ready); await page.screenshot({ path: `deliverables/navigation-modes/${name}-${width}-${theme}.png` }); };
    await page.goto(local.url + "/"); await page.waitForFunction(() => !!window.bgSample);
    await page.locator("header").first().getByRole("switch", { name: "Night mode" }).waitFor(); // anonymous appearance remains accessible
    await page.evaluate(() => window.bgSample.signInAs("owner")); await page.goto(local.url + "/owners/");
    const header = page.locator("header").first();
    const account = header.getByRole("button", { name: /^Account:/ }); await account.waitFor();
    if (width >= 1024) {
      await header.getByRole("navigation", { name: "Main", exact: true }).getByRole("link", { name: "My profile", exact: true }).waitFor();
      await header.getByRole("navigation", { name: "Main", exact: true }).getByRole("link", { name: "Edit profile", exact: true }).waitFor();
    }
    assert.equal(await header.getByRole("switch", { name: "Night mode" }).count(), 0, "authenticated appearance defaults to My Settings");
    const nav = async () => {
      // Query appearance is applied before hydration. Wait for the real look-specific shell,
      // otherwise a click can target the server header just before React replaces it.
      await page.waitForFunction(() => !!window.bgSample && (document.documentElement.dataset.look !== "modern" || !!document.querySelector("[data-admin-shell][data-modern-owner]")));
      if (width >= 1024) return page.getByRole("navigation", { name: /^(Owner|Preview) workspace$/, exact: true });
      const drawer = page.getByRole("dialog", { name: /^(Owner|Preview) workspace$/, exact: true });
      try {
        await page.getByRole("button", { name: /Open owner menu|More owner pages/ }).filter({ visible: true }).first().click();
        await drawer.waitFor();
        await drawer.getByRole("button", { name: "Collapse all", exact: true }).waitFor();
      } catch (error) {
        const diagnostic = await page.evaluate(() => ({ path: location.pathname, look: document.documentElement.dataset.look,
          sampleReady: !!window.bgSample, shell: document.querySelector("[data-admin-shell]")?.outerHTML.slice(0, 1600),
          dialogs: [...document.querySelectorAll("dialog")].map(dialog => ({ open: dialog.open, text: dialog.textContent })) }));
        fs.writeFileSync(`deliverables/navigation-modes/drawer-readiness-failure-${width}-${theme}.json`, JSON.stringify(diagnostic, null, 2));
        await shot("drawer-readiness-failure");
        throw error;
      }
      return drawer;
    };
    let sidebar = await nav();
    assert.deepEqual(await sidebar.locator("[data-owner-section] > button").allTextContents(), ["Overview", "Gigsters"]);
    assert.equal(await sidebar.getByRole("link", { name: "Staff", exact: true }).count(), 0);
    console.log(`STEP ${width}/${theme}: focused Owner navigation ready`);
    await shot("owner"); if (width < 1024) await page.keyboard.press("Escape");
    await page.goto(local.url + "/owners/developer/");
    await page.getByText("The Hub below is a fictional sample workspace.", { exact: false }).waitFor();
    const embedded = page.frameLocator('iframe[data-developer-hub]');
    await embedded.getByRole("heading", { name: "Choose your experience" }).waitFor();
    // The heading exists in server markup before AdminRoutes' client-ready snapshot removes its
    // initial shell. Wait for the real embedded state, then retain strict no-duplicate assertions.
    try {
      await page.waitForFunction(() => {
        const doc = document.querySelector('iframe[data-developer-hub]')?.contentDocument;
        return !!doc?.documentElement.hasAttribute("data-embedded") && doc.querySelector("[data-admin-shell]") === null;
      });
    } catch (error) {
      const diagnostic = await page.evaluate(() => {
        const frame = document.querySelector('iframe[data-developer-hub]'), doc = frame?.contentDocument;
        return { parentPath: location.pathname, frameSrc: frame?.getAttribute("src"), frameName: frame?.getAttribute("name"), frameMarked: frame?.hasAttribute("data-developer-hub"), childUrl: doc?.location.href, childRoot: doc?.documentElement.outerHTML.slice(0, 1200), shellCount: doc?.querySelectorAll("[data-admin-shell]").length, headings: [...(doc?.querySelectorAll("h1,h2") ?? [])].map(heading => heading.textContent) };
      });
      fs.writeFileSync(`deliverables/navigation-modes/embedded-readiness-failure-${width}-${theme}.json`, JSON.stringify(diagnostic, null, 2));
      await shot("embedded-readiness-failure");
      console.log(`FAIL embedded readiness ${width}/${theme}: ${JSON.stringify(diagnostic)}`);
      throw error;
    }
    assert.equal(await embedded.locator("[data-admin-shell]").count(), 0, "embedded sample has no second sidebar");
    assert.equal(await embedded.locator("header").filter({ visible: true }).count(), 0, "embedded sample has no duplicate top navigation");
    console.log(`STEP ${width}/${theme}: embedded chrome hydrated without a second shell`);
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
    console.log(`STEP ${width}/${theme}: iframe identity and appearance isolation passed`);
    // Theme interactions scroll the child and can scroll its outer owner content to the focused control.
    // Reset both real scroll containers directly; do not wait on a background iframe animation frame.
    await child.evaluate(() => { window.scrollTo({ top: 0, left: 0, behavior: "instant" }); for (const main of document.querySelectorAll("main")) { main.scrollTop = 0; main.scrollLeft = 0; } });
    await page.evaluate(() => { window.scrollTo({ top: 0, left: 0, behavior: "instant" }); for (const main of document.querySelectorAll("main")) { main.scrollTop = 0; main.scrollLeft = 0; } });
    await shot("private-hub");
    await page.goto(local.url + "/owners/"); await account.waitFor();
    await header.getByRole("button", { name: "Switch experience" }).press("ArrowDown");
    await page.getByRole("menuitemradio", { name: "Developer Mode", exact: true }).click();
    await page.waitForURL("**/hub/");
    console.log(`STEP ${width}/${theme}: Developer navigation ready`);
    sidebar = await nav(); await sidebar.getByRole("link", { name: "Staff", exact: true }).waitFor();
    await sidebar.getByRole("link", { name: "Hub", exact: true }).waitFor(); await shot("developer");
    if (width < 1024) await page.keyboard.press("Escape");
    await page.reload(); assert.equal(await page.locator("[data-navigation-mode]").getAttribute("data-navigation-mode"), "developer");
    await account.click(); await page.getByRole("menuitem", { name: "My Settings", exact: true }).click();
    let settings = page.getByRole("dialog", { name: "My Settings", exact: true }); await settings.waitFor();
    assert.equal(await settings.getByLabel("Show theme chooser in navigation").isChecked(), false);
    const settingsDiagnostic = await settings.evaluate(dialog => ({ html: dialog.outerHTML, selects: [...dialog.querySelectorAll("select")].map(select => ({ id: select.id, labels: [...select.labels].map(label => label.textContent), value: select.value })) }));
    fs.writeFileSync(`deliverables/navigation-modes/settings-before-theme-${width}-${theme}.json`, JSON.stringify(settingsDiagnostic, null, 2));
    console.log(`STEP ${width}/${theme}: Settings before Theme selection ${JSON.stringify(settingsDiagnostic.selects)}`);
    await shot("settings-before-theme");
    await settings.getByRole("combobox", { name: "Theme", exact: true }).waitFor();
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
    // NavLink names include the asynchronously loaded count, e.g. "People, 31 invited so far".
    // Match both legitimate states while still proving the exact destination and accessible label.
    const entryDiagnostic = await page.evaluate(() => ({
      url: location.href, look: document.documentElement.dataset.look,
      unstyled: document.documentElement.hasAttribute("data-unstyled"),
      mode: document.querySelector("[data-navigation-mode]")?.getAttribute("data-navigation-mode"),
      session: JSON.parse(localStorage.getItem("bg2-sample-v2") || "null")?.session,
      preferences: Object.fromEntries(Object.keys(localStorage).filter(key => key.startsWith("bg2-navigation-preferences-v1:sample:")).map(key => [key, localStorage.getItem(key)])),
    }));
    entryDiagnostic.navigation = await entryNav.ariaSnapshot();
    fs.writeFileSync(`deliverables/navigation-modes/before-people-${width}-${theme}.json`, JSON.stringify(entryDiagnostic, null, 2));
    await shot("before-people");
    console.log(`STEP ${width}/${theme}: before People ${JSON.stringify(entryDiagnostic)}`);
    assert.equal(entryDiagnostic.mode, "developer", "ordinary owner entry preserves saved Developer mode");
    assert.equal(entryDiagnostic.session?.role, "owner", "drawer navigation does not change the sample owner identity");
    const people = entryNav.getByRole("link", { name: /^People(?:, \d+ invited so far)?$/ });
    assert.equal(await people.count(), 1, "one accessible People destination with its optional loaded count");
    assert.equal(await people.getAttribute("href"), "/owners/people/", "People retains the intended owner route");
    await people.click();
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
    const themeMenu = page.getByRole("menu"); await themeMenu.waitFor();
    const themeDiagnostic = { url: page.url(), menu: await themeMenu.ariaSnapshot() };
    fs.writeFileSync(`deliverables/navigation-modes/before-styled-${width}-${theme}.json`, JSON.stringify(themeDiagnostic, null, 2));
    await shot("before-styled");
    console.log(`STEP ${width}/${theme}: before Styled ${JSON.stringify(themeDiagnostic)}`);
    // DS Menu exposes both its label and description as the radio item's accessible name.
    const styled = themeMenu.getByRole("menuitemradio", { name: "Styled The chosen theme", exact: true });
    assert.equal(await styled.count(), 1, "one Styled radio choice with its complete accessible name");
    assert.equal(await styled.getAttribute("aria-checked"), "false", "explicit wireframe entry is still active before the manual choice");
    await styled.click();
    assert.equal(new URL(page.url()).searchParams.has("unstyled"), false, "manual Styled choice consumes the explicit unstyled entry");
    await page.waitForFunction(() => !document.documentElement.hasAttribute("data-unstyled"));
    await page.evaluate(() => window.bgSample.signInAs("gigster", "grace-liu")); await page.goto(local.url + "/profile/canvas/");
    await account.waitFor();
    await page.waitForFunction(() => document.documentElement.dataset.look === "modern");
    await page.waitForFunction(expected => document.documentElement.dataset.theme === expected, outerAppearance.theme === "dark" ? "light" : "dark");
    await header.getByRole("switch", { name: "Night mode" }).waitFor({ state: "hidden" });
    assert.equal(await header.getByRole("switch", { name: "Night mode" }).count(), 0, "another account does not inherit navigation preference");
    assert.equal(await page.locator("html").getAttribute("data-look"), "modern", "another account restores its own iframe-selected preference instead of inheriting the owner theme");
    await page.goto(local.url + "/hub/"); await account.waitFor();
    const previewNav = await nav();
    await previewNav.getByRole("link", { name: "Staff", exact: true }).waitFor();
    await previewNav.getByRole("link", { name: /^People(?:, \d+ invited so far)?$/ }).waitFor();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("bg2-sample-v2")).session.role), "gigster", "complete Developer directory does not promote a fictional Gigster");
    if (width < 1024) await page.keyboard.press("Escape");
    await page.goto(local.url + "/owners/developer/"); await page.getByText("Owners only", { exact: true }).waitFor();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    assert.deepEqual(errors, []); await context.close(); console.log(`PASS navigation modes/settings ${width}/${theme}`);
  }
} finally { await browser.close(); await new Promise(resolve => local.server.close(resolve)); }
