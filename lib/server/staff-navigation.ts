import { CompanyOsError, companyOs, configFromEnv, type CompanyOs, type Credential, type Row } from "./companyos";
import { bearer, readCapped } from "./routes";
import { ENTITY, NAVIGATION_SCHEMA } from "@/lib/staff-navigation/schema";
import { cleanMenu, object, selectConfiguration, MenuValidationError, type NavigationSnapshot } from "@/lib/staff-navigation/model";
import type { StaffUser, StaffRole } from "@/lib/staff/types";
const uuid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const TARGETS = { "between-gigs": "38c1218b-1c1f-4fd3-874a-a8b2ea547628", "between-gigs-dev": "b6b6db6e-97f1-4d7f-8029-2d43c1fd281b" };
class Refusal extends Error { constructor(readonly status: number, readonly code: string, message: string) { super(message); } }
function refuse(status: number, code: string, message: string): never { throw new Refusal(status, code, message); }
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "private, no-store", vary: "Authorization", "x-content-type-options": "nosniff" } });
function keys(input: Record<string, unknown>, allowed: string[]) { if (Object.keys(input).some(k => !allowed.includes(k))) refuse(400, "invalid_menu_request", "Unexpected request fields."); }
function revision(value: unknown): value is { id: string; revision: number } { return object(value) && Object.keys(value).every(k => ["id", "revision"].includes(k)) && uuid(value.id) && Number.isSafeInteger(value.revision) && Number(value.revision) >= 0; }
interface Meta { key: string; orgUnit?: string | null; fields: { key: string; type: string; config?: Record<string, unknown> }[] }
function ready(meta: Meta[]) {
  const matches = meta.filter(e => e.key === ENTITY);
  if (!matches.length) return false;
  const entity = matches[0];
  if (matches.length !== 1 || entity.orgUnit || !Array.isArray(entity.fields) || entity.fields.length !== NAVIGATION_SCHEMA.fields.length || NAVIGATION_SCHEMA.fields.some(expected => {
    const actual = entity.fields.filter(f => f.key === expected.key);
    return actual.length !== 1 || actual[0].type !== expected.type || actual[0].config?.required !== true || Object.keys(actual[0].config ?? {}).some(k => k !== "required");
  })) refuse(409, "menu_schema_mismatch", "Navigation storage differs from the reviewed schema. No schema or access rules were changed.");
  return true;
}
export interface NavigationDeps { cos?: CompanyOs; tenant?: keyof typeof TARGETS }
export async function handleStaffNavigation(action: string, req: Request, deps: NavigationDeps = {}): Promise<Response> {
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });
  if (new URL(req.url).search) return json(400, { error: "invalid_menu_request" });
  if (!(req.headers.get("content-type") ?? "").startsWith("application/json")) return json(415, { error: "unsupported_media_type" });
  const token = bearer(req); if (!token) return json(401, { error: "unauthorized" });
  const raw = await readCapped(req, 32 * 1024); if (!raw) return json(413, { error: "too_large" });
  let input: Record<string, unknown>;
  try { const value: unknown = JSON.parse(new TextDecoder().decode(raw)); if (!object(value)) return json(400, { error: "invalid_menu_request" }); input = value; } catch { return json(400, { error: "invalid_menu_request" }); }
  try {
    const cfg = deps.cos ? null : configFromEnv();
    const tenant = deps.tenant ?? cfg?.tenant ?? "between-gigs";
    if (!Object.hasOwn(TARGETS, tenant)) refuse(503, "menu_tenant_unavailable", "Navigation settings are not configured for this tenant.");
    const cos = deps.cos ?? companyOs(cfg!), cred: Credential = { kind: "session", token };
    const me = await cos.me(cred);
    if (!me || me.isSuperAdmin !== true) refuse(403, "super_admin_only", "Only a currently verified superadmin can manage these menus.");
    if (!me.user || !uuid(me.user.id) || typeof me.user.email !== "string" || !me.user.email.trim() || !Array.isArray(me.roleKeys) || me.roleKeys.some(role => typeof role !== "string")) refuse(503, "menu_identity_unavailable", "Your account could not be verified.");
    const verifiedTenant = (me as unknown as { tenant?: { id: string; slug: string } }).tenant;
    if (!verifiedTenant || verifiedTenant.slug !== tenant || verifiedTenant.id !== TARGETS[tenant as keyof typeof TARGETS]) refuse(503, "menu_tenant_unavailable", "The navigation tenant could not be verified.");
    if (!["snapshot", "setup", "save", "repair"].includes(action)) return json(404, { error: "not_found" });
    keys(input, action === "save" ? ["userId", "expected", "menu", "requestId"] : action === "repair" ? ["userId", "keepId", "expected", "requestId"] : action === "snapshot" ? ["userId"] : []);
    const userId = input.userId ?? me.user.id;
    if (!uuid(userId)) refuse(400, "invalid_menu_request", "Choose a valid staff account.");
    const [userResponse, metaResponse] = await Promise.all([cos.call<{ users: StaffUser[] }>(cred, "GET", "/admin/users"), cos.call<{ entities: Meta[] }>(cred, "GET", "/meta/entities")]);
    if (!Array.isArray(userResponse.users) || !Array.isArray(metaResponse.entities)) refuse(503, "menu_store_unavailable", "Navigation settings could not be read.");
    const target = userResponse.users.find(u => u.userId === userId);
    if (!target || !target.memberships.length) refuse(404, "menu_subject_not_found", "This account is no longer a member of this tenant.");
    const eligible = target.memberships.some(m => m.roleKey === "super_admin");
    const membershipIds = target.memberships.map(m => m.membershipId).sort();
    if (membershipIds.length > 100 || membershipIds.some(id => !uuid(id)) || new Set(membershipIds).size !== membershipIds.length) refuse(503, "menu_membership_unavailable", "The staff membership could not be verified.");
    let configured = ready(metaResponse.entities);
    if (action === "setup" && !configured) {
      try { await cos.call(cred, "POST", "/meta/entities", NAVIGATION_SCHEMA); } catch (e) { if (!(e instanceof CompanyOsError && e.status === 409)) throw e; }
      configured = ready((await cos.call<{ entities: Meta[] }>(cred, "GET", "/meta/entities")).entities);
      if (!configured) refuse(409, "menu_setup_incomplete", "Storage setup is incomplete. Refresh before retrying.");
    }
    if (configured) {
      const { roles } = await cos.call<{ roles: StaffRole[] }>(cred, "GET", "/admin/roles");
      if (!Array.isArray(roles) || roles.some(role => role.key !== "super_admin" && role.permissions.some(p => p.entity === ENTITY && p.scope !== "none"))) refuse(409, "menu_storage_not_private", "Navigation storage has unexpected role grants. An owner must review them; this tool does not change access rules.");
      const admin = roles.find(role => role.key === "super_admin");
      if (!admin || ["read", "create", "update", "delete"].some(action => !admin.permissions.some(p => p.entity === ENTITY && p.action === action && p.scope === "all"))) refuse(409, "menu_storage_not_ready", "Navigation storage permissions need owner review.");
    }
    const read = async (): Promise<NavigationSnapshot> => {
      const rows: Row[] = [];
      if (configured && eligible) for (let offset = 0; offset < 5000; offset += 500) {
        const { data } = await cos.call<{ data: Row[] }>(cred, "POST", "/query", { entity: ENTITY, filter: { field: "user", op: "eq", value: userId }, sort: [{ field: "id", dir: "asc" }], limit: 500, offset });
        if (!Array.isArray(data) || data.length > 500) refuse(503, "menu_store_unavailable", "Navigation settings could not be read.");
        rows.push(...data); if (data.length < 500) break;
        if (offset === 4500) refuse(409, "menu_scan_limit", "Too many saved navigation settings. An owner must inspect storage.");
      }
      return { source: "database", store: configured ? "ready" : "missing", currentUserId: me.user.id, target: { userId, email: target.email, name: target.name, eligible }, ...selectConfiguration(rows, userId) };
    };
    const before = await read();
    if (action === "snapshot" || action === "setup") return json(200, { result: before });
    if (!eligible) refuse(409, "menu_subject_unsupported", "This account currently has Gigster menus. Custom menus are supported only for existing superadmin staff; no role or permission will be added.");
    if (!configured) refuse(409, "menu_store_missing", "Set up the reviewed private menu storage before saving.");
    if (!uuid(input.requestId)) refuse(400, "invalid_menu_request", "Provide a unique save request ID.");
    let ops: Record<string, unknown>[];
    let desiredMenu: ReturnType<typeof cleanMenu> | undefined;
    if (action === "save") {
      const menu = cleanMenu(input.menu);
      desiredMenu = menu;
      if (before.conflict) refuse(409, "menu_duplicate_conflict", "Conflicting menu records exist. Choose a record to keep and repair them first.");
      if (input.expected !== null && !revision(input.expected)) refuse(400, "invalid_menu_request", "Provide the saved menu revision.");
      const current = before.record;
      if (current && JSON.stringify(current.menu) === JSON.stringify(menu)) return json(200, { result: before });
      if (input.expected === null ? !!current : !current || current.id !== input.expected.id || current.revision !== input.expected.revision) refuse(409, "menu_changed", "These menus changed. Refresh and compare before saving.");
      const data = { visible_modes: menu.modes, visible_items: menu.items, revision: current ? current.revision + 1 : 0 };
      ops = [current ? { op: "update", entity: ENTITY, id: current.id, data, ifMatch: { field: "revision", value: current.revision } } : { op: "create", entity: ENTITY, data: { user: userId, active: true, schema_version: 1, ...data } }];
    } else {
      if (!before.conflict || !uuid(input.keepId) || !Array.isArray(input.expected) || !input.expected.every(revision)) refuse(400, "invalid_menu_repair", "Choose the record to keep from the current conflict list.");
      if (before.conflicts.length > 200) refuse(409, "menu_repair_limit", "The conflict exceeds the supported atomic batch size. An owner must plan a separate repair.");
      const expected = input.expected;
      if (expected.length !== before.conflicts.length || new Set(expected.map(r => r.id)).size !== expected.length || before.conflicts.some(r => !expected.some(e => e.id === r.id && e.revision === r.revision)) || !before.conflicts.some(r => r.id === input.keepId)) refuse(409, "menu_changed", "The conflict list changed. Refresh before repairing.");
      ops = before.conflicts.map(r => ({ op: "update", entity: ENTITY, id: r.id, data: { ...(r.id === input.keepId ? {} : { active: false }), revision: r.revision + 1 }, ifMatch: { field: "revision", value: r.revision } }));
    }
    await cos.call(cred, "POST", "/batch", { ops, membershipSnapshot: { userId, ids: membershipIds } }, { "Idempotency-Key": "staff_navigation_" + input.requestId });
    const after = await read();
    if (after.conflict || !after.record) refuse(409, "menu_write_needs_review", "A write may have completed, but menu storage now conflicts. Refresh and repair before applying these settings.");
    if (desiredMenu && JSON.stringify(after.configuration) !== JSON.stringify(desiredMenu)) refuse(409, "menu_changed_after_save", "The save completed but another edit changed these menus. Refresh and compare before continuing.");
    if (action === "repair" && after.record.id !== input.keepId) refuse(409, "menu_changed_after_save", "The repaired settings changed again. Refresh before continuing.");
    return json(200, { result: after });
  } catch (e) {
    if (e instanceof Refusal) return json(e.status, { error: e.code, message: e.message });
    if (e instanceof MenuValidationError) return json(409, { error: "menu_values_invalid", message: e.message });
    if (e instanceof CompanyOsError && [401, 403].includes(e.status)) return json(e.status, { error: "unauthorized", message: "Sign in with a current superadmin account." });
    if (e instanceof CompanyOsError && e.status === 409) return json(409, { error: "menu_changed", message: "The save or membership state changed. Refresh before retrying; a previous attempt may already be saved." });
    return json(503, { error: "menu_store_unavailable", message: "Navigation settings are unavailable. A previous write may have completed; refresh before retrying." });
  }
}
