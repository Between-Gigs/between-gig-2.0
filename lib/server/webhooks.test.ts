import { describe, expect, it, vi } from "vitest";
import { forwardResend } from "./webhooks";

// Resend's delivery webhook, passed on to Company OS as it came: Company OS checks the Svix signature on the raw body.
const COS = "http://cos.internal:4000";
const hook = (body: string, headers: Record<string, string> = {}) =>
  new Request("http://localhost:3000/webhooks/resend/", {
    method: "POST",
    headers: { "content-type": "application/json", "svix-id": "msg_1", "svix-timestamp": "1793430000", "svix-signature": "v1,abc", "user-agent": "Svix", cookie: "__session=x", ...headers },
    body,
  });

function upstream(status = 204, reply = "") {
  const seen: { url: string; headers: Headers; body: Uint8Array }[] = [];
  const fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    seen.push({ url: String(url), headers: new Headers(init?.headers), body: new Uint8Array(await new Response(init?.body).arrayBuffer()) });
    return new Response(status === 204 ? null : reply, { status });
  }) as typeof globalThis.fetch;
  return { fetch, seen };
}

describe("/webhooks/resend", () => {
  it("forwards the raw body byte for byte with the svix headers and content type, nothing else", async () => {
    const raw = '{"type":"email.delivered","data":{"email_id":"e1"}}  ';
    const u = upstream();
    const res = await forwardResend(hook(raw), { url: COS, fetch: u.fetch });
    expect(res.status).toBe(204);
    expect(u.seen).toHaveLength(1);
    expect(u.seen[0]!.url).toBe(`${COS}/webhooks/messaging/resend`);
    expect(new TextDecoder().decode(u.seen[0]!.body)).toBe(raw);
    expect(Object.fromEntries(u.seen[0]!.headers)).toEqual({ "content-type": "application/json", "svix-id": "msg_1", "svix-timestamp": "1793430000", "svix-signature": "v1,abc" });
  });

  it("passes Company OS's status back (a bad signature is its 401), with no body of its own", async () => {
    const u = upstream(401, '{"error":"invalid_signature"}');
    const res = await forwardResend(hook("{}"), { url: COS, fetch: u.fetch });
    expect(res.status).toBe(401);
    expect(await res.text()).toBe("");
  });

  it("refuses without the svix headers, anything but POST, or a body over 256 KB, before forwarding", async () => {
    const u = upstream();
    expect((await forwardResend(hook("{}", { "svix-signature": "" }), { url: COS, fetch: u.fetch })).status).toBe(400);
    expect((await forwardResend(new Request("http://localhost/webhooks/resend/"), { url: COS, fetch: u.fetch })).status).toBe(405);
    expect((await forwardResend(hook("x".repeat(300_000)), { url: COS, fetch: u.fetch })).status).toBe(413);
    expect(u.seen).toEqual([]);
  });

  it("Company OS unreachable is 502, and the body is never logged", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const info = vi.spyOn(console, "log").mockImplementation(() => {});
    const fetch = (async () => { throw new Error("ECONNREFUSED"); }) as typeof globalThis.fetch;
    const res = await forwardResend(hook('{"secret":"BODY-MARKER"}'), { url: COS, fetch });
    expect(res.status).toBe(502);
    const logged = [...log.mock.calls, ...warn.mock.calls, ...info.mock.calls].flat().map(String).join(" ");
    expect(logged).not.toContain("BODY-MARKER");
    log.mockRestore(); warn.mockRestore(); info.mockRestore();
  });
});
