import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/*
 * With the publish gate, "approved" no longer means public. Code that decides who sees a profile must ask
 * lib/profile/publish-gate.ts (isPublicStatus, isReviewedStatus, isApprovedPrivate), never compare a status to "approved".
 *
 * The rule, kept narrow so it has few false positives: in components/ and lib/ (the publish-gate module itself, tests,
 * the sample data, the Company OS adapters and the studio workspace aside), a line that compares a `status` to the literal
 * "approved" is refused. A local `state` already derived through isApprovedPrivate is not a status. A list that names
 * "published" as well ("has this been reviewed") is not a visibility test and is allowed. Caught forms:
 *   status === "approved"   status !== 'approved'   "approved" === status
 *   ["approved", ...].includes(status)   status.includes("approved")   x.status == "approved"
 *   case "approved":  (in a switch over a status)
 * Not caught on purpose: labels and copy that merely contain the word, type unions, and the owner's review action name.
 * A line that really must compare (say, the server asking Company OS for approved rows) may end with `// approved-ok: why`.
 */
const ROOT = path.resolve(__dirname, "../..");
const SKIP_DIR = new Set(["ds", "node_modules", "contract", "companyos", "studio"]);
const SKIP_FILE = [/\.test\.tsx?$/, /lib\/profile\/publish-gate\.ts$/, /lib\/data\/(seed|sample|stage-two)\.ts$/, /lib\/data\/types\.ts$/];

function files(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? (SKIP_DIR.has(e.name) ? [] : files(p)) : /\.tsx?$/.test(e.name) && !SKIP_FILE.some((r) => r.test(p.replace(/\\/g, "/"))) ? [p] : [];
  });
}

const Q = "[\"'`]approved[\"'`]";
const STATUS = "status\\b";
export const BARE_APPROVED = [
  new RegExp(`\\b${STATUS}\\s*[!=]==?\\s*${Q}`),
  new RegExp(`${Q}\\s*[!=]==?\\s*[\\w.?]*${STATUS}`),
  new RegExp(`\\bstatus\\??\\.includes\\(\\s*${Q}`),
  new RegExp(`\\[(?![^\\]]*published)[^\\]]*${Q}[^\\]]*\\]\\.includes\\(\\s*[\\w.?]*${STATUS}`),
  new RegExp(`\\bcase\\s+${Q}\\s*:`),
];

const scan = (dirs: string[]) => dirs.flatMap((d) => files(path.join(ROOT, d))).flatMap((f) =>
  fs.readFileSync(f, "utf8").split("\n").map((line, i) => ({ f, i, line }))
    .filter(({ line }) => !/\/\/\s*approved-ok:/.test(line) && BARE_APPROVED.some((r) => r.test(line)))
    .map(({ f, i, line }) => `${path.relative(ROOT, f)}:${i + 1}: ${line.trim()}`));

describe("nothing decides visibility from a bare \"approved\"", () => {
  it("components/ and lib/ never compare or test a status against \"approved\"", () => {
    expect(scan(["components", "lib", "app"])).toEqual([]);
  });
  it("the matcher catches the forms it documents, and leaves copy and labels alone", () => {
    const hit = (s: string) => BARE_APPROVED.some((r) => r.test(s));
    for (const s of ['if (p.status === "approved")', "x.status !== 'approved'", 'if ("approved" === person.status)', 'return ["approved", "draft"].includes(person.status);', 'status.includes("approved")', 'case "approved":', "status == `approved`"]) expect(hit(s), s).toBe(true);
    for (const s of ['label: "Approved, not yet public"', 'const APPROVED = "approved";', 'type Status = "draft" | "approved"', 'toast({ message: "Approved" })', 'status === "published"', 'state === "approved"', '["submitted", "approved", "published"].includes(person.status)']) expect(hit(s), s).toBe(false);
  });
});
