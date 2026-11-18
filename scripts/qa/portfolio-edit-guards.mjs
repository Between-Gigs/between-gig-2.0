// Fictional local data only: delayed decoding must never restore a stale portfolio.
import assert from "node:assert/strict";
import { chromium } from "playwright-core";
import { serve } from "./serve.mjs";

const { server, url } = await serve(process.env.OUT_DIR || "out");
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium" });
const read = page => page.evaluate(() => {
  const state = JSON.parse(localStorage.getItem("bg2-sample-v2"));
  return state.drafts.find(d => d.personId === state.session.personId).fields.workSamples;
});
try {
  for (const width of [390, 1440]) for (const theme of ["light", "dark"]) {
    const context = await browser.newContext({ viewport: { width, height: 1100 }, colorScheme: theme });
    await context.route("**/*", route => new URL(route.request().url()).origin === new URL(url).origin ? route.continue() : route.abort());
    const page = await context.newPage();
    await page.goto(url + "/");
    await page.waitForFunction(() => !!window.bgSample);
    await page.evaluate(() => window.bgSample.reset().then(() => window.bgSample.signInAs("gigster", "maya")));
    await page.evaluate(() => {
      const state = JSON.parse(localStorage.getItem("bg2-sample-v2"));
      state.drafts.find(d => d.personId === state.session.personId).fields.workSamples = ["#173f2c", "#b9dec9"].map(color => {
        const canvas = document.createElement("canvas"); canvas.width = 800; canvas.height = 600;
        const ctx = canvas.getContext("2d"); ctx.fillStyle = color; ctx.fillRect(0, 0, 800, 600);
        return canvas.toDataURL("image/jpeg");
      });
      localStorage.setItem("bg2-sample-v2", JSON.stringify(state));
    });
    await page.goto(url + "/profile/canvas/");
    await page.locator("#sec-work figure img").first().waitFor();
    const before = await read(page);
    // Hold the decoded replacement while the user reorders the existing samples.
    let release;
    const pending = new Promise(resolve => release = resolve);
    await page.route("**/qa-delayed-portfolio.jpg", async route => {
      await pending;
      await route.fulfill({ contentType: "image/jpeg", body: Buffer.from(before[0].split(",")[1], "base64") });
    });
    await page.evaluate(() => { window.__createObjectURL = URL.createObjectURL; URL.createObjectURL = () => location.origin + "/qa-delayed-portfolio.jpg"; });
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Replace work sample 1", exact: true }).click();
    await (await chooser).setFiles({ name: "replacement.jpg", mimeType: "image/jpeg", buffer: Buffer.from(before[0].split(",")[1], "base64") });
    await page.locator("#sample-grip-0").press("ArrowRight");
    await page.waitForFunction(before => {
      const state = JSON.parse(localStorage.getItem("bg2-sample-v2"));
      return JSON.stringify(state.drafts.find(d => d.personId === state.session.personId).fields.workSamples) === JSON.stringify([before[1], before[0]]);
    }, before);
    const response = page.waitForResponse("**/qa-delayed-portfolio.jpg"); release(); await response;
    await page.evaluate(() => { URL.createObjectURL = window.__createObjectURL; });
    await page.getByText("Your work samples changed. Choose the photo again.", { exact: true }).waitFor();
    assert.ok(JSON.stringify(await read(page)) === JSON.stringify([before[1], before[0]]), "delayed replacement preserves the user's newer order");
    // A cross-tab list update also invalidates an already-open crop, including same-length replacement.
    await page.getByRole("button", { name: "Adjust the fit of work sample 1", exact: true }).click();
    await page.getByRole("dialog").waitFor();
    const changed = [before[0], before[1]];
    await page.evaluate(changed => {
      const state = JSON.parse(localStorage.getItem("bg2-sample-v2"));
      const draft = state.drafts.find(d => d.personId === state.session.personId);
      draft.fields.workSamples = changed;
      draft.savedAt = new Date(Date.parse(draft.savedAt) + 1000).toISOString();
      localStorage.setItem("bg2-sample-v2", JSON.stringify(state));
      window.dispatchEvent(new StorageEvent("storage", { key: "bg2-sample-v2" }));
    }, changed);
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    assert.deepEqual(await read(page), changed, "invalidated crop never changes a replacement target");
    // A newer selection wins even if the older image finishes last; obsolete reads stay silent.
    let releaseOld;
    const oldPending = new Promise(resolve => releaseOld = resolve);
    await page.route("**/qa-superseded-photo.jpg", async route => {
      await oldPending;
      await route.fulfill({ contentType: "image/jpeg", body: Buffer.from(before[0].split(",")[1], "base64") });
    });
    await page.evaluate(() => {
      let calls = 0;
      window.__photoReadDone = 0; window.__revokeObjectURL = URL.revokeObjectURL;
      URL.createObjectURL = file => ++calls === 1 ? location.origin + "/qa-superseded-photo.jpg" : window.__createObjectURL(file);
      URL.revokeObjectURL = value => { window.__photoReadDone++; window.__revokeObjectURL(value); };
    });
    for (const index of [0, 1]) {
      const nextChooser = page.waitForEvent("filechooser");
      await page.getByRole("button", { name: "Replace work sample 1", exact: true }).click();
      await (await nextChooser).setFiles({ name: `selection-${index}.jpg`, mimeType: "image/jpeg", buffer: Buffer.from(before[index].split(",")[1], "base64") });
    }
    await page.waitForFunction(original => {
      const state = JSON.parse(localStorage.getItem("bg2-sample-v2"));
      return state.drafts.find(d => d.personId === state.session.personId).fields.workSamples[0] !== original;
    }, changed[0]);
    const newest = await read(page);
    releaseOld();
    await page.waitForFunction(() => window.__photoReadDone === 2);
    assert.ok(JSON.stringify(await read(page)) === JSON.stringify(newest), "superseded image cannot replace the newer selection");
    assert.equal(await page.getByText("Your work samples changed. Choose the photo again.", { exact: true }).count(), 0);
    await page.evaluate(() => { URL.createObjectURL = window.__createObjectURL; URL.revokeObjectURL = window.__revokeObjectURL; });
    // A fresh crop still saves normally, and its source image stays intact.
    await page.getByRole("button", { name: "Adjust the fit of work sample 1", exact: true }).click();
    await page.getByRole("slider", { name: "Zoom", exact: true }).fill("2");
    await page.getByRole("button", { name: "Save fit", exact: true }).click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem("bg2-sample-v2")).drafts.find(d => d.personId === "maya").fields.workSamples[0].includes("#fit="));
    const fitted = await read(page);
    assert.equal(fitted[0].split("#fit=")[0], newest[0]); assert.equal(fitted[1], newest[1]);
    console.log(`PASS ${width}/${theme}: stale decode and crop rejected, newer order preserved, fresh crop keeps original`);
    await context.close();
  }
} finally { await browser.close(); server.close(); }
