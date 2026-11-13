import { describe, expect, it } from "vitest";
import { blankFields } from "@/lib/data/fields";
import { defaultProfileTemplate, encodeProfileTemplate, parseProfileTemplate, type ProfileTemplate } from "./template";
import { completeness, contentChanged, partsDone, validateAll } from "./validate";

describe("profile template", () => {
  it("round-trips the full field and page order, omitting untrusted keys and rejecting malformed settings", () => {
    const rules: ProfileTemplate = { required: ["rate", "name"], order: [...defaultProfileTemplate.order].reverse(), sections: [...defaultProfileTemplate.sections].reverse() };
    const clean = parseProfileTemplate(encodeProfileTemplate(rules))!;
    expect(clean.required).toEqual(["name", "rate"]);
    expect(clean.order).toEqual(rules.order);
    expect(clean.sections).toEqual(rules.sections);
    expect(parseProfileTemplate('{"version":99}')).toBeNull();
    expect(parseProfileTemplate(JSON.stringify({ ...rules, order: ["name", "name"], version: 1 }))).toBeNull();
    expect(parseProfileTemplate(JSON.stringify({ ...rules, required: ["email"], version: 1 }))).toBeNull();
    expect(encodeProfileTemplate(clean)).not.toContain("person");
  });

  it("enforces newly required fields at submission and counts progress against the same choices", () => {
    const rules: ProfileTemplate = { ...defaultProfileTemplate, required: ["zip", "travel", "rate"] };
    const f = { ...blankFields(), zip: "90026", rate: "0" };
    expect(validateAll(f, rules)).toEqual({ 2: { travel: "Describe how far you can travel.", rate: "Add a starting rate greater than zero." } });
    expect(partsDone(f, "", rules)).toEqual({ done: 0, total: 2 });
    expect(completeness(f, rules)).toBeCloseTo(1 / 3);
    const complete = { ...f, travel: "Within 20 miles", rate: "95" };
    expect(validateAll(complete, rules)).toEqual({});
    expect(partsDone(complete, "", rules)).toEqual({ done: 2, total: 2 });
    expect(completeness(complete, rules)).toBe(1);
  });

  it("allows omitted optional answers, validates entered ones, and handles zero requirements", () => {
    const rules = { ...defaultProfileTemplate, required: [] };
    expect(validateAll(blankFields(), rules)).toEqual({});
    expect(validateAll({ ...blankFields(), zip: "12", imdb: "other" }, rules)).toHaveProperty("0.imdb");
    expect(validateAll({ ...blankFields(), zip: "12" }, rules)).toHaveProperty("2.zip");
    expect(partsDone(blankFields(), "", rules)).toEqual({ done: 0, total: 0 });
    expect(completeness(blankFields(), rules)).toBe(1);
  });

  it("supports private and public supplemental answers on drafts created before they existed", () => {
    const rules: ProfileTemplate = { ...defaultProfileTemplate, required: ["bookingMobile", "earliestStart", "hireableJobs"] };
    const legacy = blankFields("Jamie");
    expect(contentChanged(legacy, { ...legacy, personality: "", hireableJobs: "", earliestStart: "" })).toBe(false);
    expect(contentChanged(legacy, { ...legacy, bookingMinimum: "Two hours" })).toBe(true);
    expect(contentChanged(legacy, { ...legacy, earliestStart: "2026-12-20" })).toBe(false);
    expect(Object.keys(validateAll(legacy, rules)[3])).toEqual(["bookingMobile", "earliestStart", "hireableJobs"]);
    const f = { ...legacy, bookingMobile: "+1 213 555 0153", earliestStart: "2026-12-20", hireableJobs: "Style a home office" };
    expect(validateAll(f, rules)).toEqual({});
    expect(validateAll({ ...f, earliestStart: "2026-02-31" }, rules)).toHaveProperty("3.earliestStart");
    expect(validateAll({ ...f, personality: "x".repeat(161) }, rules)).toHaveProperty("3.personality");
    expect(partsDone(f, "", rules)).toEqual({ done: 1, total: 1 });
  });

  it("keeps the existing sample and live defaults until a template is explicitly applied", () => {
    // Credits became optional (client, 13 Nov 2026): nine required parts, not ten.
    expect(partsDone(blankFields("Sam"))).toEqual({ done: 1, total: 9 });
    expect(completeness(blankFields("Sam"))).toBeCloseTo(1 / 10);
    expect(validateAll(blankFields())[0]).toHaveProperty("photo");
  });
});
