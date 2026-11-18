import { describe, expect, it } from "vitest";
import { DEFAULT_MENU, MINIMAL_MENU, cleanMenu, effectiveMenu, parseRecord, selectConfiguration } from "./model";
const record = (id = "one", patch = {}) => ({ id, data: { user: "subject", active: true, schema_version: 1, revision: 0, visible_modes: ["gigster", "owner"], visible_items: ["dashboard", "people"], ...patch }, updatedAt: "2026-11-18" });
describe("staff menus are presentation, never authority", () => {
  it("keeps defaults when no configuration exists and intersects non-owner authority", () => {
    expect(selectConfiguration([], "subject").configuration).toBeNull();
    expect(effectiveMenu(DEFAULT_MENU, false)).toEqual({ modes: ["gigster"], items: ["my_profile", "edit_profile"] });
    expect(effectiveMenu({ modes: ["developer"], items: ["staff"] }, false)).toEqual({ modes: ["gigster"], items: ["my_profile", "edit_profile"] });
  });
  it("accepts only known modes/items, rejects duplicate values, empty modes and forged fields", () => {
    expect(cleanMenu({ modes: ["gigster"], items: [] })).toEqual({ modes: ["gigster"], items: [] });
    for (const menu of [{ modes: [], items: [] }, { modes: ["admin"], items: [] }, { modes: ["owner", "owner"], items: [] }, { modes: ["owner"], items: ["send_email"] }, { modes: ["owner"], items: [], role: "super_admin" }]) expect(() => cleanMenu(menu)).toThrow();
  });
  it("refuses malformed records and fails closed on duplicate active per-user settings", () => {
    expect(selectConfiguration([record(), record("two")], "subject")).toMatchObject({ configuration: MINIMAL_MENU, conflict: true });
    expect(selectConfiguration([record(), record("inactive", { active: false }), record("other", { user: "someone-else" })], "subject")).toMatchObject({ conflict: false, record: { id: "one", revision: 0 } });
    for (const patch of [{ revision: -1 }, { revision: 0.5 }, { schema_version: 2 }, { visible_items: ["not-real"] }]) expect(() => parseRecord(record("bad", patch))).toThrow();
  });
});
