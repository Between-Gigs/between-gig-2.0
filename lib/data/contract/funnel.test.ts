import { beforeEach, describe, expect, it } from "vitest";
import type { DashboardSummary } from "../types";
import { harness } from "./harness";
import { completeFields, joined, photo, waitlistRow } from "./fixtures";

const h = await harness();
beforeEach(() => h.reset());

async function dashboard() {
  await h.signInOwner();
  return h.source.owners.dashboard();
}
const stages = (d: DashboardSummary) => ({ ...d.funnel, opened: undefined });

describe("funnel counts", () => {
  it("each step of one person's way moves its stage by one, and no other", async () => {
    let before = await dashboard();
    const { email } = await joined(h, "funnel");
    let after = await dashboard();
    expect(stages(after)).toEqual({ ...stages(before), signups: before.funnel.signups + 1 });
    expect(after.waitlist.total).toBe(before.waitlist.total + 1);
    expect(after.waitlist.not_invited).toBe(before.waitlist.not_invited + 1);

    before = after;
    const row = await waitlistRow(h, email);
    await h.source.owners.invite([row.signup.id]);
    const personId = (await waitlistRow(h, email)).personId!;
    after = await dashboard();
    expect(stages(after)).toEqual({ ...stages(before), invited: before.funnel.invited + 1 });
    expect(after.invitedCounts.invited).toBe(before.invitedCounts.invited + 1);
    expect(after.invitedPersonIds).toContain(personId);

    before = after;
    await h.signIn(email, "Funnel Contract");
    after = await dashboard();
    expect(stages(after)).toEqual({ ...stages(before), accounts: before.funnel.accounts + 1 });

    before = after;
    await h.signIn(email);
    await h.source.profiles.saveDraft(personId, completeFields("Funnel Contract", await photo(h, personId)), 4);
    await h.source.profiles.submit(personId);
    after = await dashboard();
    expect(stages(after)).toEqual({ ...stages(before), submitted: before.funnel.submitted + 1 });
    expect(after.counts.submitted).toBe(before.counts.submitted + 1);
    expect(after.reviewQueue.map((s) => s.person.id)).toContain(personId);

    before = after;
    await h.source.owners.approve(personId);
    after = await dashboard();
    expect(stages(after)).toEqual({ ...stages(before), approved: before.funnel.approved + 1 });
    expect(after.counts.approved).toBe(before.counts.approved + 1);
    expect(after.counts.submitted).toBe(before.counts.submitted - 1);
  });

  it("the review queue is oldest first", async () => {
    const d = await dashboard();
    const times = d.reviewQueue.map((s) => s.person.submittedAt ?? "");
    expect(times).toEqual([...times].sort());
  });
});
