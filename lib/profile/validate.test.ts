import { describe, expect, it } from "vitest";
import { blankFields } from "@/lib/data/seed";
import { completeFields } from "@/lib/data/contract/fixtures";
import { defaultProfileTemplate } from "./template";
import { ABOUT_MAX, MAX_SERVICES, contentChanged, gigsterChecklist, hasRate, isPartFilled, readNotes, validateGigster, validateStep } from "./validate";

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

  it("allows up to five services, and each line is one short sentence", () => {
    const five = ["A", "B", "C", "D", "E"];
    expect(MAX_SERVICES).toBe(5);
    expect(validateStep(1, { ...blankFields("A"), services: five }).services).toBeUndefined();
    expect(validateStep(1, { ...blankFields("A"), services: [...five, "F"] }).services).toMatch(/up to 5/);
    expect(validateStep(1, { ...blankFields("A"), services: ["A"], serviceLines: { A: "x".repeat(121) } }).serviceLines).toMatch(/120/);
  });

  it("the Gigster editor needs a line for every service and a question for a personality answer", () => {
    const f = { ...completeFields("Sample Crew", "img/people/maya.jpg"), services: ["Event Styling"] };
    expect(validateGigster(f, defaultProfileTemplate).serviceLines).toMatch(/each service/);
    const lined = { ...f, serviceLines: { "Event Styling": "I'll dress your table for a dinner party." } };
    expect(validateGigster(lined, defaultProfileTemplate)).toEqual({});
    expect(validateGigster({ ...lined, personality: "I juggle." }, defaultProfileTemplate).personalityQuestion).toBeTruthy();
    expect(validateGigster({ ...lined, personality: "I juggle.", personalityQuestion: "quiet-skill" }, defaultProfileTemplate)).toEqual({});
    expect(validateGigster({ ...lined, services: [], other: "" }, defaultProfileTemplate).services).toBeTruthy();
  });

  it("the checklist splits what's needed to submit from what can come later", () => {
    const { required, optional } = gigsterChecklist(blankFields("A"), defaultProfileTemplate);
    // Credits are optional (client, 13 Nov 2026).
    expect(required.map((i) => i.id)).toEqual(["photo", "name", "services", "availability", "where", "film", "experience"]);
    expect(optional.map((i) => i.id)).toContain("credits");
    expect(required.find((i) => i.id === "name")?.done).toBe(true);
    expect(required.find((i) => i.id === "photo")?.done).toBe(false);
  });

  it("contentChanged sees a changed service line, and ignores empty editor answers", () => {
    const a = { ...blankFields("A"), credits: ["One"], services: ["S"], serviceLines: { S: "One" } };
    expect(contentChanged(a, { ...a, serviceLines: { S: "Two" } })).toBe(true);
    expect(contentChanged({ ...a, serviceLines: {} }, { ...a, serviceLines: undefined })).toBe(false);
    expect(contentChanged({ ...a, title: "" }, a)).toBe(false);
  });
});
