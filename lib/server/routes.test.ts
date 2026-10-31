import { beforeEach, describe, expect, it } from "vitest";
import { companyOs } from "./companyos";
import { media } from "./media";
import { FUNNEL_LIMIT, ROUTES, handle, handleUpload, resetRateLimit, type RouteName } from "./routes";

// 2.0's server routes against a fake Company OS: which credential each route sends, what it refuses before calling,
// and that no token or Company OS address ever leaves in a response.
const COS = "http://cos.internal:4000";
const READER = "cos_svc_reader_aaaaaaaaaaaa";
const SUBMITTER = "cos_svc_submit_bbbbbbbbbbbb";
const SESSION = "sess_clerk_cccccccccccccccc";
const PERSON = "11111111-1111-4111-8111-111111111111";
const FILE = "22222222-2222-4222-8222-222222222222";

type Call = { method: string; path: string; auth: string; body: unknown };
type Reply = { status?: number; body?: unknown; raw?: Response };
type Responder = (c: Call) => Reply | undefined;

function fake(respond: Responder = () => undefined, { superAdmin = true } = {}) {
  const calls: Call[] = [];
  const fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    const call: Call = { method: init?.method ?? "GET", path: url.pathname.replace("/t/between-gigs", "") + url.search, auth: new Headers(init?.headers).get("authorization") ?? "", body: typeof init?.body === "string" ? JSON.parse(init.body) : undefined };
    if (url.origin !== COS) { calls.push({ ...call, path: url.href }); return respond({ ...call, path: url.href })?.raw ?? new Response("", { status: 200 }); }
    calls.push(call);
    const r = respond(call) ?? (call.path === "/me"
      ? { body: { user: { id: "u1", email: superAdmin ? "owner@between-gigs.example" : "maya@example.org", name: "Pat" }, roleKeys: [], isSuperAdmin: superAdmin } }
      : call.path === "/query" ? { body: { data: [] } }
      : call.path === "/admin/users" ? { body: { users: [] } }
      : call.path.startsWith("/forms/") ? { body: { outcome: "created" } }
      : call.path.startsWith("/audit") ? { body: { events: [] } }
      : { body: {} });
    return r.raw ?? new Response(JSON.stringify(r.body ?? {}), { status: r.status ?? 200, headers: { "content-type": "application/json" } });
  }) as typeof globalThis.fetch;
  const cos = companyOs({ url: COS, tenant: "between-gigs", readerToken: READER, submitterToken: SUBMITTER, fetch });
  return { cos, calls };
}

