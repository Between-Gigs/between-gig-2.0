import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/*
 * With the publish gate, "approved" no longer means public. Components must ask lib/profile/publish-gate.ts
 * (isPublicStatus, isReviewedStatus, isApprovedPrivate), never compare a person's status to "approved" directly.
 */
function files(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? (e.name === "ds" ? [] : files(p)) : /\.tsx?$/.test(e.name) ? [p] : [];
  });
}

describe("components never compare a status to approved", () => {
  it("no `status === \"approved\"` (or !==, or single quotes) under components/", () => {
    const bad = files(path.resolve(__dirname, "../../components")).flatMap((f) =>
      fs.readFileSync(f, "utf8").split("\n").map((line, i) => ({ f, i, line }))
        .filter(({ line }) => /\bstatus\s*[!=]==?\s*["']approved["']/.test(line))
        .map(({ f, i }) => `${path.relative(process.cwd(), f)}:${i + 1}`));
    expect(bad).toEqual([]);
  });
});
