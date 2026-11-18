import { describe, expect, it } from "vitest";
import { companyOs } from "./companyos";
import { emailHubStatus, testHubEmail } from "./email-hub";
const id = "11111111-1111-4111-8111-111111111111";
function setup(admin = true, templates = [{ id, data: { key: "approved", channel: "email", active: true, subject: "Published", body: "Sample", body_html: "<p>Sample</p>" } }], automations = [{ id: "automation", data: { template: "approved", active: true, event: "profile.reviewed", filter: { to: "published" } } }]) {
  const calls: { path: string; method: string; body: Record<string, unknown>; headers: Headers }[] = [];
  const cos = companyOs({ url: "https://cos.test", tenant: "between-gigs", readerToken: "", submitterToken: "", fetch: (async (url, init) => {
    const path = new URL(String(url)).pathname;
    const body = JSON.parse(String(init?.body ?? "{}"));
    calls.push({ path, method: init?.method ?? "GET", body, headers: new Headers(init?.headers) });
    return Response.json(path.endsWith("/me") ? { isSuperAdmin: admin } : path.endsWith("/query") ? { data: body.entity === "message_template" ? templates : automations } : { data: { enabled: true, status: "queued" } });
  }) as typeof fetch });
  return { ctx: { cos, cred: { kind: "session" as const, token: "owner" }, appUrl: "https://between-gigs.com" }, calls };
}
describe("owner email hub safety", () => {
  it("requires superadmin before reading template data or attempting a test", async () => {
    const f = setup(false);
    await expect(emailHubStatus(f.ctx, [])).rejects.toMatchObject({ status: 403 });
    await expect(testHubEmail(f.ctx, [{ name: "approved", recipient: "a@example.org", requestId: id }])).rejects.toMatchObject({ status: 403 });
    expect(f.calls.every(c => c.path.endsWith("/me"))).toBe(true);
  });
  it("distinguishes enabled content, unverified approval and configured triggers", async () => {
    const f = setup();
    const s = await emailHubStatus(f.ctx, []);
    expect(s.approved).toMatchObject({ lifecycle: "unknown", content: "enabled", usage: "configured", triggers: ["profile.reviewed → published"] });
    expect(s["sign-in-code"]).toMatchObject({ lifecycle: "unknown", usage: "external", content: "not_installed" });
  });
  it("does not hide tenant invitation automations behind a manual-send label", async () => {
    const f = setup(true, [], [{ id: "auto", data: { template: "invite", active: true, event: "owner.configured", filter: { to: "invited" } } }]);
    expect((await emailHubStatus(f.ctx, [])).invite?.usage).toBe("configured");
  });
  it("refuses lists, display names, injection, extra send/content fields and unsupported templates", async () => {
    for (const recipient of ["a@example.org,b@example.org", "a@example.org\nb@example.org", "Name <a@example.org>", "bad", "a@b", "a@example.org;cc@x.org"]) {
      const f = setup();
      await expect(testHubEmail(f.ctx, [{ name: "approved", recipient, requestId: id }])).rejects.toMatchObject({ status: 400 });
      expect(f.calls.some(c => c.method === "POST")).toBe(false);
    }
    for (const extra of [{ mode: "real" }, { html: "x" }, { to: "x@example.org" }]) {
      const f = setup();
      await expect(testHubEmail(f.ctx, [{ name: "approved", recipient: "a@example.org", requestId: id, ...extra }])).rejects.toMatchObject({ status: 400 });
    }
    const f = setup();
    await expect(testHubEmail(f.ctx, [{ name: "diagnostic", recipient: "a@example.org", requestId: id }])).rejects.toMatchObject({ status: 400 });
  });
  it("uses the backend copy and durable replay key; never writes contacts, templates or real comms logs", async () => {
    const f = setup();
    await testHubEmail(f.ctx, [{ name: "approved", recipient: "  A@Example.org  ", requestId: id }]);
    const send = f.calls.at(-1)!;
    expect(send.path).toBe("/t/between-gigs/comms/template-tests");
    expect(send.headers.get("Idempotency-Key")).toBe(`owner-email:${id}`);
    expect(send.body).toEqual({ templateId: id, recipient: "a@example.org", mode: "live", source: { subject: "Published", body: "Sample", bodyHtml: "<p>Sample</p>" } });
    expect(f.calls.filter(c => c.method === "POST").every(c => c.path.endsWith("/query") || c.path.endsWith("/template-tests"))).toBe(true);
  });
});
