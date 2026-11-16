import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RatePricing } from "@/components/profile/RatePricing";
import { toProfile, fromProfile } from "@/lib/data/companyos/fields";
import { blankFields } from "@/lib/data/seed";
import { draftOps } from "@/lib/server/gigs";
import { cleanFields } from "@/lib/server/routes";
import type { ProfileFields } from "@/lib/data/types";
import { LOCAL_ONLY_FIELDS } from "@/lib/data/api";
import { pricingLines, privateDetails, readPrivateDetails, withoutPrivateDetails } from "./details";

afterEach(() => vi.unstubAllEnvs());
const base = (o: Partial<ProfileFields> = {}): ProfileFields => ({ ...blankFields("Fictional Crew"), ...o });
const both = base({ rateOptions: ["hourly", "project"], hourlyRate: "45", minimumHours: "2", projectMinimum: "500", rate: "45", basis: "hourly" });

describe("public pricing lines", () => {
  it("shows both options when both are chosen", () => {
    expect(pricingLines(both)).toEqual(["$45/hour · minimum 2 hours", "Projects from $500"]);
    expect(pricingLines({ ...both, minimumHours: "1" })?.[0]).toBe("$45/hour · minimum 1 hour");
    expect(pricingLines({ ...both, minimumHours: "", projectMinimum: "" })).toEqual(["$45/hour", "Projects: price on request"]);
  });
  it("is null unless both are chosen with an hourly amount (single option keeps the existing display)", () => {
    expect(pricingLines(base({ rateOptions: ["hourly"], hourlyRate: "45" }))).toBeNull();
    expect(pricingLines(base({ rateOptions: ["hourly", "project"], hourlyRate: "" }))).toBeNull();
    expect(pricingLines(base())).toBeNull();
  });
  it("renders only with the flag on", () => {
    const html = () => renderToStaticMarkup(createElement(RatePricing, { f: both }));
    expect(html()).toBe("");
    vi.stubEnv("NEXT_PUBLIC_PROFILE_DETAILS", "1");
    expect(html()).toContain("$45/hour · minimum 2 hours");
    expect(html()).toContain("Projects from $500");
  });
  it.each(["components/profile/ProfileView.tsx", "components/profile/ModernProfile.tsx", "components/profile/WarmProfile.tsx", "components/ds/templates/ProfileTemplate.tsx"])("%s uses it", (file) => {
    expect(readFileSync(file, "utf8")).toContain("<RatePricing");
  });
});

describe("phone number under the flag", () => {
  it("goes to private_details.phone, never public_details", () => {
    const f = base({ bookingMobile: "+1 213 555 0123" });
    expect(privateDetails(f)).toMatchObject({ phone: "+1 213 555 0123" });
    const { data } = toProfile({ ...f, rateOptions: ["project"] }, { details: true });
    expect(JSON.stringify(data.public_details)).not.toContain("555");
    expect(JSON.stringify(data)).not.toContain("555");
  });
  it("loads from private_details and a cleared number is sent as empty", () => {
    expect(readPrivateDetails({ phone: "+1 213 555 0123" })).toEqual({ bookingMobile: "+1 213 555 0123" });
    const stored = { profile: { id: "p", data: { ...toProfile(base(), { details: true }).data, person: "x", status: "approved", private_details: { phone: "+1 213 555 0123", phone_channels: [], booking_consent: false } }, createdAt: "", updatedAt: "" }, items: [] };
    const ops = draftOps("x", base({ bookingMobile: "" }), stored, false, { details: true });
    expect(ops[0]!.data).toMatchObject({ private_details: { phone: "" } });
    expect(draftOps("x", base({ bookingMobile: "+1 213 555 0123" }), stored, false, { details: true })).toEqual([]);
  });
  it("flag off: stays browser-only and is not sent", () => {
    const ops = draftOps("x", base({ bookingMobile: "+1 213 555 0123" }), { items: [] }, false, { details: false });
    expect(JSON.stringify(ops)).not.toContain("555");
    expect(LOCAL_ONLY_FIELDS).toContain("bookingMobile");
  });
  it("never in a public response", () => {
    expect(withoutPrivateDetails(base({ bookingMobile: "+1 213 555 0123" }))).not.toHaveProperty("bookingMobile");
    expect(fromProfile({}, [], "")).not.toHaveProperty("bookingMobile");
    expect(cleanFields({ ...base(), bookingMobile: "+1 213 555 0123" }).bookingMobile).toBe("+1 213 555 0123");
  });
});

