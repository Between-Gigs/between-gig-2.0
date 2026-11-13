import { markArea } from "@/lib/split-area";
import { SAMPLE_OWNER } from "@/lib/data/fields";

import type { StaffAction, StaffGateway, StaffMembership, StaffPermission, StaffScope, StaffSnapshot } from "./types";
export type * from "./types";

markArea("bg-split:sample");

const KEY = "bg2-staff-sample-v1";
const actions: StaffAction[] = ["read", "create", "update", "delete"];
const permission = (entity: string, scope: StaffScope): StaffPermission[] => actions.map((action) => ({ entity, action, scope }));
const copy = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const member = (userId: string, roleKey: string, roleName: string): StaffMembership => ({ membershipId: userId + ":" + roleKey, roleKey, roleName });
const fresh = (): StaffSnapshot => ({
  currentUserId: "sample-owner",
  roles: [
    { key: "super_admin", name: "Super admin", isSystem: true, permissions: [...permission("person", "all"), ...permission("profile", "all")], capabilities: ["manage_staff", "review_profiles"] },
    { key: "provider", name: "Gigster", isSystem: false, permissions: [...permission("person", "own"), ...permission("profile", "own")], capabilities: [] },
    { key: "reviewer", name: "Reviewer", isSystem: false, permissions: [{ entity: "person", action: "read", scope: "all" }, { entity: "profile", action: "read", scope: "all" }, { entity: "profile", action: "update", scope: "all" }], capabilities: ["review_profiles"] },
  ],
  users: [
    { userId: "sample-owner", ...SAMPLE_OWNER, signedUp: true, memberships: [member("sample-owner", "super_admin", "Super admin"), member("sample-owner", "provider", "Gigster")] },
    { userId: "sample-reviewer", email: "reviewer@between-gigs.example", name: "Reviewer (sample)", signedUp: true, memberships: [member("sample-reviewer", "reviewer", "Reviewer"), member("sample-reviewer", "provider", "Gigster")] },
    { userId: "sample-staff", email: "staff@between-gigs.example", name: "Staff (sample)", signedUp: false, memberships: [member("sample-staff", "reviewer", "Reviewer")] },
  ],
});
let memory: StaffSnapshot | null = null;
function load() {
  try { const raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw) as StaffSnapshot; } catch { /* memory fallback */ }
  return memory ?? fresh();
}
function save(state: StaffSnapshot) {
  memory = copy(state);
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* private browser */ }
}
function roleIn(state: StaffSnapshot, key: string) {
  const role = state.roles.find((r) => r.key === key);
  if (!role) throw new Error("That role is no longer available. Refresh and try again.");
  return role;
}

/** Fictional browser-only controls. No Company OS permission or invitation is changed. */
export const sampleStaff: StaffGateway = {
  async snapshot() { return copy(load()); },
  async invite(input) {
    const state = load();
    const email = input.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
    if (!input.roleKeys.length) throw new Error("Choose at least one role.");
    const roles = input.roleKeys.map((key) => roleIn(state, key));
    let user = state.users.find((u) => u.email.toLowerCase() === email);
    if (!user) {
      user = { userId: "sample-" + Date.now().toString(36), email, name: input.name.trim(), signedUp: false, memberships: [] };
      state.users.push(user);
    }
    for (const role of roles) if (!user.memberships.some((m) => m.roleKey === role.key)) user.memberships.push(member(user.userId, role.key, role.name));
    save(state);
    return { emailSent: false };
  },
  async addRole(input) {
    const state = load();
    const user = state.users.find((u) => u.email === input.email);
    if (!user) throw new Error("That staff member no longer exists. Refresh and try again.");
    const role = roleIn(state, input.roleKey);
    if (!user.memberships.some((m) => m.roleKey === role.key)) user.memberships.push(member(user.userId, role.key, role.name));
    save(state);
  },
  async removeRole(input) {
    const state = load();
    const user = state.users.find((u) => u.memberships.some((m) => m.membershipId === input.membershipId));
    const membership = user?.memberships.find((m) => m.membershipId === input.membershipId);
    if (!user || !membership) throw new Error("That role assignment no longer exists.");
    if (membership.roleKey === "super_admin" && state.users.filter((u) => u.memberships.some((m) => m.roleKey === "super_admin")).length <= 1) throw new Error("Keep at least one super admin.");
    user.memberships = user.memberships.filter((m) => m.membershipId !== input.membershipId);
    save(state);
  },
  async savePermissions(input) {
    const state = load();
    const role = roleIn(state, input.roleKey);
    if (role.isSystem) throw new Error("Super admin access is managed by the platform.");
    for (const next of input.permissions) {
      role.permissions = role.permissions.filter((p) => !(p.entity === next.entity && p.action === next.action));
      if (next.scope !== "none") role.permissions.push(copy(next));
    }
    save(state);
  },
  async getPolicies() { return { policies: [] }; },
};
