import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildSeed, buildWaitlist } from "../seed.ts";
import { offSetServices, onSetSkills, laServiceAreas } from "../taxonomy.ts";
import { optionKey } from "./fields.ts";
import { toCompanyOsSeed } from "./seed.ts";

// 2.0's made-up sample as a Company OS test seed (Company OS ADR 0025 amendment 2026-10-30, `testSeed`).
const state = buildSeed();
const seed = toCompanyOsSeed(state, buildWaitlist(state.people));
const of = (entity: string) => seed.records.filter((r) => r.entity === entity);

describe("toCompanyOsSeed", () => {
  it("is marked fictional, starts with a record that has an id, and fits one import batch", () => {
    expect(seed.fictional).toBe(true);
    expect(typeof seed.records[0]?.id).toBe("string");
    expect(seed.records.length).toBeLessThanOrEqual(1000);
  });

  it("holds only made-up addresses", () => {
    for (const r of [...of("person"), ...of("form_submission")]) expect(String(r.data.email)).toMatch(/@example\.com$/);
  });

  it("puts the whole waitlist on the call sheet, one sign-up per address, the seed people linked to their person", () => {
    const subs = of("form_submission");
    expect(subs).toHaveLength(500);
    expect(new Set(subs.map((s) => s.data.email)).size).toBe(500);
    expect(subs.every((s) => s.data.form_key === "call_sheet")).toBe(true);
    const people = of("person");
    expect(people).toHaveLength(state.people.length);
    const linked = subs.filter((s) => s.data.person);
    expect(linked).toHaveLength(people.length);
    for (const s of linked) expect(people.map((p) => p.id)).toContain(s.data.person);
  });

  it("gives a profile to everyone who saved a draft, with 2.0's status, a URL-safe handle and option keys the recipe has", () => {
    const profiles = of("profile");
    expect(profiles).toHaveLength(state.drafts.length);
    const statuses = new Set(profiles.map((p) => p.data.status));
    expect([...statuses].sort()).toEqual(["approved", "changes_requested", "draft", "submitted"]);
    for (const p of profiles) expect(String(p.data.public_handle)).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    const known = new Set([...onSetSkills, ...offSetServices, ...laServiceAreas].map(optionKey));
    for (const i of of("profile_item").filter((i) => i.data.kind !== "credit")) expect(known).toContain(i.data.value);
  });

  it("records the changes-requested notes as one review with the notes by section", () => {
    const reviews = of("profile_review").filter((r) => r.data.to_status === "changes_requested");
    expect(reviews.length).toBe(state.people.filter((p) => p.status === "changes_requested").length);
    for (const r of reviews) {
      expect(String(r.data.note)).toMatch(/: /);
      expect(Object.keys(r.data.section_notes as object).length).toBeGreaterThan(0);
    }
  });

  it("lists each photo person's picture, under the seed folder, from 2.0's public images", () => {
    expect(seed.files.length).toBeGreaterThan(0);
    for (const f of seed.files) {
      expect(f).toMatchObject({ owner_entity: "profile", kind: "photo", mime: "image/jpeg" });
      expect(f.path).toMatch(/^between-gigs\/[a-z-]+\.jpg$/);
      expect(existsSync(new URL(`../../../public/${f.source}`, import.meta.url))).toBe(true);
    }
  });

  it("is the same every time (stable ids), so a regenerated seed has a clean diff", () => {
    expect(toCompanyOsSeed(buildSeed(), buildWaitlist(buildSeed().people))).toEqual(seed);
  });
});
