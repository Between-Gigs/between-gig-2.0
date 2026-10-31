/*
 * The steps every contract test builds on, written only against the DataSource and the harness: a visitor joins
 * the call sheet, an owner invites them, they sign in, build, submit, and an owner reviews. Each run uses fresh,
 * made-up addresses (example domains), so the live tenant never needs a reset between tests.
 */
import { blankFields } from "../seed";
import type { ProfileFields, ReviewNoteInput } from "../types";
import type { Harness } from "./harness";

let n = 0;
/** A fresh, made-up address. */
export const freshEmail = (tag: string) => `${tag}-${Date.now().toString(36)}${(n++).toString(36)}@contract.example`;

/** The smallest bytes Company OS accepts as a JPEG (its upload check reads the type and the first bytes). */
export const tinyJpeg = () =>
  new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9])], { type: "image/jpeg" });

/** Every answer the questionnaire needs, with values from the taxonomy; one credit hidden from clients. */
export const completeFields = (name: string, photo: string): ProfileFields => ({
  ...blankFields(name),
  photo,
  years: "6",
  position: "Set decoration",
  credits: ["Night Shift (feature)", "Old commercial"],
  creditPins: [true, false],
  skills: ["Set decoration"],
  services: ["Interior Styling"],
  market: "la",
  zip: "90026",
  areas: ["Eastside"],
  month: "2026-11",
  monthStatus: "available",
  dates: "Weekends",
  rate: "45",
  basis: "hourly",
  about: "Six years dressing sets for features.",
  mode: "studio",
});

/** A visitor joins the call sheet. Leaves nobody signed in. */
export async function joined(h: Harness, tag: string) {
  const email = freshEmail(tag);
  await h.signOut();
  const r = await h.source.funnel.joinWaitlist({ email, zip: "90026", category: "interiors", placement: "contract" });
  if (!r.ok) throw new Error(`joinWaitlist: ${r.error}`);
  return { email, signupId: r.signup.id };
}

/** The owner's waitlist row for an address. Leaves the owner signed in. */
export async function waitlistRow(h: Harness, email: string) {
  await h.signInOwner();
  const rows = await h.source.owners.waitlist({ text: email });
  const row = rows.find((r) => r.signup.email === email);
  if (!row) throw new Error(`no waitlist row for ${email}`);
  return row;
}

/** Joined and invited by an owner. Leaves the owner signed in. */
export async function invited(h: Harness, tag: string) {
  const { email } = await joined(h, tag);
  const row = await waitlistRow(h, email);
  const result = await h.source.owners.invite([row.signup.id]);
  if (result.invited !== 1) throw new Error(`invite: ${JSON.stringify(result)}`);
  const personId = (await waitlistRow(h, email)).personId;
  if (!personId) throw new Error("invite made no person");
  return { email, personId, signupId: row.signup.id };
}

/** Invited, then signed in. Leaves the Gigster signed in. */
export async function registered(h: Harness, tag: string, name = "Contract Gigster") {
  const who = await invited(h, tag);
  const r = await h.signIn(who.email, name);
  if (!r.ok) throw new Error(`signIn: ${r.error}`);
  return { ...who, name };
}

/** The photo as the builder gets it: uploaded where the source can, else a data URL. */
export async function photo(h: Harness, personId: string) {
  return h.source.profiles.uploadPhoto ? h.source.profiles.uploadPhoto(personId, tinyJpeg()) : "data:image/jpeg;base64,/9j/";
}

/** Registered, with every answer saved. Leaves the Gigster signed in. */
export async function drafted(h: Harness, tag: string, name = "Contract Gigster") {
  const who = await registered(h, tag, name);
  const fields = completeFields(name, await photo(h, who.personId));
  await h.source.profiles.saveDraft(who.personId, fields, 3);
  return { ...who, fields };
}

/** Drafted and submitted. Leaves the Gigster signed in. */
export async function submitted(h: Harness, tag: string, name = "Contract Gigster") {
  const who = await drafted(h, tag, name);
  await h.source.profiles.submit(who.personId);
  return who;
}

/** Submitted, then approved by an owner. Leaves the owner signed in. */
export async function approved(h: Harness, tag: string, name = "Contract Gigster") {
  const who = await submitted(h, tag, name);
  await h.signInOwner();
  const person = await h.source.owners.approve(who.personId);
  return { ...who, slug: person.slug };
}

export const notes: ReviewNoteInput[] = [
  { section: "about", note: "Add your years on features." },
  { section: "skills", note: "Pick one more skill." },
];
