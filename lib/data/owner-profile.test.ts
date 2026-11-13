import { beforeEach, describe, expect, it } from "vitest";
import { sampleSource as source } from "./sample";

beforeEach(() => source.demo!.reset());

describe("an owner can have their own Gigster profile", () => {
  it("creates only their own person after consent, keeps owner authority, and survives switching", async () => {
    await source.demo!.signInAs("owner");
    const before = (await source.auth.session())!;
    expect(before.personId).toBeNull();
    const result = await source.auth.signUp!({ name: "My Own Profile", acceptedTerms: true });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.session.role).toBe("owner");
    const id = result.session.personId!;
    expect((await source.people.get(id))!.person).toMatchObject({ email: before.email, name: "My Own Profile", status: "registered" });
    const draft = (await source.profiles.getDraft(id))!;
    await source.profiles.saveDraft(id, { ...draft.fields, about: "My personal profile." }, 0);
    await expect(source.owners.dashboard()).resolves.toBeDefined();
    await source.demo!.signInAs("gigster", "maya");
    await source.demo!.signInAs("owner");
    expect(await source.auth.session()).toMatchObject({ role: "owner", personId: id });
    expect((await source.profiles.getDraft(id))!.fields.about).toBe("My personal profile.");
    await source.auth.signUp!({ name: "My Own Profile", acceptedTerms: true });
    const own = await source.people.list({ text: before.email });
    expect(own.filter(p => p.person.email === before.email)).toHaveLength(1);
  });

  it("does not create a person without explicit acceptance or a signed-in owner", async () => {
    await expect(source.auth.signUp!({ name: "Unknown", acceptedTerms: true })).resolves.toMatchObject({ ok: false });
    await source.demo!.signInAs("owner");
    const before = await source.auth.session();
    // A runtime caller cannot bypass the UI's checkbox.
    await expect(source.auth.signUp!({ name: "Owner", acceptedTerms: false as true })).resolves.toMatchObject({ ok: false, error: "terms" });
    expect(await source.auth.session()).toEqual(before);
  });
});
