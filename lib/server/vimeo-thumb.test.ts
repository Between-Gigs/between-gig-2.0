import { describe, expect, it, vi } from "vitest";
import { createVimeoThumbs } from "./vimeo-thumb";

// The Vimeo thumbnail is fetched on the server only (the browser's CSP never lets the page call Vimeo), cached,
// time-boxed, and falls back to nothing (a neutral placeholder) on any problem.
const oembed = (thumb: unknown) => new Response(JSON.stringify({ thumbnail_url: thumb }), { status: 200, headers: { "content-type": "application/json" } });

describe("createVimeoThumbs", () => {
  it("asks Vimeo's oEmbed for exactly that numeric id and returns the thumbnail", async () => {
    const fetcher = vi.fn(async () => oembed("https://i.vimeocdn.com/video/123_640.jpg"));
    const get = createVimeoThumbs({ fetcher });
    expect(await get("76979871")).toBe("https://i.vimeocdn.com/video/123_640.jpg");
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://vimeo.com/api/oembed.json?url=" + encodeURIComponent("https://vimeo.com/76979871"));
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(init.redirect).toBe("error");
  });
  it("never calls out for an id that isn't plain digits", async () => {
    const fetcher = vi.fn(async () => oembed("https://i.vimeocdn.com/x.jpg"));
    const get = createVimeoThumbs({ fetcher });
    for (const id of ["", "abc", "1/../2", "12 34", "1".repeat(20), "76979871?x=1"]) expect(await get(id)).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("only accepts a thumbnail on Vimeo's image host over https", async () => {
    for (const bad of ["https://evil.com/x.jpg", "http://i.vimeocdn.com/x.jpg", "https://i.vimeocdn.com.evil.com/x.jpg", "javascript:alert(1)", 5, null, "https://user@i.vimeocdn.com/x.jpg"]) {
      expect(await createVimeoThumbs({ fetcher: async () => oembed(bad) })("76979871")).toBeNull();
    }
  });
  it("caches a hit, and a miss for a shorter time", async () => {
    let now = 0;
    const fetcher = vi.fn(async () => oembed("https://i.vimeocdn.com/video/a.jpg"));
    const get = createVimeoThumbs({ fetcher, now: () => now, hitMs: 1000, missMs: 100 });
    await get("1"); await get("1"); expect(fetcher).toHaveBeenCalledTimes(1);
    now = 1001; await get("1"); expect(fetcher).toHaveBeenCalledTimes(2);
    const failing = vi.fn(async () => new Response("no", { status: 404 }));
    const miss = createVimeoThumbs({ fetcher: failing, now: () => now, hitMs: 1000, missMs: 100 });
    expect(await miss("2")).toBeNull(); await miss("2"); expect(failing).toHaveBeenCalledTimes(1);
    now += 101; await miss("2"); expect(failing).toHaveBeenCalledTimes(2);
  });
  it("gives up quietly on a network error, a bad status or a hang", async () => {
    expect(await createVimeoThumbs({ fetcher: async () => { throw new Error("down"); } })("3")).toBeNull();
    expect(await createVimeoThumbs({ fetcher: async () => new Response("x", { status: 500 }) })("3")).toBeNull();
    expect(await createVimeoThumbs({ fetcher: async () => new Response("not json", { status: 200 }) })("3")).toBeNull();
    const hang = (_u: string, init?: RequestInit) => new Promise<Response>((_, no) => init?.signal?.addEventListener("abort", () => no(new Error("aborted"))));
    expect(await createVimeoThumbs({ fetcher: hang, timeoutMs: 20 })("4")).toBeNull();
  });
  it("shares one request between simultaneous callers and bounds the cache", async () => {
    const fetcher = vi.fn(async () => oembed("https://i.vimeocdn.com/video/a.jpg"));
    const get = createVimeoThumbs({ fetcher, max: 2 });
    await Promise.all([get("1"), get("1"), get("1")]); expect(fetcher).toHaveBeenCalledTimes(1);
    await get("2"); await get("3"); await get("1"); expect(fetcher).toHaveBeenCalledTimes(4);
  });
  it("reads at most 64 KB of the oEmbed answer (declared length or streamed)", async () => {
    const big = JSON.stringify({ thumbnail_url: "https://i.vimeocdn.com/x.jpg", pad: "x".repeat(70_000) });
    expect(await createVimeoThumbs({ fetcher: async () => new Response(big, { status: 200, headers: { "content-length": String(big.length) } }) })("5")).toBeNull();
    const stream = new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode(big)); c.close(); } });
    expect(await createVimeoThumbs({ fetcher: async () => new Response(stream, { status: 200 }) })("6")).toBeNull();
  });
  it("at most 5 lookups at once: the rest get the placeholder without calling Vimeo", async () => {
    const release: (() => void)[] = [];
    const fetcher = vi.fn(() => new Promise<Response>((ok) => release.push(() => ok(oembed("https://i.vimeocdn.com/a.jpg")))));
    const get = createVimeoThumbs({ fetcher, maxInflight: 5 });
    const first = ["1", "2", "3", "4", "5"].map((id) => get(id));
    expect(await get("6")).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(5);
    release.forEach((r) => r());
    expect(await Promise.all(first)).toEqual(Array(5).fill("https://i.vimeocdn.com/a.jpg"));
    release.length = 0;
    const later = get("6"); release.forEach((r) => r());
    expect(await later).toBe("https://i.vimeocdn.com/a.jpg");
  });
});
