import { blankFields } from "@/lib/data/seed";
import type { ProfileFields } from "@/lib/data/types";
import { describe, expect, it } from "vitest";
import { offSetServices, serviceChoices } from "@/lib/data/taxonomy";
import { customServiceFrom, customServiceIfUnchanged, serviceDraftReducer, OTHER_SERVICE, serviceSelectOptions } from "./service-choice";
import { serviceExamples, serviceExamplesFor } from "./service-examples";

describe("existing service guidance and explicit custom conversion", () => {
  it("covers seven existing categories without introducing a backend option", () => {
    expect(serviceExamples).toHaveLength(7);
    expect(serviceExamples.flatMap(category => category.examples)).toHaveLength(21);
    for (const category of serviceExamples) expect(offSetServices).toContain(category.value);
    for (const source of ["sample", "live"] as const) expect(serviceChoices(source)).not.toContain("Video Editing & Digital Content");
    expect(serviceExamplesFor("Video Editing & Digital Content")).toBeUndefined();
    expect(serviceExamplesFor("Unlisted legacy service")).toBeUndefined();
    expect(serviceExamplesFor("Hair Styling")).toBe(serviceExamplesFor("Beauty & Personal Styling"));
    expect(serviceExamplesFor("Makeup Services")).toBe(serviceExamplesFor("Beauty & Personal Styling"));
  });
  it("preserves unknown saved choices and omits duplicate or second custom choices", () => {
    const choices = serviceSelectOptions(offSetServices, ["Interior Styling", "Unlisted legacy service"], "Unlisted legacy service", false);
    expect(choices).toContainEqual({ value: "Unlisted legacy service", label: "Unlisted legacy service" });
    expect(choices.some(choice => choice.value === "Interior Styling")).toBe(false);
    expect(choices.at(-1)?.value).toBe(OTHER_SERVICE);
    expect(serviceSelectOptions(offSetServices, [], undefined, true).some(choice => choice.value === OTHER_SERVICE)).toBe(false);
  });
  it("moves exact personal text without truncation or mutation, retaining other lines and order", () => {
    const line = "  Personal wording\n" + "x".repeat(150);
    const fields = { services: ["Interior Styling", "Hair Styling", "Unlisted legacy service"], serviceLines: { "Interior Styling": "first", "Hair Styling": line, "Unlisted legacy service": "last", "orphan": "retained" }, other: "" };
    const before = structuredClone(fields);
    expect(customServiceFrom(fields, 1)).toEqual({ services: ["Interior Styling", "Unlisted legacy service"], serviceLines: { "Interior Styling": "first", "Unlisted legacy service": "last", orphan: "retained" }, other: "Hair Styling\n" + line });
    expect(fields).toEqual(before);
    expect(customServiceFrom(fields, -1)).toBeNull();
    expect(customServiceFrom(fields, 1, true)).toBeNull();
    expect(customServiceFrom({ ...fields, other: "Existing custom answer" }, 1)).toBeNull();
  });
  it("retains a shared legacy line when a duplicate saved row remains", () => {
    expect(customServiceFrom({ services: ["Hair Styling", "Hair Styling"], serviceLines: { "Hair Styling": "Legacy personal line" }, other: "" }, 0)).toEqual({ services: ["Hair Styling"], serviceLines: { "Hair Styling": "Legacy personal line" }, other: "Hair Styling\nLegacy personal line" });
  });
  it("refuses stale confirmed conversions after concurrent service changes", () => {
    const expected = { services: ["Hair Styling"], serviceLines: { "Hair Styling": "Original" }, other: "" };
    expect(customServiceIfUnchanged(expected, structuredClone(expected), 0)?.other).toBe("Hair Styling\nOriginal");
    for (const current of [{ ...expected, services: ["Interior Styling"] }, { ...expected, serviceLines: { "Hair Styling": "Newer" } }, { ...expected, other: "New custom answer" }]) expect(customServiceIfUnchanged(current, expected, 0)).toBeNull();
  });

  it("checks a confirmed conversion against newer queued state, without changing unrelated fields", () => {
    const original: ProfileFields = { ...blankFields("Fictional Crew"), services: ["Hair Styling"], serviceLines: { "Hair Styling": "Original" }, other: "", tools: "Exact old tools" };
    const queued = serviceDraftReducer({ fields: original, conversion: null }, { type: "set", value: current => current && { ...current, serviceLines: { "Hair Styling": "Queued newer answer" } } });
    const refused = serviceDraftReducer(queued, { type: "convert", id: 1, expected: original, index: 0 });
    expect(refused.fields).toBe(queued.fields); expect(refused.conversion).toEqual({ id: 1, succeeded: false });
    const accepted = serviceDraftReducer({ fields: original, conversion: null }, { type: "convert", id: 2, expected: original, index: 0 });
    expect(accepted.fields).toEqual({ ...original, services: [], serviceLines: {}, other: "Hair Styling\nOriginal" });
    expect(accepted.conversion).toEqual({ id: 2, succeeded: true });
  });

});
