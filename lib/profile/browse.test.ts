import { describe, expect, it } from "vitest";
import { blankFields } from "@/lib/data/seed";
import type { Person, Profile, ProfileFields } from "@/lib/data/types";
import { browseHref, browseQuery, craftHref, filterGigsters, noFilters, parseBrowse, type Listed } from "./browse";

const row = (id: string, status: Person["status"], f: Partial<ProfileFields>): Listed => ({
  person: { id, slug: id, name: f.name ?? id, status } as Person,
  profile: { personId: id, fields: { ...blankFields(), market: "la", ...f } } as Profile,
});
const list = [
  row("maya", "approved", { name: "Maya Chen", position: "Costume & wardrobe", areas: ["Eastside", "Downtown"], services: ["Alterations"], monthStatus: "available" }),
  row("jordan", "approved", { name: "Jordan Ellis", position: "Props", areas: ["The Valley"], services: ["Custom furniture"], monthStatus: "limited" }),
  row("imani", "submitted", { name: "Imani Carter", position: "Set decoration", areas: ["Eastside"], monthStatus: "available" }),
];

describe("the /p/ query string", () => {
  it("reads known slugs and drops unknown ones", () => {
    expect(parseBrowse("?craft=wardrobe&area=eastside&availability=available&q=maya")).toEqual({ craft: "wardrobe", area: "eastside", availability: "available", q: "maya" });
    expect(parseBrowse("craft=nope&area=mars&availability=soon")).toEqual(noFilters);
  });

  it("writes only what is set, and round-trips", () => {
    const f = { ...noFilters, craft: "wardrobe", area: "the-valley" };
    expect(browseQuery(f)).toBe("craft=wardrobe&area=the-valley");
    expect(parseBrowse(browseQuery(f))).toEqual(f);
    expect(browseHref()).toBe("/p/");
    expect(browseHref({ area: "eastside" })).toBe("/p/?area=eastside");
  });

  it("the breadcrumb's craft link", () => {
    expect(craftHref("Costume & wardrobe")).toBe("/p/?craft=wardrobe");
    expect(craftHref("Lighting & grip")).toBe("/p/?craft=lighting-grip");
    expect(craftHref("Something unknown")).toBe("/p/");
  });
});

describe("filterGigsters", () => {
  const names = (f = noFilters) => filterGigsters(list, f).map((r) => r.person.id);
  it("lists only approved people, A to Z", () => expect(names()).toEqual(["jordan", "maya"]));
  it("filters by craft, area and availability", () => {
    expect(names({ ...noFilters, craft: "wardrobe" })).toEqual(["maya"]);
    expect(names({ ...noFilters, area: "eastside" })).toEqual(["maya"]);
    expect(names({ ...noFilters, availability: "limited" })).toEqual(["jordan"]);
    expect(names({ ...noFilters, craft: "set-decoration" })).toEqual([]);
  });
  it("searches name, craft and services, every word", () => {
    expect(names({ ...noFilters, q: "chen" })).toEqual(["maya"]);
    expect(names({ ...noFilters, q: "furniture props" })).toEqual(["jordan"]);
    expect(names({ ...noFilters, q: "costume alterations" })).toEqual(["maya"]);
    expect(names({ ...noFilters, q: "maya props" })).toEqual([]);
  });
});
