// The Milestone 2 happy path, end to end, in one browser context:
// invite email → join → sign out → sign in with a code → builder (validation, autosave + resume) → submit
// → my profile → owner search finds them → their profile opens. Returns a list of problems (empty = pass).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export async function flow({ browser, base, outDir }) {
  const problems = [];
  const shots = path.join(outDir, "flow");
  fs.rmSync(shots, { recursive: true, force: true });
  fs.mkdirSync(shots, { recursive: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  let n = 0;
  const shot = (name) => page.screenshot({ path: path.join(shots, `${String(++n).padStart(2, "0")}-${name}.png`), fullPage: true });
  const step = async (name, fn) => {
    try { await fn(); await shot(name); process.stdout.write(`flow ${name} ✓\n`); return true; }
    catch (e) { problems.push(`flow "${name}": ${e.message.split("\n")[0]}`); await shot(`${name}-FAILED`).catch(() => {}); return false; }
  };
  const expectText = async (text) => { await page.getByText(text, { exact: false }).first().waitFor(); };

  const ok =
    await step("invite-email", async () => {
      await page.goto(`${base}/`);
      await page.waitForFunction(() => "bgSample" in window);
      await page.evaluate(() => window.bgSample.reset());
      await page.evaluate(() => window.bgSample.signInAs("invited"));
      await page.goto(`${base}/emails/`);
      await page.getByRole("radio", { name: /Sample outbox/ }).click();
      await page.getByRole("link", { name: "You're invited to Between Gigs" }).click();
      await page.waitForURL(/\/emails\/invite\/\?outbox=/);
      await page.locator("iframe").waitFor();
      const actions = page.frameLocator("iframe").getByRole("link", { name: /^Create your profile/i });
      await actions.first().waitFor();
      if (await actions.count() !== 2) throw new Error("expected hero and end-of-body profile actions");
      const href = await actions.first().getAttribute("href");
      if (await actions.last().getAttribute("href") !== href) throw new Error("profile action destinations differ");
      if (!href?.includes("/join/?invite=")) throw new Error(`invite link looks wrong: ${href}`);
      await page.goto(href);
    })
    && await step("join", async () => {
      await page.getByLabel("Full name").waitFor();
      if ((await page.getByLabel("Email").inputValue()) !== "riley.park@example.com") throw new Error("email not prefilled");
      await page.getByRole("button", { name: "Create account", exact: true }).click();
      await expectText("Agree to the Terms and Privacy Policy");
      await page.getByLabel("Full name").fill("Riley Park");
      await page.getByRole("checkbox").check();
      await page.getByRole("button", { name: "Create account", exact: true }).click();
      await page.waitForURL(/\/profile\/canvas\/?$/);
      // A brand-new account lands on its own blank profile, with the welcome.
      await page.getByRole("heading", { name: /This is your page\./ }).first().waitFor();
    })
    && await step("used-invite", async () => {
      await page.goto(`${base}/join/?invite=riley-7q2m`);
      await expectText("You've already joined");
    })
    && await step("sign-out", async () => {
      await page.goto(`${base}/preview/`);
      await page.locator("header").first().getByRole("button", { name: /^Account:/ }).click();
      await page.getByRole("menuitem", { name: "Log out", exact: true }).click();
      await page.waitForURL(/\/login\/\?signedOut=1/);
      await expectText("You're logged out");
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("bg2-sample-v2"))?.session ?? null), null, "logout clears the sample session");
    })
    && await step("sign-in-code", async () => {
      await page.getByLabel("Email").fill("riley.park@example.com");
      await page.getByRole("button", { name: "Email me a code" }).click();
      await page.getByLabel("6-digit code").waitFor();
      await page.getByLabel("6-digit code").fill("000000");
      await page.getByRole("button", { name: "Log in", exact: true }).click();
      await expectText("doesn't match");
      const code = await page.evaluate(() => window.bgSample.peekCode("riley.park@example.com"));
      await page.getByLabel("6-digit code").fill(code);
      await page.waitForURL(/\/profile\/canvas\/?$/);
      await expectText("How I can help");
    })
    && await step("builder-about", async () => {
      // Start your profile now opens Edit on your profile; this flow walks the step-by-step questionnaire.
      await page.waitForURL(/\/profile\/canvas\/?$/);
      // The questionnaire isn't linked any more (editing happens on the page), but its route still works.
      await page.goto(`${base}/profile/edit/`);
      await page.locator("[data-step='0']").waitFor();
      // Steps never block: Next moves on with nothing filled in; required answers are checked on Submit.
      await page.getByRole("button", { name: /^Next/ }).click();
      await page.locator("[data-step='1']").waitFor();
      await page.getByRole("button", { name: /^Back\s*:/ }).click();
      await page.locator("[data-step='0']").waitFor();
      await page.locator("#f-photo").setInputFiles(path.join(ROOT, "public/img/people/jordan-2.jpg"));
      // Every upload opens the cropper; keep the centred square.
      await page.getByRole("button", { name: "Use this photo" }).click();
      await page.getByLabel("Years in the business").fill("8");
      await page.getByLabel("Department").fill("Set decoration");
      await page.getByLabel("IMDb profile link").fill("https://www.imdb.com/name/nm0000001/");
      await page.locator("#f-credits").fill("Fictional series · Set dresser (sample credit)");
      await page.getByRole("button", { name: /^Next/ }).click();
      await page.locator("[data-step='1']").waitFor();
    })
    && await step("builder-skills", async () => {
      await page.getByRole("button", { name: "Set decoration" }).click();
      await page.getByRole("button", { name: "Interior Styling" }).click();
      await page.getByRole("button", { name: /^Next/ }).click();
      await page.locator("[data-step='2']").waitFor();
    })
    && await step("builder-resume", async () => {
      await page.getByLabel("Home ZIP code").fill("90029");
      await page.getByRole("button", { name: "Eastside" }).click();
      await page.getByLabel("Dates or times this month").fill("Weekday afternoons");
      await page.getByRole("status").filter({ hasText: /^Saved(?:\s|$)/ }).waitFor();
      await page.waitForTimeout(1200);
      await page.reload();
      await page.locator("[data-step='2']").waitFor();
      if ((await page.getByLabel("Home ZIP code").inputValue()) !== "90029") throw new Error("autosave did not keep the ZIP after reload");
      await page.getByRole("button", { name: /^Next/ }).click();
      await page.locator("[data-step='3']").waitFor();
    })
    && await step("builder-story", async () => {
      await page.getByLabel("About me").fill("Fifteen years dressing sets taught me how a room should feel. I help with room styling, sourcing and seasonal refreshes, planned around your space and your timing.");
      await page.getByRole("button", { name: /^Next/ }).click();
      await page.locator("[data-step='4']").waitFor();
      await expectText("Ready for review");
    })
    && await step("submit", async () => {
      await page.getByRole("button", { name: "Submit for review" }).click();
      await expectText("You're in the queue, Riley.");
    })
    && await step("my-profile", async () => {
      await page.getByRole("link", { name: "See my profile" }).click();
      await page.waitForURL(/\/profile\/?$/);
      await expectText("Submitted for review");
      // Green Room: My profile is the profile page itself (Justin's Flow p4) under one ruled status line.
      const status = page.getByRole("region", { name: "Where your profile stands" });
      await status.getByRole("link", { name: "Edit profile" }).waitFor();
      await page.getByRole("heading", { name: "Riley Park", level: 1 }).waitFor();
      await page.getByText(/Fifteen years dressing sets/).first().waitFor();
      // No old dashboard pieces: no preview toggle and no dark "You're live" block.
      assert.equal(await page.getByRole("button", { name: /full profile preview/ }).count(), 0);
    })
    && await step("confirmation-email", async () => {
      await page.goto(`${base}/emails/`);
      await page.getByRole("radio", { name: /Sample outbox/ }).click();
      await page.getByRole("link", { name: "We've got your profile, Riley" }).waitFor();
    })
    && await step("public-not-yet", async () => {
      await page.goto(`${base}/p/riley-park/`);
      await expectText("This profile isn't public yet");
    })
    && await step("owner-search", async () => {
      await page.evaluate(() => window.bgSample.signInAs("owner"));
      await page.goto(`${base}/owners/people/`);
      await page.locator("[data-results]").waitFor();
      await page.getByLabel("Search people").fill("riley");
      await page.getByRole("link", { name: "Riley Park" }).waitFor();
      await page.getByRole("combobox", { name: "Status" }).click();
      await page.getByRole("option", { name: /^Submitted/ }).click();
      await page.getByRole("link", { name: "Riley Park" }).click();
      await page.waitForURL(/\/owners\/people\/riley-park\/?$/);
      await page.getByRole("heading", { name: "Riley Park", level: 1 }).waitFor();
      await page.locator("#review-h").waitFor();
    });

  // Milestone 3: the public funnel.
  const funnel = ok
    && await step("call-sheet-signup", async () => {
      await page.evaluate(() => window.bgSample.signInAs("invited"));
      // The two-step call-sheet form now lives only on the pre-Green Room draft (13 Nov 2026); the live page links to /join/.
      await page.goto(`${base}/preview/drafts/professionals-v1/`);
      const draft = page.frameLocator('iframe[data-admin-page-preview]');
      const expectDraft = text => draft.getByText(text, { exact: false }).first().waitFor();
      await draft.getByRole("button", { name: "I offer this service: Interior styling" }).click();
      await expectDraft("Interested in offering: Interior Styling");
      await draft.getByRole("button", { name: "Get on the call sheet" }).last().click();
      await expectDraft("Enter your email address");
      await draft.getByLabel("Email").fill("new.gigster@example.com");
      await draft.getByLabel("ZIP code").fill("90026");
      await draft.getByRole("dialog").getByRole("button", { name: "Get on the call sheet" }).click();
      await expectDraft("You're on the list.");
      await draft.getByLabel("What would you offer?").fill("Room styling and sourcing between shoots.");
      await draft.getByRole("button", { name: "Save optional details" }).click();
      await expectDraft("Thank you for joining!");
    })
    && await step("join-calls-to-action", async () => {
      // Coming soon and For professionals: every call to action goes straight to sign-up and says where it goes.
      for (const path of ["/", "/professionals/"]) {
        await page.goto(`${base}${path}`);
        const ctas = page.getByRole("link", { name: "Create your Gigster profile" });
        if (await ctas.count() < 1) throw new Error(`${path}: no "Create your Gigster profile" link`);
        for (const href of await ctas.evaluateAll((els) => els.map((el) => el.getAttribute("href")))) {
          if (!/\/join\/$/.test(href ?? "")) throw new Error(`${path}: call to action goes to ${href}, not /join/`);
        }
        if (await page.getByRole("button", { name: "Get on the call sheet" }).count()) throw new Error(`${path}: still opens the two-step call-sheet form`);
      }
      await page.goto(`${base}/professionals/`);
      await expectText("Decide when you're available.");
      await page.getByRole("link", { name: "Create your Gigster profile" }).first().click();
      await page.waitForURL(/\/join\/?$/);
    })
    && await step("storyboard-profile", async () => {
      await page.goto(`${base}/storyboard/`);
      await page.getByRole("button", { name: "Next page", exact: true }).click();
      await expectText("Page 2 of 20");
      const cta = page.getByRole("link", { name: "Create your profile", exact: true });
      if (await cta.count() !== 1) throw new Error("Storyboard needs one direct profile CTA");
      if (await page.getByRole("button", { name: "Offer your skills" }).count()) throw new Error("Retired Storyboard form still present");
      await cta.click();
      await page.waitForURL(/\/join\/?$/);
    })
    && await step("funnel-emails", async () => {
      await page.goto(`${base}/emails/`);
      await page.getByRole("radio", { name: /Sample outbox/ }).click();
      if (await page.getByRole("link", { name: "Your next chapter starts here." }).count()) throw new Error("Retired Storyboard welcome was queued");
      if (await page.getByRole("link", { name: "Thank you. The next chapter is coming." }).count()) throw new Error("Storyboard navigation must not queue a form email");
    })
    && await step("privacy-request", async () => {
      await page.goto(`${base}/privacy/`);
      await page.getByLabel("Email used for your signup").fill("new.gigster@example.com");
      await page.getByLabel("Your request").fill("Please remove me from the waitlist.");
      await page.getByRole("button", { name: "Send privacy request" }).click();
      await expectText("Your request has been saved");
    });

  // Milestone 4: the owners review and invite.
  const owners = ok && funnel
    && await step("owner-dashboard", async () => {
      await page.evaluate(() => window.bgSample.signInAs("owner"));
      await page.goto(`${base}/owners/`);
      await expectText("waiting for your review");
      await page.getByRole("link", { name: "Open the review queue" }).click();
      await page.waitForURL(/\/owners\/review\/?$/);
      await page.getByRole("link", { name: "Imani Carter" }).waitFor();
    })
    && await step("owner-approve", async () => {
      await page.goto(`${base}/owners/people/imani-carter/`);
      await page.getByRole("checkbox", { name: /photo shows their face/ }).check();
      await page.getByRole("button", { name: "Approve & next" }).click();
      await expectText("Imani Carter approved · now live");
      await page.waitForURL(/\/owners\/people\/(?!imani-carter)[^/]+\/\?from=review$/);
      await page.goto(`${base}/p/imani-carter/`);
      await page.getByRole("heading", { name: "Imani Carter", level: 1 }).waitFor();
    })
    && await step("owner-suggest-edits", async () => {
      await page.goto(`${base}/owners/people/theo-nakamura/`);
      await page.getByRole("button", { name: "Suggest edits" }).click();
      await page.getByRole("textbox", { name: /^Photo/ }).fill("");
      await page.getByRole("button", { name: "Send to Theo" }).click();
      await expectText("Add a note to at least one section.");
      await page.getByRole("textbox", { name: /^Your story/ }).fill("Tell clients what a portrait session with you feels like.");
      await page.getByRole("button", { name: "Send to Theo" }).click();
      await expectText("Edits sent");
      await page.evaluate(() => window.bgSample.signInAs("gigster", "theo-nakamura"));
      await page.goto(`${base}/profile/`);
      await expectText("Tell clients what a portrait session with you feels like.");
      await page.evaluate(() => window.bgSample.signInAs("owner"));
    })
    && await step("owner-bulk-invite", async () => {
      await page.goto(`${base}/owners/waitlist/?status=not_invited`);
      await page.locator("[data-results]").waitFor();
      const boxes = page.getByRole("checkbox", { name: /^Select .*@example\.com$/ });
      for (let i = 0; i < 3; i++) await boxes.nth(i).check();
      await page.getByRole("button", { name: "Invite 3 people" }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Send 3 invites" }).click();
      await expectText("3 invites queued");
    })
    && await step("owner-emails", async () => {
      await page.goto(`${base}/emails/`);
      await page.getByRole("radio", { name: /Sample outbox/ }).click();
      await page.getByRole("link", { name: /Your profile is live/ }).first().waitFor();
      await page.getByRole("link", { name: /A few small changes to your profile, Theo/ }).waitFor();
    });

  if (ok && funnel && owners && errors.length) problems.push(`flow: page errors: ${errors.join(" | ")}`);
  await context.close();
  return problems;
}
