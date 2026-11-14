// Run against a sample-mode static build. No requests to Clerk or real email providers.
import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright-core";
import { serve } from "./serve.mjs";
const { server, url } = await serve("out");
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium" });
try {
  // Tall desktop reproduces the reported blank band; narrow screens keep their
  // intentional portrait fade, but the stage must still meet the footer.
  for (const viewport of [{ width: 2048, height: 1382 }, { width: 390, height: 844 }]) {
    for (const mode of ["light", "dark"]) {
      const context = await browser.newContext({ viewport, colorScheme: mode });
      await context.addInitScript((theme) => localStorage.setItem("bg-theme", theme), mode);
      const page = await context.newPage();
      for (const route of ["join", "login"]) {
        await page.goto(`${url}/${route}/`);
        await page.getByLabel("Email", { exact: true }).waitFor();
        const layout = await page.evaluate(async () => {
          await document.fonts.ready;
          const stage = document.querySelector("main > section");
          const footer = document.querySelector("footer");
          return {
            gap: footer.getBoundingClientRect().top - stage.getBoundingClientRect().bottom,
            overflow: document.documentElement.scrollWidth > innerWidth,
          };
        });
        assert.ok(Math.abs(layout.gap) <= 1, `${route} ${viewport.width} ${mode}: stage/footer gap ${layout.gap}`);
        assert.equal(layout.overflow, false);
      }
      await context.close();
    }
  }
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${url}/join/`);
    await page.getByLabel("Email", { exact: true }).fill("bad");
    await page.getByRole("button", { name: "Create account", exact: true }).click();
    await page.getByText("Enter your email address, like name@example.com.", { exact: true }).waitFor();
    await page.getByLabel("Email", { exact: true }).fill(`open-${width}@example.com`);
    await page.getByLabel("Full name").fill("Open Signup");
    await page.getByRole("checkbox").check();
    fs.mkdirSync("qa/output/auth", { recursive: true });
    await page.screenshot({ path: `qa/output/auth/open-signup-${width}.png`, fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.getByRole("button", { name: "Create account", exact: true }).click();
    await page.waitForURL(/\/profile\/canvas\/$/);
    const state = await page.evaluate(() => JSON.parse(localStorage.getItem("bg2-sample-v2")));
    assert.equal(state.session.role, "gigster");
    await page.goto(`${url}/owners/`);
    await page.getByText("Owners only", { exact: true }).waitFor();
    for (const invite of ["not-a-real-invite", "sky-9x4p"]) {
      await page.goto(`${url}/join/?invite=${invite}`);
      await page.getByRole("link", { name: "Create an account", exact: true }).click();
      await page.getByLabel("Email", { exact: true }).waitFor();
      assert.equal(await page.getByLabel("Email", { exact: true }).isEditable(), true);
    }
    await page.evaluate(() => window.bgSample.reset());
    await page.goto(`${url}/join/?invite=riley-7q2m`);
    const email = page.getByLabel("Email", { exact: true });
    await email.waitFor();
    assert.equal(await email.inputValue(), "riley.park@example.com");
    await email.fill(`edited-${width}@example.com`);
    await page.getByLabel("Full name").fill("Edited Email");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Create account", exact: true }).click();
    await page.waitForURL(/\/profile\/canvas\/$/);
    const changed = await page.evaluate(() => JSON.parse(localStorage.getItem("bg2-sample-v2")));
    assert.equal(changed.invites.find((i) => i.token === "riley-7q2m").usedAt, undefined);
    await page.goto(`${url}/login/`);
    await page.getByRole("link", { name: "Create an account", exact: true }).waitFor();
    // Open sign-up: the link goes to /join/, never to an invitation-only screen.
    assert.equal(await page.getByRole("link", { name: "Create an account", exact: true }).getAttribute("href"), "/join/");
    assert.equal(await page.getByText("Joining is by invitation", { exact: true }).count(), 0);
    assert.deepEqual(errors, []);
    await context.close();
    console.log(`Open signup UI passed at ${width}px: open entry, validation, recovery, editable invite, owner gate, login link.`);
  }
} finally {
  await browser.close();
  server.close();
}

