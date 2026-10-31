import { describe, expect, it } from "vitest";
import { inChunks } from "./batch";

describe("inChunks (bulk invites)", () => {
  it("sends at most 10 a call, adds up the counts and reports progress after each chunk", async () => {
    const calls: string[][] = [];
    const progress: [number, number][] = [];
    const ids = Array.from({ length: 23 }, (_, i) => `s${i}`);
    const total = await inChunks(ids, async (chunk) => { calls.push(chunk); return { invited: chunk.length - 1, skipped: 1 }; }, (done, of) => progress.push([done, of]));
    expect(calls.map((c) => c.length)).toEqual([10, 10, 3]);
    expect(calls.flat()).toEqual(ids);
    expect(progress).toEqual([[10, 23], [20, 23], [23, 23]]);
    expect(total).toEqual({ invited: 20, skipped: 3, failed: 0 });
  });

  it("a chunk that fails as a whole counts all its sign-ups as failed and the rest still go", async () => {
    let n = 0;
    const total = await inChunks(Array.from({ length: 15 }, (_, i) => `s${i}`), async (chunk) => {
      if (n++ === 0) throw new Error("network");
      return { invited: chunk.length, skipped: 0 };
    });
    expect(total).toEqual({ invited: 5, skipped: 0, failed: 10 });
  });
});
