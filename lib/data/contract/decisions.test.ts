import { beforeEach, describe, expect } from "vitest";
import { harness, only } from "./harness";
import { freshEmail, registered, submitted } from "./fixtures";

const h = await harness();
beforeEach(() => h.reset());
const sampleOnly = only(h, "sample");
const liveOnly = only(h, "live");

// Where live behaves differently from the sample on purpose (Company OS decision log N-05, N-10; gap analysis §13.3).
// Each is a test of the decision, on the target it applies to.
describe("agreed differences", () => {
  liveOnly("live has no demo block: the UI hides its controls", () => {
    expect(h.source.kind).toBe("live");
    expect(h.source.demo).toBeUndefined();
  });

  sampleOnly("the sample keeps its demo block and email-code sign-in (Clerk does this live)", async () => {
    expect(h.source.kind).toBe("sample");
    const { email } = await registered(h, "sample-code");
    await h.signOut();
    expect(await h.source.auth.requestCode(email)).toMatchObject({ ok: true, email });
    const code = await h.source.demo!.peekCode(email);
    expect(await h.source.auth.verifyCode(email, "000000")).toEqual({ ok: false, error: "wrong-code" });
    expect(await h.source.auth.verifyCode(email, code!)).toMatchObject({ ok: true, session: { email, role: "gigster" } });
  });

  liveOnly("decision N-10: undo is a hold in the review toast, so live has no undoReview", () => {
    expect(h.source.owners.undoReview).toBeUndefined();
  });

  sampleOnly("the sample can still undo a decision right after it", async () => {
    const who = await submitted(h, "sample-undo");
    await h.signInOwner();
    await h.source.owners.approve(who.personId);
    expect((await h.source.owners.undoReview!(who.personId)).status).toBe("submitted");
  });

  // Live, Company OS refuses a Clerk account nobody invited (account_not_invited → "unknown-email"); the route tests
  // cover that answer (lib/server/routes.test.ts), since a dev login can't be made for an address that has no login.
  sampleOnly("decision N-05: the sample allows open sign-up; live is invite-only", async () => {
    const r = await h.signIn(freshEmail("sample-open"), "Open Contract");
    expect(r).toMatchObject({ ok: true, created: true, session: { role: "gigster" } });
  });
});
