import { describe, expect, it } from "vitest";
import { companyOs } from "./companyos";
import { handle } from "./routes";
const configured = {
  enabled: true,
  recipient: "jmassion@gmail.com",
  sender: "hello@between-gigs.com",
  receipt: null,
};
function setup(admin = true, status: typeof configured & { authorization?: string; templateSha256?: string; originalRequestId?: string } = configured) {
  const calls: { path: string; method: string; body: unknown }[] = [];
  const cos = companyOs({
    url: "http://cos.internal",
    tenant: "between-gigs",
    readerToken: "",
    submitterToken: "",
    fetch: (async (url, init) => {
      const path = new URL(String(url)).pathname;
      calls.push({
        path,
        method: init?.method ?? "GET",
        body: init?.body ? JSON.parse(String(init.body)) : null,
      });
      const result = path.endsWith("/me")
        ? { isSuperAdmin: admin }
        : init?.method === "POST"
          ? {
              data: {
                ...status,
                receipt: { requestId: "request", status: "queued" },
              },
            }
          : { data: status };
      return new Response(JSON.stringify(result));
    }) as typeof fetch,
  });
  const run = (
    name: "emails.sendDiagnostic" | "emails.diagnosticStatus",
    args: unknown[] = [],
    token = "session-token",
  ) =>
    handle(
      name,
      new Request("https://between-gigs.com/api/emails/sendDiagnostic/", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ args }),
      }),
      { cos, appUrl: "https://between-gigs.com" },
    );
  return { calls, run };
}
describe("site diagnostic email boundary", () => {
  it("rejects unauthenticated, non-owner and hostile envelope/HTML requests", async () => {
    const f = setup();
    expect((await f.run("emails.sendDiagnostic", [], "")).status).toBe(401);
    expect(f.calls).toHaveLength(0);
    expect(
      (
        await f.run("emails.sendDiagnostic", [
          { to: "other@example.com", html: "<p>x</p>", cc: ["x@y.com"] },
        ])
      ).status,
    ).toBe(400);
    expect(f.calls).toHaveLength(0);
    const member = setup(false);
    expect((await member.run("emails.sendDiagnostic")).status).toBe(403);
    expect(member.calls).toHaveLength(1);
  });
  it("pins the recipient and sender on the server and submits no browser content", async () => {
    const f = setup();
    expect((await f.run("emails.sendDiagnostic")).status).toBe(200);
    expect(f.calls.at(-1)).toEqual({
      path: "/t/between-gigs/comms/diagnostic",
      method: "POST",
      body: {},
    });
    for (const patch of [
      { recipient: "other@example.com" },
      { sender: "other@between-gigs.com" },
    ]) {
      const wrong = setup(true, { ...configured, ...patch });
      expect((await wrong.run("emails.sendDiagnostic")).status).toBe(409);
      expect(wrong.calls.some((c) => c.method === "POST")).toBe(false);
    }
  });
});


describe("revised diagnostic authority", () => {
  const revised = { ...configured, authorization: "revised", originalRequestId: "3632e9c4-b3ac-476b-a3f1-471bdb8304c4", templateSha256: "7c25145b910f881b85da101a0b2cb6cc24e4d6e34254a40998fa3b2eb67582ad" };
  it("pins the exact revised template and original request before the empty site POST", async () => {
    const good = setup(true,revised);
    expect((await good.run("emails.sendDiagnostic")).status).toBe(200);
    expect(good.calls.at(-1)?.body).toEqual({});
    for(const patch of [{templateSha256:"other"},{originalRequestId:"other"},{authorization:"third"}]) {
      const bad = setup(true,{...revised,...patch});
      expect((await bad.run("emails.sendDiagnostic")).status).toBe(409);
      expect(bad.calls.some(c=>c.method==="POST")).toBe(false);
    }
  });
});
