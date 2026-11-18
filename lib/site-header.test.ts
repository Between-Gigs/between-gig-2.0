import { beforeEach, describe, expect, it, vi } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const state = vi.hoisted(() => ({ session: null as null | { role: string; name: string; email: string }, loading: false, pathname: "/" }));
vi.mock("@/lib/session", () => ({ useSession: () => state }));
vi.mock("@/lib/auth/context", () => ({ useAuthActions: () => ({ provider: "sample", signOut: vi.fn() }) }));
vi.mock("@/lib/data", () => ({ data: { kind: "sample" } }));
vi.mock("next/navigation", () => ({ usePathname: () => state.pathname, useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next/link", () => ({ default: ({ children, ...props }: React.ComponentProps<"a">) => React.createElement("a", props, children) }));
vi.mock("@ds/components", () => ({
  Avatar: () => React.createElement("span", null, "Avatar"),
  IconButton: () => null,
  Logo: () => React.createElement("span", null, "Logo"),
  Menu: ({ trigger }: { trigger: React.ReactNode }) => trigger,
  ThemeToggle: () => React.createElement("button", { "aria-label": "Change theme" }),
  cx: (...items: unknown[]) => items.filter(Boolean).join(" "),
}));
vi.mock("@/components/site/LookSwitcher", () => ({ LookSwitcher: () => null }));
import { SiteHeader } from "@/components/site/SiteHeader";

const render = (props = {}) => renderToStaticMarkup(React.createElement(SiteHeader, props));

describe("public header authentication states", () => {
  beforeEach(() => { state.session = null; state.loading = false; state.pathname = "/"; });
  it.each(["/", "/login/", "/join/", "/professionals/", "/storyboard/", "/preview/wallpapers/"])("has one visible sign-in entry and no guest menu on %s", pathname => {
    state.pathname = pathname;
    const html = render();
    expect(html.match(/href="\/login\/"/g)).toHaveLength(1);
    expect(html).toContain(">Sign in</a>");
    expect(html).not.toContain('aria-label="Main"');
    expect(html).not.toContain('aria-label="Menu"');
    expect(html).not.toContain("For professionals");
    expect(html).not.toContain("Storyboard");
    expect(html).not.toContain(">Hub<");
    expect(html).toContain('href="/" aria-label="Between Gigs home"');
    const signIn = html.match(/<a href="\/login\/"[^>]+>/)?.[0] ?? "";
    expect(signIn).toContain("min-h-11");
    expect(signIn).not.toContain("hidden");
    // Signed out, the Los Angeles Call Sheet sits in the middle of the bar (Justin, 14 Nov 2026).
    expect(html).toContain("data-header-title");
    expect(html).toContain("Los Angeles Call Sheet");
    expect(html).toContain("swiss:md:col-span-3");
  });
  it("offers a separate Sign up next to Sign in, except on the sign-up page", () => {
    for (const pathname of ["/", "/login/", "/professionals/", "/crew-call/"]) {
      state.pathname = pathname;
      const html = render();
      expect(html.match(/href="\/join\/"[^>]*data-header-signup/g)).toHaveLength(1);
      expect(html).toContain(">Sign up</a>");
    }
    state.pathname = "/join/";
    expect(render()).not.toContain("data-header-signup");
    state.pathname = "/";
    state.session = { role: "gigster", name: "Test", email: "test@example.com" };
    expect(render()).not.toContain("data-header-signup");
    state.session = null;
    state.loading = true;
    expect(render()).not.toContain("data-header-signup");
  });
  it("shows the Call Sheet title only to signed-out visitors", () => {
    state.loading = true;
    expect(render()).not.toContain("data-header-title");
    state.loading = false;
    state.session = { role: "gigster", name: "Test", email: "test@example.com" };
    expect(render()).not.toContain("data-header-title");
    state.session = null;
    expect(render({ app: true })).not.toContain("data-header-title");
  });
  it("does not flash sign-in while session loads", () => {
    state.loading = true;
    expect(render()).not.toContain(">Sign in</a>");
  });
  it("preserves signed-in Gigster navigation and avatar", () => {
    state.session = { role: "gigster", name: "Test", email: "test@example.com" };
    const html = render();
    expect(html).toContain("My profile");
    expect(html).toContain("Edit profile");
    expect(html).toContain('aria-label="Account: Test"');
    expect(html).not.toContain(">Sign in</a>");
  });
  it.each([false, true])("gives owners the mode switch and account controls (app=%s)", app => {
    state.session = { role: "owner", name: "Owner", email: "owner@example.com" };
    state.pathname = "/owners/";
    const html = render({ app });
    expect(html).not.toContain('aria-label="Main"');
    expect(html).toContain('aria-label="Switch experience:');
    expect(html).not.toContain('class="md:hidden"');
    expect(html).toContain('aria-label="Account: Owner"');
    expect(html).not.toContain(">Sign in</a>");
  });
  it("keeps signed-out preview chrome free of account and sign-in controls", () => {
    const html = render({ app: true });
    expect(html).not.toContain(">Sign in</a>");
    expect(html).not.toContain('aria-label="Switch experience:');
    expect(html).not.toContain('aria-label="Account:');
  });
});
