import { beforeEach, describe, expect, it } from "vitest";
import { harness, only } from "./harness";
import { freshEmail, invited, joined, waitlistRow } from "./fixtures";

const h = await harness();
beforeEach(() => h.reset());

describe("waitlist and invite", () => {
  it("joining twice keeps one sign-up and says so; step 2's details land on it", async () => {
    const email = freshEmail("waitlist-twice");
    await h.signOut();
    const first = await h.source.funnel.joinWaitlist({ email: email.toUpperCase(), zip: "90026", placement: "hero" });
    expect(first).toMatchObject({ ok: true, alreadyJoined: false, signup: { email, zip: "90026" } });
    if (!first.ok) return;
    await h.source.funnel.addDetails(first.signup.id, { category: "interiors", details: "Set dressing for homes" });
    const again = await h.source.funnel.joinWaitlist({ email, zip: "90026", placement: "footer" });
    expect(again).toMatchObject({ ok: true, alreadyJoined: true });

    await h.signInOwner();
    const rows = (await h.source.owners.waitlist({ text: email })).filter((r) => r.signup.email === email);
    expect(rows).toHaveLength(1);
    expect(rows[0].signup).toMatchObject({ email, zip: "90026", category: "interiors", details: "Set dressing for homes", placement: "hero" });
    expect(rows[0].inviteStatus).toBe("not_invited");
  });

  it("an invite moves the row to invited with its person; signing in moves it to registered", async () => {
    const who = await invited(h, "waitlist-invite");
    const row = await waitlistRow(h, who.email);
    expect(row).toMatchObject({ inviteStatus: "invited", personId: who.personId });
    expect(row.invitedAt).toBeTruthy();
    expect((await h.source.owners.waitlist({ inviteStatus: "invited", text: who.email })).map((r) => r.signup.email)).toEqual([who.email]);

    await h.signIn(who.email, "Waitlist Contract");
    expect((await waitlistRow(h, who.email)).inviteStatus).toBe("registered");
    expect((await h.source.owners.waitlist({ inviteStatus: "not_invited", text: who.email }))).toEqual([]);
  });

  it("inviting again skips whoever is already invited or unknown", async () => {
    const who = await invited(h, "waitlist-skip");
    const { email } = await joined(h, "waitlist-skip-new");
    const fresh = await waitlistRow(h, email);
    expect(await h.source.owners.invite([who.signupId, fresh.signup.id])).toEqual({ invited: 1, skipped: 1 });
  });

  it("filters by category and searches by email", async () => {
    const { email } = await joined(h, "waitlist-filter");
    await h.signInOwner();
    expect((await h.source.owners.waitlist({ text: email, category: "interiors" })).map((r) => r.signup.email)).toEqual([email]);
    expect(await h.source.owners.waitlist({ text: email, category: "hair" })).toEqual([]);
  });

  // Agreed difference (N-10, gap analysis §13.3 #6): Clerk doesn't report an opened invite, so live has no "opened" stage.
  only(h, "live")("decision N-10: no \"opened\" stage; the funnel's opened equals accounts", async () => {
    const who = await invited(h, "waitlist-opened");
    expect((await waitlistRow(h, who.email)).inviteStatus).toBe("invited");
    const d = await h.source.owners.dashboard();
    expect(d.waitlist.opened).toBe(0);
    expect(d.funnel.opened).toBe(d.funnel.accounts);
    expect(await h.source.owners.waitlist({ inviteStatus: "opened" })).toEqual([]);
  });
});
