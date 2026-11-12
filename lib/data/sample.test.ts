import { beforeEach, describe, expect, it } from "vitest";
import { cleanName, sampleSource as s, slugify } from "./sample";

/*
 * The sample's review semantics, which the editor (/profile/canvas/) and the owners' screens are built on:
 * - saveDraft only ever saves the Gigster's working copy. Availability is copied onto the version the team or the
 *   public has straight away; every other change stays unsent, and nothing changes the status.
 * - submit ("Send for review" / "Send again") replaces the version the team has. Sent again after "Suggest edits", the
 *   notes are kept as previousNotes and the round goes up.
 * - approve puts the version the team saw live (with the latest availability) and keeps a newer draft as unsent.
 * Seed people: maya approved, imani-carter submitted, hana-kim changes requested (her draft is incomplete).
 */
beforeEach(() => s.demo!.reset());

const draftOf = async (id: string) => (await s.profiles.getDraft(id))!;
const edit = async (id: string, change: Record<string, string>) => {
  const d = await draftOf(id);
  return s.profiles.saveDraft(id, { ...d.fields, ...change }, d.step);
};
const summary = async (id: string) => (await s.people.get(id))!;

describe("saveDraft on a live (approved) profile", () => {
  it("keeps a content change as an unsent draft: still approved, the old version stays public", async () => {
    const before = (await s.people.getPublic("maya")).profile!.fields.about;
    await edit("maya", { about: "A newer About, not sent yet." });
    const now = await summary("maya");
    expect(now.person.status).toBe("approved");
    expect(now.unsent).toBe(true);
    expect((await s.people.getPublic("maya")).profile?.fields.about).toBe(before);
    expect((await draftOf("maya")).fields.about).toBe("A newer About, not sent yet.");
  });

  it("puts an availability change live at once, with nothing unsent", async () => {
    await edit("maya", { monthStatus: "limited", dates: "Weekends only" });
    expect((await summary("maya")).person.status).toBe("approved");
    expect((await summary("maya")).unsent).toBe(false);
    expect((await s.people.getPublic("maya")).profile?.fields).toMatchObject({ monthStatus: "limited", dates: "Weekends only" });
  });

  it("an availability edit with an unsent content change still never unpublishes (corner case 1)", async () => {
    await edit("maya", { about: "Unreviewed About." });
    await edit("maya", { dates: "Mornings" });
    const page = await s.people.getPublic("maya");
    expect((await summary("maya")).person.status).toBe("approved");
    expect(page.profile?.fields.dates).toBe("Mornings");
    expect(page.profile?.fields.about).not.toBe("Unreviewed About.");
  });

  it("Send again sends the draft for a re-review and takes it off the site until it's approved", async () => {
    await edit("maya", { about: "Sent this time." });
    const r = await s.profiles.submit("maya");
    expect(r.person.status).toBe("submitted");
    expect(r.person.reviewRound).toBe(2);
    expect(r.person.previousNotes).toBeUndefined();
    expect((await s.people.getPublic("maya")).profile).toBeNull();
    expect((await summary("maya")).unsent).toBe(false);
    await s.owners.approve("maya");
    expect((await s.people.getPublic("maya")).profile?.fields.about).toBe("Sent this time.");
  });
});

describe("saveDraft while in review (submitted)", () => {
  it("doesn't change what the team sees; Send again replaces it in the same round", async () => {
    const sent = (await s.profiles.getProfile("imani-carter"))!.fields.about;
    await edit("imani-carter", { about: "Edited while in review." });
    expect((await s.profiles.getProfile("imani-carter"))?.fields.about).toBe(sent);
    expect((await summary("imani-carter")).unsent).toBe(true);
    expect((await s.owners.reviewQueue()).find((q) => q.person.id === "imani-carter")?.unsent).toBe(true);

    const round = (await summary("imani-carter")).person.reviewRound;
    const r = await s.profiles.submit("imani-carter");
    expect(r.profile.fields.about).toBe("Edited while in review.");
    expect(r.person.reviewRound).toBe(round);
    expect((await summary("imani-carter")).unsent).toBe(false);
  });

  it("approve puts the version the team saw live, with the latest availability, and keeps the newer draft unsent", async () => {
    const sent = (await s.profiles.getProfile("imani-carter"))!.fields.about;
    await edit("imani-carter", { about: "Newer, never sent." });
    await edit("imani-carter", { dates: "Evenings" });
    await s.owners.approve("imani-carter");
    const page = (await s.people.getPublic("imani-carter")).profile!;
    expect(page.fields.about).toBe(sent);
    expect(page.fields.dates).toBe("Evenings");
    expect((await draftOf("imani-carter")).fields.about).toBe("Newer, never sent.");
    expect((await summary("imani-carter")).unsent).toBe(true);
    // An availability edit afterwards keeps it live (the reported unpublish).
    await edit("imani-carter", { dates: "Weekends" });
    expect((await summary("imani-carter")).person.status).toBe("approved");
  });
});

