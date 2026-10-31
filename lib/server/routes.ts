/*
 * 2.0's server routes, one per DataSource method (app/api/<group>/<method>/route.server.ts, each one line; `*.server.ts` files are in the server build only). This table is
 * where each method gets its credential, in one place to audit:
 * - "optional": the person's session if there is one (who is signed in);
 * - "session": the person's session, or 401;
 * - "owner": the person's session, or 401; a Gigster gets Company OS's 403 (super-admin only);
 * - "public": the public_reader identity, never the visitor's session;
 * - "funnel": the submit-only identity, behind a honeypot and a per-IP rate limit (N-08).
 * The browser sends its Clerk session token as `Authorization: Bearer` (lib/data/api.ts); a header, not a cookie, so
 * another site can't make these calls on someone's behalf. Responses carry results and Company OS's refusal codes only.
 */
import type { PeopleQuery, ProfileFields, ReviewNoteInput, SketchKind, WaitlistQuery } from "@/lib/data/types";
import { randomBytes } from "node:crypto";
import { blankFields } from "@/lib/data/seed";
import { CompanyOsError, companyOs, configFromEnv, type CompanyOs, type Credential } from "./companyos";
import * as gigs from "./gigs";

type Access = "optional" | "session" | "owner" | "public" | "funnel";
type Args = unknown[];

interface RouteDef {
  access: Access;
  run(ctx: gigs.Ctx, args: Args, req: Request): Promise<unknown>;
  /** Funnel routes: the honeypot's value in these arguments (a field people never see, so only bots fill it). */
  honeypot?(args: Args): unknown;
}

const s = (v: unknown) => (typeof v === "string" ? v : "");
const o = <T,>(v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? v : {}) as T;
const ids = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const n = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);

/** The questionnaire as sent, kept to its own fields and types (anything else falls back to the blank answer). */
export function cleanFields(v: unknown): ProfileFields {
  const input = o<Record<string, unknown>>(v);
  const out = blankFields() as unknown as Record<string, unknown>;
  for (const [k, d] of Object.entries(out)) {
    const x = input[k];
    if (typeof d === "string" && typeof x === "string") out[k] = x.slice(0, 4000);
    else if (Array.isArray(d) && Array.isArray(x)) out[k] = x.filter((e): e is string => typeof e === "string").slice(0, 50).map((e) => e.slice(0, 400));
  }
  if (Array.isArray(input.creditPins)) out.creditPins = input.creditPins.slice(0, 50).map((e) => e !== false);
  return out as unknown as ProfileFields;
}

export const ROUTES = {
  "auth.session": { access: "optional", run: (ctx) => (ctx.cred.kind === "session" ? gigs.session(ctx) : Promise.resolve(null)) },
  "auth.syncExternal": { access: "optional", run: (ctx) => (ctx.cred.kind === "session" ? gigs.syncExternal(ctx) : Promise.resolve({ ok: false, error: "unknown-email" })) },

  "people.list": { access: "owner", run: (ctx, [q]) => gigs.listPeople(ctx, o<PeopleQuery>(q)) },
  "people.get": { access: "session", run: (ctx, [id]) => gigs.getPerson(ctx, s(id)) },
  "people.getPublic": { access: "public", run: (ctx, [slug]) => gigs.getPublic(ctx, s(slug)) },
  "people.similar": { access: "public", run: (ctx, [id, limit]) => gigs.similar(ctx, s(id), n(limit, 3)) },

  "profiles.getDraft": { access: "session", run: (ctx, [id]) => gigs.getDraft(ctx, s(id)) },
  "profiles.saveDraft": { access: "session", run: (ctx, [id, fields]) => gigs.saveDraft(ctx, s(id), cleanFields(fields)) },
  "profiles.submit": { access: "session", run: (ctx, [id]) => gigs.submit(ctx, s(id)) },
  "profiles.getProfile": { access: "session", run: (ctx, [id]) => gigs.getProfile(ctx, s(id)) },

  "funnel.joinWaitlist": {
    access: "funnel",
    honeypot: ([input]) => o<{ website?: unknown }>(input).website,
    run: (ctx, [input]) => {
      const i = o<Record<string, unknown>>(input);
      return gigs.joinWaitlist(ctx, { email: s(i.email), zip: s(i.zip), category: s(i.category), placement: s(i.placement) });
    },
  },
  "funnel.addDetails": {
    access: "funnel",
    honeypot: ([, input]) => o<{ website?: unknown }>(input).website,
    run: (ctx, [id, input]) => { const i = o<Record<string, unknown>>(input); return gigs.addDetails(ctx, s(id), { category: s(i.category), details: s(i.details) }); },
  },
  "funnel.submitSketch": {
    access: "funnel",
    honeypot: ([, answers]) => o<{ website?: unknown }>(answers).website,
    run: (ctx, [kind, answers]) => gigs.submitSketch(ctx, s(kind) as SketchKind, o<Record<string, string>>(answers)),
  },
  "funnel.privacyRequest": {
    access: "funnel",
    honeypot: ([, , website]) => website,
    run: (ctx, [email, message]) => gigs.privacyRequest(ctx, s(email), s(message)),
  },

  "owners.dashboard": { access: "owner", run: (ctx) => gigs.dashboard(ctx) },
  "owners.activity": { access: "owner", run: (ctx, [limit]) => gigs.activity(ctx, n(limit, 50)) },
  "owners.reviewQueue": { access: "owner", run: (ctx) => gigs.reviewQueue(ctx) },
  "owners.approve": { access: "owner", run: (ctx, [id]) => gigs.approve(ctx, s(id)) },
  "owners.requestChanges": { access: "owner", run: (ctx, [id, notes]) => gigs.requestChanges(ctx, s(id), (Array.isArray(notes) ? notes : []) as ReviewNoteInput[]) },
  "owners.waitlist": { access: "owner", run: (ctx, [q]) => gigs.waitlist(ctx, o<WaitlistQuery>(q)) },
  "owners.invite": { access: "owner", run: (ctx, [list]) => gigs.invite(ctx, ids(list)) },
  "owners.resendInvite": { access: "owner", run: (ctx, [list]) => gigs.resendInvite(ctx, ids(list)) },
} satisfies Record<string, RouteDef>;

