/*
 * Bulk invites in chunks: Company OS's invitations are one call each, so 2.0's server takes at most 10 sign-ups a
 * request (lib/server/gigs.ts INVITE_CHUNK). Each chunk is its own request, with its own fresh session token, and the
 * waitlist shows progress between them.
 */
export const CHUNK = 10;

type Counts = { invited: number; skipped: number; failed?: number };

export async function inChunks(ids: string[], send: (chunk: string[]) => Promise<Counts>, progress?: (done: number, of: number) => void) {
  const total = { invited: 0, skipped: 0, failed: 0 };
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    try {
      const r = await send(chunk);
      total.invited += r.invited;
      total.skipped += r.skipped;
      total.failed += r.failed ?? 0;
    } catch {
      total.failed += chunk.length;
    }
    progress?.(Math.min(i + CHUNK, ids.length), ids.length);
  }
  return total;
}
