/*
 * Live, a review decision waits a few seconds before it is sent, so Undo in the toast can cancel it (Company OS
 * decision N-10): once sent it can't be taken back, since Company OS keeps every review and the decision emails the
 * Gigster. The sample can reverse a decision (owners.undoReview), so there it is sent at once, as before.
 */
import { data } from "@/lib/data";
import { sendNow } from "@/lib/data/api";

export const HOLD_MS = 8000;

const pending = new Map<string, { timer: ReturnType<typeof setTimeout>; fire: () => void }>();

export interface Hold {
  /** Takes the decision back: cancels it while held (live), or reverses it (sample). False when it's too late. */
  cancel(): Promise<boolean>;
}

/**
 * Makes a decision on a person. Resolves once Undo is possible: at once while held (live), or after the sample has
 * applied it (a refusal rejects, as the call itself would). Live, `onError` runs if the held decision fails when sent.
 */
export async function holdDecision(personId: string, send: () => Promise<unknown>, { onSent, onError }: { onSent?: () => void; onError: () => void }): Promise<Hold> {
  const undo = data.owners.undoReview;
  if (undo) {
    await send();
    return { cancel: () => undo(personId).then(() => true, () => false) };
  }
  // One decision per person at a time: a second one while the first is held is refused, as a sent one would be.
  if (pending.has(personId)) throw new Error("a decision on this person is already waiting");
  const fire = () => {
    if (pending.get(personId)?.fire === fire) pending.delete(personId);
    send().then(() => onSent?.(), onError);
  };
  pending.set(personId, { timer: setTimeout(fire, HOLD_MS), fire });
  return {
    async cancel() {
      const p = pending.get(personId);
      if (!p || p.fire !== fire) return false;
      clearTimeout(p.timer);
      pending.delete(personId);
      return true;
    },
  };
}

/** True while a decision on this person waits: lists leave them out, as if it were already sent. */
export const isHeld = (personId: string) => pending.has(personId);

// Leaving or closing the page sends what's waiting rather than dropping it.
if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => {
    // keepalive and the last token: the page is going, so there's no time to fetch a fresh one (the timer path does).
    for (const p of [...pending.values()]) { clearTimeout(p.timer); sendNow(p.fire); }
  });
}
