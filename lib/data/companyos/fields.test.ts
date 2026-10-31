import { describe, expect, it } from "vitest";
import { blankFields } from "../seed.ts";
import type { ProfileFields } from "../types.ts";
import { fromProfile, optionKey, toProfile } from "./fields.ts";

// 2.0's questionnaire (ProfileFields) as Company OS records (gap analysis §13.4 in Company OS).
const filled: ProfileFields = {
  ...blankFields("Maya Ríos"),
  photo: "img/people/maya.jpg",
  years: "9",
  position: "Costume & wardrobe",
  imdb: "https://www.imdb.com/name/nm0000000/",
  credits: ["Feature A (sample)", "  ", "Old commercial (sample)"],
  creditPins: [true, true, false],
  skills: ["Wardrobe & costume", "Set decoration"],
  services: ["Wardrobe & Personal Styling"],
  other: "Tailoring",
  market: "la",
  zip: "90026",
  areas: ["Eastside", "The Valley"],
  travel: "Up to 20 miles",
  month: "2026-11",
  monthStatus: "away",
  dates: "Weekday mornings",
  rate: "45",
  basis: "day",
  about: "About me.",
  languages: "English, Spanish",
  insurance: "private",
  tools: "Sewing kit",
  transport: "Car",
  mode: "studio",
};

describe("optionKey", () => {
  it("turns a taxonomy label into the recipe's option key", () => {
    expect(optionKey("Wardrobe & costume")).toBe("wardrobe_costume");
    expect(optionKey("Photography & Portraits")).toBe("photography_portraits");
    expect(optionKey("The Valley")).toBe("the_valley");
    expect(optionKey("Pasadena area")).toBe("pasadena_area");
  });
});

describe("toProfile", () => {
  it("maps every field to a profile field, a tenant field or an item, with Company OS's values", () => {
    const { data, items } = toProfile(filled);
    expect(data).toEqual({
      display_name: "Maya Ríos",
      years_experience: 9,
      position: "Costume & wardrobe",
      external_profile_url: "https://www.imdb.com/name/nm0000000/",
      home_market: "la",
      home_city: "",
      postal_code: "90026",
      travel_notes: "Up to 20 miles",
      availability_month: "2026-11",
      availability_status: "unavailable",
      availability_notes: "Weekday mornings",
      rate_text: "45",
      rate_basis: "daily",
      about: "About me.",
      languages: "English, Spanish",
      insurance_disclosure: "discuss_privately",
      tools: "Sewing kit",
      transport: "Car",
      work_mode: "at_provider",
      services_other: "Tailoring",
    });
    expect(items).toEqual([
      { kind: "credit", value: "Feature A (sample)", position: 0, visible: true },
      { kind: "credit", value: "Old commercial (sample)", position: 1, visible: false },
      { kind: "skill", value: "wardrobe_costume", position: 0 },
      { kind: "skill", value: "set_decoration", position: 1 },
      { kind: "service", value: "wardrobe_personal_styling", position: 0 },
      { kind: "area", value: "eastside", position: 0 },
      { kind: "area", value: "the_valley", position: 1 },
    ]);
  });

  it("leaves out what is empty: no years, no month in YYYY-MM, no areas outside LA", () => {
    const { data, items } = toProfile({ ...blankFields("Felix"), market: "other", otherCity: "Lisbon, Portugal", areas: ["Eastside"], month: "November 2026", mode: "both", insurance: "yes", basis: "project" });
    expect(data).toMatchObject({ home_market: "other", home_city: "Lisbon, Portugal", work_mode: "on_site_or_at_provider", insurance_disclosure: "has_coverage", rate_basis: "project" });
    expect(data).not.toHaveProperty("years_experience");
    expect(data).not.toHaveProperty("availability_month");
    expect(items.filter((i) => i.kind === "area")).toEqual([]);
  });
});

describe("fromProfile", () => {
  it("round-trips: a profile written by toProfile reads back as the same questionnaire", () => {
    const { data, items } = toProfile(filled);
    expect(fromProfile(data, items, filled.photo)).toEqual({
      ...filled,
      credits: ["Feature A (sample)", "Old commercial (sample)"], // the blank credit isn't stored
      creditPins: [true, false],
    });
  });

  it("round-trips a profile outside LA, with no years, an unset month and every other option value", () => {
    const felix: ProfileFields = { ...blankFields("Felix"), market: "other", otherCity: "Lisbon, Portugal", month: "", monthStatus: "limited", basis: "project", insurance: "no", mode: "both", credits: ["One"], creditPins: [true] };
    const { data, items } = toProfile(felix);
    expect(fromProfile(data, items, "")).toEqual(felix);
  });

  it("reads items in their stored order, whatever order they arrive in", () => {
    const items = [
      { kind: "skill" as const, value: "set_decoration", position: 1 },
      { kind: "credit" as const, value: "Second", position: 1 },
      { kind: "skill" as const, value: "props", position: 0 },
      { kind: "credit" as const, value: "First", position: 0 },
    ];
    const f = fromProfile({ display_name: "Ana" }, items, "");
    expect(f.skills).toEqual(["Props", "Set decoration"]);
    expect(f.credits).toEqual(["First", "Second"]);
    expect(f.creditPins).toEqual([true, true]);
  });

  it("starts a blank questionnaire from an empty profile: one empty credit row, the builder's defaults", () => {
    expect(fromProfile({}, [], "")).toEqual({ ...blankFields(""), month: "" });
  });

  it("reads Company OS values 2.0 has no answer for as the nearest one, and keeps an option key it doesn't know", () => {
    const f = fromProfile({ work_mode: "remote", availability_status: "unknown", home_market: "atlanta" }, [{ kind: "service", value: "no_such_service", position: 0 }], "");
    expect(f).toMatchObject({ mode: "on-site", monthStatus: "available", market: "other", services: ["no_such_service"] });
  });

  it("a public read (no ZIP, no insurance, no hidden credits) reads with those left empty", () => {
    const { data, items } = toProfile(filled);
    const open = Object.fromEntries(Object.entries(data).filter(([k]) => !["postal_code", "insurance_disclosure", "home_city", "services_other"].includes(k)));
    const f = fromProfile(open, items.filter((i) => i.visible !== false).map((i) => ({ kind: i.kind, value: i.value, position: i.position })), "");
    expect(f).toMatchObject({ zip: "", insurance: "private", credits: ["Feature A (sample)"], creditPins: [true] });
  });
});
