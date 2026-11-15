import { describe, expect, it } from "vitest";
import { validateWork, validateRelations } from "./validation";
import type { Phase, WorkFields, WorkItem } from "./types";
const p = "00000000-0000-4000-8000-000000000001",
  a = "00000000-0000-4000-8000-000000000002",
  b = "00000000-0000-4000-8000-000000000003";
export const fields: WorkFields = {
  title: "Test work",
  phase: p,
  kind: "task",
  parent: "",
  category: "ui",
  journey: "gigster",
  status: "not_started",
  owner: "",
  description: "",
  acceptance: "",
  blocker: "",
  startDate: "",
  dueDate: "",
  evidence: [],
  dependsOn: [],
  deployment: "unknown",
};
const row = (id: string, patch: Partial<WorkFields> = {}): WorkItem => ({
  ...fields,
  ...patch,
  id,
  revision: 0,
  updatedAt: "2026-11-15T00:00:00Z",
});
const phases = [{ id: p }] as Phase[];
describe("strict management data", () => {
  it("rejects unknown fields, hidden controls, bad URLs and impossible dates", () => {
    for (const patch of [
      { tenant: "evil" },
      { title: "\u0000" },
      { dueDate: "2026-02-30" },
      {
        evidence: [
          { label: "bad", url: "javascript:alert(1)", note: "", checkedAt: "" },
        ],
      },
      {
        evidence: [
          {
            label: "bad",
            url: "https://user:password@example.org",
            note: "",
            checkedAt: "",
          },
        ],
      },
    ])
      expect(() => validateWork({ ...fields, ...patch })).toThrow();
  });
  it("requires dated evidence for done and reasons for blocked", () => {
    expect(() => validateWork({ ...fields, status: "done" })).toThrow();
    expect(() => validateWork({ ...fields, status: "blocked" })).toThrow();
    expect(
      validateWork({
        ...fields,
        status: "done",
        evidence: [
          {
            label: "Owner review",
            url: "",
            note: "Checked desktop flow",
            checkedAt: "2026-11-15",
          },
        ],
      }).status,
    ).toBe("done");
  });
  it("refuses cross-phase, missing and circular relationships", () => {
    expect(() =>
      validateRelations({ ...fields, parent: b }, a, phases, [
        row(b, { parent: a }),
      ]),
    ).toThrow();
    expect(() =>
      validateRelations({ ...fields, dependsOn: [b] }, a, phases, [
        row(b, { dependsOn: [a] }),
      ]),
    ).toThrow();
    expect(() =>
      validateRelations({ ...fields, parent: b }, a, phases, []),
    ).toThrow();
  });
  it("will not orphan active children or dependents by archive", () => {
    expect(() =>
      validateRelations({ ...fields, status: "archived" }, a, phases, [
        row(b, { parent: a }),
      ]),
    ).toThrow();
    expect(() =>
      validateRelations({ ...fields, status: "archived" }, a, phases, [
        row(b, { dependsOn: [a] }),
      ]),
    ).toThrow();
  });
  it("will not finish an unfinished tree or dependency", () => {
    expect(() =>
      validateRelations({ ...fields, status: "done" }, a, phases, [
        row(b, { parent: a }),
      ]),
    ).toThrow();
    expect(() =>
      validateRelations(
        { ...fields, status: "done", dependsOn: [b] },
        a,
        phases,
        [row(b)],
      ),
    ).toThrow();
  });
  it("requires reopening a completed parent before adding or reopening work", () => {
    expect(() =>
      validateRelations({ ...fields, parent: a }, b, phases, [
        row(a, { status: "done" }),
      ]),
    ).toThrow();
    expect(() =>
      validateRelations({ ...fields, parent: a }, b, phases, [
        row(a, { status: "done" }),
        row(b, { parent: a, status: "done" }),
      ]),
    ).toThrow();
  });
  it("rejects completion cycles mixing hierarchy and dependencies", () => {
    expect(() =>
      validateRelations({ ...fields, parent: a, dependsOn: [a] }, b, phases, [
        row(a),
      ]),
    ).toThrow();
    const c = "00000000-0000-4000-8000-000000000004";
    expect(() =>
      validateRelations({ ...fields, parent: a, dependsOn: [c] }, b, phases, [
        row(a),
        row(c, { dependsOn: [a] }),
      ]),
    ).toThrow();
  });
  it("allows informational communication children of completed containers", () => {
    expect(() =>
      validateRelations({ ...fields, status: "done" }, a, phases, [
        row(b, { parent: a, kind: "communication" }),
      ]),
    ).not.toThrow();
    expect(() =>
      validateRelations(
        { ...fields, parent: a, kind: "communication" },
        b,
        phases,
        [row(a, { status: "done" })],
      ),
    ).not.toThrow();
  });
  it("keeps communications as leaf records so work cannot hide under them", () => {
    expect(() =>
      validateRelations({ ...fields, parent: a }, b, phases, [
        row(a, { kind: "communication" }),
      ]),
    ).toThrow();
    expect(() =>
      validateRelations({ ...fields, kind: "communication" }, a, phases, [
        row(a),
        row(b, { parent: a }),
      ]),
    ).toThrow();
  });
});
