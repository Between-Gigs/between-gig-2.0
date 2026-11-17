import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { checkRequirement } from "./check-company-os.mjs";

// company-os.json: which Company OS release this frontend needs (playbook rule E9: API before frontend).
describe("checkRequirement", () => {
  it("accepts >=MAJOR.MINOR.PATCH", () => {
    expect(checkRequirement('{ "requires": ">=1.6.0" }')).toEqual({ ok: true, todo: false, requires: ">=1.6.0" });
  });

  it.each([
    ["not JSON", "{"],
    ["no requires", "{}"],
    ["a range that isn't >=", '{ "requires": "^1.6.0" }'],
    ["a short version", '{ "requires": ">=1.6" }'],
    ["a non-string", '{ "requires": 160 }'],
  ])("refuses %s", (_label, text) => {
    expect(checkRequirement(text).ok).toBe(false);
  });

  it("refuses the owner's placeholder for a release, and lets test deploys through with a warning", () => {
    const text = '{ "requires": ">=0.0.0", "todo": "owner: the bg-2 release" }';
    expect(checkRequirement(text)).toMatchObject({ ok: false, todo: true });
    expect(checkRequirement(text, { allowTodo: true })).toMatchObject({ ok: true, todo: true, requires: ">=0.0.0" });
  });

  it("the repo's file is well-formed (its placeholder is for the owner to replace before the first release)", () => {
    expect(checkRequirement(readFileSync(new URL("../company-os.json", import.meta.url), "utf8"), { allowTodo: true }).ok).toBe(true);
  });
});

describe("feature API release coordination",()=>{
  const feature={requires:">=2.7.0",apiCommit:"a".repeat(40),profilesModule:"1.5.0"}; // Fictional releases, not reservations.
  it("refuses custom activation when only the baseline API minimum is present",()=>{
    expect(checkRequirement('{"requires":">=1.14.0"}',{customServiceReview:true}).ok).toBe(false);
  });
  it("refuses unallocated, unproven or lower-than-feature release declarations",()=>{
    for(const f of [{...feature,requires:null},{...feature,requires:[">=2.7.0"]},{...feature,apiCommit:null},{...feature,apiCommit:["a".repeat(40)]},feature])expect(checkRequirement(JSON.stringify({requires:">=1.14.0",profileFeatures:{customServiceReview:f}}),{customServiceReview:true}).ok).toBe(false);
  });
  it("allows coordinated declarations without claiming runtime capability verification",()=>{
    expect(checkRequirement(JSON.stringify({requires:">=2.7.0",profileFeatures:{customServiceReview:feature}}),{customServiceReview:true}).ok).toBe(true);
  });
});

describe("the shipped company-os.json", () => {
  const shipped = JSON.parse(readFileSync(new URL("../company-os.json", import.meta.url), "utf8")) as { requires: string; profileFeatures: Record<string, { requires: string | null }> };
  const atLeast = (range: string, floor: number[]) => { const v = range.slice(2).split(".").map(Number); return v[0] > floor[0] || (v[0] === floor[0] && (v[1] > floor[1] || (v[1] === floor[1] && v[2] >= floor[2]))); };
  it("needs API 1.17.0 overall: the Between Gigs profile release (1.16.0 is a Hoy-only release without it)", () => {
    expect(atLeast(shipped.requires, [1, 17, 0])).toBe(true);
  });
  it("declares the publish gate at API 1.17.0 or later", () => {
    expect(shipped.profileFeatures.publishGate.requires).not.toBeNull();
    expect(atLeast(shipped.profileFeatures.publishGate.requires as string, [1, 17, 0])).toBe(true);
  });
});
