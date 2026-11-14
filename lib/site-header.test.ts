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
vi.mock("@/components/site/ExperienceSwitcher", () => ({ ExperienceSwitcher: () => null }));
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
    expect(html).toContain("swiss:md:col-span-9");
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
  it("preserves signed-in owner navigation", () => {
    state.session = { role: "owner", name: "Owner", email: "owner@example.com" };
    const html = render();
    expect(html).toContain("Gigster Experience");
    expect(html).toContain("Owner Experience");
    expect(html).toContain(">Hub<");
    expect(html).not.toContain(">Sign in</a>");
  });
  it("leaves the owner app shell account controls with its sidebar", () => {
    expect(render({ app: true })).not.toContain(">Sign in</a>");
  });
});
