export type StaffAction = "read" | "create" | "update" | "delete";
export type StaffScope = "none" | "own" | "all";
export interface StaffPermission { entity: string; action: StaffAction; scope: StaffScope }
export interface StaffMembership { membershipId: string; roleKey: string; roleName: string; orgUnit?: string | null }
export interface StaffUser { userId: string; email: string; name?: string | null; signedUp: boolean; memberships: StaffMembership[] }
export interface StaffRole { key: string; name: string; isSystem: boolean; permissions: StaffPermission[]; capabilities?: string[] }
export interface StaffSnapshot { currentUserId: string; users: StaffUser[]; roles: StaffRole[] }
export interface StaffInviteResult { url?: string; roleAdded?: boolean; emailSent?: boolean; warning?: string }
export interface StaffGateway {
  snapshot(): Promise<StaffSnapshot>;
  invite(input: { email: string; name: string; roleKeys: string[] }): Promise<StaffInviteResult>;
  addRole(input: { email: string; roleKey: string }): Promise<unknown>;
  removeRole(input: { membershipId: string }): Promise<unknown>;
  savePermissions(input: { roleKey: string; permissions: StaffPermission[] }): Promise<unknown>;
  getPolicies?(roleKey: string): Promise<unknown>;
}

