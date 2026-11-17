import { describe, expect, it } from "vitest";
import { blankFields } from "../seed.ts";
import { fromProfile, toProfile } from "./fields.ts";

const filled = {
  ...blankFields("Fictional Crew"),
  rateOptions: ["hourly", "project"] as ("hourly" | "project")[], hourlyRate: "45", minimumHours: "2", projectMinimum: "500", linkedin: "https://www.linkedin.com/company/fictional-studio",
};

describe("profile details in the mapper", () => {
  it("flag off: nothing about details reaches the profile data", () => {
    const { data } = toProfile(filled);
    expect(data).not.toHaveProperty("public_details");
    expect(data).not.toHaveProperty("private_details");
  });
  it("flag on: the public details are one JSON field; private details never ride in toProfile", () => {
    const { data } = toProfile({ ...filled, contactChannels: ["sms"], bookingContactConsent: true }, { details: true });
    expect(data.public_details).toEqual({ rate_options: ["hourly", "project"], hourly_amount: 45, minimum_hours: 2, minimum_project_price: 500, linkedin_url: "https://www.linkedin.com/company/fictional-studio" });
    expect(JSON.stringify(data.public_details)).not.toMatch(/sms|consent/);
    expect(data).not.toHaveProperty("private_details");
  });
  it("round trips public and private details", () => {
    const { data } = toProfile(filled, { details: true });
    const back = fromProfile({ ...data, private_details: { phone_channels: ["phone", "whatsapp"], booking_consent: true, booking_consent_at: "2026-11-16T10:00:00.000Z" } }, [], "");
    expect(back).toMatchObject({ rateOptions: ["hourly", "project"], hourlyRate: "45", minimumHours: "2", projectMinimum: "500", linkedin: filled.linkedin, contactChannels: ["phone", "whatsapp"], bookingContactConsent: true });
  });
  it("keeps the legacy rate in step: hourly amount first, else the project minimum", () => {
    expect(toProfile(filled, { details: true }).data).toMatchObject({ rate_text: "45", rate_basis: "hourly" });
    expect(toProfile({ ...filled, rateOptions: ["project"] }, { details: true }).data).toMatchObject({ rate_text: "500", rate_basis: "project" });
  });
  it("a profile with no details reads back unchanged (existing tenants)", () => {
    const back = fromProfile(toProfile(blankFields("Fictional Crew")).data, [], "");
    for (const k of ["rateOptions", "hourlyRate", "linkedin", "contactChannels", "bookingContactConsent", "marketingEmailConsent"]) expect(back).not.toHaveProperty(k);
  });
});
