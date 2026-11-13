import { describe, expect, it } from "vitest";
import { companyOs } from "./companyos";
import { handleStaff, cleanPermissions } from "./staff";

const token = "clerk_test_session_abcdefghijkl";
const req = (body: unknown = {}, authenticated = true) => new Request("https://test.example/api/staff/snapshot/", {
  method: "POST", headers: { "content-type": "application/json", ...(authenticated ? { authorization: `Bearer ${token}` } : {}) },
  body: JSON.stringify(body),
});
function fake(superAdmin = true, options: { users?: unknown[]; failRole?: string; alreadySignedUp?: boolean } = {}) {
  const calls: { method: string; path: string; body: unknown }[] = [];
  const cos = companyOs({ url: "http://cos.internal", tenant: "between-gigs", readerToken: "", submitterToken: "", fetch: (async (url, init) => {
    const path = new URL(String(url)).pathname.replace("/t/between-gigs", "");
    calls.push({ method: init?.method ?? "GET", path, body: init?.body ? JSON.parse(String(init.body)) : null });
    if (path === "/invitations" && options.alreadySignedUp) return new Response(JSON.stringify({ error: "already_signed_up" }), { status: 409 });
    if (path === "/admin/users" && init?.method === "POST" && options.failRole && JSON.parse(String(init.body)).roleKey === options.failRole) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403 });
    const body = path === "/me" ? { isSuperAdmin: superAdmin, user: { id: "owner" }, roleKeys: [] }
      : path === "/admin/users" ? { users: options.users ?? [] } : path === "/admin/roles" ? { roles: [{ key: "reviewer", name: "Reviewer", isSystem: false, permissions: [] }, { key: "provider", name: "Gigster", isSystem: false, permissions: [] }, { key: "super_admin", name: "Super admin", isSystem: true, permissions: [] }] }
      : path === "/invitations" ? { url: "https://test.example/join/?ticket=example" } : { ok: true };
    return new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } });
  }) as typeof fetch });
  return { cos, calls };
}
describe("Staff Company OS routes", () => {
  it("requires a session before accessing protected staff data", async () => {
    const f = fake();
    expect((await handleStaff("snapshot", req({}, false), f)).status).toBe(401);
    expect(f.calls).toHaveLength(0);
  });
  it("refuses a Gigster before reading staff or changing memberships", async () => {
    const f = fake(false);
    expect((await handleStaff("addRole", req({ email: "staff@example.test", roleKey: "reviewer" }), f)).status).toBe(403);
    expect(f.calls.map((c) => c.path)).toEqual(["/me"]);
  });
  it("returns the real role catalog and grouped memberships", async () => {
    const f = fake();
    const response = await handleStaff("snapshot", req(), f);
    expect((await response.json()).result.currentUserId).toBe("owner");
    expect(f.calls.map((c) => c.path)).toEqual(["/me", "/admin/users", "/admin/roles"]);
  });
  it("creates only an invitation link and never claims email delivery", async () => {
    const f = fake();
    const response = await handleStaff("invite", req({ email: "staff@example.test", name: "Staff", roleKeys: ["reviewer"] }), { ...f, appUrl: "https://test.example" });
    const result = (await response.json()).result;
    expect(result.url).toContain("/join/");
    expect(result.emailSent).toBe(false);
    expect(f.calls.find((c) => c.path === "/invitations")?.body).toEqual({ email: "staff@example.test", roleKey: "reviewer", redirectUrl: "https://test.example/join/" });
    expect(f.calls.some((c) => c.path.includes("comms"))).toBe(false);
  });
  it("validates permissions before forwarding a write", () => {
    expect(() => cleanPermissions([{ entity: "profile", action: "drop", scope: "all" }])).toThrow();
    expect(cleanPermissions([{ entity: "profile", action: "read", scope: "own" }])).toEqual([{ entity: "profile", action: "read", scope: "own" }]);
  });
  it("preserves a generated link when an additional role cannot be assigned", async () => {
    const f = fake(true, { failRole: "provider" });
    const response = await handleStaff("invite", req({ email: "staff@example.test", name: "Staff", roleKeys: ["reviewer", "provider"] }), { ...f, appUrl: "https://test.example" });
    expect(response.status).toBe(200);
    expect((await response.json()).result).toMatchObject({ url: "https://test.example/join/?ticket=example", emailSent: false, warning: expect.stringContaining("not all requested roles") });
  });
  it("does not discard granted access when a global login has already signed in", async () => {
    const f = fake(true, { alreadySignedUp: true });
    const response = await handleStaff("invite", req({ email: "staff@example.test", name: "Staff", roleKeys: ["reviewer", "provider"] }), { ...f, appUrl: "https://test.example" });
    expect(response.status).toBe(200);
    expect((await response.json()).result).toMatchObject({ roleAdded: true, emailSent: false });
    expect(f.calls.some(call => call.path === "/admin/users" && (call.body as { roleKey?: string })?.roleKey === "provider")).toBe(true);
  });
  it("explains the existing pending multi-staff-role resend limitation without altering roles", async () => {
    const f = fake(true, { users: [{ userId: "pending", email: "staff@example.test", signedUp: false, memberships: [{ roleKey: "reviewer" }, { roleKey: "super_admin" }] }] });
    const response = await handleStaff("invite", req({ email: "staff@example.test", roleKeys: ["reviewer"] }), { ...f, appUrl: "https://test.example" });
    expect(response.status).toBe(409);
    expect((await response.json()).error).toBe("pending_multi_role_invitation");
    expect(f.calls.some(call => call.method !== "GET")).toBe(false);
  });

});
