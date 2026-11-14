import { describe, expect, it } from "vitest";
import { createApiSource, sendNow } from "./api";

// The live source's requests: a fresh token per call; only a call made as the page closes uses the last one, with keepalive.
function source() {
  const seen: { url: string; auth: string | null; keepalive: boolean }[] = [];
  let n = 0;
  const fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    seen.push({ url: String(url), auth: new Headers(init?.headers).get("authorization"), keepalive: !!init?.keepalive });
    return Response.json({ result: { id: "p" } });
  }) as typeof globalThis.fetch;
  const api = createApiSource({ baseUrl: "http://localhost:3000", fetch, getToken: async () => `token-${++n}` });
  return { api, seen };
}

describe("lib/data/api.ts", () => {
  it("token(): the current session token from the provider, for calls outside the DataSource (the preview's door)", async () => {
    const api = createApiSource({ getToken: async () => "tok_abc" });
    expect(await api.token()).toBe("tok_abc");
    api.setTokenProvider(async () => null);
    expect(await api.token()).toBeNull();
  });

  it("asks for a fresh token on every call, held decisions included, without keepalive", async () => {
    const { api, seen } = source();
    await api.owners.approve("a");
    await api.owners.requestChanges("b", [{ section: "about", note: "x" }]);
    expect(seen).toEqual([
      { url: "http://localhost:3000/api/owners/approve/", auth: "Bearer token-1", keepalive: false },
      { url: "http://localhost:3000/api/owners/requestChanges/", auth: "Bearer token-2", keepalive: false },
    ]);
  });

  it("sendNow (the page is closing): keepalive and the last token, sent before anything is awaited", async () => {
    const { api, seen } = source();
    await api.owners.dashboard();
    let p: Promise<unknown> | undefined;
    sendNow(() => { p = api.owners.approve("a"); });
    await p;
    expect(seen[1]).toEqual({ url: "http://localhost:3000/api/owners/approve/", auth: "Bearer token-1", keepalive: true });
    await api.owners.approve("c");
    expect(seen[2]).toMatchObject({ auth: "Bearer token-2", keepalive: false });
  });
});

describe("live authentication session notifications", () => {
  const session = { personId: "p", email: "test@example.test", role: "gigster", name: "Test", startedAt: "2026-01-01", via: "clerk" };
  for (const operation of ["syncExternal", "signUp"] as const) {
    it(`${operation} refreshes existing subscribers without dropping the resolved session`, async () => {
      let sessionReads = 0;
      const api = createApiSource({ fetch: (async (url) => {
        if (String(url).includes("auth/session/")) { sessionReads++; return Response.json({ result: null }); }
        return Response.json({ result: { ok: true, session, created: false } });
      }) as typeof fetch });
      let observed = await api.auth.session();
      let refreshed: Promise<void> = Promise.resolve();
      api.auth.onChange(() => { refreshed = api.auth.session().then(s => { observed = s; }); });
      if (operation === "syncExternal") await api.auth.syncExternal({ email: session.email });
      else await api.auth.signUp!({ name: "Test", acceptedTerms: true });
      await refreshed;
      expect(observed).toEqual(session);
      expect(sessionReads).toBe(1);
    });
  }
});
