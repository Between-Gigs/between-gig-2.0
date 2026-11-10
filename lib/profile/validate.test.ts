import { describe, expect, it } from "vitest";
import { blankFields } from "@/lib/data/seed";
import { ABOUT_MAX, contentChanged, hasRate, isPartFilled, readNotes, validateStep } from "./validate";

describe("lib/profile/validate.ts", () => {
  it("a rate of 0 or blank is 'Rate on request', the same everywhere", () => {
    expect(hasRate("")).toBe(false);
    expect(hasRate("0")).toBe(false);
    expect(hasRate("00")).toBe(false);
    expect(hasRate("45")).toBe(true);
    expect(isPartFilled("rate", { ...blankFields("A"), rate: "0" })).toBe(false);
  });

  it("About me over 600 characters is an error that says how long it is", () => {
    const e = validateStep(3, { ...blankFields("A"), about: "x".repeat(ABOUT_MAX + 1) });
    expect(e.about).toMatch(/600/);
    expect(validateStep(3, { ...blankFields("A"), about: "x".repeat(ABOUT_MAX) }).about).toBeUndefined();
  });

  it("caps the name at 60, the department at 40 and the dates at 80", () => {
    const f = { ...blankFields("N".repeat(61)), position: "D".repeat(41), dates: "d".repeat(81) };
    expect(validateStep(0, f).name).toMatch(/60/);
    expect(validateStep(0, f).position).toMatch(/40/);
    expect(validateStep(2, f).dates).toMatch(/80/);
  });

  it("contentChanged ignores availability, key order and missing credit pins", () => {
    const a = { ...blankFields("A"), credits: ["One"] };
    expect(contentChanged(a, { ...a, dates: "Weekends", monthStatus: "away", month: "December 2026" })).toBe(false);
    expect(contentChanged(a, { ...a, creditPins: [true] })).toBe(false);
    expect(contentChanged(a, { ...a, creditPins: [false] })).toBe(true);
    expect(contentChanged(a, { ...a, about: "New" })).toBe(true);
  });

  it("reads photo notes, whether saved under photo or as an older 'Photo:' note under About you", () => {
    expect(readNotes([{ section: "photo", note: "Clearer photo." }])).toEqual([{ section: "photo", note: "Clearer photo." }]);
    expect(readNotes([{ section: "about", note: "Photo: Clearer photo." }])).toEqual([{ section: "photo", note: "Clearer photo." }]);
    expect(readNotes([{ section: "about", note: "Photo: Clearer photo.\nAdd your IMDb link." }]))
      .toEqual([{ section: "photo", note: "Clearer photo." }, { section: "about", note: "Add your IMDb link." }]);
    expect(readNotes([{ section: "about", note: "Add your IMDb link." }])).toEqual([{ section: "about", note: "Add your IMDb link." }]);
  });
});
