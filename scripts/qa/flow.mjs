// The Milestone 2 happy path, end to end, in one browser context:
// invite email → join → sign out → sign in with a code → builder (validation, autosave + resume) → submit
// → my profile → owner search finds them → their profile opens. Returns a list of problems (empty = pass).
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
      await page.getByRole("link", { name: "Professional onboarding is open" }).click();
      await page.waitForURL(/\/emails\/invite\/\?outbox=/);
      await page.locator("iframe").waitFor();
      const href = await page.frameLocator("iframe").getByRole("link", { name: /Create your profile/ }).getAttribute("href");
      if (!href?.includes("/join/?invite=")) throw new Error(`invite link looks wrong: ${href}`);
      await page.goto(href);
    })
    && await step("join", async () => {
      await page.getByLabel("Full name").waitFor();
      if ((await page.getByLabel("Email").inputValue()) !== "riley.park@example.com") throw new Error("email not prefilled");
      await page.getByRole("button", { name: "Create my profile" }).click();
      await expectText("Agree to the Terms of Use");
      await page.getByLabel("Full name").fill("Riley Park");
      await page.getByRole("checkbox").check();
      await page.getByRole("button", { name: "Create my profile" }).click();
      await page.waitForURL(/\/profile\/edit\/?$/);
      await page.locator("[data-step='0']").waitFor();
    })
    && await step("used-invite", async () => {
      await page.goto(`${base}/join/?invite=riley-7q2m`);
      await expectText("You've already joined");
    })
    && await step("sign-out", async () => {
      await page.goto(`${base}/`);
      await page.getByRole("button", { name: /Account:/ }).click();
      await page.getByRole("menuitem", { name: "Sign out" }).click();
      await page.waitForURL(/\/login\/\?signedOut=1/);
      await expectText("You're signed out");
    })
    && await step("sign-in-code", async () => {
      await page.getByLabel("Email").fill("riley.park@example.com");
      await page.getByRole("button", { name: "Email me a code" }).click();
      await page.getByLabel("6-digit code").waitFor();
      await page.getByLabel("6-digit code").fill("000000");
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      await expectText("doesn't match");
      const code = await page.evaluate(() => window.bgSample.peekCode("riley.park@example.com"));
      await page.getByLabel("6-digit code").fill(code);
      await page.waitForURL(/\/profile\/?$/);
      await expectText("Let's build your profile");
    })
    && await step("builder-about", async () => {
      await page.getByRole("link", { name: "Start your profile" }).click();
      await page.locator("[data-step='0']").waitFor();
      await page.getByRole("button", { name: "Continue" }).click();
      await expectText("to continue");
      await page.locator("#f-photo").setInputFiles(path.join(ROOT, "public/img/people/jordan-2.jpg"));
      await page.getByLabel("Years in the business").fill("8");
      await page.getByLabel("Industry position / department").fill("Set decoration");
      await page.getByLabel("IMDb profile link").fill("https://www.imdb.com/name/nm0000001/");
      await page.getByLabel("Credit 1").fill("Fictional series · Set dresser (sample credit)");
      await page.getByRole("button", { name: "Continue" }).click();
      await page.locator("[data-step='1']").waitFor();
    })
    && await step("builder-skills", async () => {
      await page.getByRole("button", { name: "Set decoration" }).click();
      await page.getByRole("button", { name: "Interior Styling" }).click();
      await page.getByRole("button", { name: "Continue" }).click();
      await page.locator("[data-step='2']").waitFor();
    })
    && await step("builder-resume", async () => {
      await page.getByLabel("Home ZIP code").fill("90029");
      await page.getByRole("button", { name: "Eastside" }).click();
      await page.getByLabel("Dates or times this month").fill("Weekday afternoons");
      await expectText("Saved");
      await page.waitForTimeout(1200);
      await page.reload();
      await page.locator("[data-step='2']").waitFor();
      if ((await page.getByLabel("Home ZIP code").inputValue()) !== "90029") throw new Error("autosave did not keep the ZIP after reload");
      await page.getByRole("button", { name: "Continue" }).click();
      await page.locator("[data-step='3']").waitFor();
    })
    && await step("builder-story", async () => {
      await page.getByLabel("About me").fill("Fifteen years dressing sets taught me how a room should feel. I help with room styling, sourcing and seasonal refreshes, planned around your space and your timing.");
      await page.getByRole("button", { name: "Continue" }).click();
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
      await page.getByRole("heading", { name: "Riley Park", level: 1 }).waitFor();
    })
    && await step("confirmation-email", async () => {
      await page.goto(`${base}/emails/`);
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
      await page.getByRole("button", { name: /Submitted/ }).first().click();
      await page.getByRole("link", { name: "Riley Park" }).click();
      await page.waitForURL(/\/owners\/people\/riley-park\/?$/);
      await page.getByRole("heading", { name: "Riley Park", level: 1 }).waitFor();
      await page.locator("#review-h").waitFor();
    });

  // Milestone 3: the public funnel.
  const funnel = ok
    && await step("call-sheet-signup", async () => {
      await page.evaluate(() => window.bgSample.signInAs("invited"));
      await page.goto(`${base}/professionals/`);
      await page.getByRole("button", { name: "I offer this service: Interior styling" }).click();
      await expectText("Interested in offering: Interior Styling");
      await page.getByRole("button", { name: "Get on the call sheet" }).last().click();
      await expectText("Enter your email address");
      await page.getByLabel("Email").fill("new.gigster@example.com");
      await page.getByLabel("ZIP code").fill("90026");
      await page.getByRole("dialog").getByRole("button", { name: "Get on the call sheet" }).click();
      await expectText("You're on the list.");
      await page.getByLabel("What would you offer?").fill("Room styling and sourcing between shoots.");
      await page.getByRole("button", { name: "Save optional details" }).click();
      await expectText("Thank you for joining!");
    })
    && await step("storyboard-talent", async () => {
      await page.goto(`${base}/storyboard/`);
      await page.getByRole("button", { name: "Next page", exact: true }).click();
      await expectText("Page 2 of 20");
      await page.getByRole("button", { name: "Offer your skills" }).click();
      await page.getByRole("button", { name: "Save my professional interest" }).click();
      await expectText("Fill this in to continue.");
      const answers = { "Your name": "Sam Rivera", "Email for follow-up": "sam.rivera@example.com", "Your entertainment role or craft": "Scenic carpenter", "What services would you like to offer?": "Custom furniture and repairs.", "Where can you work?": "Los Angeles", "When are you available?": "Weekdays between shoots" };
      for (const [label, value] of Object.entries(answers)) await page.getByLabel(label, { exact: false }).first().fill(value);
      await page.getByRole("button", { name: "Save my professional interest" }).click();
      await expectText("Your professional interest is saved.");
    })
    && await step("funnel-emails", async () => {
      await page.goto(`${base}/emails/`);
      await page.getByRole("link", { name: "Your next chapter starts here." }).waitFor();
      await page.getByRole("link", { name: "Thank you. The next chapter is coming." }).waitFor();
    })
    && await step("privacy-request", async () => {
      await page.goto(`${base}/privacy/`);
      await page.getByLabel("Email used for your signup").fill("new.gigster@example.com");
      await page.getByLabel("Your request").fill("Please remove me from the waitlist.");
      await page.getByRole("button", { name: "Send privacy request" }).click();
      await expectText("Your request has been saved");
    })
    && await step("journal", async () => {
      await page.goto(`${base}/journal/`);
      await page.getByRole("link", { name: "Between productions, the craft is still here." }).click();
      await page.getByRole("heading", { name: "Fewer days on location." }).waitFor();
    });

  // Milestone 4: the owners review and invite.
  const owners = ok && funnel
    && await step("owner-dashboard", async () => {
      await page.evaluate(() => window.bgSample.signInAs("owner"));
      await page.goto(`${base}/owners/`);
      await expectText("waiting for your review");
      await page.getByRole("link", { name: "See the queue" }).click();
      await page.waitForURL(/\/owners\/review\/?$/);
      await page.getByRole("link", { name: "Imani Carter" }).waitFor();
    })
    && await step("owner-approve", async () => {
      await page.goto(`${base}/owners/people/imani-carter/`);
      await page.getByRole("checkbox", { name: /photo shows their face/ }).check();
      await page.getByRole("button", { name: "Approve profile" }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Approve profile" }).click();
      await expectText("Approved · now live");
      await page.goto(`${base}/p/imani-carter/`);
      await page.getByRole("heading", { name: "Imani Carter", level: 1 }).waitFor();
    })
    && await step("owner-suggest-edits", async () => {
      await page.goto(`${base}/owners/people/theo-nakamura/`);
      await page.getByRole("button", { name: "Suggest edits" }).click();
      await page.getByRole("button", { name: "Send to Theo" }).click();
      await expectText("Add a note to at least one section.");
      await page.getByLabel("Your story").fill("Tell clients what a portrait session with you feels like.");
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
      await expectText("3 invites sent");
    })
    && await step("owner-emails", async () => {
      await page.goto(`${base}/emails/`);
      await page.getByRole("link", { name: /Your profile is live/ }).first().waitFor();
      await page.getByRole("link", { name: /A few small changes to your profile, Theo/ }).waitFor();
    });

  if (ok && funnel && owners && errors.length) problems.push(`flow: page errors: ${errors.join(" | ")}`);
  await context.close();
  return problems;
}
