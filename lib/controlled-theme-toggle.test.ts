import { describe, expect, it, vi } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
// Exercise the real DS component with a legacy-hook tripwire. The uncontrolled case below proves
// this fixture actually detects useTheme, rather than replacing ThemeToggle with a lookalike.
vi.mock("react", async original => {
  const actual = await original<typeof import("react")>();
  return { ...actual, useState: () => { throw new Error("legacy theme hook entered"); } };
});
import { ThemeToggle } from "@ds/components/ThemeToggle";
describe("controlled design-system theme toggle", () => {
  it.each(["light", "dark"] as const)("renders controlled %s without entering the legacy document/storage hook", theme => {
    const html = renderToStaticMarkup(React.createElement(ThemeToggle, { theme, onChange: vi.fn(), size: "sm" }));
    expect(html).toContain('role="switch"');
    expect(html).toContain(`aria-checked="${theme === "dark"}"`);
    expect(html).toContain(theme === "dark" ? ">Night</span>" : ">Day</span>");
  });
  it.each(["sm", "md"] as const)("renders %s icon-only without label padding and with an even inset in both modes", size => {
    const render = (theme: "light" | "dark", showLabel: boolean) =>
      renderToStaticMarkup(React.createElement(ThemeToggle, { theme, size, showLabel }));
    const day = render("light", false);
    const night = render("dark", false);
    const buttonClasses = (html: string) => html.match(/^<button[^>]+class="([^"]+)"/)?.[1].split(/\s+/);
    const labelPadding = size === "sm" ? "pr-3" : "pr-3.5";
    for (const html of [day, night]) {
      expect(buttonClasses(html)).not.toContain(labelPadding);
      expect(html).not.toMatch(/>(Day|Night)<\/span>/);
    }
    expect(buttonClasses(render("dark", true))).toContain(labelPadding);
    const travel = size === "sm" ? "translate-x-5" : "translate-x-6";
    expect(day).not.toContain(travel);
    expect(night).toContain(travel);
  });
  it("keeps the legacy hook on the uncontrolled path", () => {
    expect(() => renderToStaticMarkup(React.createElement(ThemeToggle))).toThrow("legacy theme hook entered");
  });
});
