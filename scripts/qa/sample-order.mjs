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
if (have < 3) await p.locator('#sec-work input[aria-label="Upload showcase image or video"]').setInputFiles(["#c33", "#3c3", "#33c"].slice(0, 3 - have).map((c, i) => ({ name: `s${i}.svg`, mimeType: "image/svg+xml", buffer: png(c) })));
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
// Adjust the fit (Justin, 14 Nov 2026): the whole photo shows at its own ratio with the 16:9 thumbnail frame over
// it and a live 16:9 preview. Saving keeps the photo itself (the lightbox shows it whole) and aligns the thumbnail.
const firstBefore = (await srcs())[0];
const natural = await p.locator("#sec-work figure img").first().evaluate((el) => el.naturalWidth / el.naturalHeight);
await p.getByRole("button", { name: "Adjust the fit of work sample 1" }).click();
const stage = p.getByRole("application", { name: /Thumbnail frame/ });
await stage.waitFor();
await p.locator("[data-fit-frame]").waitFor();
const sb = await stage.boundingBox();
assert.ok(Math.abs(sb.width / sb.height - natural) < 0.02, `the photo shows at its own ratio (${(sb.width / sb.height).toFixed(3)} vs ${natural.toFixed(3)})`);
const ratio = async (sel) => { const b = await p.locator(sel).boundingBox(); return b.width / b.height; };
assert.ok(Math.abs((await ratio("[data-fit-frame]")) - 16 / 9) < 0.03, "the frame is the thumbnail's 16:9");
assert.ok(Math.abs((await ratio("[data-fit-preview]")) - 16 / 9) < 0.03, "the preview is 16:9");
await p.getByRole("slider", { name: "Zoom" }).fill("2");
const fr = await p.locator("[data-fit-frame]").boundingBox();
await p.mouse.move(fr.x + fr.width / 2, fr.y + fr.height / 2); await p.mouse.down(); await p.mouse.move(fr.x + fr.width / 2 + 60, fr.y + fr.height / 2 + 30, { steps: 6 }); await p.mouse.up();
await p.getByRole("button", { name: "Save fit" }).click();
await p.waitForTimeout(400);
const after1 = await srcs();
assert.equal(after1[0], firstBefore, "the photo itself is unchanged (not cropped)");
assert.equal(after1.length, n, "no photo added or lost");
const style = await p.locator("#sec-work figure img").first().getAttribute("style");
assert.ok(/width: 2\d\d(\.\d+)?%/.test(style ?? ""), `the thumbnail shows the zoomed, aligned part (${style})`);
console.log("PASS: work samples reorder by keyboard and by drag, focus follows; Adjust aligns the thumbnail and keeps the photo whole");
} finally { await b.close(); server.close(); }
