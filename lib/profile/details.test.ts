import { afterEach, describe, expect, it, vi } from "vitest";
import { blankFields } from "@/lib/data/seed";
import type { ProfileFields } from "@/lib/data/types";
import { cleanDetails, detailsErrors, linkedinHref, marketingChange, privateDetails, profileDetailsEnabled, publicDetails, readPrivateDetails, readPublicDetails, withoutPrivateDetails } from "./details";

afterEach(() => vi.unstubAllEnvs());
const base = (over: Partial<ProfileFields> = {}): ProfileFields => ({ ...blankFields("Fictional Crew"), ...over });

describe("flag", () => {
  it("is off unless NEXT_PUBLIC_PROFILE_DETAILS is exactly 1", () => {
    for (const v of ["", "0", "true", "yes"]) { vi.stubEnv("NEXT_PUBLIC_PROFILE_DETAILS", v); expect(profileDetailsEnabled()).toBe(false); }
    vi.stubEnv("NEXT_PUBLIC_PROFILE_DETAILS", "1"); expect(profileDetailsEnabled()).toBe(true);
  });
});

describe("detailsErrors", () => {
  it("needs at least one rate option", () => {
    expect(detailsErrors(base({ rateOptions: [] })).rateOptions).toMatch(/Hourly, By Project, or both/);
    expect(detailsErrors(base()).rateOptions).toBeDefined();
    expect(detailsErrors(base({ rateOptions: ["project"] })).rateOptions).toBeUndefined();
  });
  it("hourly needs an amount above zero; the minimum hours is optional", () => {
    expect(detailsErrors(base({ rateOptions: ["hourly"] })).hourlyRate).toBeDefined();
    expect(detailsErrors(base({ rateOptions: ["hourly"], hourlyRate: "0" })).hourlyRate).toBeDefined();
    expect(detailsErrors(base({ rateOptions: ["hourly"], hourlyRate: "abc" })).hourlyRate).toBeDefined();
    expect(detailsErrors(base({ rateOptions: ["hourly"], hourlyRate: "45" }))).toEqual({});
    expect(detailsErrors(base({ rateOptions: ["hourly"], hourlyRate: "45", minimumHours: "0" })).minimumHours).toBeDefined();
    expect(detailsErrors(base({ rateOptions: ["hourly"], hourlyRate: "45", minimumHours: "2" }))).toEqual({});
  });
  it("a minimum project price is optional but must be a positive amount", () => {
    expect(detailsErrors(base({ rateOptions: ["project"], projectMinimum: "-5" })).projectMinimum).toBeDefined();
    expect(detailsErrors(base({ rateOptions: ["project"], projectMinimum: "500" }))).toEqual({});
  });
  it("LinkedIn is optional; personal and company pages pass, anything else says so inline", () => {
    const ok = (linkedin: string) => detailsErrors(base({ rateOptions: ["project"], linkedin })).linkedin;
    expect(ok("")).toBeUndefined();
    expect(ok("https://www.linkedin.com/in/fictional-crew")).toBeUndefined();
    expect(ok("https://linkedin.com/company/fictional-studio/")).toBeUndefined();
    for (const bad of ["https://linkedin.com.evil.com/in/x", "javascript:alert(1)", "http://www.linkedin.com/in/x", "https://www.linkedin.com/feed/", "https://evil.com/?https://www.linkedin.com/in/x", "linkedin.com/in/x", "https://www.linkedin.com/in/"]) {
      expect(ok(bad), bad).toMatch(/linkedin\.com\/in\/|company/);
    }
  });
});

describe("publicDetails (what a save sends; never refused by the module)", () => {
  it("is empty with nothing chosen", () => expect(publicDetails(base())).toBeUndefined());
  it("builds the module's keys in a fixed order", () => {
    const f = base({ rateOptions: ["hourly", "project"], hourlyRate: "45", minimumHours: "2", projectMinimum: "500", linkedin: "https://www.linkedin.com/in/x" });
    expect(JSON.stringify(publicDetails(f))).toBe(JSON.stringify({ rate_options: ["hourly", "project"], hourly_amount: 45, minimum_hours: 2, minimum_project_price: 500, linkedin_url: "https://www.linkedin.com/in/x" }));
  });
  it("leaves out what the module would refuse, so an autosave mid-edit is never a 422", () => {
    expect(publicDetails(base({ rateOptions: ["hourly"], hourlyRate: "" }))).toBeUndefined();
    expect(publicDetails(base({ rateOptions: ["hourly", "project"], hourlyRate: "", projectMinimum: "500" }))).toEqual({ rate_options: ["project"], minimum_project_price: 500 });
    expect(publicDetails(base({ rateOptions: ["project"], linkedin: "https://linkedin.com.evil.com/in/x" }))).toEqual({ rate_options: ["project"] });
    expect(publicDetails(base({ linkedin: "https://www.linkedin.com/in/x" }))).toEqual({ linkedin_url: "https://www.linkedin.com/in/x" });
  });
});

