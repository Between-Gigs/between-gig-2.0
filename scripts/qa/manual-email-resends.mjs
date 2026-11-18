// Owner UI fixture. All application requests are intercepted with fictional data.
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import tailwind from "@tailwindcss/postcss";
import { chromium } from "playwright-core";

const require = createRequire(import.meta.url);
const postcss = createRequire(require.resolve("@tailwindcss/postcss"))("postcss");
const esbuildDir = fs.readdirSync("node_modules/.pnpm").find(name => name.startsWith("esbuild@"));
const { build } = await import(pathToFileURL(path.resolve(`node_modules/.pnpm/${esbuildDir}/node_modules/esbuild/lib/main.js`)));
const entry = `
  import React from 'react';
  import {createRoot} from 'react-dom/client';
  import {EmailActions} from './components/emails/EmailActions';
  const root = createRoot(document.getElementById('root'));
  const render = (name = 'profile-submitted') => root.render(
    <>
      <span hidden data-fixture-template={name} />
      <EmailActions name={name} status={{testEnabled:true}}/>
    </>,
  );
  window.fixtureTemplate = render;
  render();
`;
const bundle = await build({
  stdin: { contents: entry, resolveDir: process.cwd(), loader: "tsx" },
  bundle: true, write: false, format: "iife", define: { "process.env.NODE_ENV": '"production"' },
  plugins: [{ name: "fake-owner-only", setup(builder) {
    builder.onResolve({ filter: /^@\/lib\/(data(?:\/api)?|session|site|auth\/clerk)$/ }, args => ({ path: args.path, namespace: "fake" }));
    builder.onLoad({ filter: /.*/, namespace: "fake" }, args => {
      const sources = {
        "@/lib/data": 'export const data={kind:"live"}',
        "@/lib/data/api": 'export const apiSource={token:async()=>window.fixtureTokenUnavailable ? null : window.fixtureOwner??"first-owner"}',
        "@/lib/site": 'export const basePath=""',
        "@/lib/auth/clerk": "export const clerkEnabled=true",
        "@/lib/session": `
          import {useState,useEffect} from "react";
          export const useSession=()=>{
            const [id,set]=useState(window.fixtureOwner??"first-owner");
            useEffect(()=>{
              const changed=()=>set(window.fixtureOwner);
              window.addEventListener("fixture-owner",changed);
              return()=>window.removeEventListener("fixture-owner",changed);
            },[]);
            return {session:{personId:id,email:id+"@example.org",role:"owner"},loading:false};
          };
        `,
      };
      return { contents: sources[args.path], resolveDir: process.cwd() };
    });
  } }],
});

