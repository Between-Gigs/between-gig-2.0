import { describe, expect, it } from "vitest";
import { companyOs } from "./companyos";
import { handle, type RouteName } from "./routes";

// Owners see who came by invitation and who signed up by themselves (Company OS: admin users carry selfSignedUp).
const COS = "http://cos.internal:4000";
const SESSION = "sess_clerk_cccccccccccccccc";
const T = "2026-11-10T10:00:00.000Z";
const row = (id: string, data: Record<string, unknown>) => ({ id, data, createdAt: T, updatedAt: T });

const persons = [
  row("p-inv", { email: "invited@example.org", name: "invited@example.org", user: "u-inv" }),
  row("p-join", { email: "joined@example.org", name: "Jo Joined", user: "u-join" }),
  row("p-self", { email: "self@example.org", name: "Sam Self", user: "u-self" }),
  row("p-wl", { email: "wait@example.org", name: "Wen Wait", user: "u-wl" }),
];
const users = [
  { userId: "u-inv", email: "invited@example.org", signedUp: false, memberships: [{ roleKey: "provider" }] },
  { userId: "u-join", email: "joined@example.org", signedUp: true, selfSignedUp: false, memberships: [{ roleKey: "provider" }] },
  { userId: "u-self", email: "self@example.org", signedUp: true, selfSignedUp: true, memberships: [{ roleKey: "provider" }] },
  { userId: "u-wl", email: "wait@example.org", signedUp: true, selfSignedUp: true, memberships: [{ roleKey: "provider" }] },
];
const subs = [
  row("s-inv", { email: "invited@example.org", person: "p-inv", answers: {} }),
  row("s-join", { email: "joined@example.org", person: "p-join", answers: {} }),
  row("s-wl", { email: "wait@example.org", person: "p-wl", answers: {} }),
  row("s-none", { email: "nobody@example.org", answers: {} }),
];

function run(name: RouteName, args: unknown[] = []) {
  const fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    const path = url.pathname.replace("/t/between-gigs", "");
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    const reply = (b: unknown) => new Response(JSON.stringify(b), { status: 200, headers: { "content-type": "application/json" } });
    if (path === "/me") return reply({ user: { id: "u1", email: "owner@example.org", name: "Pat" }, roleKeys: [], isSuperAdmin: true });
    if (path === "/admin/users") return reply({ users });
    if (path === "/audit") return reply({ events: [] });
    if (path === "/query") return reply({ data: body.entity === "person" ? persons : body.entity === "form_submission" ? subs : [] });
    return reply({});
  }) as typeof globalThis.fetch;
  const cos = companyOs({ url: COS, tenant: "between-gigs", readerToken: "r".repeat(20), submitterToken: "s".repeat(20), fetch });
  const req = new Request("http://localhost:3000/api/x", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${SESSION}` }, body: JSON.stringify({ args }) });
  return handle(name, req, { cos, appUrl: "http://localhost:3000" }).then(async (r) => (await r.json() as { result: any }).result);
}

describe("self sign-ups on the owner dashboard (live)", () => {
  it("a person's source is self when their login signed up by themselves, else invited", async () => {
    const list = await run("people.list", [{}]);
    const source = Object.fromEntries(list.map((s: any) => [s.person.id, s.person.source]));
    expect(source).toEqual({ "p-inv": "invited", "p-join": "invited", "p-self": "self", "p-wl": "self" });
  });

  it("a self sign-up starts as registered and is never 'invited, not joined'", async () => {
    const list = await run("people.list", [{}]);
    const self = list.find((s: any) => s.person.id === "p-self").person;
    expect(self.status).toBe("registered");
    const d = await run("owners.dashboard");
    expect(d.invitedCounts.invited).toBe(1);
    expect(d.invitedPersonIds).not.toContain("p-self");
    expect(d.invitedPersonIds).not.toContain("p-wl");
  });

  it("the funnel counts self sign-ups apart from invited", async () => {
    const d = await run("owners.dashboard");
    expect(d.funnel.invited).toBe(2);
    expect(d.funnel.signedUp).toBe(2);
    expect(d.signedUpPersonIds.sort()).toEqual(["p-self", "p-wl"]);
  });

  it("people can be filtered by source", async () => {
    const self = await run("people.list", [{ source: "self" }]);
    expect(self.map((s: any) => s.person.id).sort()).toEqual(["p-self", "p-wl"]);
    const invited = await run("people.list", [{ source: "invited" }]);
    expect(invited.map((s: any) => s.person.id).sort()).toEqual(["p-inv", "p-join"]);
  });

  it("a call-sheet person who signed up by themselves shows as registered, source self", async () => {
    const rows = await run("owners.waitlist", [{}]);
    const wl = rows.find((r: any) => r.signup.id === "s-wl");
    expect(wl).toMatchObject({ inviteStatus: "registered", source: "self", personId: "p-wl" });
    expect(rows.find((r: any) => r.signup.id === "s-inv").source).toBe("invited");
  });
});
