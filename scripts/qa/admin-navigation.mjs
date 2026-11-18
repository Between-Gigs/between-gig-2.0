// Shared account / workspace controls in fresh fictional sessions only. No real data, publishing or sends.
import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright-core";
import { serve } from "./serve.mjs";
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const local = process.env.QA_BASE_URL ? null : await serve("out", { base });
const url = process.env.QA_BASE_URL ?? local.url;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium" });
fs.mkdirSync("deliverables/admin-navigation", { recursive: true });

// Menu focuses its first item on the next animation frame. Wait for that real keyboard state before
// sending Escape; an immediate Escape on the still-focused trigger would leave the popup open.
async function openMenu(page, trigger) {
  await trigger.press("ArrowDown");
  await page.waitForFunction(label => Array.from(document.querySelectorAll("button")).find(button => button.getAttribute("aria-label") === label)?.getAttribute("aria-expanded") === "true", await trigger.getAttribute("aria-label"));
  const id = await trigger.getAttribute("aria-controls");
  assert.ok(id, "open trigger identifies its menu");
  const menu = page.locator(`[id="${id}"]`);
  await menu.waitFor();
  await page.waitForFunction(id => document.activeElement === document.getElementById(id)?.querySelector('[role^="menuitem"]:not(:disabled)'), id);
  const popup = await menu.locator("..").boundingBox(), viewport = page.viewportSize();
  const fits = popup && viewport && popup.x >= -1 && popup.y >= -1 && popup.x + popup.width <= viewport.width + 1 && popup.y + popup.height <= viewport.height + 1;
  const diagnostic = { url: page.url(), trigger: await trigger.getAttribute("aria-label"), popup, viewport, look: await page.locator("html").getAttribute("data-look"), theme: await page.locator("html").getAttribute("data-theme") };
  if (!fits) {
    fs.writeFileSync("deliverables/admin-navigation/menu-bounds-failure.json", JSON.stringify(diagnostic, null, 2));
    await page.screenshot({ path: "deliverables/admin-navigation/menu-bounds-failure.png" });
  }
  assert.ok(fits, "open menu fits the viewport: " + JSON.stringify(diagnostic));
  return menu;
}
async function closeMenu(page, trigger, menu) {
  await page.keyboard.press("Escape");
  await menu.waitFor({ state: "hidden" });
  assert.equal(await trigger.getAttribute("aria-expanded"), "false", "Escape closes the menu");
  assert.equal(await trigger.evaluate(button => document.activeElement === button), true, "Escape restores focus to its trigger");
}
try {
  for (const look of ["editorial", "swiss", "modern"]) for (const width of [320, 390, 768, 1440]) for (const theme of ["light", "dark"]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme, reducedMotion: "reduce" });
    await context.addInitScript(({ look, theme }) => { localStorage.setItem("bg2-site-look-v2", look); localStorage.setItem("bg-theme", theme); }, { look, theme });
    const page = await context.newPage(); const errors = []; page.on("pageerror", e => errors.push(e.message));
    await page.goto(url + base + "/hub/"); await page.waitForFunction(() => !!window.bgSample);
    await page.evaluate(() => window.bgSample.signInAs("owner"));
    for (const route of ["/owners/", "/profile/canvas/", "/hub/"]) {
      await page.goto(url + base + route);
      const header = page.locator("header").first();
      const account = header.getByRole("button", { name: /^Account:/ });
      await account.waitFor();
      const switcher = header.getByRole("button", { name: /^Switch experience:/ });
      assert.equal(await switcher.isVisible(), true, `${look}/${width}: persistent workspace switch`);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${look}/${width}/${route}: no overflow`);
      const mainLinks = header.getByRole("navigation", { name: "Main", exact: true });
      if (await mainLinks.isVisible()) {
        const navBox = await mainLinks.boundingBox(), switchBox = await switcher.boundingBox();
        assert.ok(navBox.x + navBox.width <= switchBox.x + 1, "center links do not overlap workspace controls");
      }
      const box = await account.boundingBox(); assert.ok(box.x + box.width <= width, "account fits top right"); assert.ok(box.y < 90, "account in top bar");
      const accountMenu = await openMenu(page, account);
      await accountMenu.getByRole("menuitem", { name: "My profile", exact: true }).waitFor();
      await accountMenu.getByRole("menuitem", { name: "Edit profile", exact: true }).waitFor();
      await accountMenu.getByRole("menuitem", { name: "Log out", exact: true }).waitFor();
      await closeMenu(page, account, accountMenu);
      const experienceMenu = await openMenu(page, switcher);
      for (const name of [/Gigster Mode/, /Owner Mode/, /Developer Mode/]) assert.equal(await experienceMenu.locator('[role^="menuitem"]').filter({ hasText: name }).isVisible(), true);
      await closeMenu(page, switcher, experienceMenu);
      if (route === "/profile/canvas/" && width >= 1024) assert.deepEqual(await header.getByRole("navigation", { name: "Main", exact: true }).getByRole("link").allTextContents(), ["My profile", "Edit profile"]);
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("bg2-sample-v2")).session.role), "owner", "navigation keeps authority");
      if (route === "/owners/") {
        if ([320, 1440].includes(width)) await page.screenshot({ path: `deliverables/admin-navigation/owner-${look}-${width}-${theme}.png` });
        const navigationMenu = await openMenu(page, switcher);
        await navigationMenu.getByRole("menuitemradio", { name: "Gigster Mode", exact: true }).click();
        await page.waitForURL("**/profile/canvas/");
        assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("bg2-sample-v2")).session.role), "owner", "switching experience preserves owner authority");
      }
    }
    await context.close(); assert.deepEqual(errors, []);
    console.log(`PASS: owner navigation ${look}/${width}/${theme}`);
  }
  for (const role of ["gigster", "signed-out"]) for (const width of [320, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } }); const page = await context.newPage();
    await page.goto(url + base + "/hub/"); await page.waitForFunction(() => !!window.bgSample);
    await page.evaluate(async role => { await window.bgSample.reset(); if (role === "gigster") await window.bgSample.signInAs("gigster", "grace-liu"); }, role);
    await page.goto(url + base + "/professionals/");
    const header = page.locator("header").first(); await page.getByRole("heading").first().waitFor();
    assert.equal(await header.getByRole("button", { name: "Switch experience" }).count(), 0, "no workspace switch for non-owner");
    if (role === "gigster") {
      await header.getByRole("button", { name: /^Account:/ }).waitFor();
      if (width === 1440) assert.deepEqual(await header.getByRole("navigation", { name: "Main", exact: true }).getByRole("link").allTextContents(), ["My profile", "Edit profile"]);
    } else await header.getByRole("link", { name: "Sign in", exact: true }).waitFor();
    await page.screenshot({ path: `deliverables/admin-navigation/${role}-${width}.png` });
    await page.goto(url + base + "/owners/"); await page.getByText("Owners only", { exact: true }).waitFor();
    await context.close(); console.log(`PASS: ${role}/${width} role boundary`);
  }
} finally { await browser.close(); if (local) await new Promise(resolve => local.server.close(resolve)); }
