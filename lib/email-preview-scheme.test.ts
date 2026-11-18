import { describe, expect, it } from "vitest";
import { forceScheme } from "@/components/emails/preview";
import { diagnostic } from "@/emails/diagnostic";
import { renderEmail } from "@/emails";
describe("preview theme forcing", () => {
  it("forces every diagnostic dark block regardless of OS preference", () => {
    const html = diagnostic().html;
    expect(html.match(/prefers-color-scheme:dark/g)?.length).toBeGreaterThan(1);
    for (const scheme of ["light", "dark"] as const) {
      const forced = forceScheme(html, scheme);
      expect(forced).not.toContain("prefers-color-scheme:dark");
      expect(forced.match(new RegExp(scheme === "dark" ? "@media all" : "@media not all", "g"))?.length).toBeGreaterThan(1);
    }
  });
  it("does not invent a dark rendition for the deliberately light invitation", () => {
    const html = renderEmail("invite").html;
    expect(forceScheme(html, "dark")).toBe(forceScheme(html, "light"));
  });
});
