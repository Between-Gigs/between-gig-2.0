import { afterEach, describe, expect, it, vi } from "vitest";
import { requestPreview } from "./preview-access";

// /preview-access/ asks the server for the preview cookie. The session goes as a Bearer token, like every other call
// to 2.0's API: Clerk's __session cookie can't be relied on (on test the super admin was sent back to the door, 2026-11-03).
type Call = { url: string; init: RequestInit };
const fetcher = (status: number, calls: Call[] = []) => async (url: string, init: RequestInit) => {
  calls.push({ url, init });
  return new Response(null, { status });
};

afterEach(() => vi.restoreAllMocks());

describe("requestPreview", () => {
  it("sends the session token as a Bearer header, as JSON, to the grant", async () => {
    const calls: Call[] = [];
    // An explicit empty base: the default is read from NEXT_PUBLIC_BASE_PATH, which a Pages build in the shell sets.
    expect(await requestPreview(async () => "tok_0123456789", fetcher(204, calls), "")).toBe("granted");
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe("/api/preview/grant/");
    // Under a base path (the Pages build's), the same path below it, as lib/data/api.ts does.
    const based: Call[] = [];
    await requestPreview(async () => "tok_0123456789", fetcher(204, based), "/between-gig-2.0");
    expect(based[0]!.url).toBe("/between-gig-2.0/api/preview/grant/");
    expect(calls[0]!.init.method).toBe("POST");
    expect(calls[0]!.init.headers).toEqual({ "content-type": "application/json", authorization: "Bearer tok_0123456789" });
    // The server answers 415 to anything but a JSON body.
    expect(calls[0]!.init.body).toBe("{}");
    expect(calls[0]!.init.credentials).toBe("same-origin");
  });

  it("without a token, asks the person to sign in and calls nothing", async () => {
    const calls: Call[] = [];
    expect(await requestPreview(async () => null, fetcher(204, calls))).toBe("signed-out");
    expect(calls).toEqual([]);
  });

  it.each([
    // A token was sent and still refused: signing in again wouldn't help, so not "signed-out" (a manual loop).
    [401, "unavailable"],
    [404, "refused"],
    [503, "unavailable"],
    [500, "unavailable"],
  ] as const)("a %i answer → %s, its status (never the token) in the console", async (status, state) => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await requestPreview(async () => "tok_0123456789", fetcher(status), "")).toBe(state);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]![0])).toContain(String(status));
    expect(JSON.stringify(warn.mock.calls)).not.toContain("tok_0123456789");
  });

  it("a network failure or a token that can't be read → unavailable", async () => {
    expect(await requestPreview(async () => "tok_0123456789", async () => { throw new TypeError("offline"); }, "")).toBe("unavailable");
    expect(await requestPreview(async () => { throw new Error("clerk"); }, fetcher(204))).toBe("unavailable");
  });
});