describe("privateDetails and the marketing choice", () => {
  it("sends channels and the booking consent; the marketing choice only when told to", () => {
    const f = base({ contactChannels: ["sms", "whatsapp"], bookingContactConsent: true, marketingEmailConsent: true });
    expect(privateDetails(f)).toEqual({ phone_channels: ["sms", "whatsapp"], booking_consent: true });
    expect(privateDetails(f, true)).toEqual({ phone_channels: ["sms", "whatsapp"], booking_consent: true, marketing_consent: true });
    expect(privateDetails(f, false)).toMatchObject({ marketing_consent: false });
  });
  it("is empty for a person who never touched it", () => expect(privateDetails(base())).toBeUndefined());
  it("marketing is sent only when the checkbox differs from what was loaded and the server has not moved since", () => {
    expect(marketingChange(base({ marketingEmailConsent: true, marketingConsentBaseline: false }), false)).toBe(true);
    expect(marketingChange(base({ marketingEmailConsent: false, marketingConsentBaseline: true }), true)).toBe(false);
    expect(marketingChange(base({ marketingEmailConsent: true, marketingConsentBaseline: true }), true)).toBeUndefined();
    expect(marketingChange(base({ marketingEmailConsent: undefined }), false)).toBeUndefined();
    // a stale draft: loaded as on, person later unsubscribed by the link (server now off): an unchanged checkbox must not re-enable
    expect(marketingChange(base({ marketingEmailConsent: true, marketingConsentBaseline: true }), false)).toBeUndefined();
    // changed in the editor but the server moved too: leave it for the person to decide again
    expect(marketingChange(base({ marketingEmailConsent: true, marketingConsentBaseline: false }), true)).toBeUndefined();
  });
});

describe("reading and cleaning", () => {
  it("reads the module's public details into the editor's answers", () => {
    expect(readPublicDetails({ rate_options: ["hourly", "project"], hourly_amount: 45.5, minimum_hours: 2, minimum_project_price: 500, linkedin_url: "https://www.linkedin.com/in/x" }))
      .toEqual({ rateOptions: ["hourly", "project"], hourlyRate: "45.5", minimumHours: "2", projectMinimum: "500", linkedin: "https://www.linkedin.com/in/x" });
    expect(readPublicDetails(undefined)).toEqual({});
    expect(readPublicDetails({ rate_options: ["x"], linkedin_url: 5 })).toEqual({});
  });
  it("reads private details (consent time is the server's, not an answer)", () => {
    expect(readPrivateDetails({ phone_channels: ["sms"], booking_consent: true, booking_consent_at: "2026-11-16T00:00:00.000Z" })).toEqual({ contactChannels: ["sms"], bookingContactConsent: true });
    expect(readPrivateDetails(null)).toEqual({});
  });
  it("cleans what a browser sends: known keys and types only", () => {
    expect(cleanDetails({ rateOptions: ["hourly", "hourly", "day"], hourlyRate: "45", linkedin: "x".repeat(900), contactChannels: ["sms", "fax"], marketingEmailConsent: true, evil: 1 }))
      .toEqual({ rateOptions: ["hourly"], hourlyRate: "45", linkedin: "x".repeat(500), contactChannels: ["sms"], marketingEmailConsent: true });
    expect(() => cleanDetails({ bookingContactConsent: "yes" })).toThrow(/invalid_private_details/);
  });
  it("a public response never carries the private answers", () => {
    const f = base({ contactChannels: ["sms"], bookingContactConsent: true, marketingEmailConsent: true, marketingConsentBaseline: true, bookingMobile: "+1 213 555 0123" });
    const out = withoutPrivateDetails(f);
    for (const k of ["contactChannels", "bookingContactConsent", "marketingEmailConsent", "marketingConsentBaseline", "bookingMobile"]) expect(out).not.toHaveProperty(k);
  });
});

describe("linkedinHref", () => {
  it("returns only a profile or company link on linkedin.com, else nothing", () => {
    expect(linkedinHref("https://www.linkedin.com/in/x")).toBe("https://www.linkedin.com/in/x");
    for (const bad of ["javascript:alert(1)", "https://linkedin.com.evil.com/in/x", undefined, ""]) expect(linkedinHref(bad)).toBe("");
  });
});

import { readFileSync } from "node:fs";
import { validateGigster } from "./validate";

describe("flag off: no new UI and no new checks", () => {
  const f = base({ linkedin: "https://linkedin.com.evil.com/in/x" });
  it("the editor asks nothing new", () => {
    const e = validateGigster(f);
    for (const k of ["rateOptions", "hourlyRate", "minimumHours", "projectMinimum", "linkedin"]) expect(e).not.toHaveProperty(k);
  });
  it("with the flag on the same answers are checked", () => {
    vi.stubEnv("NEXT_PUBLIC_PROFILE_DETAILS", "1");
    expect(validateGigster(f)).toMatchObject({ linkedin: expect.any(String), rateOptions: expect.any(String) });
  });
  it("every new editor control sits behind the flag", () => {
    const src = readFileSync("components/gigster/editor/canvas.tsx", "utf8");
    for (const c of ["<RateOptionFields", "<LinkedInField", "<ContactChoices"]) {
      const at = src.indexOf(c);
      expect(at, c).toBeGreaterThan(0);
      expect(src.slice(Math.max(0, at - 140), at), c).toMatch(/detailsOn|profileDetailsEnabled\(\)/);
    }
  });
});

describe("the consent checkboxes", () => {
  it("are unticked by default and use the draft wording", () => {
    const src = readFileSync("components/gigster/editor/DetailFields.tsx", "utf8");
    expect(src).toContain("Between Gigs may share my contact details with clients and contact me about bookings and projects.");
    expect(src).toContain("Send me Between Gigs news, opportunities and updates by email. I can unsubscribe at any time.");
    expect(src).toContain('href="/privacy/"');
    expect(src).toContain("d.bookingContactConsent === true");
    expect(src).toContain("d.marketingEmailConsent === true");
    expect(src).not.toMatch(/defaultChecked|#[0-9a-fA-F]{3,6}\b/);
  });
});
