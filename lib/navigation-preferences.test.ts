import { describe, expect, it } from "vitest";
import { navigationMode, parseNavigationPreferences, preferenceKey, readPreferenceRecord, writePreferenceRecord, modeDestination } from "./navigation-preferences";
describe("navigation presentation preferences", () => {
  it("separates actual accounts and data sources while normalizing email identity", () => {
    expect(preferenceKey("live", " Owner@Example.com ")).toBe(preferenceKey("live", "owner@example.com"));
    expect(preferenceKey("live", "owner@example.com")).not.toBe(preferenceKey("sample", "owner@example.com"));
    expect(preferenceKey("live", "one@example.com")).not.toBe(preferenceKey("live", "two@example.com"));
    expect(preferenceKey("live")).not.toBe(preferenceKey("live", "owner@example.com"));
  });
  it.each([null, "not-json", "null", "[]", '{"showThemeChooser":"true","mode":"admin","look":"unknown","theme":"blue","unstyled":"true"}'])("uses safe defaults for unknown stored values: %s", raw => {
    expect(parseNavigationPreferences(raw)).toEqual({ showThemeChooser: false });
  });
  it("retains only supported personal presentation choices", () => {
    expect(parseNavigationPreferences('{"mode":"developer","showThemeChooser":true,"look":"swiss","theme":"dark","role":"owner","unstyled":true}')).toEqual({ mode: "developer", showThemeChooser: true, look: "swiss", theme: "dark", unstyled: true });
  });
  it("keeps new visit-local preferences when storage can be read but quota prevents writing", () => {
    const memory = new Map<string, string>();
    const storage = { getItem: () => "old", setItem: () => { throw new Error("quota"); } };
    writePreferenceRecord("user", "new", storage, memory);
    expect(readPreferenceRecord("user", storage, memory)).toBe("new");
    expect(readPreferenceRecord("other", storage, memory)).toBe("old");
    let persisted = "old";
    const recovered = { getItem: () => persisted, setItem: (_key: string, value: string) => { persisted = value; } };
    writePreferenceRecord("user", "latest", recovered, memory);
    expect(memory.has("user")).toBe(false);
    expect(readPreferenceRecord("user", recovered, memory)).toBe("latest");
  });
  it("keeps this visit usable with completely unavailable storage", () => {
    const memory = new Map<string, string>();
    writePreferenceRecord("user", "saved for visit", undefined, memory);
    expect(readPreferenceRecord("user", undefined, memory)).toBe("saved for visit");
    expect(readPreferenceRecord("unknown", undefined, memory)).toBe("");
  });
  it("leaves sample Hub base paths for real guarded owner destinations", () => {
    for (const href of ["/owners/", "/owners/people/", "/owners/review/", "/owners/waitlist/", "/owners/staff/"]) {
      expect(modeDestination(href, "/hub")).toEqual({ href, fullPage: true });
      expect(modeDestination(href, "")).toEqual({ href, fullPage: false });
    }
    expect(modeDestination("/preview/forms/", "/hub").fullPage).toBe(false);
  });
  it("uses route context without granting any authority", () => {
    expect(navigationMode("/hub/", "", "gigster")).toBe("developer");
    expect(navigationMode("/", "/hub")).toBe("developer");
    expect(navigationMode("/owners/developer/", "", "owner")).toBe("developer");
    expect(navigationMode("/owners/", "", "owner")).toBe("owner");
    expect(navigationMode("/owners/people/", "", "developer")).toBe("developer");
    expect(navigationMode("/profile/canvas/", "", "developer")).toBe("gigster");
  });
});
