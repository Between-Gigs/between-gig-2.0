import { describe, expect, it } from "vitest";
import { toProfile } from "@/lib/data/companyos/fields";
import { completeFields } from "@/lib/data/contract/fixtures";
import type { Row } from "./companyos";
import { draftOps } from "./gigs";

// The autosave batch: the first save creates the profile and its items; later saves send only what changed, since
// any stored change to an approved profile sends it back to review (N-09).
const PERSON = "p-1";
const fields = completeFields("Maya Ríos", "/media/f");

function stored(f = fields): { profile: Row; items: Row[] } {
  const { data, items } = toProfile(f);
  return {
    profile: { id: "prof", data: { ...data, person: PERSON, status: "approved" }, createdAt: "", updatedAt: "" },
    items: items.map((i, n) => ({ id: `item-${n}`, data: { ...i, profile: "prof", visible: i.visible ?? true }, createdAt: "", updatedAt: "" })),
  };
}

describe("draftOps", () => {
  it("the first save creates the profile, then its items pointing at it", () => {
    const ops = draftOps(PERSON, fields, { items: [] });
    expect(ops[0]).toMatchObject({ op: "create", entity: "profile", data: { person: PERSON, display_name: "Maya Ríos", position: "Set decoration" } });
    expect(ops.slice(1).every((o) => o.op === "create" && o.entity === "profile_item" && (o.data!.profile as { $ref: number }).$ref === 0)).toBe(true);
    expect(ops).toHaveLength(1 + 5);
  });

  it("saving the same answers sends nothing", () => {
    expect(draftOps(PERSON, fields, stored())).toEqual([]);
  });

  it("only the changed field goes in the update", () => {
    expect(draftOps(PERSON, { ...fields, about: "Seven years now." }, stored())).toEqual([{ op: "update", entity: "profile", id: "prof", data: { about: "Seven years now." } }]);
  });

  it("a cleared number or month is cleared, not left as it was", () => {
    expect(draftOps(PERSON, { ...fields, years: "", month: "" }, stored())).toEqual([{ op: "update", entity: "profile", id: "prof", data: { years_experience: null, availability_month: null } }]);
  });

  it("items by difference: a new one created, a removed one deleted, a moved or re-pinned one updated", () => {
    const next = { ...fields, credits: ["Old commercial", "Night Shift (feature)", "New show"], creditPins: [true, true, true], skills: ["Props"] };
    const ops = draftOps(PERSON, next, stored());
    expect(ops).toEqual(expect.arrayContaining([
      { op: "update", entity: "profile_item", id: "item-1", data: { position: 0, visible: true } },
      { op: "update", entity: "profile_item", id: "item-0", data: { position: 1 } },
      { op: "create", entity: "profile_item", data: { kind: "credit", value: "New show", position: 2, visible: true, profile: "prof" } },
      { op: "create", entity: "profile_item", data: { kind: "skill", value: "props", position: 0, profile: "prof" } },
      { op: "delete", entity: "profile_item", id: "item-2" },
    ]));
    expect(ops).toHaveLength(5);
  });

  it("changing only availability touches only availability fields", () => {
    const ops = draftOps(PERSON, { ...fields, monthStatus: "limited", dates: "Mornings" }, stored());
    expect(ops).toEqual([{ op: "update", entity: "profile", id: "prof", data: { availability_status: "limited", availability_notes: "Mornings" } }]);
  });
});

describe("draftOps keeps what 2.0 can't show", () => {
  it("a stored value 2.0 reads as its nearest (work mode remote) isn't overwritten by an availability edit", async () => {
    const { fromProfile } = await import("@/lib/data/companyos/fields");
    const s = stored();
    s.profile.data.work_mode = "remote";
    const shown = fromProfile(s.profile.data, s.items.map((r) => ({ kind: r.data.kind as "credit", value: String(r.data.value), position: Number(r.data.position), ...(r.data.visible === false ? { visible: false } : {}) })), "/media/f");
    expect(draftOps(PERSON, { ...shown, monthStatus: "limited" }, s)).toEqual([{ op: "update", entity: "profile", id: "prof", data: { availability_status: "limited" } }]);
  });
});

describe("draftOps writes what isn't stored yet", () => {
  it("a profile created by the photo upload (name only) gets every answer on the next save, defaults included", () => {
    const s = { profile: { id: "prof", data: { person: PERSON, display_name: "Maya Ríos", status: "draft" }, createdAt: "", updatedAt: "" }, items: [] };
    const [update] = draftOps(PERSON, fields, s);
    expect(update!.data).toMatchObject({ home_market: "la", work_mode: "at_provider", insurance_disclosure: "discuss_privately", rate_basis: "hourly", position: "Set decoration" });
  });
});
