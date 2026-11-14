import { it, expect } from "vitest";
import { blankFields } from "@/lib/data/fields";
import { cleanFields } from "./routes";
import { toProfile, fromProfile } from "@/lib/data/companyos/fields";
import { contentChanged } from "@/lib/profile/validate";
it("round-trips ordered services, both prices and private consent without public leakage", () => {
    const original = { ...blankFields(), services: ["Interior Styling"], serviceLines: { "Interior Styling": "Style a room" }, skills: ["Custom craft"], title: "Creative craftsperson", rateOptions: ["hourly", "project"] as ("hourly" | "project")[], hourlyRate: "60", projectMinimum: "250", travelBeyondLA: true, bookingMobile: "+12135550123", contactChannels: ["sms"] as "sms"[], bookingContactConsent: true, marketingEmailConsent: false, showcase: [{ id: "x", kind: "image" as const, url: "https://example.org/photo.jpg", description: "Custom table" }] };
    const cleaned = cleanFields(original);
    const packed = toProfile(cleaned, { review: true });
    expect(packed.data.public_details).toMatchObject({ hourlyRate: "60", projectMinimum: "250", skills: ["Custom craft"] });
    expect(JSON.stringify(packed.data.public_details)).not.toMatch(/1213555|bookingContactConsent/);
    expect(fromProfile(packed.data, packed.items, original.photo)).toMatchObject({ hourlyRate: "60", bookingMobile: "+12135550123", bookingContactConsent: true });
    expect(contentChanged(original, { ...original, showcase: [{ ...original.showcase[0], description: "New project" }] })).toBe(true);
});
