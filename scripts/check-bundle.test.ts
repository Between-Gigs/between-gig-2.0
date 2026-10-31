import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { findSecrets } from "./check-bundle.mjs";

// What reaches a browser (the server build's .next/static and public/) must hold no server secret (decision N-03).
// Every value below is made up.
const dirs: string[] = [];
afterEach(() => { for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true }); });
function bundle(files: Record<string, string>) {
  const dir = mkdtempSync(path.join(tmpdir(), "bg-bundle-"));
  dirs.push(dir);
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    writeFileSync(path.join(dir, rel), text);
  }
  return dir;
}

describe("findSecrets", () => {
  it("passes a clean bundle, including the public Clerk publishable key", async () => {
    const dir = bundle({ "chunks/app.js": 'const k="pk_test_ZmljdGlvbmFsJA";fetch("/api/forms")', "css/a.css": "body{}" });
    expect(await findSecrets([dir])).toEqual([]);
  });

  it.each([
    ["a Company OS service token", 'x="cos_svc_0000_fictional"'],
    ["a Clerk live secret key", 'x="sk_live_fictional"'],
    ["a Clerk test secret key", 'x="sk_test_fictional"'],
    ["the Clerk secret's variable name", "process.env.CLERK_SECRET_KEY"],
    ["the private Company OS address", 'u="http://api.railway.internal:4000"'],
  ])("finds %s", async (_label, text) => {
    const dir = bundle({ "chunks/x.js": text });
    const found = await findSecrets([dir]);
    expect(found).toHaveLength(1);
    expect(found[0]).toContain(path.join("chunks", "x.js"));
  });

  it("finds this environment's real values when they are set, and never prints them", async () => {
    const env = { COMPANY_OS_URL: "http://fictional-api.example.test:4000", COMPANY_OS_SUBMIT_TOKEN: "fictional-submit-secret-123" };
    const dir = bundle({ "a.js": "fictional-submit-secret-123", "b.js": "see http://fictional-api.example.test:4000/x", "c.js": "fine" });
    const found = await findSecrets([dir], env);
    expect(found).toHaveLength(2);
    expect(found.join("\n")).toContain("COMPANY_OS_SUBMIT_TOKEN");
    expect(found.join("\n")).not.toContain("fictional-submit-secret-123");
    expect(found.join("\n")).not.toContain("fictional-api.example.test");
  });

  it("ignores empty or very short environment values (they would match anything)", async () => {
    const dir = bundle({ "a.js": "abc" });
    expect(await findSecrets([dir], { COMPANY_OS_READ_TOKEN: "", CLERK_SECRET_KEY: "ab" })).toEqual([]);
  });

  it("looks inside nested folders and source maps, and skips folders that don't exist", async () => {
    const dir = bundle({ "deep/er/x.js.map": '{"sourcesContent":["cos_svc_1_fictional"]}' });
    expect(await findSecrets([dir, path.join(dir, "missing")])).toHaveLength(1);
  });
});
