import { describe, expect, it } from "vitest";
import { blankFields } from "@/lib/data/seed";
import { locationLabel } from "./location";

describe("locationLabel (the profile's Location row)", () => {
  it("LA: the areas, or Los Angeles", () => {
    expect(locationLabel({ ...blankFields(), market: "la", areas: ["Eastside", "Downtown"] })).toBe("Eastside · Downtown, Los Angeles area");
    expect(locationLabel({ ...blankFields(), market: "la", areas: [] })).toBe("Los Angeles, Los Angeles area");
  });

  it("another market: the city, or Another market when it is not known (the public page never has it)", () => {
    expect(locationLabel({ ...blankFields(), market: "other", otherCity: "Lisbon, Portugal" })).toBe("Lisbon, Portugal");
    expect(locationLabel({ ...blankFields(), market: "other", otherCity: "" })).toBe("Another market");
  });
});
