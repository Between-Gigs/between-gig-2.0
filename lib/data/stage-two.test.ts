import { beforeEach, describe, expect, it } from "vitest";
import { completeFields } from "./contract/fixtures";
import { sampleSource as source } from "./sample";
import { startDateLabel } from "../profile/stage-two";

beforeEach(() => source.demo!.reset());

describe("Stage 2 sample answers", () => {
  it("carries a new signup's answers from draft through review while omitting mobile and account email from both public projections", async () => {
    const email = "crew.qa@example.test";
    const registered = await source.auth.register({ email, name: "Sample Crew", acceptTerms: true });
    if (!registered.ok) throw new Error(registered.error);
    const id = registered.person.id;
    const answers = {
      bookingMobile: "+1 213-555-0123", hireableJobs: "I plan furniture layouts for small spaces.",
      earliestStart: "2026-12-02", bookingMinimum: "Two hours", personality: "I collect postcards from each location.",
    };
    await source.profiles.saveDraft(id, { ...completeFields("Sample Crew", "img/people/maya.jpg"), ...answers }, 3);
    expect((await source.profiles.getDraft(id))!.fields).toMatchObject(answers);
    const submitted = await source.profiles.submit(id);
    expect((await source.people.get(id))!.fields).toMatchObject(answers);
    expect((await source.people.getPublic(submitted.person.slug)).profile).toBeNull();
    await source.owners.approve(id);
    const expanded = await source.people.getPublic(submitted.person.slug);
    const list = (await source.people.similar("", 1000)).find((x) => x.person.id === id)!;
    for (const result of [expanded, list]) {
      expect(result.person?.email).toBe("");
      expect(result.profile?.fields).not.toHaveProperty("bookingMobile");
      expect(result.profile?.fields).toMatchObject({ hireableJobs: answers.hireableJobs, earliestStart: answers.earliestStart, bookingMinimum: answers.bookingMinimum, personality: answers.personality });
      expect(JSON.stringify(result)).not.toContain(answers.bookingMobile);
      expect(JSON.stringify(result)).not.toContain(email);
    }
  });

  it("publishes an availability date immediately and keeps other edits in the draft until reviewed again", async () => {
    const draft = (await source.profiles.getDraft("maya"))!;
    const first = await source.people.getPublic("maya");
    const edits = { earliestStart: "2026-11-25", bookingMinimum: "Four hours", bookingMobile: "+1 323-555-0145" };
    await source.profiles.saveDraft("maya", { ...draft.fields, ...edits }, draft.step);
    const published = await source.people.getPublic("maya");
    expect(published.profile?.fields.earliestStart).toBe(edits.earliestStart);
    expect(published.profile?.fields.bookingMinimum).toBe(first.profile?.fields.bookingMinimum);
    expect(published.profile?.fields).not.toHaveProperty("bookingMobile");
    expect((await source.people.get("maya"))?.unsent).toBe(true);
    await source.profiles.submit("maya");
    expect((await source.people.getPublic("maya")).profile).toBeNull();
    await source.owners.approve("maya");
    expect((await source.people.getPublic("maya")).profile?.fields.bookingMinimum).toBe(edits.bookingMinimum);
    expect((await source.people.get("maya"))?.fields?.bookingMobile).toBe(edits.bookingMobile);
  });

  it("formats date-only answers without shifting the day and accepts older profiles without one", () => {
    expect(startDateLabel("2027-01-01")).toBe("Jan 1, 2027");
    expect(startDateLabel("2026-02-30")).toBe("");
    expect(startDateLabel(undefined)).toBe("");
  });
});
