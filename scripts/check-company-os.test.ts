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
