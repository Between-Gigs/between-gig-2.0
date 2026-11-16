import { beforeEach, expect, it } from "vitest";
import { harness } from "./harness";
import { drafted } from "./fixtures";
const h = await harness();
beforeEach(() => h.reset());
it("saves a fictional international postal value privately and excludes it after review", async () => {
  const who = await drafted(h, "international-postal", "Postal Contract");
  const zip = "AB1C 2D3E";
  await h.source.profiles.saveDraft(who.personId, { ...who.fields, market: "other", otherCity: "Fictional city, Test Country", zip }, 2);
  expect((await h.source.profiles.getDraft(who.personId))?.fields).toMatchObject({ market: "other", zip, services: who.fields.services, credits: who.fields.credits });
  await h.source.profiles.submit(who.personId);
  await h.signInOwner();
  expect((await h.source.people.get(who.personId))?.fields?.zip).toBe(zip);
  await h.source.owners.approve(who.personId);
  const slug = (await h.source.people.get(who.personId))!.person.slug;
  await h.signOut();
  const page = await h.source.people.getPublic(slug);
  // Current fixture approval publishes the active other market; do not let null pass vacuously.
  expect(page.profile).not.toBeNull();
  expect(page.profile?.fields.zip).toBe("");
  expect(JSON.stringify(page)).not.toContain(zip);
});
