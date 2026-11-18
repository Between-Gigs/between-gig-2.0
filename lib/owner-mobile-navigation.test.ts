import { describe, expect, it, vi } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
const state = vi.hoisted(() => ({ mode: "owner" as "owner" | "developer" }));
// Live kind is essential: its Hub is /owners/developer/, unlike the sample /hub/ destination.
vi.mock("@/lib/data", () => ({ data: { kind: "live" } }));
vi.mock("@/components/site/LookSync", () => ({ useLook: () => "swiss" }));
vi.mock("@/components/site/PersonalPreferences", () => ({ useNavigationMode: () => state.mode, usePersonalPreferences: () => ({ preferences: { showThemeChooser: false } }), PersonalThemeToggle: () => null }));
vi.mock("@/components/site/SiteHeader", () => ({ SiteHeader: () => null, AccountMenu: () => null }));
vi.mock("next/navigation", () => ({ usePathname: () => "/owners/", useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next/link", () => ({ default: ({ children, ...props }: React.ComponentProps<"a">) => React.createElement("a", props, children) }));
import { OwnerMobileTabs } from "@/components/owners/OwnerShell";
function renderedDestinations(mode: "owner" | "developer") {
  state.mode = mode;
  const html = renderToStaticMarkup(React.createElement(OwnerMobileTabs, { counts: null, onOpenNav: () => {} }));
  return { html, hrefs: [...html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)].map(match => match[1]) };
}
describe("live Swiss mobile navigation outcomes", () => {
  it("keeps Dashboard, Review, People and Waitlist in Owner Mode without a Developer Hub displacing them", () => {
    const { hrefs, html } = renderedDestinations("owner");
    expect(hrefs).toEqual(["/owners/", "/owners/review/", "/owners/people/", "/owners/waitlist/"]);
    expect(html).not.toContain("/owners/developer/");
    expect(html).toContain('aria-label="More owner pages and account actions"');
  });
  it("makes the real guarded Hub a mobile destination in Developer Mode, alongside the full More directory", () => {
    const { hrefs, html } = renderedDestinations("developer");
    expect(hrefs).toEqual(["/owners/", "/owners/developer/", "/owners/review/", "/owners/people/"]);
    expect(html).toContain('aria-label="More owner pages and account actions"');
  });
});
