import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ menu: { modes: ["gigster", "owner", "developer"], items: ["dashboard", "people", "my_profile", "edit_profile"] }, mode: "owner" }));
vi.mock("@/lib/data", () => ({ data: { kind: "live" } }));
vi.mock("@/lib/session", () => ({ useSession: () => ({ session: { role: "owner", name: "Owner", email: "owner@example.test" } }) }));
vi.mock("@/lib/auth/context", () => ({ useAuthActions: () => ({ provider: "sample", signOut: vi.fn() }) }));
vi.mock("next/navigation", () => ({ usePathname: () => "/owners/", useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next/link", () => ({ default: ({ children, ...props }: React.ComponentProps<"a">) => React.createElement("a", props, children) }));
vi.mock("@/components/site/StaffNavigationVisibility", () => ({ useStaffMenuVisibility: () => ({ menu: state.menu, issue: "" }) }));
vi.mock("@/components/site/PersonalPreferences", () => ({ useNavigationMode: () => state.mode, usePersonalPreferences: () => ({ preferences: { showThemeChooser: false }, update: vi.fn() }), usePersonalLook: () => vi.fn(), PersonalThemeToggle: () => null }));
vi.mock("@/components/site/LookSync", () => ({ useLook: () => "swiss" }));
vi.mock("@/components/site/LookSwitcher", () => ({ LookSwitcher: () => null }));
vi.mock("@ds/components", () => ({
  cx: (...v: unknown[]) => v.filter(Boolean).join(" "), Logo: () => null, Avatar: () => null, IconButton: () => null, Modal: () => null,
  Menu: ({ trigger, items }: { trigger: React.ReactNode; items: ({ label?: string } | string)[] }) => React.createElement("div", null, trigger, items.map((item, index) => typeof item === "object" && item.label ? React.createElement("span", { key: index, "data-choice": "" }, item.label) : null)),
}));
import { AccountMenu, SiteHeader } from "@/components/site/SiteHeader";
import { ExperienceSwitcher } from "@/components/site/ExperienceSwitcher";
import { OwnerMobileTabs } from "@/components/owners/OwnerShell";
describe("real navigation renderers honor menu visibility without removing recovery", () => {
  it.each(["gigster", "owner", "developer"])("keeps centered profile links in %s mode while honoring item visibility", mode => {
    state.mode = mode;
    state.menu = { modes: ["gigster", "owner", "developer"], items: ["my_profile", "edit_profile"] };
    const full = renderToStaticMarkup(React.createElement(SiteHeader));
    expect(full).toContain('href="/profile/"');
    expect(full).toContain('href="/profile/canvas/"');
    state.menu = { modes: ["gigster", "owner", "developer"], items: ["my_profile"] };
    const filtered = renderToStaticMarkup(React.createElement(SiteHeader));
    expect(filtered).toContain('href="/profile/"');
    expect(filtered).not.toContain('href="/profile/canvas/"');
  });
  it("filters personal account menu items while keeping settings, logout and admin recovery", () => {
    state.menu = { modes: ["gigster"], items: [] };
    const html = renderToStaticMarkup(React.createElement(AccountMenu));
    expect(html).not.toContain(">My profile<"); expect(html).not.toContain(">Edit profile<");
    for (const label of ["My Settings", "Manage team menus", "Log out"]) expect(html).toContain(">" + label + "<");
  });
  it("keeps the truthful direct-route mode label with a single different visible destination", () => {
    state.mode = "developer"; state.menu = { modes: ["owner"], items: [] };
    const html = renderToStaticMarkup(React.createElement(ExperienceSwitcher));
    expect(html).toContain('aria-label="Switch experience: Developer Mode"');
    expect(html).toContain('data-choice="">Owner Mode<'); expect(html).not.toContain('data-choice="">Developer Mode<');
  });
  it("filters the actual Swiss mobile destinations from the same item identifiers", () => {
    state.mode = "owner"; state.menu = { modes: ["owner"], items: ["people"] };
    const html = renderToStaticMarkup(React.createElement(OwnerMobileTabs, { counts: null, onOpenNav: vi.fn() }));
    expect(html).toContain('href="/owners/people/"'); expect(html).not.toContain('href="/owners/"'); expect(html).not.toContain('href="/owners/waitlist/"');
  });
});
