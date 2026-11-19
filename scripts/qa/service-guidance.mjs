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
// Multiple authored lines make the height change observable even at the widest test viewport.
const shortAnswer = "Set up lights.";
const longAnswer = "Install lights and stands\nSet up safe cable runs\nBalance key and fill\nCheck power loads\nStrike gear after the shoot ends";
const rewrapAnswer = "Pack lights and stands, set up safe cable runs, balance key and fill, test power loads, and strike gear after the shoot.";
assert.equal(longAnswer.length, 120);
assert.equal(rewrapAnswer.length, 120);
const readSize = field => field.evaluate(el => ({
  height: el.clientHeight,
  scrollHeight: el.scrollHeight,
  fieldSizing: getComputedStyle(el).getPropertyValue("field-sizing"),
}));
async function checkAnswerSizing(field, supportsContentSizing, description) {
  await field.fill(shortAnswer);
  const shortSize = await readSize(field);
  if (supportsContentSizing) {
    assert.equal(shortSize.fieldSizing, "content", `${description} opts into supported content sizing`);
    assert.equal(await field.evaluate(el => el.style.height), "", `${description} leaves supported sizing to the browser`);
  } else {
    assert.notEqual(shortSize.fieldSizing, "content", `${description} exercises the JS fallback, not native CSS`);
    assert.match(await field.evaluate(el => el.style.height), /^\d+px$/, `${description} fallback measures the real textarea`);
  }
  await field.fill(longAnswer);
  const longSize = await readSize(field);
  assert.equal(await field.inputValue(), longAnswer, `${description} accepts the exact 120 characters`);
  assert.ok(longSize.height > shortSize.height, `${description} grows after entering the long answer`);
  assert.ok(longSize.scrollHeight <= longSize.height + 1, `${description} displays the full long answer without scrolling`);
  await field.fill(shortAnswer);
  const shrunkSize = await readSize(field);
  assert.ok(shrunkSize.height < longSize.height && Math.abs(shrunkSize.height - shortSize.height) <= 1,
    `${description} shrinks back to its short height after editing`);

  // With neither sizing mechanism active, the standard textarea is still editable and scrollable.
  if (!supportsContentSizing) return;
  const previousStyle = await field.getAttribute("style");
  try {
    await field.evaluate(el => el.style.setProperty("field-sizing", "fixed"));
    const fallbackShort = await readSize(field);
    await field.fill(longAnswer);
    const fallbackLong = await readSize(field);
    assert.equal(await field.inputValue(), longAnswer, `${description} fallback retains all 120 characters`);
    assert.equal(fallbackLong.height, fallbackShort.height, `${description} fallback stays at its original height`);
    assert.ok(fallbackLong.scrollHeight > fallbackLong.height + 1, `${description} fallback provides vertical overflow`);
    assert.ok(await field.evaluate(el => { el.scrollTop = el.scrollHeight; return el.scrollTop > 0; }),
      `${description} fallback scrolls to reveal the end`);
    await field.fill(shortAnswer);
    assert.equal(await field.inputValue(), shortAnswer, `${description} fallback remains editable`);
  } finally {
    await field.evaluate((el, style) => {
      if (style === null) el.removeAttribute("style");
      else el.setAttribute("style", style);
    }, previousStyle);
  }
}

async function checkLegacyRewrap(page, field, description) {
  // Hold text, font, viewport, and theme constant; only resize the textarea.
  // This isolates ResizeObserver from edits and global viewport listeners.
  await page.evaluate(async () => { await document.fonts?.ready; });
  const id = await field.getAttribute("id");
  const previousWidth = await field.evaluate(el => el.style.width);
  const setWidth = width => field.evaluate((el, px) => { el.style.width = `${px}px`; }, width);
  const waitForFittedWidth = (width, minHeight, maxHeight) => page.waitForFunction(
    ([fieldId, px, low, high]) => {
      const el = document.getElementById(fieldId);
      const height = el?.clientHeight;
      return el?.offsetWidth === px && height >= low && height <= high && el.scrollHeight <= height + 1;
    }, [id, width, minHeight, maxHeight],
  );
  try {
    await setWidth(256);
    await field.fill(rewrapAnswer);
    await waitForFittedWidth(256, 1, Number.MAX_SAFE_INTEGER);
    const wide = await readSize(field);
    await setWidth(96);
    await waitForFittedWidth(96, wide.height + 2, Number.MAX_SAFE_INTEGER);
    const narrow = await readSize(field);
    assert.equal(await field.inputValue(), rewrapAnswer, `${description} preserves all text after narrowing`);
    await setWidth(256);
    await waitForFittedWidth(256, wide.height - 1, wide.height + 1);
    const wideAgain = await readSize(field);
    assert.ok(wideAgain.height < narrow.height, `${description} shrinks after widening`);
    assert.equal(await field.inputValue(), rewrapAnswer, `${description} preserves all text after widening`);
  } finally {
    await field.evaluate((el, width) => { el.style.width = width; }, previousWidth);
  }
}
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
  await fixture(page, ["Interior Styling"], "Fictional custom\n" + shortAnswer, { "Interior Styling": shortAnswer });
  const supportsContentSizing = await page.evaluate(() => CSS.supports("field-sizing", "content"));
  await checkAnswerSizing(page.locator("#f-line-0"), supportsContentSizing, "standard answer");
  await checkAnswerSizing(page.locator("#f-other-line"), supportsContentSizing, "custom answer");
  if (width === 320 && theme === "light" && supportsContentSizing) {
    // Simulate the unsupported property for the app, and disable the native rule in the CI engine.
    const legacyPage = await context.newPage();
    legacyPage.setDefaultTimeout(12000);
    legacyPage.on("pageerror", error => errors.push(error.message));
    try {
      await legacyPage.addInitScript(() => {
        const supports = CSS.supports.bind(CSS);
        CSS.supports = (...args) => args[0] === "field-sizing" && args[1] === "content" ? false : supports(...args);
      });
      await fixture(legacyPage, ["Interior Styling"], "Fictional custom\n" + shortAnswer, { "Interior Styling": shortAnswer });
      await legacyPage.addStyleTag({ content: '[id^="f-line-"], #f-other-line { field-sizing: fixed !important; }' });
      await checkAnswerSizing(legacyPage.locator("#f-line-0"), false, "standard answer without native support");
      await checkAnswerSizing(legacyPage.locator("#f-other-line"), false, "custom answer without native support");
      await checkLegacyRewrap(legacyPage, legacyPage.locator("#f-line-0"), "standard answer without native support");
      await checkLegacyRewrap(legacyPage, legacyPage.locator("#f-other-line"), "custom answer without native support");
    } finally { await legacyPage.close(); }
  }
  await fixture(page, ["Interior Styling"]); await section.locator("summary").click();
  await page.addScriptTag({ content: fs.readFileSync("node_modules/axe-core/axe.min.js", "utf8") });
  assert.deepEqual(await section.evaluate(async el => (await window.axe.run(el, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } })).violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) }))), []);
  await section.screenshot({ path: `${dir}/LOCAL-SAMPLE-${width}-${theme}.png` });
  assert.deepEqual(errors, []); assert.deepEqual(external, []);
  await context.close(); console.log(`PASS ${width}/${theme}: 21 examples, seven taglines, keyboard, exact answers, existing-row Other conversion/reload/limits, legacy wording, ${supportsContentSizing ? "grow/shrink and " : ""}scrolling fallback, Axe, no external requests`);
}} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
