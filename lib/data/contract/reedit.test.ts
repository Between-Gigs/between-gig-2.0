import { beforeEach, describe, expect, it } from "vitest";
import { harness } from "./harness";
import { approved } from "./fixtures";

const h = await harness();
beforeEach(() => h.reset());

// Decision N-09: editing an approved profile sends it back to review and off the public page; availability is exempt.
describe("re-editing an approved profile", () => {
  it("an edit sends it back to review and takes it off the public page until approved again", async () => {
    const who = await approved(h, "reedit-back", "Reedit Contract");
    await h.signIn(who.email);
    await h.source.profiles.saveDraft(who.personId, { ...who.fields, about: "Seven years now." }, 3);

    await h.signInOwner();
    expect((await h.source.people.get(who.personId))?.person.status).toBe("submitted");
    expect((await h.source.owners.reviewQueue()).map((s) => s.person.id)).toContain(who.personId);
    expect((await h.source.profiles.getProfile(who.personId))?.fields.about).toBe("Seven years now.");
    await h.signOut();
    expect((await h.source.people.getPublic(who.slug)).profile).toBeNull();

    await h.signInOwner();
    await h.source.owners.approve(who.personId);
    await h.signOut();
    expect((await h.source.people.getPublic(who.slug)).profile?.fields.about).toBe("Seven years now.");
  });

  it("changing only availability keeps it approved and public", async () => {
    const who = await approved(h, "reedit-availability");
    await h.signIn(who.email);
    await h.source.profiles.saveDraft(who.personId, { ...who.fields, monthStatus: "limited", dates: "Mornings only" }, 2);

    await h.signInOwner();
    expect((await h.source.people.get(who.personId))?.person.status).toBe("approved");
    await h.signOut();
    expect((await h.source.people.getPublic(who.slug)).profile?.fields).toMatchObject({ monthStatus: "limited", dates: "Mornings only" });
  });

  it("saving the same answers again changes nothing", async () => {
    const who = await approved(h, "reedit-same");
    await h.signIn(who.email);
    await h.source.profiles.saveDraft(who.personId, who.fields, 4);
    await h.signInOwner();
    expect((await h.source.people.get(who.personId))?.person.status).toBe("approved");
  });
});
