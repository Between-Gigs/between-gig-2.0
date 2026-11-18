import { describe, expect, it } from "vitest";
import { companyOs } from "./companyos";
import { manualStatus, releaseVersion, previewReal, sendReal, realReceipt } from "./manual-emails";
const uuid = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const hash = "a".repeat(64);
const binding = { templateKey: "approved", recipient: "a@example.org", contextId: uuid, eventId: uuid, releaseId: uuid, fingerprint: hash };
function setup(admin = true) {
  const calls: { path: string; method: string; body: unknown; headers: Headers }[] = [];
  const cos = companyOs({ url: "https://cos.test", tenant: "between-gigs", readerToken: "", submitterToken: "", fetch: (async (url, init) => {
    const u = new URL(String(url));
    calls.push({ path: u.pathname + u.search, method: init?.method ?? "GET", body: init?.body ? JSON.parse(String(init.body)) : null, headers: new Headers(init?.headers) });
    return Response.json(u.pathname.endsWith("/me") ? { isSuperAdmin: admin } : { data: u.pathname.endsWith("/comms/template-releases") && init?.method === "GET" ? { supported: true, templateId: uuid, sourceHash: hash, current: null, releases: [] } : { requestId: uuid, status: "queued" } });
  }) as typeof fetch });
  return { ctx: { cos, cred: { kind: "session" as const, token: "owner" }, appUrl: "https://between-gigs.com" }, calls };
}
describe("manual email gateway boundaries", () => {
  it("requires actual superadmin before every read or write", async () => {
    for (const [fn, args] of [[manualStatus,["approved"]],[releaseVersion,[{name:"approved",action:"draft",templateId:uuid,sourceHash:hash}]],[previewReal,[{name:"approved",recipient:"a@example.org"}]],[sendReal,[{name:"approved",requestId:uuid,binding}]],[realReceipt,[{name:"approved",requestId:uuid}]]] as const) {
      const f=setup(false); await expect(fn(f.ctx,[...args])).rejects.toMatchObject({status:403}); expect(f.calls).toHaveLength(1);
    }
  });
  it("binds stored-version actions to the known registry template and refuses raw content", async () => {
    const f=setup();
    await releaseVersion(f.ctx,[{name:"approved",action:"draft",templateId:uuid,sourceHash:hash}]);
    expect(f.calls.at(-1)?.body).toEqual({action:"draft",templateId:uuid,sourceHash:hash});
    for(const patch of [{html:"<p>Browser</p>"},{sender:"x@example.org"},{templateId:other}]) {
      const g=setup(); await expect(releaseVersion(g.ctx,[{name:"approved",action:"draft",templateId:uuid,sourceHash:hash,...patch}])).rejects.toMatchObject({status:400});
      expect(g.calls.some(c=>c.method==="POST")).toBe(false);
    }
  });
  it("refuses unknown templates, real sign-in/invite shortcuts and list/display-name recipients", async () => {
    for(const name of ["__proto__","sign-in-code","invite","welcome","coming-soon"]) {
      const f=setup();await expect(previewReal(f.ctx,[{name,recipient:"a@example.org"}])).rejects.toMatchObject({status:400});
    }
    for(const recipient of ["a@example.org,b@example.org","Name <a@example.org>","a@example.org\nb@example.org"]) {
      const f=setup();await expect(previewReal(f.ctx,[{name:"approved",recipient}])).rejects.toMatchObject({status:400});expect(f.calls.some(c=>c.method==="POST")).toBe(false);
    }
  });
  it("normalizes preflight input, preserves the exact backend-owned send binding, and uses a valid request key", async () => {
    const f=setup();await previewReal(f.ctx,[{name:"profile-submitted",recipient:"  A@Example.org  "}]);
    expect(f.calls.at(-1)?.body).toEqual({templateKey:"profile_submitted",recipient:"a@example.org"});
    f.calls.length=0;
    await sendReal(f.ctx,[{name:"approved",requestId:uuid,binding}]);
    expect(f.calls).toHaveLength(2); // owner read + dedicated command only; never re-preview on uncertain retry
    expect(f.calls.at(-1)?.path).toBe("/t/between-gigs/comms/manual-sends");
    expect(f.calls.at(-1)?.body).toEqual({requestId:uuid,binding});
    expect(f.calls.at(-1)?.headers.get("Idempotency-Key")).toBe(`manual-email_${uuid}`);
    for(const bad of [{...binding,templateKey:"changes_requested"},{...binding,recipient:"Other <a@example.org>"},{...binding,body:"forged"}]) {
      const g=setup();await expect(sendReal(g.ctx,[{name:"approved",requestId:uuid,binding:bad}])).rejects.toMatchObject({status:400});expect(g.calls.some(c=>c.method==="POST")).toBe(false);
    }
  });
  it("reads receipt and version status only via fixed tenant-scoped backend paths", async () => {
    const f=setup();await manualStatus(f.ctx,["profile-submitted"]);expect(f.calls.at(-1)?.path).toBe("/t/between-gigs/comms/template-releases?templateKey=profile_submitted");
    await realReceipt(f.ctx,[{name:"approved",requestId:uuid}]);expect(f.calls.at(-1)?.path).toBe(`/t/between-gigs/comms/manual-sends?requestId=${uuid}`);
  });
});
