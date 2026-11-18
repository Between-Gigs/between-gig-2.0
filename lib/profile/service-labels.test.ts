import { describe, expect, it } from "vitest";
import { serviceCategories, serviceLabel, serviceMatches, serviceFamily, serviceFilterValues, servicePickerLabel, servicePickerValues, serviceFilterLabel } from "./service-labels";
import { serviceSelectOptions } from "./service-choice";
import { offSetServices, serviceChoices } from "../data/taxonomy";
import { fromProfile, toProfile } from "../data/companyos/fields";
import { blankFields } from "../data/fields";

describe("approved labels use existing option values", () => {
  it("offers only the seven supported categories and keeps old taxonomy for decoding", () => {
    expect(serviceCategories.map(category => category.label)).toEqual(["Wardrobe & Personal Styling", "Furniture & Creative Builds", "Beauty, Hair & Makeup", "Interior Styling", "Parties & Event Planning", "Photography & Videography", "Lighting Design"]);
    expect(offSetServices).toHaveLength(10);
    for (const source of ["live", "sample"] as const) {
      expect(serviceChoices(source)).toEqual(serviceCategories.map(category => category.value));
      expect(serviceChoices(source)).not.toContain("Video Editing & Digital Content");
      expect(serviceChoices(source)).not.toContain("Wardrobe & Laundry Care");
    }
    for (const category of serviceCategories) expect(offSetServices).toContain(category.value);
  });
  it("never merges distinct saved values, personal lines or custom text on serialization", () => {
    const services = ["Hair Styling", "Makeup Services", "Beauty & Personal Styling", "Wardrobe & Laundry Care", "Event Styling"];
    const fields = { ...blankFields(), services, serviceLines: Object.fromEntries(services.map((value, i) => [value, `My exact personal answer ${i}.`])), other: "Custom tailoring\nPreserve my personal note." };
    const wire = toProfile(fields, { extras: true });
    expect(wire.items.filter(item => item.kind === "service").map(item => item.value)).toEqual(["hair_styling", "makeup_services", "beauty_personal_styling", "wardrobe_laundry_care", "event_styling"]);
    expect(fromProfile(wire.data, wire.items, "")).toMatchObject({ services, serviceLines: fields.serviceLines, other: fields.other });
    expect(serviceLabel("Hair Styling")).toBe("Beauty, Hair & Makeup");
    expect(servicePickerLabel("Hair Styling")).toBe("Beauty, Hair & Makeup · saved: Hair Styling");
    expect(servicePickerLabel("hair_styling")).toBe("Beauty, Hair & Makeup · saved: Hair Styling");
    expect(serviceFilterLabel("hair_styling")).toBe("Hair Styling");
    const options = serviceSelectOptions(serviceChoices("live"), services, "Hair Styling", true, servicePickerLabel, serviceMatches);
    expect(options).toContainEqual({ value: "Hair Styling", label: "Beauty, Hair & Makeup · saved: Hair Styling" });
    expect(options.some(option => option.value === "Beauty & Personal Styling")).toBe(false);
    expect(servicePickerValues(services, serviceChoices("live"))).toEqual(expect.arrayContaining(services));
  });
  it("maps aliases only for labels and filtering while retaining retired/bookmarked answers", () => {
    expect(serviceMatches("Hair Styling", "Beauty & Personal Styling")).toBe(true);
    expect(serviceMatches("Photography & Portraits", "Photography & Videography")).toBe(true);
    expect(serviceMatches("Hair Styling", "hair_styling")).toBe(true);
    expect(serviceMatches("Makeup Services", "Hair Styling")).toBe(false);
    expect(serviceMatches("Beauty & Personal Styling", "Hair Styling")).toBe(false);
    expect(serviceMatches("Wardrobe & Laundry Care", "Wardrobe & Personal Styling")).toBe(false);
    expect(serviceFamily("Parties & Event Planning")).toBe("Event Styling");
    expect(serviceFamily("event_styling")).toBe("Event Styling");
    expect(serviceFilterValues(serviceChoices("live"), "Hair Styling")).toContain("Hair Styling");
    expect(serviceFilterValues(serviceChoices("live"))).toContain("Wardrobe & Laundry Care");
    expect(serviceSelectOptions(serviceChoices("live"), ["legacy_custom_key"], "legacy_custom_key", false, servicePickerLabel, serviceMatches)).toContainEqual({ value: "legacy_custom_key", label: "legacy_custom_key" });
  });
  it("round-trips every offered category using its existing backend key", () => {
    for (const category of serviceCategories) {
      const fields = { ...blankFields(), services: [category.value], serviceLines: { [category.value]: "My own wording." } };
      const wire = toProfile(fields, { extras: true });
      expect(wire.items.find(item => item.kind === "service")?.value).toBe(category.key);
      expect(fromProfile(wire.data, wire.items, "")).toMatchObject({ services: fields.services, serviceLines: fields.serviceLines });
    }
  });
});
