/*
 * The live harness: lib/data/api.ts, with its requests handed straight to 2.0's route handlers (lib/server/routes.ts,
 * the same code app/api/** runs), which call a local Company OS with the made-up tenant from
 * scripts/companyos-local/setup.mjs. Company OS's dev login stands in for Clerk: its token is what the browser would
 * send as the Clerk session token. Environment: .env.companyos.local (COMPANY_OS_URL, the service tokens, APP_URL,
 * CONTRACT_OWNER_EMAIL).
 */
import { readFileSync } from "node:fs";
import { createApiSource } from "../api";
import type { Harness } from "./harness";

function loadEnv() {
  try {
    for (const line of readFileSync(".env.companyos.local", "utf8").split("\n")) {
      const m = /^([A-Z_]+)=(.*)$/.exec(line.trim());
      if (m && !process.env[m[1]!]) process.env[m[1]!] = m[2];
    }
  } catch { /* the variables may come from the environment instead */ }
}

export async function liveHarness(): Promise<Harness> {
  loadEnv();
  const { handle, handleUpload } = await import("@/lib/server/routes");
  const { media } = await import("@/lib/server/media");
  const cosUrl = process.env.COMPANY_OS_URL!;
  const tenant = process.env.COMPANY_OS_TENANT || "between-gigs";
  const ownerEmail = process.env.CONTRACT_OWNER_EMAIL || "owner@between-gigs.example";
  let token: string | null = null;
  let ip = 0;

  // The browser's fetch, delivered to the route handlers. Each request gets its own address so the funnel's per-IP
  // limit (tested in lib/server/routes.test.ts) doesn't throttle the suite.
  const fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    const headers = new Headers(init?.headers);
    headers.set("x-real-ip", `198.18.${Math.floor(ip / 250) % 250}.${ip++ % 250}`);
    const req = new Request(url, { ...init, headers });
    if (url.pathname.replace(/\/$/, "") === "/api/profiles/uploadPhoto") return handleUpload(req);
    const [, , group, method] = url.pathname.split("/");
    return handle(`${group}.${method}` as Parameters<typeof handle>[0], req);
  }) as typeof globalThis.fetch;

  const source = createApiSource({ baseUrl: "http://localhost:3000", fetch, getToken: async () => token });

  async function devLogin(email: string) {
    const res = await globalThis.fetch(`${cosUrl}/t/${tenant}/auth/dev-login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
    if (!res.ok) throw new Error(`dev-login ${email}: ${res.status} ${await res.text()}`);
    token = ((await res.json()) as { token: string }).token;
    await source.auth.signOut(); // drops the cached session, as a Clerk sign-in does
  }

  return {
    target: "live",
    source,
    async reset() { token = null; await source.auth.signOut(); },
    async signIn(email, name) {
      await devLogin(email);
      return source.auth.syncExternal({ email, name, acceptedTerms: true });
    },
    async signInOwner() {
      await devLogin(ownerEmail);
      const r = await source.auth.syncExternal({ email: ownerEmail });
      if (!r.ok) throw new Error(r.error);
      return r.session;
    },
    async signOut() { token = null; await source.auth.signOut(); },
    async media(url) {
      const id = url.replace(/^\/media\//, "").replace(/\/$/, "");
      const res = await media(new Request(`http://localhost:3000/media/${id}/`, { headers: token ? { cookie: `__session=${token}` } : {} }), id);
      await res.arrayBuffer();
      return res.status;
    },
  };
}
