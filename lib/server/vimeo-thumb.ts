/**
 * Vimeo's thumbnail for a video, fetched on the server only (the page's CSP gives the browser no way to call Vimeo's API)
 * through its public oEmbed endpoint. Time-boxed, cached in memory (a hit for a day, a miss for a few minutes), one request
 * for simultaneous callers, and any problem means null: the profile then shows a neutral placeholder.
 */
export interface VimeoThumbOptions {
  fetcher?: (url: string, init?: RequestInit) => Promise<Response>;
  now?: () => number;
  timeoutMs?: number;
  hitMs?: number;
  missMs?: number;
  max?: number;
  /** Most lookups running at once; more get nothing (the placeholder) without calling Vimeo. */
  maxInflight?: number;
  /** Most bytes read from the oEmbed answer. */
  maxBytes?: number;
}

const ID = /^\d{1,12}$/;
const IMAGE = /^https:\/\/i\.vimeocdn\.com\/[^\s@]+$/;

/** The body as text, read no further than `max` bytes; null when it is longer. */
async function readCapped(res: Response, max: number): Promise<string | null> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) { await reader.cancel().catch(() => undefined); return null; }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export function createVimeoThumbs({ fetcher = fetch, now = Date.now, timeoutMs = 2500, hitMs = 86_400_000, missMs = 300_000, max = 500, maxInflight = 5, maxBytes = 64 * 1024 }: VimeoThumbOptions = {}) {
  const cache = new Map<string, { until: number; value: string | null }>();
  const inflight = new Map<string, Promise<string | null>>();
  const lookup = async (id: string): Promise<string | null> => {
    try {
      const url = "https://vimeo.com/api/oembed.json?url=" + encodeURIComponent(`https://vimeo.com/${id}`);
      const res = await fetcher(url, { signal: AbortSignal.timeout(timeoutMs), redirect: "error", headers: { accept: "application/json" } });
      if (!res.ok) return null;
      if (Number(res.headers.get("content-length") ?? 0) > maxBytes) { await res.body?.cancel().catch(() => undefined); return null; }
      const text = await readCapped(res, maxBytes);
      if (text === null) return null;
      const body = JSON.parse(text) as { thumbnail_url?: unknown };
      return typeof body.thumbnail_url === "string" && IMAGE.test(body.thumbnail_url) ? body.thumbnail_url : null;
    } catch { return null; }
  };
  return async function thumbnail(id: string): Promise<string | null> {
    if (!ID.test(id)) return null;
    const hit = cache.get(id);
    if (hit && hit.until > now()) return hit.value;
    const pending = inflight.get(id);
    if (pending) return pending;
    if (inflight.size >= maxInflight) return null;
    const run = lookup(id).then((value) => {
      cache.delete(id);
      cache.set(id, { until: now() + (value ? hitMs : missMs), value });
      while (cache.size > max) cache.delete(cache.keys().next().value as string);
      return value;
    }).finally(() => inflight.delete(id));
    inflight.set(id, run);
    return run;
  };
}

export const vimeoThumbnail = createVimeoThumbs();
