import { CompanyOsError, companyOs, configFromEnv, type CompanyOs, type Credential } from "./companyos";
import { bearer, failure, readCapped } from "./routes";
import type { StaffInviteResult, StaffPermission, StaffRole, StaffSnapshot, StaffUser } from "@/lib/staff/types";

const key = (value: unknown): value is string => typeof value === "string" && /^[a-z][a-z0-9_]{0,79}$/.test(value);
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const refuse = (message: string): never => { throw new CompanyOsError(400, "invalid_body", message); };
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store", "x-content-type-options": "nosniff" } });

export function cleanPermissions(value: unknown): StaffPermission[] {
  if (!Array.isArray(value) || value.length > 2000) return refuse("Choose valid access rules.");
  return value.map(item => {
    if (!object(item) || !key(item.entity) || typeof item.action !== "string" || !["read", "create", "update", "delete"].includes(item.action) || typeof item.scope !== "string" || !["none", "own", "all"].includes(item.scope)) return refuse("Choose valid access rules.");
    return { entity: item.entity, action: item.action, scope: item.scope } as StaffPermission;
  });
}

let cached: CompanyOs | null = null;
export interface StaffDeps { cos?: CompanyOs; appUrl?: string }

/** Every operation uses the caller's verified superadmin session, never a platform or service identity. */
export async function handleStaff(action: string, request: Request, deps: StaffDeps = {}): Promise<Response> {
  if (request.method !== "POST") return json(405, { error: "method_not_allowed" });
  if (!(request.headers.get("content-type") ?? "").startsWith("application/json")) return json(415, { error: "unsupported_media_type" });
  const token = bearer(request);
  if (!token) return json(401, { error: "unauthorized" });
  const raw = await readCapped(request, 256 * 1024);
  if (!raw) return json(413, { error: "too_large" });
  let input: Record<string, unknown>;
  try { const value: unknown = JSON.parse(new TextDecoder().decode(raw)); if (!object(value)) return json(400, { error: "invalid_body" }); input = value; } catch { return json(400, { error: "invalid_body" }); }
  try {
    const cos = deps.cos ?? (cached ??= companyOs(configFromEnv()));
    const cred: Credential = { kind: "session", token };
    const me = await cos.me(cred);
    if (!me.isSuperAdmin) throw new CompanyOsError(403, "super_admin_only", "Only a superadmin can manage staff and access rules.");
    const users = () => cos.call<{ users: StaffUser[] }>(cred, "GET", "/admin/users");
    const roles = () => cos.call<{ roles: StaffRole[] }>(cred, "GET", "/admin/roles");
    let result: unknown;
    if (action === "snapshot") {
      const [people, access] = await Promise.all([users(), roles()]);
      result = { currentUserId: me.user.id, users: people.users, roles: access.roles } satisfies StaffSnapshot;
    } else if (action === "getPolicies") {
      if (!key(input.roleKey)) refuse("Choose a valid role.");
      result = await cos.call(cred, "GET", "/admin/roles/" + encodeURIComponent(input.roleKey as string) + "/policies");
    } else if (action === "removeRole") {
      if (typeof input.membershipId !== "string" || !/^[a-zA-Z0-9_-]{1,120}$/.test(input.membershipId)) refuse("Choose a valid role assignment.");
      await cos.call(cred, "DELETE", "/admin/memberships/" + encodeURIComponent(input.membershipId as string));
      result = { ok: true };
    } else if (action === "savePermissions") {
      if (!key(input.roleKey) || !Array.isArray(input.permissions) || input.permissions.length > 2000) refuse("Choose a role and valid access rules.");
      const permissions = cleanPermissions(input.permissions);
      const role = (await roles()).roles.find(role => role.key === input.roleKey);
      if (!role) throw new CompanyOsError(404, "role_not_found");
      if (role.isSystem) throw new CompanyOsError(403, "system_role", "Superadmin access cannot be narrowed here.");
      result = await cos.call(cred, "PUT", "/admin/roles/" + encodeURIComponent(input.roleKey as string) + "/permissions", { permissions: permissions.map(item => { const p = item as StaffPermission; return { entity: p.entity, action: p.action, scope: p.scope }; }) });
    } else if (action === "addRole" || action === "invite") {
      const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
      if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || /[\u0000-\u001f\u007f]/.test(email)) refuse("Enter a valid email address.");
      const requested = action === "addRole" ? [input.roleKey] : input.roleKeys;
      if (!Array.isArray(requested) || !requested.length || requested.length > 20 || !requested.every(key)) refuse("Choose at least one valid role.");
      const roleKeys = [...new Set(requested as string[])];
      const available = (await roles()).roles;
      if (roleKeys.some(role => !available.some(item => item.key === role) || role === "public_reader" || role === "form_submitter")) refuse("Choose a staff or Gigster role.");
      const name = typeof input.name === "string" ? input.name.trim() : "";
      if (name.length > 200 || /[\u0000-\u001f\u007f]/.test(name)) refuse("Enter a valid name.");
      if (action === "addRole") {
        result = await cos.call(cred, "POST", "/admin/users", { email, roleKey: roleKeys[0] });
      } else {
        const existing = (await users()).users.find(user => user.email.toLowerCase() === email);
        const held = new Set(existing?.memberships.map(member => member.roleKey) ?? []);
        let invitation: { url?: string; roleAdded?: boolean } = {};
        if (!existing?.signedUp && new Set(existing?.memberships.filter(member => member.roleKey !== "provider").map(member => member.roleKey) ?? []).size > 1) throw new CompanyOsError(409, "pending_multi_role_invitation", "This pending account already has several staff roles. Use its existing invitation link; creating a replacement link requires backend support.");
        if (!existing?.signedUp) {
          let origin: URL;
          try { origin = new URL(deps.appUrl ?? process.env.APP_URL ?? ""); } catch { throw new CompanyOsError(503, "app_url_not_configured"); }
          if (!/^https?:$/.test(origin.protocol) || origin.pathname !== "/") throw new CompanyOsError(503, "app_url_not_configured");
          // Re-invite an existing staff account through its existing role, then add the requested memberships.
          const primary = existing?.memberships.find(member => member.roleKey !== "provider")?.roleKey ?? roleKeys[0]!;
          if (!existing && name) {
            await cos.call(cred, "POST", "/admin/users", { email, name, roleKey: primary });
            held.add(primary);
          }
          try { invitation = await cos.call(cred, "POST", "/invitations", { email, roleKey: primary, redirectUrl: origin.origin + "/join/" }); } catch (error) {
            if (!(error instanceof CompanyOsError && error.status === 409 && error.code === "already_signed_up")) throw error;
            invitation = { roleAdded: true };
          }
          held.add(primary);
        }
        let warning: string | undefined;
        try {
          for (const roleKey of roleKeys) if (!held.has(roleKey)) { await cos.call(cred, "POST", "/admin/users", { email, ...(name ? { name } : {}), roleKey }); held.add(roleKey); }
        } catch (error) {
          if (invitation.url) warning = "The invitation link is ready, but not all requested roles could be assigned. Check the current role badges and add any missing roles with Manage roles.";
          else if (error instanceof CompanyOsError) throw new CompanyOsError(error.status, error.code, "Some roles may already be assigned. Refresh the staff list to check before trying again.");
          else throw error;
        }
        result = { ...invitation, roleAdded: true, emailSent: false, ...(warning ? { warning } : {}) } satisfies StaffInviteResult;
      }
    } else return json(404, { error: "not_found" });
    return json(200, { result: result ?? { ok: true } });
  } catch (error) { return failure(error); }
}
