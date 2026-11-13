import { CompanyOsError, companyOs, configFromEnv, type CompanyOs, type Credential } from "./companyos";
import { bearer, failure, readCapped } from "./routes";
import type { StaffRole, StaffUser, StaffPermission } from "@/lib/staff/types";

export const STAFF_ACTIONS = ["snapshot", "invite", "addRole", "removeRole", "savePermissions", "getPolicies"] as const;
export type StaffActionName = typeof STAFF_ACTIONS[number];
type Input = Record<string, unknown>;
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), {
  status, headers: { "content-type": "application/json", "cache-control": "no-store", "x-content-type-options": "nosniff" },
});
const bad = (message: string): never => { throw new CompanyOsError(400, "invalid_body", message); };
const text = (value: unknown, label: string, max = 100): string => {
  if (typeof value !== "string" || !value.trim() || value.length > max || /[\u0000-\u001f\u007f]/.test(value)) return bad(`Invalid ${label}.`);
  return value.trim();
};
const roleKey = (value: unknown) => {
  const key = text(value, "role", 100);
  if (!/^[a-z0-9_]+$/.test(key)) return bad("Invalid role.");
  return key;
};
const email = (value: unknown) => {
  const e = text(value, "email", 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return bad("Enter a valid email address.");
  return e;
};
const uuid = (value: unknown) => {
  const id = text(value, "membership", 36);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return bad("Invalid membership.");
  return id;
};

export function cleanPermissions(value: unknown): StaffPermission[] {
  if (!Array.isArray(value) || value.length > 2000) return bad("Invalid permissions.");
  return value.map((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return bad("Invalid permission.");
    const p = entry as Input;
    const entity = roleKey(p.entity);
    if (!["read", "create", "update", "delete"].includes(String(p.action)) || !["all", "own", "none"].includes(String(p.scope))) return bad("Invalid permission.");
    return { entity, action: p.action, scope: p.scope } as StaffPermission;
  });
}

export async function handleStaff(action: string, req: Request, deps: { cos?: CompanyOs; appUrl?: string } = {}): Promise<Response> {
  if (!(STAFF_ACTIONS as readonly string[]).includes(action)) return json(404, { error: "not_found" });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });
  if (!(req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return json(415, { error: "unsupported_media_type" });
  const token = bearer(req);
  if (!token) return json(401, { error: "unauthorized" });
  const raw = await readCapped(req, 256 * 1024);
  if (!raw) return json(413, { error: "too_large" });
  let input: Input;
  try {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(raw) || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return json(400, { error: "invalid_body" });
    input = parsed as Input;
  } catch { return json(400, { error: "invalid_body" }); }
  try {
    const cos = deps.cos ?? companyOs(configFromEnv());
    const cred: Credential = { kind: "session", token };
    const me = await cos.me(cred);
    if (!me.isSuperAdmin) throw new CompanyOsError(403, "super-admin only");
    let result: unknown;
    if (action === "snapshot") {
      const [users, roles] = await Promise.all([
        cos.call<{ users: StaffUser[] }>(cred, "GET", "/admin/users"),
        cos.call<{ roles: StaffRole[] }>(cred, "GET", "/admin/roles"),
      ]);
      result = { currentUserId: me.user.id, users: users.users, roles: roles.roles };
    } else if (action === "addRole") {
      result = await cos.call(cred, "POST", "/admin/users", { email: email(input.email), roleKey: roleKey(input.roleKey) });
    } else if (action === "removeRole") {
      result = await cos.call(cred, "DELETE", `/admin/memberships/${uuid(input.membershipId)}`);
    } else if (action === "savePermissions") {
      const key = roleKey(input.roleKey);
      const permissions = cleanPermissions(input.permissions);
      result = await cos.call(cred, "PUT", `/admin/roles/${encodeURIComponent(key)}/permissions`, { permissions });
    } else if (action === "getPolicies") {
      result = await cos.call(cred, "GET", `/admin/roles/${encodeURIComponent(roleKey(input.roleKey))}/policies`);
    } else {
      const address = email(input.email);
      if (!Array.isArray(input.roleKeys) || !input.roleKeys.length || input.roleKeys.length > 20) return bad("Choose at least one role.");
      const keys = [...new Set(input.roleKeys.map(roleKey))];
      const name = input.name == null || input.name === "" ? undefined : text(input.name, "name", 200);
      const [users, roles] = await Promise.all([
        cos.call<{ users: StaffUser[] }>(cred, "GET", "/admin/users"),
        cos.call<{ roles: StaffRole[] }>(cred, "GET", "/admin/roles"),
      ]);
      if (keys.some((key) => !roles.roles.some((role) => role.key === key))) return bad("That role is no longer available.");
      const user = users.users.find((u) => u.email.toLowerCase() === address);
      const held = new Set((user?.memberships ?? []).map((m) => m.roleKey));
      if (user?.signedUp) {
        for (const key of keys) if (!held.has(key)) {
          await cos.call(cred, "POST", "/admin/users", { email: address, roleKey: key, ...(name ? { name } : {}) });
        }
        result = { roleAdded: keys.some((key) => !held.has(key)), emailSent: false };
      } else {
        // Invitations deliberately reject adding a different staff role during a resend.
        // Reuse a held staff role for the invitation; add requested extra memberships afterwards.
        const primary = (user?.memberships ?? []).find((m) => m.roleKey !== "provider")?.roleKey
          ?? keys.find((key) => key !== "provider") ?? keys[0]!;
        const appUrl = (deps.appUrl ?? process.env.APP_URL ?? "").replace(/\/+$/, "");
        if (!/^https?:\/\//.test(appUrl)) throw new CompanyOsError(503, "app_url_not_configured");
        const invitation = await cos.call<{ url?: string; roleAdded?: boolean }>(cred, "POST", "/invitations", {
          email: address, roleKey: primary, redirectUrl: `${appUrl}/join/`,
        });
        for (const key of keys) if (key !== primary && !held.has(key)) {
          await cos.call(cred, "POST", "/admin/users", { email: address, roleKey: key, ...(name ? { name } : {}) });
        }
        // Link creation only: the provider is called with notify:false. Do not imply an email was sent.
        result = { ...(invitation.url ? { url: invitation.url } : {}), roleAdded: invitation.roleAdded, emailSent: false };
      }
    }
    return json(200, { result: result ?? null });
  } catch (error) { return failure(error, "owner"); }
}
