// Controlled fixtures and actual exported home HTML/image bytes; no social-platform scraping or remote writes.
import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright-core";
import { serve } from "./serve.mjs";
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const { server, url } = await serve("out", { base });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium" });
fs.mkdirSync("deliverables/social-preview", { recursive: true });
const exported = fs.readFileSync("out/index.html", "utf8");
try {
  for (const width of [320, 768, 1440]) for (const theme of ["light", "dark"]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme, reducedMotion: "reduce" });
    await context.addInitScript(theme => localStorage.setItem("bg-theme", theme), theme);
    const origin = new URL(url).origin; const policies = [];
    await context.route("**/*", async route => {
      const request = route.request(), target = new URL(request.url());
      if (target.origin === origin) return route.continue();
      if (target.hostname === "inspect.between-gigs.com") {
        policies.push({ cookie: request.headers().cookie, referer: request.headers().referer });
        if (["/blocked/", "/broken.jpg"].includes(target.pathname)) return route.abort();
        if (target.pathname === "/missing/") return route.fulfill({ status: 404, contentType: "text/html", body: "Missing", headers: { "Access-Control-Allow-Origin": "*" } });
        let body = exported;
        if (target.pathname === "/fallback/") body = '<html><head><title>Fallback page</title><meta name="description" content="Plain description"></head></html>';
        if (target.pathname === "/hostile/") body = '<html><head><meta property="og:title" content="&lt;img src=x onerror=alert(1)&gt;"><meta property="og:description" content="&lt;script&gt;alert(1)&lt;/script&gt;"><meta property="og:image" content="https://inspect.between-gigs.com/broken.jpg"></head><body><script>window.hostileExecuted=true</script></body></html>';
        return route.fulfill({ status: 200, contentType: "text/html", body, headers: { "Access-Control-Allow-Origin": "*" } });
      }
      if (target.pathname.includes("/og/") && target.pathname.endsWith(".jpg")) {
        const file = `out/og/${target.pathname.split("/").at(-1)}`;
        if (fs.existsSync(file)) return route.fulfill({ contentType: "image/jpeg", body: fs.readFileSync(file) });
      }
      return route.abort();
    });
    const page = await context.newPage(); await page.goto(`${url}/preview/social/`);
    const field = page.getByLabel("Public page URL", { exact: true });
    const inspect = page.getByRole("button", { name: "Inspect page", exact: true });
    const check = async path => { await field.fill(`https://inspect.between-gigs.com/${path}/`); await inspect.click(); };
    await field.focus(); assert.equal(await field.evaluate(el => el === document.activeElement), true);
    assert.ok((await inspect.boundingBox()).height >= 44);
    await check("exported-home"); await page.getByText(/Share image loaded in this browser/).waitFor();
    const card = page.getByRole("region", { name: "Reconstructed share card", exact: true });
    assert.ok(await card.getByRole("heading", { level: 3 }).innerText());
    assert.ok((await card.getByRole("img").evaluate(el => el.naturalWidth)) > 0);
    await page.getByText("Observed metadata", { exact: true }).waitFor();
    await page.screenshot({ path: `deliverables/social-preview/${width}-${theme}.png`, fullPage: true });
    await page.addScriptTag({ content: fs.readFileSync("node_modules/axe-core/axe.min.js", "utf8") });
    const violations = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } })).violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })));
    assert.deepEqual(violations, []);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await check("fallback"); await page.getByRole("heading", { name: "Fallback page", exact: true }).waitFor();
    assert.equal(await card.getByRole("img").count(), 0);
    await page.getByText("No Open Graph or Twitter share image was found.", { exact: true }).waitFor();
    await check("hostile"); await page.getByText(/Share image failed to load/).waitFor();
    assert.equal(await page.evaluate(() => window.hostileExecuted), undefined);
    assert.equal(await card.getByRole("heading", { level: 3 }).innerText(), "<img src=x onerror=alert(1)>");
    await check("missing"); await page.getByRole("alert").getByText("The page returned HTTP 404.", { exact: true }).waitFor();
    assert.equal(await card.count(), 0, "failure clears previous metadata");
    await check("blocked"); await page.getByRole("alert").getByText(/No preview was verified/).waitFor();
    assert.equal(await card.count(), 0);
    assert.ok(policies.length >= 5 && policies.every(p => !p.cookie && !p.referer), "no cookies or referrer sent");
    await context.close();
    console.log(`PASS: social inspector ${width}/${theme}: exported metadata/image, fallback/errors, hostile text isolation, no credentials/referrer, keyboard/axe/fit`);
  }
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
