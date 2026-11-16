import { describe, expect, it } from "vitest";
import { blankFields } from "@/lib/data/seed";
import { locationLabel, profileLocationLabel } from "./location";

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

it("new no-area profiles keep a generic LA location while legacy/historical labels remain unchanged",()=>{
 const f={...blankFields(),market:"la" as const,areas:[]};expect(profileLocationLabel(f,true)).toBe("Los Angeles area");expect(profileLocationLabel(f,false)).toBe("");
 expect(profileLocationLabel({...f,areas:["Eastside"]},true)).toBe(locationLabel({...f,areas:["Eastside"]}));
 expect(profileLocationLabel({...f,market:"other",otherCity:""},true)).toBe("Another market");
});
