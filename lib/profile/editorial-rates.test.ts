import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ProfileTemplate } from "@/components/ds/templates/ProfileTemplate";
import type { ProfileLayoutProps } from "@/components/profile/ProfileView";
import { completeFields } from "@/lib/data/contract/fixtures";

const noop = () => undefined;
const person: ProfileLayoutProps["person"] = {
  id: "fixture", name: "Avery Test", slug: "avery-test", email: "", status: "approved",
  waitlistZip: "", waitlistCategory: "", invitedAt: "", updatedAt: "",
};
const dates = "Fictional dates in December";
const fields = { ...completeFields("Avery Test", ""), rate: "175", basis: "hourly" as const, dates, earliestStart: "2026-12-04" };
const fixture: ProfileLayoutProps = {
  person, fields, mode: "public",
  first: "Avery", callName: "Avery", pageLabel: "Live", services: fields.services, helps: [],
  portfolio: [], sample: false, editing: false, show: false, priced: true, rate: "$175/hr", where: "Los Angeles",
  credits: [], unseen: true, reviewed: true, P: (_id, filled, content) => filled ? content : null,
  creditRows: [], resumeUrl: "", questions: [], sections: [], saved: false, ids: "fixture",
  onSave: noop, onShare: noop, onPhoto: noop, onRequest: vi.fn(),
};
const render = (extra: Partial<ProfileLayoutProps> = {}) => renderToStaticMarkup(React.createElement(ProfileTemplate, { ...fixture, ...extra }));
const marker = 'aria-label="Rates &amp; availability"';
const experience = 'aria-label="Skills &amp; experience"';
const services = 'aria-label="How I can help"';
const count = (html: string, q: string) => html.split(q).length - 1;

describe("default Editorial booking location", () => {
  it("places the one rates and availability block directly after identity and before the profile content", () => {
    const html = render();
    expect(html).toContain(marker);
    expect(html).toMatch(/<\/section><section aria-label="Rates &amp; availability"/);
    expect(html.indexOf('aria-label="About Avery"')).toBeLessThan(html.indexOf(marker));
    expect(html.indexOf(marker)).toBeLessThan(html.indexOf(experience));
    expect(html.indexOf(marker)).toBeLessThan(html.indexOf(services));
    expect(count(html, dates)).toBe(1);
    expect(count(html, "Hourly rate")).toBe(1);
    expect(count(html, "Earliest start · Dec 4, 2026")).toBe(1);
    expect(count(html, "Request Avery")).toBe(2); // one desktop button and the unchanged fixed mobile bar
    expect(html).toContain("max-lg:hidden");
    expect(html).toMatch(/fixed inset-x-0 bottom-0[^"]*lg:hidden/);
    expect(count(html, 'id="fixture-request-note"')).toBe(1);
  });

  it("preserves rate-on-request and limited availability copy in the moved block", () => {
    const html = render({ priced: false, rate: null, fields: { ...fields, rate: "", monthStatus: "limited" } });
    expect(count(html, "Rate on request")).toBe(2); // content and the fixed bar
    expect(count(html, "Limited Availability")).toBe(2);
    expect(html.indexOf(marker)).toBeLessThan(html.indexOf(dates));
  });

  it.each([
    ["own preview", { mode: "own" }],
    ["owner view", { mode: "owner" }],
    ["embedded preview", { embedded: true }],
    ["draft preview", { draft: true }],
    ["editor part view", { part: () => null, editing: true }],
    ["layout with an aside", { aside: React.createElement("div", null, "Editor pane") }],
  ] satisfies [string, Partial<ProfileLayoutProps>][])("does not move or duplicate the rates in %s", (_label, state) => {
    const html = render(state);
    expect(html).not.toContain(marker);
    expect(html.indexOf(services)).toBeLessThan(html.indexOf(dates));
    expect(count(html, dates)).toBe(1);
  });
});
