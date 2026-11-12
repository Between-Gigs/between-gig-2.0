// First-time sample registration must create a separate draft,
// work while the identity SDK is unavailable, and leave the completed public examples intact.
import assert from "node:assert/strict";
import { chromium } from "playwright-core";
import { serve } from "./serve.mjs";

const { server, url } = await serve("out", { base: process.env.NEXT_PUBLIC_BASE_PATH ?? "" });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium" });
try {
  for (const { name, method, width } of [
    { name: "Simone", method: "Google", width: 1440 },
    { name: "Devon", method: "email", width: 390 },
  ]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    await context.route(/^https:\/\//, (route) => route.abort());
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    await page.goto(`${url}/preview/gigster-journey/`);
    const invitation = page.getByRole("article");
    assert.equal(await invitation.getByRole("link").count(), 1);
    await invitation.getByRole("link", { name: "Create Your Gigster Profile" }).click();
    await page.getByRole("combobox", { name: "Profile example" }).click();
    await page.getByRole("option", { name, exact: true }).click();
    const prefill = page.getByRole("checkbox", { name: "Prefill my test draft with this example" });
    assert.equal(await prefill.isChecked(), false);
    await prefill.check();
    await page.getByRole("button", { name: `Continue with ${method}` }).click();
    const create = page.getByRole("button", { name: "Create my sample profile" });
    await create.click();
    await page.getByRole("alert").filter({ hasText: "Agree" }).waitFor();
    const publicName = `Test ${name}`;
    await page.getByLabel("Public name").fill(publicName);
    await page.getByRole("checkbox", { name: /I agree/ }).check();
    await create.click();
    await page.waitForURL((location) => location.pathname.endsWith("/profile/canvas/") && location.searchParams.get("example") === name.toLowerCase());
    const example = page.getByRole("link", { name: `View ${name}’s completed example`, exact: false });
    await example.waitFor();
    assert.equal(await example.getAttribute("target"), "_blank");
    await page.locator('[data-spot="about"] [data-spot-edit]').first().click();
    const about = page.locator("#f-about");
    await about.fill(`${(await about.inputValue()).slice(0, 300)} I can plan a project around your schedule.`);
    await page.getByRole("button", { name: "Close", exact: true }).last().click();
    await page.getByRole("button", { name: "Send for review", exact: true }).filter({ visible: true }).first().click();
    await page.getByText("Sent for review", { exact: true }).first().waitFor();
    const result = await page.evaluate((slug) => {
      const state = JSON.parse(localStorage.getItem("bg2-sample-v2"));
      return {
        actor: state.people.find((person) => person.id === state.session.personId),
        example: state.people.find((person) => person.id === slug),
      };
    }, name.toLowerCase());
    assert.notEqual(result.actor.id, result.example.id);
    assert.equal(result.actor.name, publicName);
    assert.equal(result.actor.status, "submitted");
    assert.equal(result.example.status, "approved");
    console.log(`Stage 2 ${method} path passed at ${width}px.`);
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}
