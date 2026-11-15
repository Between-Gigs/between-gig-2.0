import { describe, expect, it } from "vitest";
import { accessRows, makePlan, changeAccess, changeSensitive, sensitiveActions, presets } from "./access-plan";
describe("non-operative access planning", () => {
  it("records confirmed intent without adding unrequested sensitive powers", () => {
    const expected = { simple: ["contacts", "approve"], medium: ["publish", "send"], designer: ["contacts"], developer: ["export", "manage_access"], product_manager: ["export", "manage_access"] };
    for (const { key } of presets) {
      const plan = makePlan(key);
      expect(Object.keys(plan.sensitive).filter(id => plan.sensitive[id]).sort()).toEqual([...expected[key]].sort());
      expect(accessRows.filter(row => row.soon).every(row => !plan.rows[row.id].view && !plan.rows[row.id].edit)).toBe(true);
    }
  });
  it("distinguishes Anowar the designer from Anuraag the developer", () => {
    const designer = makePlan("designer");
    expect(designer.scope).toBe("tenant");
    expect(accessRows.filter(r => !r.soon).every(r => designer.rows[r.id].view)).toBe(true);
    expect(Object.values(designer.rows).every(r => !r.edit)).toBe(true);
    expect(designer.sensitive.approve).toBe(false);
    expect(designer.sensitive.manage_access).toBe(false);
    expect(makePlan("developer").sensitive.manage_access).toBe(true);
  });
  it("edit includes view and required pages; removing a prerequisite clears dependents", () => {
    let plan = changeAccess(makePlan("simple"), "review", "edit", true);
    expect(plan.rows.review).toEqual({ view: true, edit: true });
    expect(plan.rows.people.view).toBe(true);
    plan = changeAccess(plan, "people", "view", false);
    expect(plan.rows.review).toEqual({ view: false, edit: false });
  });
  it("does not enable coming-soon or view-only editing", () => {
    const plan = makePlan("simple");
    expect(changeAccess(plan, "finance", "view", true)).toEqual(plan);
    expect(changeAccess(plan, "page_previews", "edit", true)).toEqual(plan);
  });
  it("sensitive proposals require prerequisites and clearing view clears those proposals", () => {
    let plan = changeSensitive(makePlan("simple"), "publish", true);
    expect(plan.sensitive.publish).toBe(true);
    expect(plan.rows.review.view).toBe(true);
    plan = changeAccess(plan, "review", "view", false);
    expect(plan.sensitive.publish).toBe(false);
  });
  it("each proposal is independent and every dependency exists", () => {
    const first = makePlan("simple");
    const other = changeAccess(first, "product", "edit", true);
    expect(first.rows.product.view).toBe(false);
    expect(other.rows.product.edit).toBe(true);
    const ids = new Set(accessRows.map(row => row.id));
    for (const row of accessRows) for (const id of row.requires) expect(ids.has(id)).toBe(true);
    for (const action of sensitiveActions) for (const id of action.requires) expect(ids.has(id)).toBe(true);
  });
});
