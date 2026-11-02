import { describe, expect, it } from "vitest";
import { showsPreviewNote } from "./preview-note";

// The footer's "Preview build: people in the sample data are fictional. Preview guide" (owner, 2026-11-02): only where
// the data is the sample (the preview and the GitHub Pages build), never on the live sites, whose data is real.
describe("showsPreviewNote", () => {
  it("shows on the sample data", () => expect(showsPreviewNote("sample")).toBe(true));
  it("never on the live data", () => expect(showsPreviewNote("live")).toBe(false));
});
