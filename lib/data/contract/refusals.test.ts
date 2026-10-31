import { beforeEach, describe, expect, it } from "vitest";
import { blankFields } from "../seed";
import { harness } from "./harness";
import { approved, drafted, photo, registered, submitted } from "./fixtures";

const h = await harness();
beforeEach(() => h.reset());

describe("refusals", () => {
  it("submit refuses a profile with answers missing, and nothing changes", async () => {
    const who = await registered(h, "refuse-incomplete", "Partial Contract");
    await h.source.profiles.saveDraft(who.personId, { ...blankFields(who.name), photo: await photo(h, who.personId), position: "Props" }, 1);
    await expect(h.source.profiles.submit(who.personId)).rejects.toThrow();
    await h.signInOwner();
    expect((await h.source.people.get(who.personId))?.person.status).toBe("draft");
  });

  it("only a submitted profile can be approved or sent back", async () => {
    const who = await drafted(h, "refuse-draft");
    await h.signInOwner();
    await expect(h.source.owners.approve(who.personId)).rejects.toThrow();
    await expect(h.source.owners.requestChanges(who.personId, [{ section: "about", note: "Too early." }])).rejects.toThrow();
  });

  it("an approved profile can't be approved again", async () => {
    const who = await approved(h, "refuse-twice");
    await expect(h.source.owners.approve(who.personId)).rejects.toThrow();
  });

  it("suggesting edits needs at least one note that isn't blank", async () => {
    const who = await submitted(h, "refuse-blank-note");
    await h.signInOwner();
    await expect(h.source.owners.requestChanges(who.personId, [{ section: "about", note: "   " }])).rejects.toThrow();
    expect((await h.source.people.get(who.personId))?.person.status).toBe("submitted");
  });

  it("the call sheet refuses a bad email or ZIP, with the field to fix", async () => {
    await h.signOut();
    expect(await h.source.funnel.joinWaitlist({ email: "not-an-email", zip: "90026", placement: "contract" })).toEqual({ ok: false, error: "email" });
    expect(await h.source.funnel.joinWaitlist({ email: "zip@contract.example", zip: "9002", placement: "contract" })).toEqual({ ok: false, error: "zip" });
  });
});
