/*
 * The live DataSource: every method is a POST to 2.0's own server route (app/api/<group>/<method>), which calls
 * Company OS (lib/server/routes.ts). The browser holds no backend credential: it sends its Clerk session token, and
 * the server picks the credential for each route. No demo block, no undoReview (the review toast holds decisions
 * instead, N-10), no invite lookup (Clerk's invitation ticket, N-05). Emails are sent by Company OS, so the outbox is empty.
 */
import { basePath } from "@/lib/site";
import type { DataSource } from "./source";
import type { ProfileDraft, ProfileFields } from "./types";

/** A refusal from the server: Company OS's status and code (e.g. 422 profile_incomplete), with its English fallback. */
export class DataError extends Error {
  constructor(readonly status: number, readonly code: string, message?: string) {
    super(message || code);
  }
}

export interface ApiOptions {
  /** Where 2.0's routes are; "" for the same origin (the browser). */
  baseUrl?: string;
  fetch?: typeof fetch;
  /** The person's Clerk session token, or null when signed out. */
  getToken?: () => Promise<string | null>;
  /** The builder's step lives in the browser (gap analysis §13.3 #7). */
  storage?: Pick<Storage, "getItem" | "setItem">;
}

const memoryStorage = (): Pick<Storage, "getItem" | "setItem"> => {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
};

export function createApiSource(opts: ApiOptions = {}): DataSource & { setTokenProvider(get: () => Promise<string | null>): void } {
  const base = opts.baseUrl ?? basePath;
  const doFetch = opts.fetch ?? ((...a: Parameters<typeof fetch>) => fetch(...a));
  let getToken = opts.getToken ?? (async () => null);
  const storage = opts.storage ?? (() => { try { return typeof localStorage !== "undefined" ? localStorage : memoryStorage(); } catch { return memoryStorage(); } })();
  const listeners = new Set<() => void>();
  const changed = () => { sessionCache = null; for (const l of listeners) l(); };
  let sessionCache: { at: number; value: ReturnType<DataSource["auth"]["session"]> } | null = null;

  async function send(path: string, init: RequestInit): Promise<unknown> {
    const token = await getToken().catch(() => null);
    const res = await doFetch(`${base}/api/${path}`, { ...init, headers: { ...(init.headers as Record<string, string>), ...(token ? { authorization: `Bearer ${token}` } : {}) } });
    const body = (await res.json().catch(() => ({}))) as { result?: unknown; error?: string; message?: string };
    if (!res.ok) throw new DataError(res.status, body.error ?? "error", body.message);
    return body.result;
  }
  const call = <T,>(name: string, args: unknown[] = [], keepalive = false) =>
    send(name.replace(".", "/"), { method: "POST", keepalive, headers: { "content-type": "application/json" }, body: JSON.stringify({ args }) }) as Promise<T>;

  const stepKey = (personId: string) => `bg2-builder-step:${personId}`;
  const withStep = (d: ProfileDraft | null) => (d ? { ...d, step: Number(storage.getItem(stepKey(d.personId)) ?? 0) || 0 } : d);

  return {
    kind: "live",
    setTokenProvider(get) { getToken = get; changed(); },

    people: {
      list: (query) => call("people.list", [query ?? {}]),
      get: (id) => call("people.get", [id]),
      getPublic: (slug) => call("people.getPublic", [slug]),
      similar: (id, limit) => call("people.similar", [id, limit ?? 3]),
    },

    invites: { lookup: async () => ({ state: "unknown" }) },

    auth: {
      session() {
        // Several components ask at once on every page; one answer serves them for a short while.
        if (!sessionCache || Date.now() - sessionCache.at > 30_000) sessionCache = { at: Date.now(), value: call("auth.session") };
        sessionCache.value.catch(() => { sessionCache = null; });
        return sessionCache.value;
      },
      register: async () => ({ ok: false, error: "unknown" }),
      requestCode: async () => ({ ok: false, error: "unknown-email" }),
      verifyCode: async () => ({ ok: false, error: "no-code" }),
      async syncExternal(identity) {
        const r = await call<Awaited<ReturnType<DataSource["auth"]["syncExternal"]>>>("auth.syncExternal", [{ email: identity.email }]);
        sessionCache = { at: Date.now(), value: Promise.resolve(r.ok ? r.session : null) };
        return r;
      },
      async signOut() { changed(); },
      onChange(listener) { listeners.add(listener); return () => void listeners.delete(listener); },
    },

    profiles: {
      getDraft: async (personId) => withStep(await call<ProfileDraft | null>("profiles.getDraft", [personId])),
      async saveDraft(personId, fields: ProfileFields, step) {
        try { storage.setItem(stepKey(personId), String(step)); } catch { /* storage blocked: the builder starts at step 1 */ }
        return (await withStep(await call<ProfileDraft>("profiles.saveDraft", [personId, fields])))!;
      },
      submit: (personId) => call("profiles.submit", [personId]),
      getProfile: (personId) => call("profiles.getProfile", [personId]),
      uploadPhoto: (personId, file) =>
        send(`profiles/uploadPhoto?personId=${encodeURIComponent(personId)}`, { method: "POST", headers: { "content-type": file.type || "image/jpeg" }, body: file }) as Promise<string>,
    },

    emails: {
      outbox: async () => [],
      get: async () => null,
      queue: async () => { throw new DataError(501, "not_supported", "Company OS sends the emails"); },
    },

    funnel: {
      joinWaitlist: (input) => call("funnel.joinWaitlist", [input]),
      addDetails: (id, input) => call("funnel.addDetails", [id, input]),
      submitSketch: (kind, answers) => call("funnel.submitSketch", [kind, answers]),
      privacyRequest: (email, message, website) => call("funnel.privacyRequest", [email, message, website ?? ""]),
    },

    owners: {
      dashboard: () => call("owners.dashboard"),
      activity: (limit) => call("owners.activity", [limit ?? 50]),
      reviewQueue: () => call("owners.reviewQueue"),
      // keepalive: a held decision sent as the page closes still arrives (components/owners/hold.ts).
      approve: (id) => call("owners.approve", [id], true),
      requestChanges: (id, notes) => call("owners.requestChanges", [id, notes], true),
      waitlist: (query) => call("owners.waitlist", [query ?? {}]),
      invite: (ids) => call("owners.invite", [ids]),
    },
  };
}

/** The browser's live source. ClerkLayer gives it the session token (setTokenProvider). */
export const apiSource = createApiSource();
