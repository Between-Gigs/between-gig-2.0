// Sidebar navigation in fresh fictional owner contexts. No real accounts, publishing or sends.
import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright-core";
import { serve } from "./serve.mjs";
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const { server, url } = await serve("out", { base });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium" });
fs.mkdirSync("deliverables/owner-sidebar", { recursive: true });
try {
  for (const look of ["editorial", "swiss", "modern"]) for (const width of [320, 390, 1440]) for (const theme of ["light", "dark"]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce", colorScheme: theme });
    await context.addInitScript(({ look, theme }) => { localStorage.setItem("bg2-site-look-v2", look); localStorage.setItem("bg-theme", theme); if (look === "swiss" && localStorage.getItem("bg2-owner-nav-collapsed") === null) localStorage.setItem("bg2-owner-nav-collapsed", "1"); }, { look, theme });
    const origin = new URL(url).origin;
    await context.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    const page = await context.newPage(); await page.goto(`${url}/hub/`); await page.waitForFunction(() => !!window.bgSample);
    await page.evaluate(() => window.bgSample.signInAs("owner")); await page.goto(`${url}/owners/`);
    await page.getByRole("button", { name: "Switch experience" }).click();
    await page.getByRole("menuitemradio", { name: "Developer Mode", exact: true }).click();
    await page.getByRole("heading").first().waitFor();
    if (width >= 1024 && look === "swiss") await page.getByRole("button", { name: "Expand sidebar ([)", exact: true }).click();
    if (width < 1024) {
      if (look === "swiss") await page.getByRole("button", { name: "More owner pages and account actions" }).click();
      else await page.getByRole("button", { name: /Open owner menu/ }).click();
    }
    let nav = width < 1024 ? page.getByRole("dialog") : page.getByRole("navigation", { name: "Owner workspace", exact: true });
    await nav.getByRole("button", { name: "Collapse Previews section", exact: true }).waitFor();
    const overview = nav.locator('[data-owner-section="Overview"]');
    assert.deepEqual(await overview.getByRole("link").allTextContents(), ["Dashboard"]);
    for (const [name, href] of [["Page Previews", "/preview/#journey-h"], ["Social Previews", "/preview/social/"], ["Email Previews", "/emails/"], ["Forms", "/preview/forms/"], ["Funnels", "/preview/funnels/"], ["Design System", "/preview/design-system/"], ["Wallpapers", "/preview/wallpapers/"]]) {
      assert.equal(await nav.getByRole("link", { name, exact: true }).getAttribute("href"), `${base}${href}`);
    }
    assert.equal(await nav.getByRole("link", { name: "Wallpapers", exact: true }).getByText("Wallpapers", { exact: true }).isVisible(), true, "drawer labels remain visible with a collapsed-rail preference");
    for (const label of ["Media Library", "Copywriting", "Skills", "Characters"]) {
      const placeholder = nav.getByRole("link", { name: `${label} · Coming soon`, exact: true });
      assert.equal(await placeholder.getAttribute("aria-disabled"), "true");
      assert.equal(await placeholder.getAttribute("href"), null);
      const before = page.url();
      await placeholder.click({ force: true });
      assert.equal(page.url(), before, "coming-soon rows cannot navigate");
    }
    const previews = nav.getByRole("button", { name: "Collapse Previews section", exact: true });
    const bounds = await previews.boundingBox(); assert.ok(bounds.height >= 44);
    await previews.focus(); await page.keyboard.press("Enter");
    assert.equal(await nav.getByRole("button", { name: "Expand Previews section", exact: true }).getAttribute("aria-expanded"), "false");
    assert.equal(await nav.getByRole("link", { name: "Forms", exact: true }).count(), 0);
    assert.equal(await nav.getByRole("link", { name: "Wallpapers", exact: true }).count(), 1, "other sections stay open");
    await nav.getByRole("button", { name: "Collapse all", exact: true }).click();
    assert.equal(await nav.locator('[data-owner-section] > button[aria-expanded="true"]').count(), 0);
    if (width >= 1024) {
      await page.getByRole("button", { name: "Collapse sidebar ([)", exact: true }).click();
      assert.equal(await nav.getByRole("link", { name: "Forms", exact: true }).isVisible(), true, "collapsed rail retains navigation icons");
      await page.getByRole("button", { name: "Expand sidebar ([)", exact: true }).click();
    }
    await nav.getByRole("button", { name: "Expand all", exact: true }).click();
    assert.equal(await nav.locator('[data-owner-section] > button[aria-expanded="true"]').count(), 6);
    await nav.getByRole("button", { name: "Collapse Studio section", exact: true }).click();
    await page.reload();
    if (width < 1024) {
      if (look === "swiss") await page.getByRole("button", { name: "More owner pages and account actions" }).click();
      else await page.getByRole("button", { name: /Open owner menu/ }).click();
    }
    nav = width < 1024 ? page.getByRole("dialog") : page.getByRole("navigation", { name: "Owner workspace", exact: true });
    await nav.getByRole("button", { name: "Expand Studio section", exact: true }).waitFor();
    await nav.getByRole("button", { name: "Expand all", exact: true }).click();
    await nav.screenshot({ path: `deliverables/owner-sidebar/${look}-${width}-${theme}.png` });
    await page.addScriptTag({ content: fs.readFileSync("node_modules/axe-core/axe.min.js", "utf8") });
    const violations = await nav.evaluate(async el => (await window.axe.run(el, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } })).violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })));
    assert.deepEqual(violations, []);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    for (const [route, title] of [["forms", "Form previews"], ["funnels", "Funnel previews"]]) {
      await page.goto(`${url}/preview/${route}/`); await page.getByRole("heading", { name: title, exact: true }).waitFor();
      assert.ok(await page.locator("main li a").count() >= 3);
    }
    await context.close();
    console.log(`PASS: owner sidebar ${look}/${width}/${theme}: sections, saved preferences, keyboard/axe, preview links, coming-soon placeholder and catalogs`);
  }
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
