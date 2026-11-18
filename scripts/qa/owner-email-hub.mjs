// Local fictional UI only. All nonlocal traffic is blocked; no email-send endpoint is called.
import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright-core";
import { serve } from "./serve.mjs";
const { server, url } = await serve("out");
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium", args: ["--no-sandbox"] });
fs.mkdirSync("deliverables/owner-email-hub", { recursive: true });
const findings = [];
try {
  for (const width of [390, 1440]) for (const os of ["light", "dark"]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, colorScheme: os, reducedMotion: "reduce" });
    let sends = 0;
    await context.route("**/*", route => {
      const req = route.request();
      if (/sendDiagnostic|testTemplate|inviteAddresses/.test(req.url())) { sends++; return route.abort(); }
      return new URL(req.url()).origin === url ? route.continue() : route.abort();
    });
    await context.addInitScript(theme => { localStorage.setItem("bg-theme", theme); }, os);
    const page = await context.newPage();
    await page.goto(`${url}/hub/`); await page.waitForFunction(() => !!window.bgSample);
    await page.evaluate(() => window.bgSample.signInAs("owner"));
    await page.goto(`${url}/emails/`);
    const cards = page.locator("main ul.grid > li");
    assert.equal(await cards.count(), 6);
    assert.match(await cards.last().innerText(), /Diagnostic email/);
    const heights = await page.locator("main ul.grid > li > div[aria-hidden]").evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().height)));
    assert.equal(new Set(heights).size, 1);
    await page.screenshot({ path: `deliverables/owner-email-hub/list-${width}-${os}.png`, fullPage: true });
    await cards.last().getByRole("link", { name: "Diagnostic email", exact: true }).click();
    await page.getByRole("heading", { name: "Diagnostic email", exact: true }).waitFor();
    const diag = page.frameLocator('iframe[title="Diagnostic email preview"]');
    await diag.getByRole("heading", { name: "Email check" }).waitFor();
    const colors = [];
    for (const scheme of ["light", "dark", "light", "dark"]) {
      await page.getByRole("radiogroup", { name: "Mail client theme" }).getByRole("radio", { name: scheme === "light" ? "Light" : "Dark", exact: true }).click();
      await page.waitForTimeout(100);
      colors.push(await diag.locator("body").evaluate(e => getComputedStyle(e).backgroundColor));
      assert.equal(await diag.locator("html").evaluate(e => e.outerHTML.includes("prefers-color-scheme:dark")), false);
    }
    assert.notEqual(colors[0], colors[1]); assert.equal(colors[0], colors[2]); assert.equal(colors[1], colors[3]);
    await page.getByRole("button", { name: "Phone preview", exact: true }).click();
    await page.getByRole("button", { name: "Desktop preview", exact: true }).click();
    assert.equal(await page.getByRole("button", { name: "Send test email", exact: true }).isDisabled(), true);
    await page.getByRole("radiogroup", { name: "Send type" }).getByRole("radio", { name: "Real email", exact: true }).click();
    assert.equal(await page.getByRole("button", { name: "Real send unavailable", exact: true }).isDisabled(), true);
    await page.getByText("Existing one-time diagnostic authorization and receipt", { exact: true }).click();
    assert.equal(await page.getByRole("button", { name: "Send one diagnostic", exact: true }).isDisabled(), true);
    await page.screenshot({ path: `deliverables/owner-email-hub/diagnostic-${width}-${os}.png`, fullPage: true });
    await page.getByRole("link", { name: "Emails", exact: true }).last().click();
    for (const name of ["invite", "approved", "changes-requested", "profile-submitted", "sign-in-code"]) {
      await page.goto(`${url}/owners/emails/?template=${name}`);
      await page.getByRole("radiogroup", { name: "Screen width" }).waitFor();
      for (const scheme of ["dark", "light"]) {
        await page.getByRole("radiogroup", { name: "Mail client theme" }).getByRole("radio", { name: scheme === "light" ? "Light" : "Dark", exact: true }).click();
        for (const device of ["Phone", "Desktop"]) {
          await page.getByRole("radiogroup", { name: "Screen width" }).getByRole("radio", { name: device, exact: true }).click();
          await page.waitForTimeout(100);
          const frame = page.frameLocator('iframe[title$="theme"]');
          const dims = await frame.locator("body").evaluate(el => ({ scroll: el.scrollWidth, client: el.clientWidth }));
          assert.ok(dims.scroll <= dims.client + 1, `${name} overflow ${width}/${os}/${scheme}/${device}: ${JSON.stringify(dims)}`);
          assert.equal(await frame.locator("a[href]").count(), 0, "live source preview links inert");
        }
      }
      assert.equal(await page.getByRole("button", { name: "Send test email", exact: true }).isDisabled(), true);
      await page.getByRole("radiogroup", { name: "Send type" }).getByRole("radio", { name: "Real email", exact: true }).click();
      await page.getByRole("button", { name: "Real send unavailable", exact: true }).waitFor();
      await page.screenshot({ path: `deliverables/owner-email-hub/${name}-${width}-${os}.png`, fullPage: true });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    }
    assert.equal(sends, 0);
    findings.push({ width, os, diagnosticColors: colors, sends });
    await context.close();
  }
  fs.writeFileSync("deliverables/owner-email-hub/results.json", JSON.stringify(findings, null, 2));
  console.log(JSON.stringify(findings));
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