const js = bundle.outputFiles[0].text;
const css = (await postcss([tailwind()]).process(fs.readFileSync("app/globals.css", "utf8"), { from: path.resolve("app/globals.css") })).css;
const doc = '<!doctype html><html lang="en"><meta charset="utf-8"><title>Manual email fixture</title><link rel="stylesheet" href="/fixture.css"><main class="mx-auto grid max-w-3xl gap-4 p-4" id="root"></main><script src="/fixture.js"></script></html>';
const assets = new Map([["/fixture.js", ["text/javascript", js]], ["/fixture.css", ["text/css", css]], ["/", ["text/html", doc]]]);
const server = http.createServer((req, res) => {
  const file = req.url.match(/^\/(?:[\w-]+\/)*([\w-]+\.woff2)$/)?.[1];
  const font = file && path.join("packages/design-system/fonts", file);
  if (font && fs.existsSync(font)) {
    res.writeHead(200, { "content-type": "font/woff2" });
    return res.end(fs.readFileSync(font));
  }
  const asset = assets.get(req.url);
  if (!asset) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": asset[0] });
  res.end(asset[1]);
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium", args: ["--no-sandbox"] });
const output = "deliverables/manual-email-resends";
fs.mkdirSync(output, { recursive: true });

const recipient = "riley@example.org";
const otherRecipient = "casey@example.org";
const date = "2026-11-18T00:00:00.000Z";
const initialHash = "a".repeat(64);
const binding = {
  templateKey: "profile_submitted", recipient, contextId: "821515aa-dc6d-4db4-b035-41df53497977",
  eventId: "238e5879-33c9-4e7e-b5ae-aab42ef6c496", releaseId: "fd450ff6-95ee-4618-abdd-fc101abcb62a",
  fingerprint: "b".repeat(64),
};
const releaseTemplate = {
  templateId: "2623f6ec-c620-4adc-a2f6-ad2dd804dd33", id: binding.releaseId, sourceHash: initialHash,
  subject: "Stored subject", body: "Stored template with {{name}}", bodyHtml: "<h1>Stored HTML</h1>",
  createdAt: date, approvedAt: null, publishedAt: null,
};
const storedVersion = (current, sourceHash = initialHash, history = current ? [current] : []) => ({
  supported: true, templateId: releaseTemplate.templateId, sourceHash, current, releases: history,
});
const receipt = (requestId, status, address = recipient) => ({
  requestId, status, recipient: address, requestedAt: date, providerId: null, sentAt: null, deliveredAt: null, error: null,
});

async function fixture(width, theme) {
  const context = await browser.newContext({ viewport: { width, height: 950 }, colorScheme: theme, reducedMotion: "reduce" });
  await context.addInitScript(theme => document.documentElement.setAttribute("data-theme", theme), theme);
  const calls = [];
  const unexpected = [];
  const published = { ...releaseTemplate, status: "published", approvedAt: date, publishedAt: date };
  const controls = {
    status: { "profile-submitted": storedVersion(published), "changes-requested": storedVersion(null) },
    previewReason: null, receiptStatus: null, uncertainSend: true, sendRefusal: null, staleRelease: false, unavailableStatus: false,
  };
  await context.route("**/*", async route => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin !== origin) { unexpected.push(req.url()); return route.abort(); }
    const method = url.pathname.match(/^\/api\/emails\/([A-Za-z]+)\/$/)?.[1];
    if (!method) return route.continue();
    const { args: [payload] } = req.postDataJSON();
    calls.push({ method, payload, actor: req.headers().authorization });
    const result = body => route.fulfill({ contentType: "application/json", json: { result: body } });
    const error = (status, code) => route.fulfill({ status, contentType: "application/json", json: { error: code } });
    switch (method) {
      case "manualStatus":
        if (controls.unavailableStatus) return error(404, "unsupported");
        return result(controls.status[payload] ?? { supported: false, current: null, templateId: null, sourceHash: null, releases: [], reason: "template_missing" });
      case "previewReal":
        assert.equal(payload.name, "profile-submitted");
        assert.ok([recipient, otherRecipient].includes(payload.recipient));
        if (controls.previewReason) return result({ available: false, reason: controls.previewReason });
        return result({
          available: true, binding: { ...binding, recipient: payload.recipient }, subject: "Actual rendered subject", body: "Actual rendered notification for Riley",
          bodyHtml: '<h1>Actual rendered HTML</h1><img src="https://remote.invalid/preview.png" alt="">',
          person: { id: "fictional-account", name: "Fictional Account", email: payload.recipient }, contextState: "submitted",
          originalReceipt: receipt("original-fixture", "sent"),
        });
      case "sendReal":
        if (controls.sendRefusal) return error(controls.sendRefusal.status, controls.sendRefusal.code);
        if (controls.uncertainSend) return error(503, "unavailable");
        return result(receipt(payload.requestId, "queued", payload.binding.recipient));
      case "realReceipt":
        if (!controls.receiptStatus) return error(404, "receipt_missing");
        const target = calls.find(call => call.method === "sendReal" && call.payload.requestId === payload.requestId);
        return result(receipt(payload.requestId, controls.receiptStatus, target?.payload.binding.recipient));
      case "releaseVersion": {
        assert.equal(payload.name, "changes-requested");
        assert.equal(payload.templateId, releaseTemplate.templateId);
        if (controls.staleRelease) {
          controls.status[payload.name] = storedVersion(controls.status[payload.name].current, "c".repeat(64), controls.status[payload.name].releases);
          return error(409, "source_changed");
        }
        const status = { draft: "draft", approve: "approved", publish: "published" }[payload.action];
        assert.ok(status);
        assert.equal(payload.sourceHash, initialHash);
        assert.equal(payload.releaseId, payload.action === "draft" ? undefined : releaseTemplate.id);
        controls.status[payload.name] = storedVersion({ ...releaseTemplate, status });
        return result(controls.status[payload.name]);
      }
      default:
        unexpected.push(req.url());
        return route.abort();
    }
  });
  const page = await context.newPage();
  const button = name => page.getByRole("button", { name, exact: true });
  const mode = name => page.getByRole("radio", { name, exact: true });
  const count = method => calls.filter(call => call.method === method).length;
  const select = async name => {
    await page.evaluate(name => window.fixtureTemplate(name), name);
    // root.render schedules work. The fixture marker and the corresponding controls commit together.
    await page.locator(`[data-fixture-template="${name}"]`).waitFor({ state: "attached" });
  };
  return { context, page, mode, button, calls, count, controls, select, unexpected };
}

