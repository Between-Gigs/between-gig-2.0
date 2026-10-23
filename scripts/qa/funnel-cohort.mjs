// Sample-mode browser regression: funnel selections exclude open accounts; headline tabs retain them.
import assert from "node:assert/strict";
import { chromium } from "playwright-core";
import { serve } from "./serve.mjs";
const { server, url } = await serve("out");
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium" });
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    await page.goto(`${url}/preview/`);
    await page.waitForFunction(() => !!window.bgSample);
    await page.evaluate(async () => {
      await window.bgSample.reset();
      await window.bgSample.signInAs("owner");
      const state = JSON.parse(localStorage.getItem("bg2-sample-v2"));
      const template = state.people.find((p) => p.status === "approved");
      const fields = state.profiles.find((p) => p.personId === template.id).fields;
      for (const status of ["draft", "submitted", "approved"]) {
        const id = `qa-open-${status}`;
        const name = `Open ${status} QA`;
        state.people.push({ ...template, id, email: `${id}@example.test`, name, slug: id, status, invitedAt: "", updatedAt: new Date().toISOString() });
        state.profiles.push({ personId: id, fields: { ...fields, name }, submittedAt: new Date().toISOString() });
      }
      localStorage.setItem("bg2-sample-v2", JSON.stringify(state));
    });
    await page.goto(`${url}/owners/`);
    const list = page.locator("#dash-list");
    const count = (name) => list.locator("button").filter({ hasText: name }).count();
    await page.getByRole("tab", { name: /^Waiting for review/ }).click();
    assert.equal(await count("Open submitted QA"), 1);
    await page.getByRole("radio", { name: "Funnel", exact: true }).click();
    await page.getByRole("button", { name: /^Submitted a profile/ }).click();
    assert.equal(await count("Open submitted QA"), 0);
    await page.getByRole("tab", { name: /^Waiting for review/ }).click();
    assert.equal(await count("Open submitted QA"), 1);
    await page.getByRole("tab", { name: /^Live profiles/ }).click();
    assert.equal(await count("Open approved QA"), 1);
    await page.getByRole("button", { name: /^Approved/ }).click();
    assert.equal(await count("Open approved QA"), 0);
    await page.getByRole("tab", { name: /^Live profiles/ }).click();
    assert.equal(await count("Open approved QA"), 1);
    await page.getByRole("button", { name: /^Created an account/ }).click();
    assert.equal(await count("Open draft QA"), 0);
    await context.close();
    console.log(`Funnel drill-down passed at ${width}px: invited-only stage lists and global headline lists.`);
  }
} finally {
  await browser.close();
  server.close();
}
