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
  it("previews the invitation HTML fallback while keeping its preferred light metadata and same baked artwork", () => {
    const html = renderEmail("invite").html;
    expect(forceScheme(html, "dark")).toContain("@media all{");
    expect(forceScheme(html, "light")).toContain("@media not all{");
    for(const scheme of ["light","dark"] as const){
      expect(forceScheme(html,scheme)).toContain('name="color-scheme" content="light"');
      expect(forceScheme(html,scheme)).toContain('/email/invitation-hero-approved.jpg');
    }
  });
});
