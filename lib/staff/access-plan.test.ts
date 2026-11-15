import { describe, expect, it } from "vitest";
import { accessRows, makePlan, changeAccess, changeSensitive, sensitiveActions } from "./access-plan";
describe("non-operative access planning", () => {
  it("keeps every consequential action off in every proposed preset", () => {
    for (const preset of ["simple", "medium", "advanced"] as const) {
      const plan = makePlan(preset);
      expect(Object.values(plan.sensitive).every(value => value === false)).toBe(true);
      expect(accessRows.filter(row => row.soon).every(row => !plan.rows[row.id].view && !plan.rows[row.id].edit)).toBe(true);
    }
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
