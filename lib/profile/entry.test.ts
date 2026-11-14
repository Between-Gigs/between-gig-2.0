import { describe, expect, it } from "vitest";
import { blankFields } from "@/lib/data/fields";
import { needsProfileEditor } from "./entry";

describe("own profile entry", () => {
  it("opens the editor for a new person or an empty draft", () => {
    expect(needsProfileEditor({ person: { status: "registered" }, fields: null, completeness: 0 }, false)).toBe(true);
    expect(needsProfileEditor({ person: { status: "invited" }, fields: blankFields("Sample"), completeness: 1 }, false)).toBe(true);
    expect(needsProfileEditor({ person: { status: "draft" }, fields: blankFields("Sample"), completeness: 0 }, false)).toBe(true);
  });
  it("preserves a meaningful unsubmitted draft", () => {
    expect(needsProfileEditor({ person: { status: "draft" }, fields: { ...blankFields("Sample"), about: "Fictional experience" }, completeness: 0 }, false)).toBe(false);
  });
  it.each(["submitted", "changes_requested", "approved"] as const)("keeps %s status even with incomplete summary data", status => {
    expect(needsProfileEditor({ person: { status }, fields: null, completeness: 0 }, false)).toBe(false);
  });
  it("keeps an existing submitted snapshot regardless of draft completeness", () => {
    expect(needsProfileEditor({ person: { status: "draft" }, fields: blankFields("Sample"), completeness: 0 }, true)).toBe(false);
  });
});
