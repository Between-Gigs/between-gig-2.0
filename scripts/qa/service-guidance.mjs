// Fictional local sample only; no hosted accounts, publication, sends or backend option changes.
import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright-core";
import { serviceExamples } from "../../lib/profile/service-examples.ts";
import { serve } from "./serve.mjs";
const { server, url } = await serve(process.env.OUT_DIR || "out");
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium" });
const dir = "deliverables/service-guidance"; fs.mkdirSync(dir, { recursive: true });
const read = page => page.evaluate(() => { const state = JSON.parse(localStorage.getItem("bg2-sample-v2")); return state.drafts.find(d => d.personId === state.session.personId).fields; });
const personal = "My exact personal answer. No example may replace it.";
async function fixture(page, services, other = "", lines) {
  await page.goto(url + "/");
  await page.evaluate(({ services, other, personal, lines }) => { const state = JSON.parse(localStorage.getItem("bg2-sample-v2")); const f = state.drafts.find(d => d.personId === state.session.personId).fields; f.services = services; f.serviceLines = lines || Object.fromEntries(services.map(s => [s, personal])); f.other = other; localStorage.setItem("bg2-sample-v2", JSON.stringify(state)); }, { services, other, personal, lines });
  await page.goto(url + "/profile/canvas/"); await page.locator("#sec-help").waitFor();
}
async function saved(page, expected) {
  await page.waitForFunction(expected => { const state = JSON.parse(localStorage.getItem("bg2-sample-v2")); const f = state.drafts.find(d => d.personId === state.session.personId).fields; return Object.entries(expected).every(([k, v]) => JSON.stringify(f[k]) === JSON.stringify(v)); }, expected);
}
try { for (const width of [320, 390, 768, 1440]) for (const theme of ["light", "dark"]) {
  const context = await browser.newContext({ viewport: { width, height: 1100 }, colorScheme: theme, reducedMotion: "reduce" }), errors = [], external = [];
  const origin = new URL(url).origin;
  await context.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : (external.push(route.request().url()), route.abort()));
  await context.addInitScript(theme => localStorage.setItem("bg-theme", theme), theme);
  const page = await context.newPage(); page.setDefaultTimeout(12000); page.on("pageerror", error => errors.push(error.message));
  await page.goto(url + "/"); await page.waitForFunction(() => !!window.bgSample); await page.evaluate(() => window.bgSample.reset().then(() => window.bgSample.signInAs("gigster", "maya")));
  for (const category of serviceExamples) {
    await fixture(page, [category.value]); const before = await read(page), section = page.locator("#sec-help");
    await section.getByText(category.tagline, { exact: true }).waitFor();
    const summary = section.locator("summary");
    const field = page.locator("#f-line-0");
    assert.equal(await field.evaluate(el => Boolean(el.compareDocumentPosition(el.closest("li")?.querySelector("summary")) & Node.DOCUMENT_POSITION_FOLLOWING)), true, "examples follow the personal answer in reading order");
    const [examplesBox, fieldBox] = await Promise.all([summary.boundingBox(), field.boundingBox()]);
    assert.ok(examplesBox.y > fieldBox.y + fieldBox.height, "examples appear under the answer at every width");
    assert.ok(examplesBox.x >= fieldBox.x && examplesBox.x + examplesBox.width <= fieldBox.x + fieldBox.width + 1, "guidance shares the answer column");
    assert.ok(!await field.getAttribute("placeholder"), "the answer field does not repeat its label as a placeholder");
    await summary.focus(); await page.keyboard.press("Enter");
    for (const example of category.examples) { await section.getByText(example.title, { exact: true }).waitFor(); await section.getByText(example.description, { exact: true }).waitFor(); }
    assert.equal(await page.locator("#f-line-0").inputValue(), personal);
    assert.equal((await section.innerText()).includes("Example: Hang artwork and style a room for a party."), false);
    assert.deepEqual(await read(page), before, "opening guidance never changes saved fields");
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  }
  await fixture(page, ["Interior Styling", "Event Styling", "Hair Styling", "Makeup Services", "Unlisted legacy service"]);
  const before = await read(page), section = page.locator("#sec-help");
  await page.locator("#f-service-4").click(); await page.getByRole("option", { name: "Unlisted legacy service", exact: true }).waitFor(); await page.keyboard.press("Escape");
  await page.locator("#f-service-0").click(); await page.getByRole("option", { name: "Other — name your service", exact: true }).click();
  const expectedOther = "Interior Styling\n" + personal;
  await saved(page, { services: before.services.slice(1), other: expectedOther });
  await page.waitForFunction(() => document.activeElement?.id === "f-other");
  assert.equal(await page.locator("#f-other-line").inputValue(), personal);
  assert.equal(await section.getByRole("button", { name: /Add another service/ }).count(), 0, "conversion preserves the fifth slot");
  await page.locator("#f-service-0").click(); assert.equal(await page.getByRole("option", { name: "Other — name your service", exact: true }).count(), 0, "an existing custom answer cannot be overwritten"); await page.keyboard.press("Escape");
  await page.reload(); await page.locator("#f-other").waitFor();
  const after = await read(page), lines = { ...before.serviceLines }; delete lines["Interior Styling"];
  assert.deepEqual(after, { ...before, services: before.services.slice(1), serviceLines: lines, other: expectedOther });
  // Renaming a legacy custom service does not flatten or truncate its personal wording.
  const longLine = "First exact line\n" + "x".repeat(150);
  await fixture(page, ["Hair Styling"], "Legacy custom\n" + longLine);
  await page.locator("#f-other").fill("Renamed custom"); await saved(page, { other: "Renamed custom\n" + longLine }); await page.reload(); await page.locator("#f-other").waitFor(); assert.equal(await page.locator("#f-other-line").inputValue(), longLine);
  const full = (fieldId) => page.locator(fieldId).evaluate(el => el.value.length === 120 && el.scrollHeight <= el.clientHeight + 1);
  const maxText = Array.from({length: 24}, () => "wrap").join(" ").padEnd(120, "z");
  await fixture(page, ["Interior Styling"], "Fictional custom\n" + maxText, {"Interior Styling": maxText});
  assert.ok(await full("#f-line-0"), "all 120 standard characters are visible at this width");
  assert.ok(await full("#f-other-line"), "all 120 custom characters are visible at this width");
  await page.locator("#f-line-0").fill(maxText.replaceAll("wrap", "wide"));
  assert.ok(await full("#f-line-0"), "the answer resizes after editing");
  await fixture(page, ["Interior Styling"]); await section.locator("summary").click();
  await page.addScriptTag({ content: fs.readFileSync("node_modules/axe-core/axe.min.js", "utf8") });
  assert.deepEqual(await section.evaluate(async el => (await window.axe.run(el, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } })).violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) }))), []);
  await section.screenshot({ path: `${dir}/LOCAL-SAMPLE-${width}-${theme}.png` });
  assert.deepEqual(errors, []); assert.deepEqual(external, []);
  await context.close(); console.log(`PASS ${width}/${theme}: 21 examples, seven taglines, keyboard, exact answers, existing-row Other conversion/reload/limits, legacy wording, Axe, no external requests`);
}} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
