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
