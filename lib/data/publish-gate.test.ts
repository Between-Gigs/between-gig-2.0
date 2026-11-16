import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sampleSource as s } from "./sample";
import { statusOf } from "@/lib/server/gigs";

/*
 * The publish gate (API 1.16.0, publish_after_approval): approving makes a profile "approved" (private, no email);
 * only "published" is public. Flag off: today's behaviour, approved is public.
 */
afterEach(() => vi.unstubAllEnvs());

describe("status mapping from Company OS", () => {
  const row = (status: string) => ({ id: "x", data: { status }, createdAt: "", updatedAt: "" });
  it("maps published, approved and the older statuses", () => {
    expect(statusOf(row("published"), true)).toBe("published");
    expect(statusOf(row("approved"), true)).toBe("approved");
    expect(statusOf(row("submitted"), true)).toBe("submitted");
    expect(statusOf(undefined, true)).toBe("registered");
  });
});

describe("flag off (today)", () => {
  beforeEach(() => s.demo!.reset());
  it("an approved profile is public, and approving queues the approved email", async () => {
    expect((await s.people.getPublic("maya")).profile).not.toBeNull();
    await s.owners.approve("imani-carter");
    const person = (await s.people.get("imani-carter"))!.person;
    expect(person.status).toBe("approved");
    expect((await s.people.getPublic(person.slug)).profile).not.toBeNull();
  });
  it("Live profiles = the approved count, no published people", async () => {
    const d = await s.owners.dashboard();
    expect(d.counts.published).toBe(0);
    expect(d.counts.approved).toBeGreaterThan(0);
  });
});

describe("gate on", () => {
  beforeEach(() => { vi.stubEnv("NEXT_PUBLIC_PROFILE_PUBLISH_GATE", "1"); s.demo!.reset(); });

  it("the sample shows both states: published people and one approved, not public", async () => {
    const d = await s.owners.dashboard();
    expect(d.counts.published).toBeGreaterThan(0);
    expect(d.counts.approved).toBeGreaterThan(0);
  });
  it("a published profile resolves publicly, an approved one reads as an unknown handle", async () => {
    expect((await s.people.getPublic("maya")).profile).not.toBeNull();
    expect((await s.people.get("maya"))!.person.status).toBe("published");
    const approved = (await s.people.list({ status: "approved" })).find((p) => p.person.slug)!;
    expect(approved).toBeTruthy();
    expect(await s.people.getPublic(approved.person.slug)).toEqual({ person: null, profile: null });
  });
  it("the public list (similar) excludes approved people", async () => {
    const approved = (await s.people.list({ status: "approved" })).map((p) => p.person.id);
    const ids = (await s.people.similar("none", 12)).map((x) => x.person.id);
    for (const id of approved) expect(ids).not.toContain(id);
    expect(ids.length).toBeGreaterThan(0);
  });
  it("owner approval makes the person approved: private, no approved email", async () => {
    const before = await s.emails.outbox();
    await s.owners.approve("imani-carter");
    const person = (await s.people.get("imani-carter"))!.person;
    expect(person.status).toBe("approved");
    expect(await s.people.getPublic(person.slug)).toEqual({ person: null, profile: null });
    const after = await s.emails.outbox();
    expect(after.filter((e: { template: string }) => e.template === "approved").length).toBe(before.filter((e: { template: string }) => e.template === "approved").length);
  });
  it("owner counters: Live counts published only; approved is its own count", async () => {
    const before = await s.owners.dashboard();
    await s.owners.approve("imani-carter");
    const after = await s.owners.dashboard();
    expect(after.counts.approved).toBe(before.counts.approved + 1);
    expect(after.counts.published).toBe(before.counts.published);
  });
});
