import { describe, expect, it } from "vitest";
import { DASHBOARD_ROUTES, SAMPLE_MARKER, SITE_ROUTES, splitProblems } from "./check-split.mjs";

// Code splitting (owner, 2026-11-02): the public site loads no dashboard code, and a live (api) build ships no sample data.
type Page = { route: string; modules: string[]; chunks: { name: string; text: string }[] };
const page = (route: string, modules: string[] = [], text = "clean"): Page => ({ route, modules, chunks: [{ name: `/_next/static/chunks/${route.length}.js`, text }] });
const clean = (): Page[] => [
  page("/", ["components/home/CallSheetHome.tsx"]),
  page("/p/[slug]", ["components/profile/PublicProfile.tsx", "components/profile/ProfileView.tsx"]),
  page("/owners", ["components/owners/OwnerShell.tsx"]),
  page("/profile/canvas", ["components/canvas/ProfileCanvas.tsx", "components/profile/PhotoPicker.tsx"]),
];

describe("splitProblems", () => {
  it("passes a clean build", () => {
    expect(splitProblems(clean(), { live: true })).toEqual([]);
  });

  it.each([
    ["components/owners/OwnerShell.tsx"],
    ["components/builder/ProfileBuilder.tsx"],
    ["components/canvas/ProfileCanvas.tsx"],
    ["components/profile/MyProfile.tsx"],
    ["components/profile/PhotoPicker.tsx"],
    ["components/profile/ChipPicker.tsx"],
    ["components/profile/LiveEditWarning.tsx"],
  ])("fails when a site route loads dashboard code (%s)", (mod) => {
    const pages = clean();
    pages[0]!.modules.push(mod);
    expect(splitProblems(pages, { live: true })).toEqual([`/ loads dashboard code: ${mod}`]);
  });

  it("lets the dashboards load their own code and the public profile its views", () => {
    expect(splitProblems(clean(), { live: true })).toEqual([]);
  });

  it("fails when a live build ships the sample data, naming the route and chunk", () => {
    const pages = clean();
    pages[2]!.chunks.push({ name: "/_next/static/chunks/sample.js", text: `x="${SAMPLE_MARKER}"` });
    expect(splitProblems(pages, { live: true })).toEqual(["/owners ships the sample data (/_next/static/chunks/sample.js)"]);
  });

  it("allows the sample data in a sample build", () => {
    const pages = clean();
    pages[0]!.chunks.push({ name: "s.js", text: SAMPLE_MARKER });
    expect(splitProblems(pages, { live: false })).toEqual([]);
  });

  it("fails closed on a route it doesn't know, and on a known route missing from the build", () => {
    expect(splitProblems([...clean(), page("/new-thing")], { live: true })).toContain("/new-thing is neither a site nor a dashboard route (scripts/check-split.mjs)");
    expect(splitProblems(clean(), { live: true, expect: ["/login"] })).toContain("/login is not in the build");
  });

  it("classifies every live page exactly once", () => {
    const both = SITE_ROUTES.filter((r: string) => DASHBOARD_ROUTES.includes(r));
    expect(both).toEqual([]);
  });
});
