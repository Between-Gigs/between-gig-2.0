/*
 * 2.0's server talking to Company OS's private API (decision N-03). Server only: the URL and the two service
 * tokens come from the server's environment and never reach a browser. Three credentials:
 * - "session": the signed-in person's Clerk session token, passed on as it came (Company OS verifies it);
 * - "reader": the public_reader service identity, for public profile pages (read-only, ADR 0029);
 * - "submitter": the submit-only form_submitter identity, for public forms (ADR 0042).
 * API: Company OS docs/integration-guide.md.
 */
export type Credential = { kind: "session"; token: string } | { kind: "reader" } | { kind: "submitter" };

export interface CompanyOsConfig {
  url: string;
  tenant: string;
  readerToken: string;
  submitterToken: string;
  fetch?: typeof fetch;
}

export function configFromEnv(env: Record<string, string | undefined> = process.env): CompanyOsConfig {
  const url = env.COMPANY_OS_URL ?? "";
  if (!/^https?:\/\//.test(url)) throw new Error("COMPANY_OS_URL is not set");
  return {
    url: url.replace(/\/+$/, ""),
    tenant: env.COMPANY_OS_TENANT || "between-gigs",
    readerToken: env.COMPANY_OS_READ_TOKEN ?? "",
    submitterToken: env.COMPANY_OS_SUBMIT_TOKEN ?? "",
  };
}

/** A refusal from Company OS: its status and code ({ error }), passed through to the browser as they came. */
export class CompanyOsError extends Error {
  constructor(readonly status: number, readonly code: string, readonly detail?: string) {
    super(`${status} ${code}${detail ? `: ${detail}` : ""}`);
  }
}

export type Row = { id: string; data: Record<string, unknown>; createdAt: string; updatedAt: string; createdBy?: string | null };
export type Filter = Record<string, unknown>;
export type QuerySpec = { entity: string; filter?: Filter; sort?: { field: string; dir?: "asc" | "desc" }[]; limit?: number; offset?: number; include?: unknown[] };
export type BatchOp = { op: "create" | "update" | "delete"; entity: string; id?: string; data?: Record<string, unknown> };
export type Me = { user: { id: string; email: string; name?: string | null }; roleKeys: string[]; isSuperAdmin: boolean };
export type AdminUser = { userId: string; email: string; name?: string | null; signedUp: boolean; memberships?: { roleKey?: string }[] };

export const eq = (field: string, value: unknown): Filter => ({ field, op: "eq", value });
export const isIn = (field: string, value: unknown[]): Filter => ({ field, op: "in", value });
export const and = (...nodes: Filter[]): Filter => ({ and: nodes });

const TIMEOUT_MS = 15_000;
const PAGE = 500;

export function companyOs(cfg: CompanyOsConfig) {
  const doFetch = cfg.fetch ?? fetch;
  const base = `${cfg.url}/t/${encodeURIComponent(cfg.tenant)}`;
  const bearer = (c: Credential) => (c.kind === "session" ? c.token : c.kind === "reader" ? cfg.readerToken : cfg.submitterToken);

  async function call<T>(cred: Credential, method: string, path: string, body?: unknown): Promise<T> {
    const token = bearer(cred);
    if (!token) throw new CompanyOsError(cred.kind === "session" ? 401 : 503, cred.kind === "session" ? "unauthorized" : "service_identity_not_configured");
    let res: Response;
    try {
      res = await doFetch(`${base}${path}`, {
        method,
        // No content-type on a bodyless request (Company OS refuses an empty JSON body).
        headers: { authorization: `Bearer ${token}`, ...(body === undefined ? {} : { "content-type": "application/json" }) },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: "no-store",
      });
    } catch {
      throw new CompanyOsError(502, "company_os_unreachable");
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    let json: unknown = undefined;
    try { json = text ? JSON.parse(text) : undefined; } catch { /* not JSON */ }
    if (!res.ok) {
      const err = (json ?? {}) as { error?: unknown; message?: unknown };
      throw new CompanyOsError(res.status, typeof err.error === "string" ? err.error : "error", typeof err.message === "string" ? err.message : undefined);
    }
    return json as T;
  }

  const api = {
    call,
    /** The secret the call sheet's sign-up tokens are signed from (gigs.signupToken): the submit identity's token. */
    signingSecret: () => cfg.submitterToken,
    me: (cred: Credential) => call<Me>(cred, "GET", "/me"),
    /** One page of rows. */
    query: async (cred: Credential, spec: QuerySpec) => (await call<{ data: Row[] }>(cred, "POST", "/query", spec)).data,
    /** Every row, page by page (500 a page, Company OS's maximum; its id tiebreak keeps pages stable). */
    async all(cred: Credential, spec: QuerySpec): Promise<Row[]> {
      const out: Row[] = [];
      for (let offset = 0; ; offset += PAGE) {
        const rows = await api.query(cred, { ...spec, limit: PAGE, offset });
        out.push(...rows);
        if (rows.length < PAGE) return out;
      }
    },
    /** Rows whose `field` is one of `values`, in chunks so a long id list stays a reasonable request. */
    async byIds(cred: Credential, entity: string, field: string, values: string[], extra?: Filter): Promise<Row[]> {
      const out: Row[] = [];
      for (let i = 0; i < values.length; i += 200) {
        const f = isIn(field, values.slice(i, i + 200));
        out.push(...(await api.all(cred, { entity, filter: extra ? and(f, extra) : f })));
      }
      return out;
    },
    batch: (cred: Credential, ops: BatchOp[]) => call<{ ids: string[] }>(cred, "POST", "/batch", { ops }),
    create: async (cred: Credential, entity: string, data: Record<string, unknown>) => (await call<{ data: Row }>(cred, "POST", `/api/${entity}`, data)).data,
    patch: async (cred: Credential, entity: string, id: string, data: Record<string, unknown>) => (await call<{ data: Row }>(cred, "PATCH", `/api/${entity}/${encodeURIComponent(id)}`, data)).data,
    remove: (cred: Credential, entity: string, id: string) => call<void>(cred, "DELETE", `/api/${entity}/${encodeURIComponent(id)}`),
    adminUsers: async (cred: Credential) => (await call<{ users: AdminUser[] }>(cred, "GET", "/admin/users")).users,
    audit: async (cred: Credential, params: Record<string, string>) => (await call<{ events: { id: string; at: string; actor: string | null; event: string; details: Record<string, unknown> | null }[] }>(cred, "GET", `/audit?${new URLSearchParams(params)}`)).events,
    invite: (cred: Credential, body: { email: string; roleKey: string; personId: string; redirectUrl: string }) =>
      call<{ userId: string; invitationId: string; url: string }>(cred, "POST", "/invitations", body),
    submitForm: (formKey: string, body: { email: string; answers?: Record<string, string>; placement?: string }) =>
      call<{ outcome: "created" | "merged" }>({ kind: "submitter" }, "POST", `/forms/${encodeURIComponent(formKey)}/submissions`, body),
    /** Starts an upload: the file record (pending) and the one-time link its bytes go to. */
    startUpload: (cred: Credential, body: { ownerEntity: string; ownerId: string; kind: string; filename: string; mime: string; sizeBytes: number }) =>
      call<{ file: Row & { id: string }; uploadUrl: string }>(cred, "POST", "/files", body),
    confirmUpload: (cred: Credential, id: string) => call<{ file: unknown }>(cred, "POST", `/files/${encodeURIComponent(id)}/confirm`),
    /** A 60-second link to a private file, for this server to fetch; never handed to a browser. */
    fileUrl: (cred: Credential, id: string) => call<{ url: string }>(cred, "GET", `/files/${encodeURIComponent(id)}/url`),
    /** A 60-second link to a published file (public_reader). */
    publicFileUrl: (id: string) => call<{ url: string }>({ kind: "reader" }, "GET", `/public-files/${encodeURIComponent(id)}/url`),
    /** Puts the bytes at an upload link (Supabase Storage), server side. */
    async putBytes(url: string, bytes: Uint8Array, mime: string) {
      let res: Response;
      try {
        res = await doFetch(url, { method: "PUT", headers: { "content-type": mime }, body: bytes as Uint8Array<ArrayBuffer>, signal: AbortSignal.timeout(TIMEOUT_MS) });
      } catch {
        throw new CompanyOsError(502, "storage_unavailable");
      }
      if (!res.ok) throw new CompanyOsError(502, "storage_unavailable");
    },
    /** Fetches a file link's bytes, server side. */
    async getBytes(url: string): Promise<Response> {
      try {
        return await doFetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
      } catch {
        throw new CompanyOsError(502, "storage_unavailable");
      }
    },
  };
  return api;
}

export type CompanyOs = ReturnType<typeof companyOs>;
