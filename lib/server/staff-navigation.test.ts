import { describe, expect, it, vi } from "vitest";
import { handleStaffNavigation } from "./staff-navigation";
import { NAVIGATION_SCHEMA, ENTITY } from "@/lib/staff-navigation/schema";
import { DEFAULT_MENU } from "@/lib/staff-navigation/model";
import { CompanyOsError, type CompanyOs, type Credential } from "./companyos";
const userId = "11111111-1111-4111-8111-111111111111", membershipId = "22222222-2222-4222-8222-222222222222", rowId = "33333333-3333-4333-8333-333333333333";
type Op = { op: string; entity: string; id?: string; data: Record<string, unknown>; ifMatch?: { field: string; value: unknown } };
type Batch = { ops: Op[]; membershipSnapshot: { userId: string; ids: string[] } };
type TestRow = { id: string; data: Record<string, unknown>; updatedAt: string };
const req = (input: unknown, token = "fixture-session") => new Request("https://web.example/api/staff-navigation/", { method: "POST", headers: { "content-type": "application/json", ...(token ? { authorization: "Bearer " + token } : {}) }, body: JSON.stringify(input) });
function fixture({ admin = true, ready = true, eligible = true, duplicate = false, existing = false, mismatch = false, publicGrant = false, wrongTenant = false, failBatch = false, loseResponse = false, raceCreate = false } = {}) {
  const calls: { method: string; path: string; body: unknown; cred: Credential }[] = [];
  let entities = ready ? [{ ...NAVIGATION_SCHEMA, fields: NAVIGATION_SCHEMA.fields.map(f => ({ ...f, ...(mismatch && f.key === "user" ? { type: "text" } : {}) })) }] : [];
  const users = [{ userId, email: "owner@example.test", signedUp: true, memberships: [{ membershipId, roleKey: eligible ? "super_admin" : "reviewer", roleName: eligible ? "Super admin" : "Reviewer" }] }];
  const rows: TestRow[] = (duplicate ? [rowId, "44444444-4444-4444-8444-444444444444"] : existing ? [rowId] : []).map(id => ({ id, data: { user: userId, active: true, schema_version: 1, revision: 0, visible_modes: DEFAULT_MENU.modes, visible_items: DEFAULT_MENU.items }, updatedAt: "2026-11-18" }));
  const cos = { me: vi.fn(async () => ({ user: { id: userId, email: "owner@example.test" }, roleKeys: [admin ? "super_admin" : "provider"], isSuperAdmin: admin, tenant: {slug: "between-gigs", id: wrongTenant ? "wrong-tenant" : "38c1218b-1c1f-4fd3-874a-a8b2ea547628"} })), call: async (cred: Credential, method: string, path: string, body: unknown) => {
    calls.push({ method, path, body, cred });
    if (path === "/meta/entities" && method === "GET") return { entities };
    if (path === "/meta/entities" && method === "POST") { const definition = body as typeof NAVIGATION_SCHEMA; entities = [{ ...definition, fields: definition.fields }]; return { entity: body }; }
    if (path === "/admin/users") return { users };
    if (path === "/admin/roles") return { roles: [{ key: "super_admin", permissions: ["read", "create", "update", "delete"].map(action => ({ entity: ENTITY, action, scope: "all" })) }, { key: "provider", permissions: publicGrant ? [{ entity: ENTITY, action: "read", scope: "all" }] : [] }] };
    if (path === "/query") return { data: rows.slice((body as { offset: number }).offset ?? 0, ((body as { offset: number }).offset ?? 0) + (body as { limit: number }).limit) };
    if (path === "/batch") {
      if (failBatch) throw new CompanyOsError(409, "membership_state_changed");
      for (const op of (body as Batch).ops) { if (op.op === "create") rows.push({ id: rowId, data: op.data, updatedAt: "2026-11-18" }); else { const row = rows.find(r => r.id === op.id); if (!row || row.data.revision !== op.ifMatch?.value) throw new Error("stale fixture"); Object.assign(row.data, op.data); } }
      if (raceCreate) rows.push({ ...structuredClone(rows[0]), id: "44444444-4444-4444-8444-444444444444" });
      if (loseResponse) throw new Error("private connection details after committed write");
      return { ids: (body as Batch).ops.map((op: Op) => op.id ?? rowId) };
    }
    throw new Error("Unexpected operation " + path);
  } } as unknown as CompanyOs;
  return { cos, calls };
}
describe("private fixed-entity staff navigation adapter", () => {
  it("requires a verified superadmin before reading private schema or users", async () => {
    for (const token of ["", "fixture-session"]) { const f = fixture({ admin: false }); const r = await handleStaffNavigation("snapshot", req({}, token), f); expect(r.status).toBe(token ? 403 : 401); expect(f.calls).toEqual([]); }
  });
  it("reports missing storage without mutating on snapshot", async () => {
    const f = fixture({ ready: false }); const r = await handleStaffNavigation("snapshot", req({}), f);
    expect(r.status).toBe(200); expect((await r.json()).result.store).toBe("missing"); expect(f.calls.every(c => c.method === "GET")).toBe(true);
  });
  it("creates only the exact reviewed metadata on explicit setup", async () => {
    const f = fixture({ ready: false }); expect((await handleStaffNavigation("setup", req({}), f)).status).toBe(200);
    expect(f.calls.filter(c => c.method !== "GET" && c.path !== "/query")).toEqual([expect.objectContaining({ method: "POST", path: "/meta/entities", body: NAVIGATION_SCHEMA })]);
  });
  it.each([{ mismatch: true }, { publicGrant: true }])("refuses incompatible schema or unexpected nonadmin grants without repairing authority: %j", async options => {
    const f = fixture(options); expect((await handleStaffNavigation("save", req({ userId, expected: null, menu: DEFAULT_MENU, requestId: "55555555-5555-4555-8555-555555555555" }), f)).status).toBe(409); expect(f.calls.every(c => c.method === "GET")).toBe(true);
  });
  it("writes fixed configuration with target membership snapshot and no role/capability mutation", async () => {
    const f = fixture(); const r = await handleStaffNavigation("save", req({ userId, expected: null, menu: DEFAULT_MENU, requestId: "55555555-5555-4555-8555-555555555555" }), f);
    expect(r.status).toBe(200); const write = f.calls.find(c => c.path === "/batch")!;
    expect((write.body as Batch).membershipSnapshot).toEqual({ userId, ids: [membershipId] });
    expect((write.body as Batch).ops).toEqual([{ op: "create", entity: ENTITY, data: { user: userId, active: true, schema_version: 1, revision: 0, visible_modes: DEFAULT_MENU.modes, visible_items: DEFAULT_MENU.items } }]);
    expect(f.calls.filter(c => c.method !== "GET" && c.path !== "/query").every(c => c.path === "/batch")).toBe(true);
    expect(f.calls.every(c => c.cred.kind === "session")).toBe(true);
  });
  it("refuses non-superadmin subjects, forged tenant/entity and arbitrary target IDs", async () => {
    for (const input of [{ userId, expected: null, menu: DEFAULT_MENU, requestId: "55555555-5555-4555-8555-555555555555", tenant: "other" }, { userId: "66666666-6666-4666-8666-666666666666", expected: null, menu: DEFAULT_MENU, requestId: "55555555-5555-4555-8555-555555555555" }]) { const f = fixture(); expect((await handleStaffNavigation("save", req(input), f)).status).toBeGreaterThanOrEqual(400); expect(f.calls.some(c => c.path === "/batch")).toBe(false); }
    const f = fixture({ eligible: false }); expect((await handleStaffNavigation("save", req({ userId, expected: null, menu: DEFAULT_MENU, requestId: "55555555-5555-4555-8555-555555555555" }), f)).status).toBe(409);
  });
  it("blocks duplicate active records and repairs only explicitly named same-user revisions by deactivation", async () => {
    const f = fixture({ duplicate: true }); const before = await handleStaffNavigation("snapshot", req({ userId }), f); expect((await before.json()).result.conflict).toBe(true);
    expect((await handleStaffNavigation("save", req({ userId, expected: null, menu: DEFAULT_MENU, requestId: "55555555-5555-4555-8555-555555555555" }), f)).status).toBe(409);
    const r = await handleStaffNavigation("repair", req({ userId, keepId: rowId, expected: [{ id: rowId, revision: 0 }, { id: "44444444-4444-4444-8444-444444444444", revision: 0 }], requestId: "77777777-7777-4777-8777-777777777777" }), f); expect(r.status).toBe(200);
    const ops = (f.calls.find(c => c.path === "/batch")!.body as Batch).ops; expect(ops.every((op: Op) => op.op === "update" && op.entity === ENTITY && op.ifMatch?.field === "revision")).toBe(true); expect(ops[1].data).toEqual({ active: false, revision: 1 });
  });
  it("uses atomic revision guards for updates and rejects a stale editor without a write", async () => {
    const menu = { modes: ["owner"], items: ["dashboard"] };
    const f = fixture({ existing: true });
    expect((await handleStaffNavigation("save", req({ userId, expected: { id: rowId, revision: 9 }, menu, requestId: "55555555-5555-4555-8555-555555555555" }), f)).status).toBe(409);
    expect(f.calls.some(c => c.path === "/batch")).toBe(false);
    expect((await handleStaffNavigation("save", req({ userId, expected: { id: rowId, revision: 0 }, menu, requestId: "55555555-5555-4555-8555-555555555555" }), f)).status).toBe(200);
    expect((f.calls.find(c => c.path === "/batch")!.body as Batch).ops).toEqual([{ op: "update", entity: ENTITY, id: rowId, data: { visible_modes: ["owner"], visible_items: ["dashboard"], revision: 1 }, ifMatch: { field: "revision", value: 0 } }]);
  });
  it("fails closed on wrong environment identity or concurrent membership change", async () => {
    const bad = fixture({ wrongTenant: true }); expect((await handleStaffNavigation("snapshot", req({}), bad)).status).toBe(503); expect(bad.calls).toEqual([]);
    const f = fixture({ failBatch: true }); const r = await handleStaffNavigation("save", req({ userId, expected: null, menu: DEFAULT_MENU, requestId: "55555555-5555-4555-8555-555555555555" }), f); expect(r.status).toBe(409); expect((await r.json()).error).toBe("menu_changed");
  });
  it("reports uncertain outcomes safely and readback prevents a duplicate retry after response loss", async () => {
    const f = fixture({ loseResponse: true }); const input = { userId, expected: null, menu: DEFAULT_MENU, requestId: "55555555-5555-4555-8555-555555555555" };
    const uncertain = await handleStaffNavigation("save", req(input), f); expect(uncertain.status).toBe(503); expect(await uncertain.text()).not.toContain("private connection");
    expect((await handleStaffNavigation("save", req(input), f)).status).toBe(200); expect(f.calls.filter(c => c.path === "/batch")).toHaveLength(1);
    const raced = fixture({ raceCreate: true }); const r = await handleStaffNavigation("save", req(input), raced); expect(r.status).toBe(409); expect((await r.json()).error).toBe("menu_write_needs_review");
  });
  it("refuses stale or foreign duplicate repair choices without changing records", async () => {
    for (const expected of [[{ id: rowId, revision: 9 }], [{ id: rowId, revision: 0 }, { id: "66666666-6666-4666-8666-666666666666", revision: 0 }]]) {
      const f = fixture({ duplicate: true }); expect((await handleStaffNavigation("repair", req({ userId, keepId: rowId, expected, requestId: "55555555-5555-4555-8555-555555555555" }), f)).status).toBe(409); expect(f.calls.some(c => c.path === "/batch")).toBe(false);
    }
  });
  it("refuses HTTP/query/content-type deviations before any backend request", async () => {
    const f = fixture();
    for (const request of [new Request("https://web.example/api/staff-navigation/snapshot/"), new Request("https://web.example/api/staff-navigation/setup/?tenant=other", { method: "POST" }), new Request("https://web.example/api/staff-navigation/setup/", { method: "POST", headers: { authorization: "Bearer fixture-session" }, body: "{}" })]) expect((await handleStaffNavigation("setup", request, f)).status).toBeGreaterThanOrEqual(400);
    expect(f.calls).toEqual([]);
  });
});
