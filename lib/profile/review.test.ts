import { describe, expect, it } from "vitest";
import { blankFields } from "@/lib/data/fields";
import { cleanReviewFields, publicReviewDetails, privateReviewDetails, rateChoices, reviewErrors, validPostalCode, safeMediaUrl } from "./review";

describe("Patti profile review", () => {
  it("accepts international postal codes and only five digits for LA", () => {
    expect(validPostalCode("la", "90026")).toBe(true);
    for (const code of ["1234", "123456", "SW1A 1AA"]) expect(validPostalCode("la", code)).toBe(false);
    for (const code of ["SW1A 1AA", "050021", "M5V 2T6"]) expect(validPostalCode("other", code)).toBe(true);
  });
  it("requires travel and one rate choice, permits project without a minimum, requires hourly amount", () => {
    const f = { ...blankFields(), travel: "Up to 15 miles", rateOptions: ["project"] as ("hourly" | "project")[] };
    expect(reviewErrors(f)).toEqual({});
    expect(reviewErrors({ ...f, rateOptions: [] }).rateOptions).toBeTruthy();
    expect(reviewErrors({ ...f, travel: "" }).travel).toBeTruthy();
    expect(reviewErrors({ ...f, rateOptions: ["hourly", "project"] }).hourlyRate).toBeTruthy();
    expect(reviewErrors({ ...f, rateOptions: ["hourly", "project"], hourlyRate: "60", minimumHours: "2" })).toEqual({});
    expect(reviewErrors({ ...f, minimumHours: "-1" }).minimumHours).toBeTruthy();
  });
  it("reads existing rate choices without changing an old day rate", () => {
    expect(rateChoices({ ...blankFields(), basis: "project", rate: "100" })).toEqual(["project"]);
    expect(rateChoices({ ...blankFields(), basis: "day", rate: "400" })).toEqual([]);
  });
  it("keeps phone, contact channels, insurance notes and consent out of public details", () => {
    const f = { ...blankFields(), travelBeyondLA: true, linkedin: "https://linkedin.com/in/example", bookingMobile: "+12135550123", bookingContactConsent: true, marketingEmailConsent: true, contactChannels: ["sms", "whatsapp"] as ("sms" | "phone" | "whatsapp")[], insuranceNotes: "private policy", rateOptions: ["hourly", "project"] as ("hourly" | "project")[], hourlyRate: "60", projectMinimum: "200" };
    expect(JSON.stringify(publicReviewDetails(f))).not.toMatch(/1213555|private policy|Consent|contactChannels/);
    expect(privateReviewDetails(f).bookingMobile).toBe(f.bookingMobile);
    expect(publicReviewDetails(f).rateOptions).toEqual(["hourly", "project"]);
  });
  it("rejects executable media URLs and cleans untrusted nested fields", () => {
    expect(safeMediaUrl("javascript:alert(1)")).toBe("");
    expect(safeMediaUrl("data:text/html,test")).toBe("");
    expect(safeMediaUrl("https://example.com/video.mp4")).toContain("https://");
    const clean = cleanReviewFields({ rateOptions: ["hourly", "owner"], marketingEmailConsent: "true", contactChannels: ["sms", "admin"], showcase: [{ kind: "video", url: "javascript:x", description: "x" }] });
    expect(clean.rateOptions).toEqual(["hourly"]);
    expect(clean.marketingEmailConsent).toBe(false);
    expect(clean.contactChannels).toEqual(["sms"]);
    expect(clean.showcase).toEqual([]);
  });
});
