// Static fictional previews only. No send, publication or production endpoint is permitted.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";
import { serve } from "./serve.mjs";
const { server, url } = await serve("out");
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium", args: ["--no-sandbox"] });
const out = "deliverables/email-preview-views";
fs.mkdirSync(out, { recursive: true });
const results = [];
try {
  for (const width of [390, 1440]) for (const theme of ["light", "dark"]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, colorScheme: theme });
    let sends = 0;
    await context.route("**/*", route => {
      const request = route.request();
      if (/sendDiagnostic|testTemplate|inviteAddresses|manual|releaseVersion/.test(request.url())) { sends++; return route.abort(); }
      return new URL(request.url()).origin === url ? route.continue() : route.abort();
    });
    const page = await context.newPage();
    await page.goto(`${url}/emails/`);
    const gallery = page.locator("[data-email-gallery]");
    await gallery.locator("iframe").first().waitFor();
    await page.getByRole("radiogroup", { name: "Mail client theme" }).getByRole("radio", { name: theme === "dark" ? "Dark" : "Light", exact: true }).click();
    const count = await gallery.locator(":scope > li").count();
    assert.equal(count, 6);
    assert.match(await gallery.locator(":scope > li").last().innerText(), /Diagnostic email/);
    for (const device of ["Phone", "Desktop"]) {
      await page.getByRole("radiogroup", { name: "Screen width" }).getByRole("radio", { name: device, exact: true }).click();
      for (const mode of ["Full height", "List", "Thumbnails"]) {
        await page.getByRole("radiogroup", { name: "Preview layout" }).getByRole("radio", { name: mode, exact: true }).click();
        if (mode === "List") assert.equal(await gallery.locator("iframe").count(), 0);
        else {
          await gallery.locator("iframe").first().waitFor();
          for (const frame of await gallery.locator("iframe").all()) {
            await frame.evaluate(async el => {
              await el.contentDocument.fonts.ready;
              await Promise.all([...el.contentDocument.images].map(image => image.complete ? Promise.resolve() : new Promise(resolve => {
                image.addEventListener("load", resolve, { once: true }); image.addEventListener("error", resolve, { once: true });
              })));
            });
            await page.waitForFunction(() => [...document.querySelectorAll("[data-email-gallery] iframe")].every(el => el.clientHeight === Math.ceil(el.contentDocument.querySelector("[data-email-preview-content]").getBoundingClientRect().height)));
            const metrics = await frame.evaluate(el => {
              const doc = el.contentDocument, content = doc.querySelector("[data-email-preview-content]");
              const box = el.getBoundingClientRect(), host = el.parentElement.getBoundingClientRect();
              return { viewport: el.clientWidth, height: content.getBoundingClientRect().height,
                documentBottom: box.top + content.getBoundingClientRect().height * (box.width / el.clientWidth), hostBottom: host.bottom,
                title: doc.title, footer: doc.body.textContent.includes("Contact") };
            });
            assert.equal(metrics.viewport, device === "Phone" ? 390 : 640);
            assert.ok(metrics.footer, `${metrics.title} footer exists`);
            assert.ok(metrics.documentBottom <= metrics.hostBottom + 1, `${mode} contains complete ${metrics.title}`);
          }
        }
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        await page.screenshot({ path: `${out}/gallery-${width}-${theme}-${device.toLowerCase()}-${mode.replaceAll(" ", "-").toLowerCase()}.png`, fullPage: true });
      }
    }
    await page.getByRole("radiogroup", { name: "Preview layout" }).getByRole("radio", { name: "Full height", exact: true }).click();
    await page.getByRole("radiogroup", { name: "Mail client theme" }).getByRole("radio", { name: theme === "dark" ? "Dark" : "Light", exact: true }).click();
    const frames = page.frameLocator("[data-email-gallery] li:first-child iframe");
    assert.equal(await frames.locator('meta[name="color-scheme"]').getAttribute("content"), "light", "invitation remains light-only");
    await page.goto(`${url}/emails/invite/`);
    await page.getByRole("radiogroup", { name: "Screen width" }).waitFor();
    for (const device of ["Phone", "Desktop"]) {
      await page.getByRole("radiogroup", { name: "Screen width" }).getByRole("radio", { name: device, exact: true }).click();
      const frame = page.locator('iframe[title$="theme"]');
      assert.equal(await frame.evaluate(el => el.clientWidth), device === "Phone" ? 390 : 640);
    }
    await page.getByRole("tab", { name: "Plain text", exact: true }).click();
    await page.getByText("Your craft. More possibilities.", { exact: false }).last().waitFor();
    assert.equal(sends, 0);
    results.push({ width, theme, cards: count, sends });
    await context.close();
  }
  // Exercise actual React component document replacement and late content changes without application APIs.
  const esbuildDir = fs.readdirSync("node_modules/.pnpm").find(name => name.startsWith("esbuild@"));
  const { build } = await import(pathToFileURL(path.resolve("node_modules/.pnpm/" + esbuildDir + "/node_modules/esbuild/lib/main.js")));
  const entry = `import React from 'react';import {createRoot} from 'react-dom/client';import {EmailPreviewFrame} from './components/emails/EmailPreviewFrame';
    const doc=(height)=>'<html><head><title>Fictional height fixture</title></head><body style="margin:0"><div data-grow style="height:'+height+'px">Fictional content</div><footer>Complete footer</footer></body></html>';
    function Fixture(){const [html,setHtml]=React.useState(doc(1400));return <><button onClick={()=>setHtml(doc(100))}>Short document</button><div style={{width:320}}><EmailPreviewFrame html={html} title="Height fixture" device="desktop" view="full"/></div></>};
    createRoot(document.getElementById('root')).render(<Fixture/>);`;
  const bundle = await build({ stdin: { contents: entry, resolveDir: process.cwd(), loader: "tsx" }, bundle: true, write: false, format: "iife", define: { "process.env.NODE_ENV": '"production"' } });
  const fixtureServer = http.createServer((req, res) => {
    res.setHeader("content-type", req.url === "/fixture.js" ? "text/javascript" : "text/html");
    res.end(req.url === "/fixture.js" ? bundle.outputFiles[0].text : '<html><head><title>Preview height fixture</title><style>.relative{position:relative}.absolute{position:absolute}.top-0{top:0}.origin-top-left{transform-origin:top left}.w-full{width:100%}.overflow-hidden{overflow:hidden}.border-0{border:0}</style></head><body><main id="root"></main><script src="/fixture.js"></script></body></html>');
  });
  await new Promise(resolve => fixtureServer.listen(0, "127.0.0.1", resolve));
  const fixtureOrigin = `http://127.0.0.1:${fixtureServer.address().port}`;
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 1000 } });
    await page.route("**/*", route => new URL(route.request().url()).origin === fixtureOrigin ? route.continue() : route.abort());
    await page.goto(fixtureOrigin);
    await page.waitForFunction(() => document.querySelector("iframe")?.clientHeight >= 1400);
    const before = await page.locator("iframe").evaluate(el => el.clientHeight);
    await page.getByRole("button", { name: "Short document", exact: true }).click();
    await page.waitForFunction(() => document.querySelector("iframe")?.clientHeight < 200);
    const short = await page.locator("iframe").evaluate(el => el.clientHeight);
    // A late image/font or other content resize takes the same observed natural-height path.
    await page.locator("iframe").evaluate(el => { el.contentDocument.querySelector("[data-grow]").style.height = "600px"; });
    await page.waitForFunction(() => document.querySelector("iframe")?.clientHeight >= 600);
    const grown = await page.locator("iframe").evaluate(el => el.clientHeight);
    await page.locator("iframe").evaluate(el => { el.contentDocument.querySelector("[data-grow]").style.height = "100px"; });
    await page.waitForFunction(() => document.querySelector("iframe")?.clientHeight < 200);
    assert.ok(before > grown && grown > short);
    results.push({ fixture: "long-short-late-grow-shrink", before, short, grown, sends: 0 });
    await page.screenshot({ path: `${out}/height-fixture.png`, fullPage: true });
    await page.close();
  } finally { await new Promise(resolve => fixtureServer.close(resolve)); }
  fs.writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 2));
  console.log("PASS: complete gallery views, real desktop/phone viewports, no list iframes, diagnostic last, detail controls and zero sends", results);
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