describe("re-review after Suggest edits", () => {
  it("submit keeps the notes asked for, with when, and marks a second round", async () => {
    const asked = (await s.owners.requestChanges("imani-carter", [{ section: "story", note: "Say more." }])).reviewNotes!;
    expect(asked.length).toBe(1);
    const r = await s.profiles.submit("imani-carter");
    expect(r.person.status).toBe("submitted");
    expect(r.person.reviewNotes).toBeUndefined();
    expect(r.person.previousNotes).toEqual(asked);
    expect(r.person.previousNotes?.every((n) => n.at && n.by)).toBe(true);
    expect(r.person.reviewRound).toBe(2);
  });

  it("a photo note keeps its own section", async () => {
    await s.owners.requestChanges("imani-carter", [{ section: "photo", note: "Use a clearer photo." }, { section: "story", note: "Say more." }]);
    expect((await summary("imani-carter")).person.reviewNotes?.map((n) => n.section)).toEqual(["photo", "story"]);
  });

  it("undoing an approval puts the re-review back as it was", async () => {
    const asked = (await s.owners.requestChanges("imani-carter", [{ section: "where", note: "Add the dates." }])).reviewNotes!;
    await s.profiles.submit("imani-carter");
    await s.owners.approve("imani-carter");
    await s.owners.undoReview!("imani-carter");
    expect((await summary("imani-carter")).person).toMatchObject({ status: "submitted", reviewRound: 2, previousNotes: asked });
  });
});

describe("the public page", () => {
  it("a profile that isn't public reads exactly like an unknown one", async () => {
    expect(await s.people.getPublic("imani-carter")).toEqual({ person: null, profile: null });
    expect(await s.people.getPublic("hana-kim")).toEqual({ person: null, profile: null });
    expect(await s.people.getPublic("no-such-person")).toEqual({ person: null, profile: null });
  });

  it("carries only what a visitor may see", async () => {
    const page = await s.people.getPublic("maya");
    expect(page.person).toMatchObject({ email: "", waitlistZip: "", waitlistCategory: "", invitedAt: "", status: "approved" });
    expect(page.person?.reviewNotes).toBeUndefined();
    expect(page.person?.submittedAt).toBeUndefined();
    expect(page.profile?.fields).toMatchObject({ zip: "", imdb: "", other: "", otherCity: "" });
    expect(page.profile?.fields.creditPins?.every(Boolean)).toBe(true);
    const email = (await summary("maya")).person.email;
    expect(JSON.stringify(page)).not.toContain(email);
    for (const x of await s.people.similar("", 24)) expect(x.person.email).toBe("");
  });
});

describe("names and slugs", () => {
  it("caps names at 60 and slugs at 60, a number included", async () => {
    const long = "Bartholomew-Maximilianus Wolfeschlegelsteinhausenbergerdorff Senior";
    expect(cleanName(`  ${long}  `).length).toBeLessThanOrEqual(60);
    expect(slugify("A".repeat(80))).toHaveLength(60);
    expect(slugify("Renée Zoë")).toBe("renee-zoe");
    const a = await s.auth.register({ email: "long.one@example.com", name: "Z".repeat(80), acceptTerms: true });
    const b = await s.auth.register({ email: "long.two@example.com", name: "Z".repeat(80), acceptTerms: true });
    if (!a.ok || !b.ok) throw new Error("register failed");
    expect(a.person.name).toHaveLength(60);
    expect(a.person.slug).toHaveLength(60);
    expect(b.person.slug).toMatch(/^z+-2$/);
    expect(b.person.slug.length).toBeLessThanOrEqual(60);
  });
});

describe("self sign-ups (source)", () => {
  it("the sample has a few people who signed up by themselves, never counted as invited", async () => {
    await s.owners.dashboard().then(() => {});
    const all = await s.people.list({});
    const self = all.filter((x) => x.person.source === "self");
    expect(self.length).toBeGreaterThanOrEqual(3);
    expect(self.every((x) => x.person.status !== "invited")).toBe(true);
    expect(all.filter((x) => x.person.source !== "self").every((x) => x.person.source === "invited")).toBe(true);
  });

  it("the funnel has a separate signed-up count, and invited-not-joined excludes self sign-ups", async () => {
    const d = await s.owners.dashboard();
    const self = (await s.people.list({ source: "self" })).map((x) => x.person.id);
    expect(d.funnel.signedUp).toBe(self.length);
    expect([...d.signedUpPersonIds].sort()).toEqual([...self].sort());
    for (const id of self) expect(d.invitedPersonIds).not.toContain(id);
  });

  it("people filter by source", async () => {
    const inv = await s.people.list({ source: "invited" });
    expect(inv.length).toBeGreaterThan(0);
    expect(inv.every((x) => x.person.source === "invited")).toBe(true);
  });

  it("a call-sheet person who then signed up by themselves shows registered with source self", async () => {
    const rows = await s.owners.waitlist({ inviteStatus: "registered" });
    expect(rows.some((r) => r.source === "self")).toBe(true);
  });
});
