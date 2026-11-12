import { existsSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { professionalExamples } from "../professional-examples";
import { validateAll } from "../profile/validate";
import { buildActivity, buildSeed, buildWaitlist } from "./seed";
import { featuredPeople } from "./featured-people";

afterEach(() => vi.unstubAllGlobals());

describe("the four Professionals examples", () => {
  it("opens each published card with complete answers, its own artwork and specific client jobs", async () => {
    vi.resetModules();
    const { sampleSource } = await import("./sample");
    for (const card of professionalExamples) {
      const { person, profile } = await sampleSource.people.getPublic(card.id);
      expect(person).toMatchObject({ name: card.name, slug: card.id, status: "approved", sample: true, email: "", waitlistZip: "" });
      expect(profile?.fields).toMatchObject({ name: card.name, photo: `art/samples/cards/${card.img}-portrait.jpg`, zip: "", credits: [card.credits] });
      expect(profile?.extras?.portfolio[0]).toEqual({ src: `art/samples/cards/${card.img}-work.jpg`, caption: card.portfolio });
      expect(profile?.extras?.helps.length).toBeGreaterThanOrEqual(3);
      for (const image of [profile!.fields.photo, profile!.extras!.portfolio[0]!.src]) {
        expect(existsSync(new URL(`../../public/${image}`, import.meta.url))).toBe(true);
      }
      await sampleSource.demo!.signInAs("gigster", card.id);
      const draft = await sampleSource.profiles.getDraft(card.id);
      expect(validateAll(draft!.fields)).toEqual({});
      expect(draft!.fields.earliestStart).toMatch(/^2026-11-/);
      expect(draft!.fields.bookingMobile).toMatch(/^\+1 213-555-01/);
      expect(profile!.fields.bookingMobile || "").toBe("");
      expect(draft!.fields.hireableJobs).toBeTruthy();
    }
  });

  it("upgrades an old browser in place, preserves occupied handles and never overwrites the samples after editing", async () => {
    vi.resetModules();
    const seed = buildSeed();
    const other = seed.people.find((p) => p.id === "maya")!;
    other.slug = "simone";
    other.email = "simone@example.com";
    const rows = buildWaitlist(seed.people);
    const session = { role: "gigster", personId: other.id, name: other.name, email: other.email, startedAt: other.registeredAt };
    const legacy = { ...seed, session, waitlist: rows, outbox: [], challenges: [], activity: buildActivity(seed.people) };
    const store = new Map([["bg2-sample-v2", JSON.stringify(legacy)]]);
    vi.stubGlobal("localStorage", { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v) });
    const { sampleSource } = await import("./sample");
    expect(await sampleSource.auth.session()).toEqual(session);
    expect((await sampleSource.people.getPublic("simone")).person?.id).toBe(other.id);
    const added = (await sampleSource.people.get("simone"))!;
    expect(added.person.slug).toBe("simone-2");
    expect(added.person.email).not.toBe(other.email);
    expect((await sampleSource.people.getPublic(added.person.slug)).profile?.fields.name).toBe("Simone");
    const draft = (await sampleSource.profiles.getDraft("simone"))!;
    await sampleSource.profiles.saveDraft("simone", { ...draft.fields, about: "My unsent edit" }, draft.step);
    vi.resetModules();
    const again = (await import("./sample")).sampleSource;
    expect((await again.profiles.getDraft("simone"))?.fields.about).toBe("My unsent edit");
    expect((await again.people.getPublic("simone-2")).profile?.fields.about).not.toBe("My unsent edit");
    const persisted = JSON.parse(store.get("bg2-sample-v2")!) as typeof legacy;
    expect(persisted.people).toHaveLength(seed.people.length + featuredPeople.length);
    expect(new Set(persisted.waitlist.map((w) => w.id)).size).toBe(rows.length + featuredPeople.length);
  });
});
