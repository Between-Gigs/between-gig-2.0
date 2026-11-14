// Work samples in the profile editor can be reordered by drag and by keyboard (Justin, 14 Nov 2026). Sample data only.
import assert from "node:assert/strict";
import { chromium } from "playwright-core"; import { serve } from "./serve.mjs";
const { server, url } = await serve("out"); const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium" });
try {
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
await p.goto(url + "/"); await p.waitForFunction(() => "bgSample" in window);
await p.evaluate(() => window.bgSample.reset().then(() => window.bgSample.signInAs("gigster", "maya")));
await p.goto(url + "/profile/canvas/"); await p.waitForLoadState("networkidle"); await p.waitForTimeout(800);
// add three images through the file input
const png = (c) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="${c}"/></svg>`);
const have = await p.locator("#sec-work img").count();
if (have < 3) await p.locator('#sec-work input[type=file]').setInputFiles(["#c33", "#3c3", "#33c"].slice(0, 3 - have).map((c, i) => ({ name: `s${i}.svg`, mimeType: "image/svg+xml", buffer: png(c) })));
await p.waitForTimeout(1000);
const srcs = () => p.locator("#sec-work figure img").evaluateAll((els) => els.map((e) => e.src.slice(-24)));
const before = await srcs();
assert.equal(await p.locator('[id^="sample-grip-"]').count(), 3, "one handle per photo");
await p.locator("#sample-grip-0").focus(); await p.keyboard.press("ArrowRight"); await p.waitForTimeout(300);
const after = await srcs();
assert.ok(before[0] === after[1] && before[1] === after[0], "ArrowRight moves the photo one place later");
assert.equal(await p.evaluate(() => document.activeElement?.id), "sample-grip-1", "focus follows the photo");
// drag grip of the last onto the first
const n = after.length; const g = await p.locator(`#sample-grip-${n - 1}`).boundingBox(); const first = await p.locator("#sec-work figure").first().boundingBox();
await p.mouse.move(g.x + 10, g.y + 10); await p.mouse.down(); await p.mouse.move(first.x + 40, first.y + 60, { steps: 12 }); await p.mouse.up(); await p.waitForTimeout(300);
const dragged = await srcs();
assert.equal(dragged[0], after[n - 1], "dragging the last photo onto the first makes it first");
// Adjust the fit: the cropper opens in the thumbnail's 16:9 shape; dragging and saving replaces the photo with a
// 1200 × 675 crop, and the grid keeps its order.
const firstBefore = (await srcs())[0];
await p.getByRole("button", { name: "Adjust the fit of work sample 1" }).click();
const frame = p.getByRole("application", { name: /Photo position/ });
await frame.waitFor();
const fb = await frame.boundingBox();
assert.ok(Math.abs(fb.width / fb.height - 16 / 9) < 0.02, `crop frame is 16:9 (${(fb.width / fb.height).toFixed(3)})`);
await p.getByRole("slider", { name: "Zoom" }).focus(); await p.keyboard.press("ArrowRight"); await p.keyboard.press("ArrowRight");
await p.mouse.move(fb.x + fb.width / 2, fb.y + fb.height / 2); await p.mouse.down(); await p.mouse.move(fb.x + fb.width / 2 + 40, fb.y + fb.height / 2 + 20, { steps: 6 }); await p.mouse.up();
await p.getByRole("button", { name: "Save fit" }).click();
await p.waitForTimeout(400);
const fitted = await p.locator("#sec-work figure img").first().evaluate((el) => ({ src: el.src.slice(-24), w: el.naturalWidth, h: el.naturalHeight }));
assert.notEqual(fitted.src, firstBefore, "the adjusted crop replaces the photo");
assert.equal(fitted.w, 1200); assert.equal(fitted.h, 675);
assert.equal((await srcs()).length, n, "no photo added or lost");
console.log("PASS: work samples reorder by keyboard and by drag, focus follows; Adjust saves a 16:9 crop in place");
} finally { await b.close(); server.close(); }
