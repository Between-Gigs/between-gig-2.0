import { beforeEach, describe, expect, it } from "vitest";
import { harness } from "./harness";
import { approved, drafted, invited, notes, registered, submitted } from "./fixtures";

const h = await harness();
beforeEach(() => h.reset());

const statusOf = async (personId: string) => {
  await h.signInOwner();
  return (await h.source.people.get(personId))?.person.status;
};

describe("statuses and transitions", () => {
  it("an invited person is invited until they sign in, then registered, with a Gigster session", async () => {
    const who = await invited(h, "status-invited");
    expect(await statusOf(who.personId)).toBe("invited");

    const r = await h.signIn(who.email, "Riley Contract");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.session).toMatchObject({ personId: who.personId, role: "gigster", email: who.email });
    expect(await h.source.auth.session()).toMatchObject({ personId: who.personId, role: "gigster" });
    expect(await statusOf(who.personId)).toBe("registered");
  });

  it("the first saved draft moves registered to draft, and the draft comes back as saved, at its step", async () => {
    const who = await drafted(h, "status-draft");
    const draft = await h.source.profiles.getDraft(who.personId);
    expect(draft?.step).toBe(3);
    expect(draft?.fields).toMatchObject({ name: who.name, position: "Set decoration", skills: ["Set decoration"], areas: ["Eastside"], zip: "90026" });
    expect(draft?.fields.photo).not.toBe("");
    expect(await statusOf(who.personId)).toBe("draft");
  });

  it("a registered person with nothing saved gets a blank draft with their name", async () => {
    const who = await registered(h, "status-blank", "Blank Contract");
    const draft = await h.source.profiles.getDraft(who.personId);
    expect(draft?.fields.credits.filter(Boolean)).toEqual([]);
    expect(draft?.step).toBe(0);
  });

  it("submit freezes the profile as submitted, stamped, and puts it in the review queue", async () => {
    const who = await submitted(h, "status-submitted");
    const profile = await h.source.profiles.getProfile(who.personId);
    expect(profile?.fields).toMatchObject({ position: "Set decoration", about: who.fields.about });
    expect(profile?.submittedAt).toBeTruthy();

    await h.signInOwner();
    const summary = await h.source.people.get(who.personId);
    expect(summary?.person).toMatchObject({ status: "submitted", name: who.name });
    expect(summary?.person.submittedAt).toBeTruthy();
    expect((await h.source.owners.reviewQueue()).map((s) => s.person.id)).toContain(who.personId);
  });

  it("saving a draft never changes a submitted profile's status", async () => {
    const who = await submitted(h, "status-keep");
    await h.source.profiles.saveDraft(who.personId, { ...who.fields, tools: "Steamer" }, 4);
    expect(await statusOf(who.personId)).toBe("submitted");
  });

  it("approve publishes the profile at /p/[slug]", async () => {
    const who = await approved(h, "status-approved", "Avery Contract");
    const summary = await h.source.people.get(who.personId);
    expect(summary?.person.status).toBe("approved");
    expect(summary?.person.approvedAt).toBeTruthy();
    expect(who.slug).toMatch(/^avery-contract(-\d+)?$/);

    await h.signOut();
    const page = await h.source.people.getPublic(who.slug);
    expect(page.profile?.fields).toMatchObject({ name: "Avery Contract", position: "Set decoration" });
  });

  it("changes requested, then submitted again: the notes are cleared", async () => {
    const who = await submitted(h, "status-resubmit");
    await h.signInOwner();
    expect((await h.source.owners.requestChanges(who.personId, notes)).status).toBe("changes_requested");

    await h.signIn(who.email);
    const back = await h.source.profiles.submit(who.personId);
    expect(back.person.status).toBe("submitted");
    expect(back.person.reviewNotes ?? []).toEqual([]);
  });
});