try {
  for (const width of [390, 1360]) for (const theme of ["light", "dark"]) {
    const { context, page, mode, button, calls, count, controls, select, unexpected } = await fixture(width, theme);
    await page.goto(origin);
    await button("Revoke published version").waitFor();
    assert.equal(await mode("Test email").getAttribute("aria-checked"), "true");
    await mode("Test email").focus();
    await page.keyboard.press("ArrowRight");
    assert.equal(await mode("Real email").getAttribute("aria-checked"), "true");
    const address = page.getByLabel("Account email address");
    await address.fill("riley@example.org, another@example.org");
    assert.equal(await button("Review real email").isDisabled(), true);
    await address.fill("riley@example.org\n");
    assert.equal(await button("Review real email").isDisabled(), true);
    await address.fill(" RILEY@EXAMPLE.ORG ");
    controls.previewReason = "manual_sends_disabled";
    await button("Review real email").click();
    await page.getByText("Manual resends are disabled in Company OS.").waitFor();
    controls.previewReason = null;
    await button("Review real email").click();
    await page.getByText("Actual rendered subject", { exact: true }).waitFor();
    await page.getByText("View stored HTML preview", { exact: true }).first().click();
    assert.equal(await page.locator('iframe[title="Stored email HTML"]').first().getAttribute("sandbox"), "");
    const rendered = page.frameLocator('iframe[title="Stored email HTML"]').first();
    await rendered.locator("h1").filter({ hasText: "Actual rendered HTML" }).waitFor();
    assert.deepEqual(unexpected, [], "stored HTML did not load remote assets");
    await page.screenshot({ path: `${output}/preview-${width}-${theme}.png`, fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);

    await page.addScriptTag({ path: require.resolve("axe-core") });
    const axe = await page.evaluate(async () => window.axe.run({ runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] } }));
    assert.deepEqual(axe.violations.map(({ id, nodes }) => ({ id, targets: nodes.map(({ target }) => target) })), []);
    await button("Continue to REAL resend").click();
    await page.getByRole("dialog").waitFor();
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    assert.equal(count("sendReal"), 0);
    await button("Cancel preview").click();
    assert.equal(await page.getByText("Actual rendered subject", { exact: true }).count(), 0);

    await button("Review real email").click();
    await button("Continue to REAL resend").click();
    await page.screenshot({ path: `${output}/confirm-${width}-${theme}.png` });
    await page.getByRole("dialog").getByRole("button", { name: "Send REAL email" }).dblclick();
    await page.getByText(/did not confirm the outcome/).waitFor();
    assert.equal(count("sendReal"), 1);
    const initial = calls.find(call => call.method === "sendReal").payload;

    await mode("Test email").click();
    await mode("Real email").click();
    await page.getByText(initial.requestId, { exact: true }).waitFor();
    await select("approved");
    await page.getByLabel("Test recipient · one email address").waitFor();
    await select("profile-submitted");
    await mode("Real email").click();
    await page.getByText(initial.requestId, { exact: true }).waitFor();
    await page.reload();
    await mode("Real email").click();
    await page.getByText(initial.requestId, { exact: true }).waitFor();
    await page.evaluate(() => {window.fixtureOwner = "second-owner"; window.dispatchEvent(new Event("fixture-owner"));});
    await mode("Real email").click();
    assert.equal(await address.inputValue(), "");
    assert.equal(await page.getByText(initial.requestId, { exact: true }).count(), 0);
    await page.evaluate(() => {window.fixtureOwner = "first-owner"; window.dispatchEvent(new Event("fixture-owner"));});
    await mode("Real email").click();
    await page.getByText(initial.requestId, { exact: true }).waitFor();
    await button("Check resend receipt").click();
    await page.getByText(/has no receipt for this request/).waitFor();
    assert.equal(await button("Start a separate resend").count(), 0);

    controls.uncertainSend = false;
    await button("Review same request").click();
    await button("Continue same REAL resend").click();
    await button("Retry same REAL resend").click();
    await page.getByText("Queued for sending", { exact: true }).waitFor();
    assert.deepEqual(calls.filter(call => call.method === "sendReal").map(call => call.payload), [initial, initial]);
    controls.receiptStatus = "sent";
    await button("Check resend receipt").click();
    await page.getByRole("status").filter({ hasText: "Accepted by the email provider" }).waitFor();
    await button("Start a separate resend").click();
    await page.getByRole("dialog").getByRole("button", { name: "Cancel", exact: true }).click();
    await page.getByText(initial.requestId, { exact: true }).waitFor();

    await page.evaluate(() => sessionStorage.setItem("bg-email-real:first-owner:profile-submitted", "corrupt"));
    await page.reload();
    await mode("Real email").click();
    await page.getByText(/browser cannot safely preserve the request/).waitFor();
    await address.fill(recipient);
    assert.equal(await button("Review real email").isDisabled(), true);

    await select("changes-requested");
    assert.equal(await mode("Test email").getAttribute("aria-checked"), "true");
    const releases = page.getByRole("region", { name: "Stored template versions" });
    await releases.getByRole("button", { name: "Create stored draft", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Cancel", exact: true }).click();
    assert.equal(count("releaseVersion"), 0);
    for (const [label, expected] of [["Create stored draft", "draft"], ["Approve stored draft", "approve"], ["Publish approved version", "publish"]]) {
      await releases.getByRole("button", { name: label, exact: true }).click();
      if (expected === "publish") controls.staleRelease = true;
      await Promise.all([
        page.waitForResponse(response => response.url().endsWith("/api/emails/releaseVersion/")),
        page.getByRole("dialog").getByRole("button", { name: label, exact: true }).dblclick(),
      ]);
      assert.equal(calls.filter(call => call.method === "releaseVersion").at(-1)?.payload.action, expected);
    }
    await page.getByText(/stored version changed/).waitFor();
    await button("Refresh stored version").click();
    await button("Create stored draft").waitFor();
    assert.equal(count("releaseVersion"), 3);
    assert.equal(await button("Publish approved version").count(), 0);
    await mode("Real email").click();
    await page.getByText(/requires a published release/).waitFor();
    await page.getByLabel("Account email address").fill(recipient);
    assert.equal(await button("Review real email").isDisabled(), true);

    controls.unavailableStatus = true;
    await select("welcome");
    await page.getByText(/could not verify stored template history/).waitFor();
    await mode("Real email").click();
    assert.equal(await button("Real send unavailable").isDisabled(), true);
    await select("sign-in-code");
    await mode("Real email").click();
    assert.equal(await page.getByRole("link", { name: "Open Clerk sign-in" }).getAttribute("href"), "/login/");
    assert.equal(count("sendReal"), 2);
    assert.deepEqual(unexpected, []);
    await context.close();
  }
  {
    const { context, page, mode, button, calls, count, controls, unexpected } = await fixture(390, "light");
    await page.goto(origin);
    await button("Revoke published version").waitFor();
    await mode("Real email").click();
    const address = page.getByLabel("Account email address");
    await address.fill(recipient);
    await button("Review real email").click();
    await button("Continue to REAL resend").click();
    controls.sendRefusal = { status: 409, code: "binding_changed" }; // Source changed after the account-bound preview was reviewed.
    await page.getByRole("dialog").getByRole("button", { name: "Send REAL email" }).click();
    await page.getByText(/declined this resend before queuing it/).waitFor({ timeout: 3000 });
    assert.equal(count("sendReal"), 1);
    assert.equal(await address.isEnabled(), true);
    assert.equal(await page.evaluate(() => sessionStorage.getItem("bg-email-real:first-owner:profile-submitted")), null);
    const rejected = calls.find(call => call.method === "sendReal").payload;

    await page.reload();
    await mode("Real email").click();
    await address.fill(otherRecipient);
    await button("Review real email").click();
    await button("Continue to REAL resend").click();
    await page.getByRole("dialog", { name: `Send a REAL email to ${otherRecipient}?` }).waitFor();
    assert.equal(count("sendReal"), 1);
    controls.sendRefusal = null;
    controls.uncertainSend = false;
    await page.getByRole("dialog").getByRole("button", { name: "Send REAL email" }).click();
    await page.getByText("Queued for sending", { exact: true }).waitFor();
    const sent = calls.filter(call => call.method === "sendReal").at(-1).payload;
    assert.notEqual(sent.requestId, rejected.requestId);
    assert.equal(sent.binding.recipient, otherRecipient);
    assert.equal(count("sendReal"), 2);

    // Casey remains queued while Riley gets a distinct intent. An uncertain Riley request cannot replace Casey's.
    await address.fill(recipient);
    await button("Review real email").click();
    await button("Continue to REAL resend").click();
    controls.uncertainSend = true;
    await page.getByRole("dialog").getByRole("button", { name: "Send REAL email" }).click();
    await page.getByText(/did not confirm the outcome/).waitFor();
    const uncertain = calls.filter(call => call.method === "sendReal").at(-1).payload;
    assert.notEqual(uncertain.requestId, rejected.requestId);
    assert.notEqual(uncertain.requestId, sent.requestId);
    await button("Review same request").click();
    await button("Continue same REAL resend").click();
    controls.sendRefusal = { status: 401, code: "unauthorized" };
    await button("Retry same REAL resend").click();
    await page.getByText(/did not confirm the outcome/).waitFor();
    assert.equal(await page.getByText(uncertain.requestId, { exact: true }).count(), 1);
    assert.deepEqual(calls.filter(call => call.method === "sendReal").at(-1).payload, uncertain);
    assert.equal(await button("Start a separate resend").count(), 0);

    await page.reload();
    await mode("Real email").click();
    await page.getByText(uncertain.requestId, { exact: true }).waitFor();
    await page.getByText("Saved requests for other accounts", { exact: true }).click();
    await button(otherRecipient).click();
    await page.getByText(sent.requestId, { exact: true }).waitFor();
    controls.receiptStatus = "history_unavailable";
    await button("Check resend receipt").click();
    await page.getByText("Delivery history unavailable", { exact: true }).waitFor();
    assert.equal(await button("Start a separate resend").count(), 0);
    controls.receiptStatus = "delivery_unconfirmed";
    await button("Check resend receipt").click();
    await page.getByText("Sending stopped; delivery unconfirmed", { exact: true }).waitFor();
    await page.getByText(/email provider may already have accepted/).waitFor();
    assert.equal(await button("Start a separate resend").count(), 0);
    await address.fill(recipient);
    await page.getByText(uncertain.requestId, { exact: true }).waitFor();
    assert.equal(count("sendReal"), 4);
    assert.deepEqual(unexpected, []);
    await context.close();
  }
  {
    const { context, page, mode, button, count, controls, unexpected } = await fixture(390, "light");
    await page.goto(origin);
    await button("Revoke published version").waitFor();
    await mode("Real email").click();
    const address = page.getByLabel("Account email address");
    await address.fill(recipient);
    const preview = async () => {
      await button("Review real email").click();
      await button("Continue to REAL resend").click();
      await page.getByRole("dialog").waitFor();
    };
    const submit = () => page.getByRole("dialog").getByRole("button", { name: "Send REAL email" }).click();
    const stored = () => page.evaluate(() => sessionStorage.getItem("bg-email-real:first-owner:profile-submitted"));

    await preview();
    await page.evaluate(() => { window.fixtureTokenUnavailable = true; });
    await submit();
    await page.getByText(/Could not verify your owner sign-in/).waitFor();
    assert.equal(count("sendReal"), 0);
    assert.equal(await stored(), null);
    await page.evaluate(() => { window.fixtureTokenUnavailable = false; });

    const authRefusals = [
      [401, "unauthorized"],
      [403, "super-admin only"],
      [403, "account_not_invited"],
      [403, "email_not_verified"],
    ];
    for (const [index, [status, code]] of authRefusals.entries()) {
      await preview();
      controls.sendRefusal = { status, code };
      await submit();
      await page.getByText(/declined this resend before queuing it/).waitFor();
      assert.equal(count("sendReal"), index + 1);
      assert.equal(await stored(), null);
    }

    await preview();
    controls.sendRefusal = null;
    controls.uncertainSend = false;
    await submit();
    await page.getByText("Queued for sending", { exact: true }).waitFor();
    assert.equal(count("sendReal"), authRefusals.length + 1);
    assert.deepEqual(unexpected, []);
    await context.close();
  }
  console.log("PASS: owner authorization recovery, definitive stale-send recovery, intercepted real previews, confirmation/cancel, duplicate guard, uncertain retry across mode/navigation/reload/owner change, receipt distinctions, release progression/stale lock, Clerk handoff and responsive dark/light axe checks.");
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
