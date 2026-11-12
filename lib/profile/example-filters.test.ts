import { describe, expect, it } from "vitest";
import { buildSeed } from "../data/seed";
import { featuredPeople } from "../data/featured-people";
import { clearExampleFilters, matchesExample, type ExampleFilters } from "./example-filters";

const profiles = buildSeed(featuredPeople).profiles;
const found = (f: Partial<ExampleFilters>) => profiles.filter((p) => matchesExample(p, { ...clearExampleFilters, ...f })).map((p) => p.personId);
describe("example gallery filters", () => {
  it("combines service, area, availability and keyword matches against client-facing jobs", () => {
    expect(found({ q: "furniture budget", service: "Interior Styling", area: "Eastside", availability: "limited" })).toEqual(["simone"]);
    expect(found({ q: "vendors", availability: "available" })).toEqual(["renee"]);
    expect(found({ q: "venue", area: "South Bay" })).toEqual(["devon"]);
    expect(found({ area: "South Bay", service: "Interior Styling" })).toEqual([]);
  });
  it("applies a maximum only to the selected rate basis", () => {
    expect(found({ basis: "hourly", max: "80" })).toEqual(["renee"]);
    expect(found({ basis: "project", max: "400" })).toEqual(["devon"]);
    expect(found({ basis: "project" })).toEqual(["luis", "devon"]);
    expect(found({ basis: "day", max: "500" })).toEqual([]);
    expect(found({ max: "5" })).toHaveLength(4);
  });
});
