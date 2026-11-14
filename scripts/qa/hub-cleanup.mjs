// Actual rendered Hub previews, scoped controls and recoverable email history. No external actions.
import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright-core";
import { serve } from "./serve.mjs";

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const { server, url } = await serve("out", { base });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium" });
fs.mkdirSync("deliverables/hub-cleanup", { recursive: true });
try {
  for (const width of [390, 768, 1440]) for (const theme of ["light", "dark"]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme, reducedMotion: "reduce" });
    await context.addInitScript(t => localStorage.setItem("bg-theme", t), theme);
    const origin = new URL(url).origin;
    await context.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    await page.goto(`${url}/hub/`);
    await page.waitForFunction(() => Boolean(window.bgSample));
    assert.equal(await page.getByRole("heading", { name: "Sample Gigster Profiles", exact: true }).count(), 1);
    const sections = await page.locator('main section[aria-labelledby]').evaluateAll(elements => elements.map(el => el.getAttribute("aria-labelledby")));
    assert.equal(sections.at(-1), "design-system-h", "Design system is last");
    const previous = page.locator('section[aria-labelledby="drafts-h"]');
    for (const path of ["join-v1", "login-v1", "profile-editor-v1"]) {
      assert.equal(await previous.locator(`a[href*="/${path}/"]`).count(), 0);
    }
    const scratchpad = page.locator('section[aria-labelledby="scratchpad-h"]');
    assert.equal(await scratchpad.getByRole("link", { name: /Draft homepage/ }).getAttribute("href"), `${base}/preview/drafts/home-peter/`);
    if (width === 1440 && theme === "light") {
      const report = [];
      const hosts = page.locator("[data-guide-preview-mode]");
      const count = await hosts.count();
      for (let index = 0; index < count; index++) {
        const host = hosts.nth(index);
        await host.scrollIntoViewIfNeeded();
        const iframe = host.locator("iframe");
        await iframe.waitFor();
        const frame = host.frameLocator("iframe");
        await frame.locator("html[data-guide-ready]").waitFor({ state: "attached" });
        await frame.locator("main h1").first().waitFor({ state: "attached" });
        const actual = await iframe.evaluate(el => ({ title: el.title, source: new URL(el.src).pathname,
          path: el.contentWindow.location.pathname, heading: el.contentDocument.querySelector("main h1")?.textContent,
          identity: el.contentWindow.name }));
        assert.equal(actual.path, actual.source, `${actual.title} stays on its intended route`);
        assert.notEqual(actual.heading, "Owners only", `${actual.title} renders content rather than an owner gate`);
        report.push(actual);
      }
      fs.writeFileSync("deliverables/hub-cleanup/rendered-catalog.json", JSON.stringify(report, null, 2));
      console.log(`PASS: inspected all ${count} rendered Hub preview routes and headings`);
    }
    const outerSession = await page.evaluate(() => JSON.parse(localStorage.getItem("bg2-sample-v2") ?? "null")?.session ?? null);
    const journey = page.locator('section[aria-labelledby="journey-h"]');
    for (const [title, route, expected] of [
      ["Edit your profile", "/profile/canvas/", "How I can help"],
      ["Profile submitted", "/profile/submitted/", "Profile submitted."],
    ]) {
      const card = journey.locator("li").filter({ has: page.getByRole("button", { name: new RegExp(`^${title}`) }) });
      await card.scrollIntoViewIfNeeded();
      const frame = card.frameLocator(`iframe[title="Preview of ${title}"]`);
      await frame.locator("html[data-guide-ready]").waitFor({ state: "attached" });
      await frame.getByText(expected, { exact: false }).first().waitFor({ state: "attached" });
      const actualRoute = await frame.locator("html").evaluate(() => location.pathname);
      assert.equal(actualRoute, `${base}${route}`, "protected thumbnail renders requested route, not login");
      assert.equal(await frame.locator("html").evaluate(() => window.name.startsWith("bg-preview:gigster:")), true);
      assert.ok(await frame.locator("body").evaluate(el => !el.innerText.includes("Loading your profile")), "preview content loaded");
    }
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem("bg2-sample-v2") ?? "null")?.session ?? null), outerSession, "thumbnails preserve viewing account");
    const staffCard = page.locator('section[aria-labelledby="tools-h"] li').filter({ has: page.getByRole("button", { name: /^Staff & access/ }) });
    await staffCard.scrollIntoViewIfNeeded();
    await staffCard.frameLocator("iframe").locator("main h1").filter({ hasText: /^Staff$/ }).waitFor({ state: "attached" });
    const group = journey.getByRole("radiogroup", { name: "The Gigster journey previews" });
    const full = group.getByRole("radio", { name: "Full height", exact: true });
    const box = await full.boundingBox();
    assert.ok(box.height >= 44, "preview controls have phone touch targets");
    await group.getByRole("radio", { name: "Thumbnails", exact: true }).focus();
    await page.keyboard.press("ArrowRight");
    assert.equal(await full.getAttribute("aria-checked"), "true", "arrow keys select section view");
    assert.equal(await page.locator('section[aria-labelledby="public-h"] [data-guide-preview-mode="full"]').count(), 0, "neighbor section stays in thumbnail mode");
    const submitted = journey.locator('iframe[title="Preview of Profile submitted"]');
    const submittedCard = journey.locator("li").filter({ has: page.getByRole("button", { name: /^Profile submitted/ }) });
    await submittedCard.scrollIntoViewIfNeeded();
    await submitted.waitFor();
    await submittedCard.frameLocator('iframe[title="Preview of Profile submitted"]').locator("h1").filter({ hasText: "Profile submitted." }).waitFor({ state: "attached" });
    await page.waitForFunction(() => {
      const frame = document.querySelector('iframe[title="Preview of Profile submitted"]');
      return frame?.contentDocument?.documentElement.hasAttribute("data-guide-ready")
        && Number(frame.style.height.replace("px", "")) > 720
        && Number(frame.style.height.replace("px", "")) >= frame.contentDocument.documentElement.scrollHeight - 1;
    });
    const fitted = await submitted.evaluate(async el => {
      let stable = 0, previous = 0;
      for (let attempt = 0; attempt < 300; attempt++) {
        await new Promise(resolve => requestAnimationFrame(resolve));
        const content = el.contentDocument.documentElement.scrollHeight;
        const viewport = Number(el.style.height.replace("px", ""));
        stable = viewport >= content - 1 && content === previous ? stable + 1 : 0;
        if (stable >= 5) return { fits: true, viewport, content };
        previous = content;
      }
      return { fits: false, viewport: el.style.height, content: el.contentDocument.documentElement.scrollHeight };
    });
    assert.ok(fitted.fits, `full page fits measured iframe: ${JSON.stringify(fitted)}`);
    await page.evaluate(() => scrollBy(0, -120));
    await submittedCard.screenshot({ path: `deliverables/hub-cleanup/submitted-${width}-${theme}.png` });
    await page.reload();
    await page.waitForFunction(() => document.querySelector('section[aria-labelledby="journey-h"] [role="radio"][aria-checked="true"]')?.textContent.includes("Full height"));
    assert.equal(await page.locator('section[aria-labelledby="journey-h"]').getByRole("radio", { name: "Full height", exact: true }).getAttribute("aria-checked"), "true", "section preference persists");
    await page.locator('section[aria-labelledby="journey-h"]').getByRole("radio", { name: "Thumbnails", exact: true }).click();
    await page.addScriptTag({ content: fs.readFileSync("node_modules/axe-core/axe.min.js", "utf8") });
    const violations = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } })).violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })));
    assert.deepEqual(violations, [], "Hub accessibility");
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "Hub fits viewport");
    const draftCard = scratchpad.locator("li").filter({ has: page.getByRole("link", { name: /Draft homepage/ }) });
    await draftCard.locator("[data-guide-preview-mode]").scrollIntoViewIfNeeded();
    await draftCard.locator("iframe").waitFor();
    await draftCard.frameLocator("iframe").locator("html[data-guide-ready]").waitFor({ state: "attached" });
    await scratchpad.frameLocator("iframe").locator('[data-preview-title]').waitFor({ state: "attached" }).catch(async error => {
      console.log(await page.locator('[data-guide-preview-mode]').evaluateAll(hosts => hosts.map(host => {
        const frame = host.querySelector("iframe");
        return { text: host.parentElement.parentElement.textContent.slice(0, 80), frame: frame?.title,
          path: frame?.contentWindow.location.pathname, ready: frame?.contentDocument.documentElement.dataset.guideReady,
          body: frame?.contentDocument.body?.innerText.slice(0, 100) };
      })));
      await page.screenshot({ path: `deliverables/hub-cleanup/failure-${width}-${theme}.png`, fullPage: false });
      throw error;
    });
    await page.evaluate(() => scrollBy(0, -120));
    await scratchpad.screenshot({ path: `deliverables/hub-cleanup/scratchpad-${width}-${theme}.png` });
    await scratchpad.getByRole("link", { name: /Draft homepage/ }).click();
    await page.locator('[data-preview-title]').waitFor();
    assert.equal(await page.locator('meta[name="robots"]').getAttribute("content"), "noindex, nofollow");
    await page.goto(`${url}/emails/`);
    assert.equal(await page.locator('main a[href$="/emails/welcome/"], main a[href$="/emails/coming-soon/"]').count(), 0, "retired templates absent from active email list");
    for (const name of ["welcome", "coming-soon"]) {
      await page.goto(`${url}/emails/${name}/`);
      await page.frameLocator("iframe").locator("body").waitFor();
      assert.ok((await page.frameLocator("iframe").locator("body").innerText()).length > 100, "retired direct URL remains recoverable");
    }
    if (width === 390 && theme === "light") {
      for (const [title, path] of [["Edit your profile", "/profile/canvas/"], ["Profile submitted", "/profile/submitted/"]]) {
        await page.goto(`${url}/hub/`);
        await page.locator('section[aria-labelledby="journey-h"]').getByRole("button", { name: new RegExp(`^${title}`) }).click();
        await page.waitForURL(location => location.pathname === `${base}${path}`);
        await page.waitForFunction(() => Boolean(window.bgSample));
        assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("bg2-sample-v2")).session.role), "gigster");
        if (title === "Profile submitted") await page.getByRole("heading", { name: "Profile submitted.", exact: true }).waitFor();
      }
    }
    await context.close();
    console.log(`PASS: Hub cleanup ${width}px/${theme}: rendered profile previews, scoped full-height controls, keyboard/axe, archive recovery and Scratchpad`);
  }
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