export type RouteName = keyof typeof ROUTES;

/** What a honeypot hit gets back: a plausible success, so a bot learns nothing. Nothing is stored. */
const DECOY: Partial<Record<RouteName, (args: Args) => unknown>> = {
  "funnel.joinWaitlist": ([input]) => {
    const i = o<Record<string, unknown>>(input);
    const email = s(i.email).trim().toLowerCase();
    // Shaped exactly like a real answer, its id a token like a real one (signed with a throwaway key: it opens nothing).
    return { ok: true, signup: { id: gigs.signupToken(email, randomBytes(32).toString("hex")), email, zip: s(i.zip), category: s(i.category), details: "", placement: s(i.placement), createdAt: new Date().toISOString() } };
  },
};

/* ---------------------------------------------------------- rate limit (per IP) ---------------------------------------------------------- */

export const FUNNEL_LIMIT = { max: 10, windowMs: 60_000 };
const hits = new Map<string, number[]>();

/** Requests with no X-Real-IP share one bucket, so it is stricter than an address's own. */
export const UNKNOWN_LIMIT = { max: 5, windowMs: 60_000 };
let withoutIp = 0;

/**
 * The caller's IP: X-Real-IP, which Railway's edge sets, or null. Never X-Forwarded-For: its first entries are
 * whatever the caller sent, and its last is an internal Railway hop that every caller shares.
 */
export function clientIp(req: Request): string | null {
  return req.headers.get("x-real-ip")?.trim() || null;
}

/** A sliding window per IP for the public forms. In memory: one server instance today (tech debt for more). */
export function rateLimited(ip: string | null, now = Date.now(), limit = FUNNEL_LIMIT) {
  if (ip === null) {
    // A request the edge didn't stamp: counted (no address is logged), and put in the shared "unknown" bucket.
    withoutIp++;
    if (withoutIp === 1 || withoutIp % 100 === 0) console.warn(`rate limit: ${withoutIp} public-form request(s) without X-Real-IP, sharing one bucket`);
    return limitedKey("unknown", now, UNKNOWN_LIMIT);
  }
  return limitedKey(`ip:${ip}`, now, limit);
}

function limitedKey(key: string, now: number, limit: { max: number; windowMs: number }) {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < limit.windowMs);
  if (recent.length >= limit.max) { hits.set(key, recent); return true; }
  recent.push(now);
  hits.delete(key);
  hits.set(key, recent); // most recent last, so the oldest go first when the map is full
  if (hits.size > 10_000) for (const k of [...hits.keys()].slice(0, 1_000)) hits.delete(k);
  return false;
}
export const resetRateLimit = () => { hits.clear(); withoutIp = 0; };

/* --------------------------------------------------------------- handling --------------------------------------------------------------- */

export interface Deps {
  cos?: CompanyOs;
  appUrl?: string;
}

const MAX_BODY = 256 * 1024;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store", "x-content-type-options": "nosniff" } });

/** The body, read no further than `max` bytes; null when it's longer (whatever Content-Length says, or without one). */
export async function readCapped(req: Request, max: number): Promise<Uint8Array | null> {
  if (Number(req.headers.get("content-length") ?? 0) > max) return null;
  if (!req.body) return new Uint8Array();
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) { await reader.cancel().catch(() => undefined); return null; }
    chunks.push(value);
  }
  const out = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) { out.set(c, at); at += c.byteLength; }
  return out;
}

