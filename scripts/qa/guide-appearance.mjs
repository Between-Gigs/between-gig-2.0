// Verify the actual typography and layout inside a live thumbnail against the page it opens.
import assert from "node:assert/strict";
import { chromium } from "playwright-core";
import { serve } from "./serve.mjs";

const { server, url } = await serve("out", { base: process.env.NEXT_PUBLIC_BASE_PATH ?? "" });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium" });

async function appearance(page) {
  await page.locator("main h1").first().waitFor();
  return page.locator("html").evaluate(async (root) => {
    await document.fonts.ready;
    const title = document.querySelector("main h1");
    const style = getComputedStyle(title);
    return {
      look: root.dataset.look,
      mode: root.dataset.theme,
      body: getComputedStyle(root).fontFamily,
      heading: style.fontFamily,
      weight: style.fontWeight,
      size: style.fontSize,
      ready: document.fonts.check(`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`),
    };
  });
}

try {
  for (const [look, mode] of [["editorial", "light"], ["friendly", "dark"], ["classic", "light"], ["swiss", "dark"], ["call-sheet", "dark"], ["modern", "light"]]) {
    // Guide frames are scaled from a 1280px viewport; compare the normal page at the same breakpoint.
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, colorScheme: mode, reducedMotion: "reduce" });
    await context.addInitScript(({ look, mode }) => {
      if (window !== window.top) return;
      localStorage.setItem("bg2-site-look-v2", look);
      localStorage.setItem("bg-theme", mode);
    }, { look, mode });
    // Check local assets even when an external identity provider is unavailable.
    const origin = new URL(url).origin;
    await context.route("**/*", (route) => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    const guide = await context.newPage();
    const target = await context.newPage();
    await guide.goto(`${url}/preview/`);
    await guide.waitForFunction(() => Boolean(window.bgSample));
    for (const [title, route, bodyFamily] of [
      ["Simone", "/p/simone/", look === "modern" ? "Geist" : (look === "friendly" || look === "editorial") ? "Plus Jakarta Sans" : (look === "classic" || look === "call-sheet") ? "Figtree" : "Inter"],
      ["For professionals", "/professionals/", look === "modern" ? "Geist" : (look === "friendly" || look === "editorial") ? "Plus Jakarta Sans" : (look === "classic" || look === "call-sheet") ? "Figtree" : "Inter"],
    ]) {
      const link = guide.locator("main li a").filter({ hasText: title }).first();
      await link.evaluate((element) => element.scrollIntoView({ block: "center", behavior: "instant" }));
      const frame = guide.frameLocator(`iframe[title="Preview of ${title}"]`);
      await frame.locator("html[data-guide-ready]").waitFor({ state: "attached" });
      await target.goto(url + route);
      await target.waitForFunction(() => Boolean(window.bgSample));
      const expected = await appearance(target);
      const actual = await appearance(frame);
      assert.deepEqual(actual, expected, `${title} in ${look}/${mode}`);
      assert.equal(actual.look, look);
      assert.equal(actual.mode, mode);
      assert.equal(actual.ready, true);
      assert.equal(actual.body.split(",")[0].replaceAll('"', "").trim(), bodyFamily);
    }
    await context.close();
    console.log(`Live guide type and layout match opened pages in ${look}/${mode}.`);
  }
} finally {
  await browser.close();
  server.close();
}
