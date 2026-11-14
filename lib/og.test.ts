import { describe, expect, it } from "vitest";
import pages from "./og-pages.json";
import { share } from "./og";

describe("share cards and SEO", () => {
  it("keeps the /professionals card the client liked", () => {
    const m = share("professionals");
    expect(m.openGraph?.title).toBe("Extraordinary Talent. Everyday Help.");
    expect(m.description).toBe("Put your craft to work beyond the set. Get on the Between Gigs call sheet.");
    expect((m.openGraph?.images as { url: string }[])[0].url).toMatch(/\/og\/professionals\.jpg$/);
  });
  it("gives every page its own canonical URL, without query strings", () => {
    for (const name of Object.keys(pages) as (keyof typeof pages)[]) {
      const canonical = String(share(name).alternates?.canonical);
      expect(canonical.endsWith(pages[name].path.split("?")[0])).toBe(true);
      expect(canonical).not.toContain("?");
    }
  });
  it("uses a page's own path when one is passed (profiles, a person under review)", () => {
    expect(String(share("gigsters", { title: "Ana", path: "/p/ana/" }).alternates?.canonical)).toMatch(/\/p\/ana\/$/);
    expect(share("gigsters", { title: "Ana" }).openGraph?.title).toBe("Ana · Between Gigs");
  });
  it("never indexes outside production (this test build has no live Clerk key)", () => {
    expect(share("home").robots).toBeUndefined();
  });
  it("has a title and a description for every page", () => {
    for (const p of Object.values(pages)) { expect(p.title.length).toBeGreaterThan(2); expect(p.description.length).toBeGreaterThan(20); }
  });
});
