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

describe("the shipped company-os.json", () => {
  const shipped = JSON.parse(readFileSync(new URL("../company-os.json", import.meta.url), "utf8")) as Record<string, unknown> & { requires: string };
  const atLeast = (range: string, floor: number[]) => { const v = range.slice(2).split(".").map(Number); return v[0] > floor[0] || (v[0] === floor[0] && (v[1] > floor[1] || (v[1] === floor[1] && v[2] >= floor[2]))); };
  it("needs API 1.17.0 overall: the Between Gigs profile release (1.16.0 is a Hoy-only release without it)", () => {
    expect(atLeast(shipped.requires, [1, 17, 0])).toBe(true);
  });
  it("carries no activation receipts: the deploy checks the backend itself", () => {
    const text = readFileSync(new URL("../company-os.json", import.meta.url), "utf8");
    expect(text).not.toMatch(/apiCommit|settingsEvidence|profilesModule|libfile_/);
    expect(shipped.profileFeatures).toBeUndefined();
  });
  it("keeps one reviewed location cutoff per environment", () => {
    expect(Object.keys(shipped.travelRequiredAfter as object).sort()).toEqual(["production", "test"]);
  });
});
