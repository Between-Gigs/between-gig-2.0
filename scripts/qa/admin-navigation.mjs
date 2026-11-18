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
      const switcher = header.getByRole("button", { name: "Switch experience", exact: true });
      assert.equal(await switcher.isVisible(), true, `${look}/${width}: persistent workspace switch`);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${look}/${width}/${route}: no overflow`);
      const mainLinks = header.getByRole("navigation", { name: "Main", exact: true });
      if (await mainLinks.isVisible()) {
        const navBox = await mainLinks.boundingBox(), switchBox = await switcher.boundingBox();
        assert.ok(navBox.x + navBox.width <= switchBox.x + 1, "center links do not overlap workspace controls");
      }
      const box = await account.boundingBox(); assert.ok(box.x + box.width <= width, "account fits top right"); assert.ok(box.y < 90, "account in top bar");
      await account.click(); await page.getByRole("menuitem", { name: "My profile", exact: true }).waitFor();
      await page.getByRole("menuitem", { name: "Edit profile", exact: true }).waitFor(); await page.getByRole("menuitem", { name: "Log out", exact: true }).waitFor();
      await page.keyboard.press("Escape");
      await switcher.click();
      for (const name of [/Gigster Experience/, /Owner Experience/, /Hub ·/]) assert.equal(await page.locator('[role^="menuitem"]').filter({ hasText: name }).isVisible(), true);
      await page.keyboard.press("Escape");
      if (route === "/profile/canvas/" && width >= 1024) assert.deepEqual(await header.getByRole("navigation", { name: "Main", exact: true }).getByRole("link").allTextContents(), ["My profile", "Edit profile"]);
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("bg2-sample-v2")).session.role), "owner", "navigation keeps authority");
      if (route === "/owners/") {
        if ([320, 1440].includes(width)) await page.screenshot({ path: `deliverables/admin-navigation/owner-${look}-${width}-${theme}.png` });
        await switcher.click(); await page.getByRole("menuitem", { name: /Gigster Experience/ }).click();
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
