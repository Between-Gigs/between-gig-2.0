import { beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => vi.resetModules());

describe("sample staff management", () => {
  it("keeps simultaneous roles, removes only the selected role, and protects the last admin", async () => {
    const { sampleStaff } = await import("./sample");
    const start = await sampleStaff.snapshot();
    const member = start.users.find(user => user.userId === "sample-staff")!;
    await sampleStaff.addRole({ email: member.email, roleKey: "provider" });
    let updated = (await sampleStaff.snapshot()).users.find(user => user.userId === member.userId)!;
    expect(updated.memberships.map(role => role.roleKey).sort()).toEqual(["provider", "reviewer"]);
    await sampleStaff.removeRole({ membershipId: updated.memberships.find(role => role.roleKey === "reviewer")!.membershipId });
    updated = (await sampleStaff.snapshot()).users.find(user => user.userId === member.userId)!;
    expect(updated.memberships.map(role => role.roleKey)).toEqual(["provider"]);
    const owner = start.users.find(user => user.userId === start.currentUserId)!;
    await expect(sampleStaff.removeRole({ membershipId: owner.memberships.find(role => role.roleKey === "super_admin")!.membershipId })).rejects.toThrow(/super admin/);
  });

  it("changes one permission without discarding other access and never claims email delivery", async () => {
    const { sampleStaff } = await import("./sample");
    await sampleStaff.savePermissions({ roleKey: "reviewer", permissions: [{ entity: "profile", action: "update", scope: "none" }] });
    const role = (await sampleStaff.snapshot()).roles.find(role => role.key === "reviewer")!;
    expect(role.permissions).toContainEqual({ entity: "profile", action: "read", scope: "all" });
    expect(role.permissions.some(permission => permission.entity === "profile" && permission.action === "update")).toBe(false);
    expect(await sampleStaff.invite({ email: "new@example.test", name: "New staff", roleKeys: ["provider", "reviewer"] })).toEqual({ emailSent: false });
    const person = (await sampleStaff.snapshot()).users.find(user => user.email === "new@example.test")!;
    expect(person.memberships.map(role => role.roleKey).sort()).toEqual(["provider", "reviewer"]);
  });
});
