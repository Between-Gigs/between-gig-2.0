// Fictional local state only. No hosted account, approval/publication action, tenant update or sends.
import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright-core";
import { serviceCategories, servicePickerLabel } from "../../lib/profile/service-labels.ts";
import { serve } from "./serve.mjs";
const { server, url } = await serve(process.env.OUT_DIR || "out");
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium" });
const dir = "deliverables/service-labels"; fs.mkdirSync(dir, { recursive: true });
const old = ["Hair Styling", "Makeup Services", "Beauty & Personal Styling", "Wardrobe & Laundry Care", "Event Styling"];
const read = page => page.evaluate(() => { const state = JSON.parse(localStorage.getItem("bg2-sample-v2")); return state.drafts.find(d => d.personId === state.session.personId).fields; });
async function saved(page, expected) { await page.waitForFunction(expected => { const state = JSON.parse(localStorage.getItem("bg2-sample-v2")); const f = state.drafts.find(d => d.personId === state.session.personId).fields; return Object.entries(expected).every(([k, value]) => JSON.stringify(f[k]) === JSON.stringify(value)); }, expected); }
async function fixture(page, services) {
  await page.goto(url + "/"); await page.evaluate(services => { const state = JSON.parse(localStorage.getItem("bg2-sample-v2")); const f = state.drafts.find(d => d.personId === state.session.personId).fields; f.services = services; f.serviceLines = Object.fromEntries(services.map((value, i) => [value, `Exact personal answer ${i}.`])); f.other = ""; localStorage.setItem("bg2-sample-v2", JSON.stringify(state)); }, services);
  await page.goto(url + "/profile/canvas/"); await page.locator("#sec-help").waitFor();
}
try { for (const width of (process.env.QUICK ? [320] : [320, 390, 768, 1440])) for (const theme of (process.env.QUICK ? ["light"] : ["light", "dark"])) {
  const context = await browser.newContext({ viewport: { width, height: 1100 }, colorScheme: theme, reducedMotion: "reduce" }), errors = [], external = [];
  const origin = new URL(url).origin;
  await context.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : (external.push(route.request().url()), route.abort()));
  await context.addInitScript(theme => { localStorage.setItem("bg-theme", theme); localStorage.setItem("bg2-site-look-v2", "editorial"); }, theme);
  const page = await context.newPage(); page.setDefaultTimeout(15000); page.on("pageerror", error => errors.push(error.message));
  await page.goto(url + "/"); await page.waitForFunction(() => !!window.bgSample); await page.evaluate(() => window.bgSample.reset().then(() => window.bgSample.signInAs("gigster", "maya")));
  await fixture(page, []); await page.locator("#f-service-0").click();
  assert.deepEqual((await page.getByRole("option").allTextContents()).map(value => value.trim()), [...serviceCategories.map(category => category.label), "Other — name your service"]);
  await page.keyboard.press("Escape");
  await fixture(page, old); const before = await read(page);
  for (let i = 0; i < old.length; i++) assert.ok((await page.locator(`#f-service-${i}`).innerText()).includes(servicePickerLabel(old[i])));
  assert.deepEqual(await read(page), before, "displaying labels does not rewrite any saved answer");
  await page.locator("#f-line-4").fill("Changed personal event answer."); const lines = { ...before.serviceLines, "Event Styling": "Changed personal event answer." };
  await saved(page, { services: old, serviceLines: lines }); await page.reload(); await page.locator("#f-service-4").waitFor(); assert.deepEqual(await read(page), { ...before, serviceLines: lines });
  await page.locator("#service-grip-4").focus(); await page.keyboard.press("ArrowUp"); const moved = [...old]; [moved[3], moved[4]] = [moved[4], moved[3]];
  await saved(page, { services: moved, serviceLines: lines }); await page.reload(); await page.locator("#f-service-4").waitFor(); assert.deepEqual(await read(page), { ...before, services: moved, serviceLines: lines });
  await page.addScriptTag({ content: fs.readFileSync("node_modules/axe-core/axe.min.js", "utf8") });
  assert.deepEqual(await page.locator("#sec-help").evaluate(async el => (await window.axe.run(el, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } })).violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) }))), []);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await page.locator("#sec-help").screenshot({ path: `${dir}/LOCAL-editor-${width}-${theme}.png` });
  await fixture(page, ["legacy_custom_key"]); await page.locator("#f-service-0").click(); await page.getByRole("option", { name: "legacy_custom_key", exact: true }).waitFor(); await page.keyboard.press("Escape"); assert.deepEqual((await read(page)).services, ["legacy_custom_key"]);
  // Build a read-only public-view fixture directly in local sample storage. No publication gateway is called.
  const person = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("bg2-sample-v2"));
    const person = state.people.find(person => person.id === state.session.personId);
    const profile = state.profiles.find(profile => profile.personId === person.id);
    const fields = state.drafts.find(draft => draft.personId === person.id).fields;
    fields.services = ["Hair Styling", "Makeup Services", "Beauty & Personal Styling", "Event Styling", "Photography & Portraits"];
    fields.serviceLines = Object.fromEntries(fields.services.map((service, index) => [service, `Exact public personal answer ${index}.`]));
    fields.other = "PRIVATE-FIXTURE-CUSTOM-SERVICE"; fields.position = ""; fields.skills = [];
    profile.fields = structuredClone(fields); profile.extras = { ...profile.extras, helps: [] }; person.status = "published";
    const contrast = state.people.find(candidate => candidate.id !== person.id && state.profiles.some(profile => profile.personId === candidate.id));
    const contrastProfile = state.profiles.find(profile => profile.personId === contrast.id);
    contrastProfile.fields.services = ["Makeup Services"]; contrast.status = "published";
    localStorage.setItem("bg2-sample-v2", JSON.stringify(state));
    return { slug: person.slug, name: person.name, fields: structuredClone(profile.fields), contrastName: contrast.name };
  });
  for (const look of ["editorial", "swiss", "modern", "friendly"]) {
    await page.goto(`${url}/p/${person.slug}/?look=${look}`); await page.getByRole("heading", { name: person.name, exact: true }).first().waitFor();
    for (const label of ["Beauty, Hair & Makeup", "Parties & Event Planning", "Photography & Videography"]) {
      const matches = await page.getByText(label, { exact: true }).all();
      assert.ok((await Promise.all(matches.map(match => match.isVisible()))).some(Boolean), `${look} displays ${label}`);
    }
    if (look === "editorial") for (const line of Object.values(person.fields.serviceLines)) await page.getByText(line, { exact: true }).waitFor();
    assert.deepEqual(await page.evaluate(slug => { const state = JSON.parse(localStorage.getItem("bg2-sample-v2")); const who = state.people.find(person => person.slug === slug); return state.profiles.find(profile => profile.personId === who.id).fields; }, person.slug), person.fields, "public label rendering never rewrites stored fields");
    assert.equal((await page.locator("body").innerText()).includes("PRIVATE-FIXTURE-CUSTOM-SERVICE"), false);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.screenshot({ path: `${dir}/LOCAL-${look}-${width}-${theme}.png` });
  }
  await page.goto(url + "/"); await page.waitForFunction(() => !!window.bgSample); await page.evaluate(() => window.bgSample.signInAs("owner"));
  await page.goto(url + "/owners/people/?service=Hair%20Styling");
  await page.getByRole("heading", { name: "People", exact: true, level: 1 }).waitFor();
  if (width < 768) await page.getByRole("button", { name: /^More filters/ }).click();
  const filter = width < 768 ? page.getByRole("dialog", { name: "More filters", exact: true }).getByRole("combobox", { name: "Service", exact: true }) : page.getByRole("combobox", { name: "Service", exact: true });
  await filter.waitFor(); await filter.getByText("Hair Styling", { exact: true }).waitFor();
  const results = page.locator('section[aria-label="Results"]');
  await results.getByText(person.name, { exact: true }).waitFor();
  assert.equal(await results.getByText(person.contrastName, { exact: true }).count(), 0, "old Hair filter excludes Makeup-only profiles");
  await filter.click(); await page.getByRole("option", { name: "Beauty, Hair & Makeup", exact: true }).click();
  await results.getByText(person.contrastName, { exact: true }).waitFor();
  await filter.click(); await page.getByRole("option", { name: "Parties & Event Planning", exact: true }).click();
  await filter.getByText("Parties & Event Planning", { exact: true }).waitFor();
  await results.getByText(person.contrastName, { exact: true }).waitFor({ state: "hidden" });
  if (width < 768) await page.getByRole("button", { name: /^Show [0-9]+ (person|people)$/ }).click();
  await page.getByText(person.name, { exact: true }).first().waitFor();
  assert.deepEqual(errors, []); assert.deepEqual(external, []);
  await context.close(); console.log(`PASS ${width}/${theme}: seven supported choices, labels without data rewrite, legacy/unknown/reorder/autosave, four public layouts/private exclusion, owner bookmark/alias filter, Axe/overflow`);
}} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