const req = (body: unknown, { token = SESSION as string | null, ip = "203.0.113.7", type = "application/json" } = {}) =>
  new Request("http://localhost:3000/api/x", {
    method: "POST",
    headers: { "content-type": type, "x-forwarded-for": `${ip}, 10.0.0.1`, ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

const call = async (name: RouteName, args: unknown[], opts?: Parameters<typeof req>[1], f = fake()) => {
  const res = await handle(name, req({ args }, opts), { cos: f.cos, appUrl: "http://localhost:3000" });
  return { res, body: await res.json() as Record<string, unknown>, calls: f.calls };
};

beforeEach(() => resetRateLimit());

describe("credentials", () => {
  it("public pages read with the public_reader identity, never the visitor's session", async () => {
    const { calls } = await call("people.getPublic", ["maya-rios"]);
    expect(calls.map((c) => c.auth)).toEqual([`Bearer ${READER}`]);
    expect((await call("people.similar", ["x"])).calls.every((c) => c.auth === `Bearer ${READER}`)).toBe(true);
  });

  it("public forms post with the submit-only identity", async () => {
    const { res, calls } = await call("funnel.joinWaitlist", [{ email: "Maya@Example.org", zip: "90026", placement: "hero" }], { token: null });
    expect(res.status).toBe(200);
    // The placement follows only a new sign-up, so a repeat (a merge) keeps where the first one came from.
    expect(calls).toEqual([
      { method: "POST", path: "/forms/call_sheet/submissions", auth: `Bearer ${SUBMITTER}`, body: { email: "maya@example.org", answers: { zip: "90026" } } },
      { method: "POST", path: "/forms/call_sheet/submissions", auth: `Bearer ${SUBMITTER}`, body: { email: "maya@example.org", placement: "hero" } },
    ]);
  });

  it("everything else runs as the signed-in person, with the token the browser sent", async () => {
    for (const name of ["people.get", "profiles.getDraft", "profiles.getProfile", "owners.dashboard", "owners.waitlist", "auth.session"] as RouteName[]) {
      const { calls } = await call(name, [PERSON]);
      expect(calls.length, name).toBeGreaterThan(0);
      expect(calls.every((c) => c.auth === `Bearer ${SESSION}`), name).toBe(true);
    }
  });

  it("every route is in the table with an access rule", () => {
    expect(Object.keys(ROUTES).sort()).toEqual([
      "auth.session", "auth.syncExternal", "funnel.addDetails", "funnel.joinWaitlist", "funnel.privacyRequest", "funnel.submitSketch",
      "owners.activity", "owners.approve", "owners.dashboard", "owners.invite", "owners.requestChanges", "owners.reviewQueue", "owners.waitlist",
      "people.get", "people.getPublic", "people.list", "people.similar", "profiles.getDraft", "profiles.getProfile", "profiles.saveDraft", "profiles.submit",
    ]);
    const access = Object.fromEntries(Object.entries(ROUTES).map(([k, v]) => [k, v.access]));
    expect(Object.entries(access).filter(([k]) => k.startsWith("owners.") || k === "people.list").every(([, a]) => a === "owner")).toBe(true);
    expect(Object.entries(access).filter(([k]) => k.startsWith("funnel.")).every(([, a]) => a === "funnel")).toBe(true);
  });
});

describe("signed in or not", () => {
  it("owner and session routes answer 401 without a session, before calling Company OS", async () => {
    for (const name of ["people.list", "people.get", "profiles.saveDraft", "profiles.submit", "owners.dashboard", "owners.approve", "owners.invite"] as RouteName[]) {
      const { res, body, calls } = await call(name, [PERSON], { token: null });
      expect(res.status, name).toBe(401);
      expect(body).toEqual({ error: "unauthorized" });
      expect(calls, name).toEqual([]);
    }
  });

  it("a Gigster on an owner route gets 403 super-admin only, and nothing else is read", async () => {
    for (const name of ["people.list", "owners.dashboard", "owners.waitlist", "owners.approve", "owners.requestChanges", "owners.invite", "owners.activity", "owners.reviewQueue"] as RouteName[]) {
      const f = fake(undefined, { superAdmin: false });
      const { res, body, calls } = await call(name, [PERSON, [{ section: "about", note: "x" }]], undefined, f);
      expect(res.status, name).toBe(403);
      expect(body).toEqual({ error: "super-admin only" });
      expect(calls.map((c) => c.path)).toEqual(["/me"]);
    }
  });

  it("Company OS's refusals pass through with their status and code", async () => {
    const f = fake((c) => (c.path === "/batch" ? { status: 403, body: { error: "forbidden", message: "not your profile", opIndex: 0 } } : undefined), { superAdmin: false });
    f.cos.query = async () => [{ id: "p1", data: { person: PERSON }, createdAt: "", updatedAt: "" }];
    const { res, body } = await call("profiles.saveDraft", [PERSON, {}], undefined, f);
    expect(res.status).toBe(403);
    expect(body).toEqual({ error: "forbidden", message: "not your profile" });
  });

  it("an expired session reads as signed out; an account nobody invited is unknown-email (invite-only, N-05)", async () => {
    const expired = fake((c) => (c.path === "/me" ? { status: 401, body: { error: "unauthorized" } } : undefined));
    expect((await call("auth.session", [], undefined, expired)).body).toEqual({ result: null });
    const stranger = fake((c) => (c.path === "/me" ? { status: 403, body: { error: "account_not_invited" } } : undefined));
    expect((await call("auth.syncExternal", [{ email: "eve@example.org" }], undefined, stranger)).body).toEqual({ result: { ok: false, error: "unknown-email" } });
    expect((await call("auth.syncExternal", [{ email: "eve@example.org" }], { token: null })).body).toEqual({ result: { ok: false, error: "unknown-email" } });
  });

  it("the role comes from Company OS (Super Admin = owner), never from what the browser says", async () => {
    const gigster = fake(undefined, { superAdmin: false });
    const { body } = await call("auth.syncExternal", [{ email: "maya@example.org", role: "owner" }], undefined, gigster);
    expect(body.result).toMatchObject({ ok: true, session: { role: "gigster" } });
  });
});

describe("public forms: honeypot and rate limit (N-08)", () => {
  it("a filled honeypot gets a plausible success and nothing is sent", async () => {
    const { res, body, calls } = await call("funnel.joinWaitlist", [{ email: "bot@example.org", zip: "90026", placement: "hero", website: "http://spam" }], { token: null });
    expect(res.status).toBe(200);
    expect(body.result).toMatchObject({ ok: true, alreadyJoined: false });
    expect(calls).toEqual([]);
    expect((await call("funnel.submitSketch", ["talent", { email: "bot@example.org", website: "x" }], { token: null })).calls).toEqual([]);
    expect((await call("funnel.privacyRequest", ["bot@example.org", "hi", "x"], { token: null })).calls).toEqual([]);
  });

  it(`more than ${FUNNEL_LIMIT.max} a minute from one IP get 429; another IP is fine`, async () => {
    const args = [{ email: "a@example.org", zip: "90026", placement: "hero" }];
    for (let i = 0; i < FUNNEL_LIMIT.max; i++) expect((await call("funnel.joinWaitlist", args, { token: null, ip: "198.51.100.1" })).res.status).toBe(200);
    const over = await call("funnel.joinWaitlist", args, { token: null, ip: "198.51.100.1" });
    expect(over.res.status).toBe(429);
    expect(over.calls).toEqual([]);
    expect((await call("funnel.joinWaitlist", args, { token: null, ip: "198.51.100.2" })).res.status).toBe(200);
  });

  it("only answers the form's own keys: anything else a visitor adds is dropped", async () => {
    const { calls } = await call("funnel.submitSketch", ["buyer", { email: "b@example.org", name: "Bo", budget: "1k", person: "x", submitted_at: "y" }], { token: null });
    expect(calls[0]).toMatchObject({ path: "/forms/storyboard_buyer/submissions", body: { email: "b@example.org", answers: { name: "Bo", budget: "1k" } } });
  });

  it("markup in an answer is passed on as text, never interpreted", async () => {
    const hostile = `"><img src=x onerror=alert(1)><script>alert(2)</script>`;
    const { calls } = await call("funnel.privacyRequest", ["c@example.org", hostile], { token: null });
    expect(calls[0]!.body).toEqual({ email: "c@example.org", answers: { message: hostile } });
  });
});

describe("requests and responses", () => {
  it("JSON only (a plain cross-site form can't post here), POST only, bounded size", async () => {
    const f = fake();
    expect((await handle("funnel.joinWaitlist", req("args=1", { type: "text/plain" }), { cos: f.cos })).status).toBe(415);
    expect((await handle("funnel.joinWaitlist", req("{nope"), { cos: f.cos })).status).toBe(400);
    expect((await handle("funnel.joinWaitlist", new Request("http://localhost/api/x", { method: "GET" }), { cos: f.cos })).status).toBe(405);
    expect((await handle("funnel.joinWaitlist", req({ args: ["x".repeat(300_000)] }), { cos: f.cos })).status).toBe(413);
    expect(f.calls).toEqual([]);
  });

  it("no token and no Company OS address in any response, success or failure", async () => {
    const unreachable = fake(() => { throw new Error(`connect ECONNREFUSED ${COS} ${READER}`); });
    const echoing = fake((c) => (c.path === "/me" ? undefined : { status: 422, body: { error: "profile_incomplete", message: "the profile is missing: photo" } }));
    for (const f of [fake(), unreachable, echoing]) {
      for (const name of Object.keys(ROUTES) as RouteName[]) {
        for (const token of [SESSION, null]) {
          const res = await handle(name, req({ args: [PERSON, { email: "a@example.org", zip: "90026" }] }, { token, ip: `192.0.2.${Math.floor(Math.random() * 250)}` }), { cos: f.cos, appUrl: "http://localhost:3000" });
          const text = await res.text();
          for (const secret of [READER, SUBMITTER, SESSION, COS, "cos.internal"]) expect(text, `${name}: ${text}`).not.toContain(secret);
          expect(res.headers.get("cache-control")).toBe("no-store");
        }
      }
    }
  });

  it("a Company OS that can't be reached is 502 unavailable, with no detail", async () => {
    const f = fake(() => { throw new Error("down"); });
    const { res, body } = await call("people.getPublic", ["maya-rios"], undefined, f);
    expect(res.status).toBe(502);
    expect(body).toEqual({ error: "unavailable" });
  });

  it("a public handle that isn't one is never sent to Company OS", async () => {
    const { body, calls } = await call("people.getPublic", ["../../admin"]);
    expect(body).toEqual({ result: { person: null, profile: null } });
    expect(calls).toEqual([]);
  });
});

describe("photo upload", () => {
  const upload = (body: BodyInit, type: string, token: string | null = SESSION, f = fake()) =>
    handleUpload(new Request(`http://localhost:3000/api/profiles/uploadPhoto?personId=${PERSON}`, { method: "POST", headers: { "content-type": type, ...(token ? { authorization: `Bearer ${token}` } : {}) }, body }), { cos: f.cos });

  it("needs a session, an image and at most 10 MB, before anything is stored", async () => {
    const f = fake();
    expect((await upload(new Uint8Array([0xff, 0xd8, 0xff]), "image/jpeg", null, f)).status).toBe(401);
    expect((await upload("<svg onload=alert(1)>", "text/html", SESSION, f)).status).toBe(415);
    expect((await upload(new Uint8Array(10 * 1024 * 1024 + 1), "image/jpeg", SESSION, f)).status).toBe(413);
    expect((await upload(new Uint8Array([1, 2, 3]), "image/svg+xml", SESSION, f)).status).toBe(422);
    expect(f.calls).toEqual([]);
  });

  it("creates the file as the person, puts the bytes server side, confirms, and answers only the /media link", async () => {
    const f = fake((c) => {
      if (c.path === "/query") return { body: { data: [{ id: "p1", data: { person: PERSON, status: "draft" }, createdAt: "", updatedAt: "" }] } };
      if (c.path === "/files") return { status: 201, body: { file: { id: FILE }, uploadUrl: "https://storage.example/upload/sign/x?token=SECRETUPLOAD" } };
      if (c.path.startsWith("https://storage.example")) return { raw: new Response("{}", { status: 200 }) };
      return undefined;
    });
    const res = await upload(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]), "image/jpeg", SESSION, f);
    const text = await res.text();
    expect(res.status).toBe(200);
    expect(JSON.parse(text)).toEqual({ result: `/media/${FILE}` });
    expect(text).not.toContain("SECRETUPLOAD");
    expect(f.calls.map((c) => [c.method, c.path.replace(/\?.*/, ""), c.auth.slice(0, 12)])).toEqual([
      ["POST", "/query", "Bearer sess_"], ["POST", "/query", "Bearer sess_"], ["POST", "/query", "Bearer sess_"],
      ["POST", "/files", "Bearer sess_"], ["PUT", "https://storage.example/upload/sign/x", ""], ["POST", `/files/${FILE}/confirm`, "Bearer sess_"],
    ]);
    expect(f.calls.find((c) => c.path === "/files")!.body).toMatchObject({ ownerEntity: "profile", ownerId: "p1", kind: "photo", mime: "image/jpeg", sizeBytes: 4 });
  });
});

describe("/media/<id>", () => {
  const get = (id: string, headers: Record<string, string>, f: ReturnType<typeof fake>) => media(new Request(`http://localhost:3000/media/${id}`, { headers }), id, { cos: f.cos });
  const storage = (type = "image/jpeg") => (c: Call): Reply | undefined => {
    if (c.path === `/files/${FILE}/url`) return c.auth === `Bearer ${SESSION}` ? { body: { url: "https://storage.example/private/x?token=PRIVATELINK", expiresIn: 60 } } : { status: 404, body: { error: "not found" } };
    if (c.path === `/public-files/${FILE}/url`) return { body: { url: "https://storage.example/public/x?token=PUBLICLINK", expiresIn: 60 } };
    if (c.path.startsWith("https://storage.example")) return { raw: new Response(new Uint8Array([0xff, 0xd8]), { headers: { "content-type": type } }) };
    return undefined;
  };

  it("the person's own photo through the private link, with their session cookie; private cache, nosniff", async () => {
    const f = fake(storage());
    const res = await get(FILE, { cookie: `theme=dark; __session=${SESSION}` }, f);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/jpeg");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("cache-control")).toBe("private, max-age=60");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(new Uint8Array([0xff, 0xd8]));
    expect(f.calls.map((c) => c.path)).toEqual([`/files/${FILE}/url`, "https://storage.example/private/x?token=PRIVATELINK"]);
  });

  it("a visitor gets an approved profile's photo through the public link (public_reader)", async () => {
    const f = fake(storage());
    const res = await get(FILE, {}, f);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("public, max-age=300");
    expect(f.calls[0]).toMatchObject({ path: `/public-files/${FILE}/url`, auth: `Bearer ${READER}` });
  });

  it("never serves anything but an image type, and never a link", async () => {
    const res = await get(FILE, {}, fake(storage("text/html")));
    expect(res.headers.get("content-type")).toBe("application/octet-stream");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect([...res.headers.values()].join(" ")).not.toMatch(/LINK|storage\.example/);
  });

  it("404 for an id that isn't one, or a file nobody may see", async () => {
    const f = fake((c) => (c.path.includes("/url") ? { status: 404, body: { error: "not found" } } : undefined));
    expect((await get("../../etc/passwd", {}, f)).status).toBe(404);
    expect(f.calls).toEqual([]);
    expect((await get(FILE, { cookie: `__session=${SESSION}` }, f)).status).toBe(404);
  });
});

describe("the questionnaire as sent", () => {
  it("keeps its own fields and types; anything else is the blank answer", async () => {
    const { cleanFields } = await import("./routes");
    const f = cleanFields({ name: "Ana", years: 6, skills: ["Props", 3, { x: 1 }], creditPins: [false, "no"], market: "la", extra: "dropped", about: "a".repeat(5000) });
    expect(f).toMatchObject({ name: "Ana", years: "", skills: ["Props"], creditPins: [false, true], market: "la" });
    expect(f.about).toHaveLength(4000);
    expect(f).not.toHaveProperty("extra");
  });
});
