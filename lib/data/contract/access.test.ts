import { beforeEach, describe, expect, it } from "vitest";
import { harness, only } from "./harness";
import { approved, drafted, registered, submitted, tinyJpeg } from "./fixtures";

const h = await harness();
beforeEach(() => h.reset());
// The sample is a browser fake with no server to refuse anything; access is enforced live (Company OS's answer, passed through).
const liveOnly = only(h, "live");

/** Resolves to the value, or null when the call is refused. Either is a correct "you can't see that". */
const orNull = <T,>(p: Promise<T | null>) => p.catch(() => null);

describe("what a Gigster, an owner and a visitor see", () => {
  it("an owner's session has the owner role and no person; the owner sees everyone in the list", async () => {
    const who = await registered(h, "see-owner");
    const session = await h.signInOwner();
    expect(session).toMatchObject({ role: "owner", personId: null });
    const rows = await h.source.people.list({ text: who.email });
    expect(rows.map((r) => r.person.id)).toEqual([who.personId]);
  });

  it("a Gigster reads their own record", async () => {
    const who = await registered(h, "see-self");
    expect((await h.source.people.get(who.personId))?.person).toMatchObject({ id: who.personId, email: who.email });
  });

  it("the public page shows nothing of a profile that isn't approved, and nothing for an unknown handle", async () => {
    const who = await submitted(h, "see-unapproved", "Hidden Contract");
    await h.signOut();
    expect((await h.source.people.getPublic("hidden-contract")).profile).toBeNull();
    expect(await h.source.people.getPublic(`no-such-handle-${who.personId}`)).toEqual({ person: null, profile: null });
  });

  liveOnly("a Gigster can't use the owners' tools or read another person", async () => {
    const other = await registered(h, "see-other");
    const who = await registered(h, "see-gigster");
    await expect(h.source.owners.dashboard()).rejects.toThrow();
    await expect(h.source.owners.waitlist()).rejects.toThrow();
    await expect(h.source.owners.approve(who.personId)).rejects.toThrow();
    await expect(h.source.people.list()).rejects.toThrow();
    expect(await orNull(h.source.people.get(other.personId))).toBeNull();
    await expect(h.source.profiles.saveDraft(other.personId, (await h.source.profiles.getDraft(who.personId))!.fields, 0)).rejects.toThrow();
  });

  liveOnly("a visitor who isn't signed in reads nobody's record or draft", async () => {
    const who = await registered(h, "see-visitor");
    await h.signOut();
    expect(await h.source.auth.session()).toBeNull();
    await expect(h.source.people.list()).rejects.toThrow();
    expect(await orNull(h.source.people.get(who.personId))).toBeNull();
    await expect(h.source.profiles.getDraft(who.personId)).rejects.toThrow();
  });

  liveOnly("the public page never carries the email, the ZIP or a hidden credit", async () => {
    const who = await approved(h, "see-public", "Public Contract");
    await h.signOut();
    const page = await h.source.people.getPublic(who.slug);
    expect(page.person?.email).toBe("");
    expect(page.person?.waitlistZip).toBe("");
    expect(page.profile?.fields.zip).toBe("");
    expect(page.profile?.fields.credits).toEqual(["Night Shift (feature)"]);
    expect(JSON.stringify(page)).not.toContain(who.email);
  });

  // Another Gigster's data, by id (IDOR): Company OS's row policies hide it, so each answer is "nothing" or a refusal.
  liveOnly("a Gigster can't read, submit or upload to another Gigster's profile by its id", async () => {
    const other = await submitted(h, "idor-other");
    await h.signInOwner();
    await h.source.owners.requestChanges(other.personId, [{ section: "about", note: "So it can be submitted again." }]);
    await registered(h, "idor-me");
    expect(await orNull(h.source.profiles.getDraft(other.personId))).toBeNull();
    expect(await orNull(h.source.profiles.getProfile(other.personId))).toBeNull();
    await expect(h.source.profiles.submit(other.personId)).rejects.toThrow();
    await expect(h.source.profiles.uploadPhoto!(other.personId, tinyJpeg())).rejects.toThrow();
    await h.signInOwner();
    expect((await h.source.people.get(other.personId))?.person.status).toBe("changes_requested");
  });

  liveOnly("a Gigster's unpublished photo is theirs and the owners' only, at its /media link", async () => {
    const owner = await drafted(h, "idor-photo");
    expect(await h.media!(owner.fields.photo)).toBe(200);
    await registered(h, "idor-viewer");
    expect(await h.media!(owner.fields.photo)).toBe(404);
    await h.signOut();
    expect(await h.media!(owner.fields.photo)).toBe(404);
    await h.signInOwner();
    expect(await h.media!(owner.fields.photo)).toBe(200);
  });
});
