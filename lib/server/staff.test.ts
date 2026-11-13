import { describe, expect, it } from "vitest";
import { companyOs } from "./companyos";
import { handleStaff, cleanPermissions } from "./staff";

const token = "clerk_test_session_abcdefghijkl";
const req = (body: unknown = {}, authenticated = true) => new Request("https://test.example/api/staff/snapshot/", {
  method: "POST", headers: { "content-type": "application/json", ...(authenticated ? { authorization: `Bearer ${token}` } : {}) },
  body: JSON.stringify(body),
});
function fake(superAdmin = true) {
  const calls: { method: string; path: string; body: unknown }[] = [];
  const cos = companyOs({ url: "http://cos.internal", tenant: "between-gigs", readerToken: "", submitterToken: "", fetch: (async (url, init) => {
    const path = new URL(String(url)).pathname.replace("/t/between-gigs", "");
    calls.push({ method: init?.method ?? "GET", path, body: init?.body ? JSON.parse(String(init.body)) : null });
    const body = path === "/me" ? { isSuperAdmin: superAdmin, user: { id: "owner" }, roleKeys: [] }
      : path === "/admin/users" ? { users: [] } : path === "/admin/roles" ? { roles: [{ key: "reviewer", name: "Reviewer", isSystem: false, permissions: [] }] }
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
});
