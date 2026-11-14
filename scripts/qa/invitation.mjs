// Canonical invite and preserved journey stages. Sample data only; never submits or sends email.
import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright-core";
import { serve } from "./serve.mjs";

const { server, url } = await serve("out", { base: process.env.NEXT_PUBLIC_BASE_PATH ?? "" });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium" });
fs.mkdirSync("deliverables/invitation", { recursive: true });
try {
  for (const width of [390, 768, 1440]) for (const theme of ["light", "dark"]) for (const blocked of [false, true]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme, reducedMotion: "reduce" });
    await context.addInitScript(t => localStorage.setItem("bg-theme", t), theme);
    if (blocked) await context.route(/\/email\/.*\.(?:png|jpg|webp)/, route => route.abort());
    const page = await context.newPage();
    await page.goto(`${url}/emails/invite/`);
    const frame = page.frameLocator("iframe");
    await frame.getByRole("heading", { name: "Your craft. More possibilities." }).waitFor();
    assert.equal(await frame.getByRole("link", { name: /^Create your profile/ }).count(), 1);
    const cta = frame.getByRole("link", { name: /^Create your profile/ });
    assert.match(await cta.getAttribute("href"), /\/join\/\?invite=/);
    await cta.focus();
    assert.equal(await cta.evaluate(el => el === document.activeElement), true, "CTA is keyboard focusable");
    await frame.getByText("Welcome to Stage 2: Building our Gigster community!", { exact: true }).waitFor();
    assert.equal(await frame.getByText("Between Gigs · 11766 Wilshire Blvd, Los Angeles, CA 90025", { exact: true }).count(), 1);
    assert.equal(await frame.locator('[data-email-unsubscribe]').getAttribute("aria-disabled"), "true");
    assert.equal(await frame.getByRole("link", { name: "Unsubscribe", exact: true }).count(), 0);
    assert.equal(await frame.getByRole("link", { name: "Privacy", exact: true }).getAttribute("href"), "https://between-gigs.com/privacy");
    assert.equal(await frame.getByRole("link", { name: "Contact support", exact: true }).getAttribute("href"), "mailto:hello@between-gigs.com");
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "page fits viewport");
    assert.ok(await frame.locator("html").evaluate(el => el.scrollWidth <= innerWidth + 1), "email fits iframe");
    assert.equal(await frame.locator('meta[name="color-scheme"]').getAttribute("content"), "light");
    await page.getByRole("radio", { name: "Dark", exact: true }).click();
    assert.equal(await frame.locator('meta[name="color-scheme"]').getAttribute("content"), "light");
    await page.screenshot({ path: `deliverables/invitation/${width}-${theme}${blocked ? "-images-blocked" : ""}.png`, fullPage: true });
    await page.goto(`${url}/preview/gigster-journey/?source=legacy#invite`);
    await page.waitForURL(location => location.pathname.endsWith("/emails/invite/") && location.searchParams.get("source") === "legacy" && location.hash === "#invite");
    await page.goto(`${url}/preview/gigster-journey/account/`);
    await page.getByRole("heading", { name: "Create your Gigster account." }).waitFor();
    assert.equal(await page.getByRole("link", { name: "1 · Invitation" }).getAttribute("href"), `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/emails/invite/`);
    await context.close();
  }
  console.log("PASS: canonical invitation, copy, footer, keyboard CTA, light intent in both themes, images-blocked fallback, legacy alias and account stage at 390/768/1440px (12 layouts)");
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
