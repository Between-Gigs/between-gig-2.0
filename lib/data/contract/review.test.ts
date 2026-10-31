import { beforeEach, describe, expect, it } from "vitest";
import { harness } from "./harness";
import { notes, submitted } from "./fixtures";

const h = await harness();
beforeEach(() => h.reset());

describe("review with a note per section", () => {
  it("suggesting edits keeps one note per section, for the owner and for the Gigster", async () => {
    const who = await submitted(h, "review-notes");
    await h.signInOwner();
    const person = await h.source.owners.requestChanges(who.personId, notes);
    expect(person.status).toBe("changes_requested");
    const shape = (p: typeof person | undefined) => (p?.reviewNotes ?? []).map((n) => ({ section: n.section, note: n.note })).sort((a, b) => a.section.localeCompare(b.section));
    expect(shape(person)).toEqual(notes);
    expect(person.reviewNotes?.every((n) => n.by && n.at)).toBe(true);
    expect((await h.source.owners.reviewQueue()).map((s) => s.person.id)).not.toContain(who.personId);

    await h.signIn(who.email);
    expect(shape((await h.source.people.get(who.personId))?.person)).toEqual(notes);
  });

  it("blank notes are dropped; the rest are kept", async () => {
    const who = await submitted(h, "review-blank");
    await h.signInOwner();
    const person = await h.source.owners.requestChanges(who.personId, [{ section: "where", note: "  " }, { section: "story", note: " Say more. " }]);
    expect(person.reviewNotes?.map((n) => [n.section, n.note])).toEqual([["story", "Say more."]]);
  });

  it("each decision shows in recent activity, by the owner who made it", async () => {
    const who = await submitted(h, "review-activity");
    await h.signInOwner();
    await h.source.owners.requestChanges(who.personId, notes);
    const events = await h.source.owners.activity(50);
    const line = events.find((e) => e.personId === who.personId && e.kind === "changes_requested");
    expect(line?.by).toBeTruthy();
    expect(events.some((e) => e.personId === who.personId && e.kind === "submitted")).toBe(true);
  });
});