/** The Clerk session token the browser sent, if any. */
export function bearer(req: Request) {
  const m = /^Bearer\s+(\S{10,4096})$/i.exec(req.headers.get("authorization") ?? "");
  return m ? m[1]! : null;
}

let cached: { cos: CompanyOs; appUrl: string } | null = null;
function fromEnv() {
  cached ??= { cos: companyOs(configFromEnv()), appUrl: (process.env.APP_URL ?? "").replace(/\/+$/, "") };
  return cached;
}

/** Turns an error into the browser's answer: Company OS's status and code as they came, anything else a bare 500. */
export function failure(e: unknown, access?: Access) {
  if (e instanceof CompanyOsError) {
    // A missing service identity or an unreachable Company OS is ours to fix, not the visitor's: no detail.
    if (e.status >= 500) return json(e.status === 503 ? 503 : 502, { error: "unavailable" });
    if (access === "public" || access === "funnel") {
      // Anonymous visitors: Company OS refusing our service identity (revoked, rotated) is ours to fix too, and its
      // English message is never theirs to read. A refusal of what they sent keeps only its code.
      if (e.status === 401 || e.status === 403) return json(503, { error: "unavailable" });
      return json(e.status, { error: e.code });
    }
    return json(e.status, { error: e.code, ...(e.detail ? { message: e.detail } : {}) });
  }
  console.error("route failed", e instanceof Error ? e.name : typeof e);
  return json(500, { error: "internal error" });
}

/** Runs one route for a request: credential, honeypot and rate limit, then the method. */
export async function handle(name: RouteName, req: Request, deps: Deps = {}): Promise<Response> {
  const route: RouteDef = ROUTES[name];
  if (req.method !== "POST") return json(405, { error: "method not allowed" });
  // JSON only: a plain cross-site form can't send it without the browser asking first (CORS).
  if (!(req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return json(415, { error: "unsupported media type" });
  // The public forms' limit comes before anything is read.
  if (route.access === "funnel" && rateLimited(clientIp(req))) return json(429, { error: "rate_limited" });
  const raw = await readCapped(req, MAX_BODY);
  if (!raw) return json(413, { error: "too large" });
  const text = new TextDecoder().decode(raw);
  let args: Args;
  try {
    const body = JSON.parse(text || "{}") as { args?: unknown };
    args = Array.isArray(body.args) ? body.args : [];
  } catch {
    return json(400, { error: "invalid body" });
  }

  const token = bearer(req);
  let cred: Credential;
  if (route.access === "public") cred = { kind: "reader" };
  else if (route.access === "funnel") {
    const trap = route.honeypot?.(args);
    if (typeof trap === "string" && trap.trim()) return json(200, { result: DECOY[name]?.(args) ?? null });
    cred = { kind: "submitter" };
  } else if (token) cred = { kind: "session", token };
  else if (route.access === "optional") cred = { kind: "reader" }; // not used: optional routes check for a session first
  else return json(401, { error: "unauthorized" });

  try {
    const { cos, appUrl } = deps.cos ? { cos: deps.cos, appUrl: deps.appUrl ?? "" } : fromEnv();
    const result = await route.run({ cos, cred, appUrl }, args, req);
    return json(200, { result: result ?? null });
  } catch (e) {
    return failure(e, route.access);
  }
}

/** The handler a route file exports: `export const POST = post("people.list");`. */
export const post = (name: RouteName) => (req: Request) => handle(name, req);

/** profiles.uploadPhoto: the image itself as the body (the builder's cropped JPEG), the person in `?personId=`. */
export async function handleUpload(req: Request, deps: Deps = {}): Promise<Response> {
  if (req.method !== "POST") return json(405, { error: "method not allowed" });
  const token = bearer(req);
  if (!token) return json(401, { error: "unauthorized" });
  const mime = (req.headers.get("content-type") ?? "").split(";")[0]!.trim().toLowerCase();
  if (!mime.startsWith("image/")) return json(415, { error: "unsupported media type" });
  const personId = new URL(req.url).searchParams.get("personId") ?? "";
  const bytes = await readCapped(req, gigs.PHOTO_MAX_BYTES);
  if (!bytes) return json(413, { error: "file_too_large" });
  try {
    const { cos, appUrl } = deps.cos ? { cos: deps.cos, appUrl: deps.appUrl ?? "" } : fromEnv();
    return json(200, { result: await gigs.uploadPhoto({ cos, cred: { kind: "session", token }, appUrl }, personId, bytes, mime) });
  } catch (e) {
    return failure(e);
  }
}
