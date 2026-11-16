import { describe, expect, it } from "vitest";
import { blankFields } from "@/lib/data/seed";
import { toProfile } from "@/lib/data/companyos/fields";
import type { ProfileFields } from "@/lib/data/types";
import { cleanFields } from "./routes";
import { draftOps } from "./gigs";
import type { Row } from "./companyos";

const PERSON = "p-1";
const fields: ProfileFields = { ...blankFields("Fictional Crew"), services: ["Wardrobe & Personal Styling"], position: "Wardrobe" };
const storedOf = (f: ProfileFields, priv?: Record<string, unknown>): { profile: Row; items: Row[] } => {
  const { data, items } = toProfile(f, { details: true });
  return {
    profile: { id: "prof", data: { ...data, person: PERSON, status: "approved", ...(priv ? { private_details: priv } : {}) }, createdAt: "", updatedAt: "" },
    items: items.map((i, n) => ({ id: `item-${n}`, data: { ...i, profile: "prof" }, createdAt: "", updatedAt: "" })),
  };
};
const run = (f: ProfileFields, existing: ReturnType<typeof storedOf> | { items: Row[] }, marketing?: boolean, details = true) =>
  draftOps(PERSON, f, existing, false, { details, marketing });

describe("draftOps with profile details", () => {
  it("flag off sends no details, whatever the draft holds", () => {
    const f = { ...fields, rateOptions: ["hourly" as const], hourlyRate: "45", linkedin: "https://www.linkedin.com/in/x", contactChannels: ["sms" as const], bookingContactConsent: true };
    const ops = run(f, { items: [] }, true, false);
    expect(JSON.stringify(ops)).not.toMatch(/public_details|private_details|marketing_consent/);
  });
  it("the first save carries public and private details", () => {
    const f = { ...fields, rateOptions: ["hourly" as const], hourlyRate: "45", contactChannels: ["sms" as const], bookingContactConsent: true };
    const [create] = run(f, { items: [] });
    expect(create!.data).toMatchObject({ public_details: { rate_options: ["hourly"], hourly_amount: 45 }, private_details: { phone_channels: ["sms"], booking_consent: true } });
  });
  it("saving the same answers sends nothing (the server's consent time is not a difference)", () => {
    const f = { ...fields, rateOptions: ["hourly" as const], hourlyRate: "45", contactChannels: ["sms" as const], bookingContactConsent: true };
    const stored = storedOf(f, { phone_channels: ["sms"], booking_consent: true, booking_consent_at: "2026-11-16T10:00:00.000Z" });
    expect(run(f, stored)).toEqual([]);
  });
  it("a changed booking consent sends both private keys, never the consent time", () => {
    const f = { ...fields, contactChannels: ["sms" as const], bookingContactConsent: true };
    const stored = storedOf({ ...f, bookingContactConsent: false }, { phone_channels: ["sms"], booking_consent: false });
    expect(run(f, stored)).toEqual([{ op: "update", entity: "profile", id: "prof", data: { private_details: { phone_channels: ["sms"], booking_consent: true } } }]);
  });
  it("the marketing choice goes only when the caller says it changed, and maps to marketing_consent", () => {
    const stored = storedOf(fields, { phone_channels: [], booking_consent: false });
    expect(run({ ...fields, marketingEmailConsent: true }, stored)).toEqual([]);
    expect(run({ ...fields, marketingEmailConsent: true }, stored, true)).toEqual([{ op: "update", entity: "profile", id: "prof", data: { private_details: { phone_channels: [], booking_consent: false, marketing_consent: true } } }]);
    expect(run({ ...fields, marketingEmailConsent: false }, stored, false)[0]!.data).toMatchObject({ private_details: { marketing_consent: false } });
  });
  it("clearing the public details clears them", () => {
    const f = { ...fields, rateOptions: ["project" as const], projectMinimum: "500" };
    const ops = run(fields, storedOf(f));
    expect(ops[0]!.data).toMatchObject({ public_details: {} });
  });
  it("public details never include a private answer", () => {
    const f = { ...fields, rateOptions: ["hourly" as const], hourlyRate: "45", contactChannels: ["sms" as const], bookingContactConsent: true, marketingEmailConsent: true };
    const [create] = run(f, { items: [] }, true);
    expect(JSON.stringify((create!.data as { public_details: unknown }).public_details)).not.toMatch(/sms|consent|channels/);
  });
});

describe("cleanFields", () => {
  it("passes the new answers through, typed", () => {
    const out = cleanFields({ ...fields, rateOptions: ["hourly", "project"], hourlyRate: "45", contactChannels: ["sms"], bookingContactConsent: true, marketingEmailConsent: false, marketingConsentBaseline: false });
    expect(out).toMatchObject({ rateOptions: ["hourly", "project"], hourlyRate: "45", contactChannels: ["sms"], bookingContactConsent: true, marketingEmailConsent: false, marketingConsentBaseline: false });
  });
  it("refuses a consent that is not a boolean", () => {
    expect(() => cleanFields({ ...fields, marketingEmailConsent: "yes" })).toThrow();
  });
});
