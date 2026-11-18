import { describe, expect, it } from "vitest";
import { serviceCatalogue, serviceCategory, serviceLabel, serviceMatches, serviceOptions, serviceValue, serviceFilterValues } from "./service-catalogue";
import { fromProfile, toProfile } from "../data/companyos/fields";
import { blankFields } from "../data/fields";

describe("approved service catalogue and legacy persistence", () => {
  it("offers eight categories, 24 full examples and eight taglines, without laundry or three separate beauty choices", () => {
    expect(serviceCatalogue.map(c => c.label)).toEqual(["Wardrobe & Personal Styling", "Furniture & Creative Builds", "Beauty, Hair & Makeup", "Interior Styling", "Parties & Event Planning", "Photography & Videography", "Lighting Design", "Video Editing & Digital Content"]);
    expect(serviceCatalogue.flatMap(c => c.examples)).toHaveLength(24);
    expect(serviceCatalogue.every(c => c.tagline && c.examples.length === 3 && c.examples.every(e => e.title && e.description.length > 60))).toBe(true);
    expect(serviceOptions([], undefined).map(o => o.label)).not.toContain("Wardrobe & Laundry Care");
    expect(serviceOptions([], undefined).at(-1)).toEqual({value:"__other",label:"Other — name your service"});
  });
  it("keeps legacy values and personal lines distinct even when their displayed category is consolidated", () => {
    const services = ["Hair Styling", "Makeup Services", "Beauty & Personal Styling", "Wardrobe & Laundry Care", "Event Styling"];
    const f = {...blankFields(), services, serviceLines: Object.fromEntries(services.map((s,i) => [s, `My personal service ${i}.`])), other:"Custom tailoring\nPreserve this personal note."};
    const wire = toProfile(f, {extras:true});
    expect(wire.items.filter(i=>i.kind==="service").map(i=>i.value)).toEqual(["hair_styling","makeup_services","beauty_personal_styling","wardrobe_laundry_care","event_styling"]);
    expect(fromProfile(wire.data, wire.items, "")).toMatchObject({services:f.services,serviceLines:f.serviceLines,other:f.other});
    expect(serviceLabel("Hair Styling")).toBe("Beauty, Hair & Makeup");
    expect(serviceCategory("Makeup Services")?.examples[0].title).toBe("Professional Makeup Application");
    expect(serviceOptions(services, "Hair Styling").some(o=>o.value==="Hair Styling")).toBe(true);
    expect(serviceOptions(services).filter(o=>o.label==="Beauty, Hair & Makeup")).toHaveLength(0);
  });
  it("matches renamed and legacy categories without rewriting stored selections", () => {
    expect(serviceMatches("Hair Styling","Beauty & Personal Styling")).toBe(true);
    expect(serviceMatches("Photography & Portraits","Photography & Videography")).toBe(true);
    expect(serviceMatches("Wardrobe & Laundry Care","Wardrobe & Personal Styling")).toBe(false);
    expect(serviceValue("Parties & Event Planning")).toBe("Event Styling");
    expect(serviceOptions(["Unknown saved service"],"Unknown saved service")[0]).toEqual({value:"Unknown saved service",label:"Unknown saved service"});
  });
  it("round-trips every new choice and personal line using supported stable option keys", () => {
    for(const c of serviceCatalogue){
      const f={...blankFields(),services:[c.value],serviceLines:{[c.value]:"Keep my own words, please."}};
      const wire=toProfile(f,{extras:true});
      expect(wire.items.find(i=>i.kind==="service")?.value).toBe(c.key);
      expect(fromProfile(wire.data,wire.items,"")).toMatchObject({services:f.services,serviceLines:f.serviceLines});
    }
  });
});

it("keeps retired and bookmarked filters available while excluding retired values from new profile choices",()=>{
 const values=serviceCatalogue.map(c=>c.value);
 expect(serviceFilterValues(values)).toContain("Wardrobe & Laundry Care");
 expect(serviceFilterValues(values,"Hair Styling")).toContain("Hair Styling");
 expect(serviceOptions([]).some(o=>o.value==="Wardrobe & Laundry Care")).toBe(false);
});