describe("review fixes", () => {
  it("m2: a phone number may have 7 to 20 digits", async () => {
    const { validPhone } = await import("./details");
    expect(validPhone("+1 213 555 0123")).toBe(true);
    expect(validPhone("+" + "1".repeat(20))).toBe(true);
    expect(validPhone("+" + "1".repeat(21))).toBe(false);
    expect(validPhone("123456")).toBe(false);
  });
  it("m4: an hourly-only profile with a minimum shows it publicly; without one the existing display stays", () => {
    expect(pricingLines(base({ rateOptions: ["hourly"], hourlyRate: "45", minimumHours: "3" }))).toEqual(["$45/hour · minimum 3 hours"]);
    expect(pricingLines(base({ rateOptions: ["hourly"], hourlyRate: "45" }))).toBeNull();
    expect(pricingLines(base({ rateOptions: ["project"], projectMinimum: "500" }))).toBeNull();
  });
  it("m1: private answers are local-only in the browser source and stripped from the sample public view", () => {
    for (const k of ["contactChannels", "bookingContactConsent", "marketingEmailConsent", "marketingConsentBaseline"]) expect(LOCAL_ONLY_FIELDS).toContain(k);
    expect(readFileSync("lib/data/sample.ts", "utf8")).toContain("withoutPrivateDetails(");
  });
  it("M1: the suppressed state disables the marketing checkbox with the note", () => {
    const src = readFileSync("components/gigster/editor/DetailFields.tsx", "utf8");
    expect(src).toContain("You asked us not to send marketing email. Contact hello@between-gigs.com to change this.");
    expect(src).toContain("marketingSuppressed");
    expect(src).toContain("disabled");
  });
});

import { saveDraft, getDraft, type Ctx } from "@/lib/server/gigs";
import { CompanyOsError, type Row } from "@/lib/server/companyos";

describe("saving the marketing choice", () => {
  const profileRow: Row = { id: "prof", data: { ...toProfile(base(), { details: true }).data, person: "x", status: "draft", private_details: { phone_channels: [], booking_consent: false } }, createdAt: "", updatedAt: "" };
  function ctxWith(pref: unknown | Error, onBatch: (ops: { data?: Record<string, unknown> }[]) => void, failFirstBatch = false) {
    let batches = 0;
    const cos = {
      query: async (_c: unknown, spec: { entity: string }) => (spec.entity === "profile" ? [profileRow] : []),
      all: async () => [],
      call: async () => { if (pref instanceof Error) throw pref; return pref; },
      batch: async (_c: unknown, ops: { data?: Record<string, unknown> }[]) => {
        onBatch(ops);
        if (failFirstBatch && batches++ === 0) throw new CompanyOsError(422, "contact_suppressed");
        return { ids: [] };
      },
    };
    return { cos, cred: { kind: "session", token: "t" } } as unknown as Ctx;
  }
  const want = (over: Partial<ProfileFields> = {}) => base({ marketingEmailConsent: true, marketingConsentBaseline: false, ...over });
  const sent = (batches: { data?: Record<string, unknown> }[][]) => JSON.stringify(batches);

  it("suppressed: the read says so and a marketing choice is never sent", async () => {
    vi.stubEnv("NEXT_PUBLIC_PROFILE_DETAILS", "1");
    const batches: { data?: Record<string, unknown> }[][] = [];
    const out = await saveDraft(ctxWith({ enabled: false, configured: true, suppressed: true }, (o) => batches.push(o)), "x", want({ about: "Hello" }));
    expect(sent(batches)).not.toContain("marketing_consent");
    expect(out.fields.marketingSuppressed).toBe(true);
  });
  it("a save that still gets contact_suppressed is retried without marketing_consent and says so", async () => {
    vi.stubEnv("NEXT_PUBLIC_PROFILE_DETAILS", "1");
    const batches: { data?: Record<string, unknown> }[][] = [];
    const out = await saveDraft(ctxWith({ enabled: false, configured: true }, (o) => batches.push(o), true), "x", want({ about: "Hello" }));
    expect(batches).toHaveLength(2);
    expect(JSON.stringify(batches[0])).toContain("marketing_consent");
    expect(JSON.stringify(batches[1])).not.toContain("marketing_consent");
    expect(JSON.stringify(batches[1])).toContain("Hello");
    expect(out.fields.marketingSuppressed).toBe(true);
  });
  it("m3: an unreadable preference saves the rest, keeps the change pending and says to try again", async () => {
    vi.stubEnv("NEXT_PUBLIC_PROFILE_DETAILS", "1");
    const batches: { data?: Record<string, unknown> }[][] = [];
    const out = await saveDraft(ctxWith(new CompanyOsError(502, "company_os_unreachable"), (o) => batches.push(o)), "x", want({ about: "Hello" }));
    expect(sent(batches)).toContain("Hello");
    expect(sent(batches)).not.toContain("marketing_consent");
    expect(out.fields.marketingEmailConsent).toBe(true);
    expect(out.fields.marketingConsentBaseline).toBe(false);
    expect(out.fields.marketingNotice).toBe("Couldn't save your email preference. Try again.");
  });
  it("getDraft carries the suppressed state", async () => {
    vi.stubEnv("NEXT_PUBLIC_PROFILE_DETAILS", "1");
    const d = await getDraft(ctxWith({ enabled: false, configured: true, suppressed: true }, () => {}), "x");
    expect(d!.fields.marketingSuppressed).toBe(true);
  });
});
