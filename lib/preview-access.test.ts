import { describe, expect, it } from "vitest";
import { requestPreview } from "./preview-access";

// /preview-access/ asks the server for the preview cookie. The session goes as a Bearer token, like every other call
// to 2.0's API: Clerk's __session cookie can't be relied on (on test the super admin was sent back to the door, 2026-11-03).
type Call = { url: string; init: RequestInit };
const fetcher = (status: number, calls: Call[] = []) => async (url: string, init: RequestInit) => {
  calls.push({ url, init });
  return new Response(null, { status });
};

describe("requestPreview", () => {
  it("sends the session token as a Bearer header, as JSON, to the grant", async () => {
    const calls: Call[] = [];
    expect(await requestPreview(async () => "tok_0123456789", fetcher(204, calls))).toBe("granted");
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe("/api/preview/grant/");
    expect(calls[0]!.init.method).toBe("POST");
    expect(calls[0]!.init.headers).toEqual({ "content-type": "application/json", authorization: "Bearer tok_0123456789" });
  });

  it("without a token, asks the person to sign in and calls nothing", async () => {
    const calls: Call[] = [];
    expect(await requestPreview(async () => null, fetcher(204, calls))).toBe("signed-out");
    expect(calls).toEqual([]);
  });

  it.each([
    [401, "signed-out"],
    [404, "refused"],
    [503, "unavailable"],
    [500, "unavailable"],
  ] as const)("a %i answer → %s", async (status, state) => {
    expect(await requestPreview(async () => "tok_0123456789", fetcher(status))).toBe(state);
  });

  it("a network failure or a token that can't be read → unavailable", async () => {
    expect(await requestPreview(async () => "tok_0123456789", async () => { throw new TypeError("offline"); })).toBe("unavailable");
    expect(await requestPreview(async () => { throw new Error("clerk"); }, fetcher(204))).toBe("unavailable");
  });
});
