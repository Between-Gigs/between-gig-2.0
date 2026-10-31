import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readlinkSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { makeBundle } from "./make-bundle.mjs";

// What the deploy workflows upload with `railway up`: the standalone server, its static files and a Dockerfile.
const dirs: string[] = [];
afterEach(() => { for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true }); });
const temp = () => { const d = mkdtempSync(path.join(tmpdir(), "bg-bundle-")); dirs.push(d); return d; };
function fakeBuild(extra: Record<string, string> = {}) {
  const root = temp();
  const file = (rel: string, text: string) => { mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); writeFileSync(path.join(root, rel), text); };
  file(".next/standalone/server.js", "server");
  file(".next/standalone/node_modules/.pnpm/next@1/node_modules/next/index.js", "next");
  symlinkSync(".pnpm/next@1/node_modules/next", path.join(root, ".next/standalone/node_modules/next"));
  file(".next/standalone/.next/static/chunks/a.js", "ok");
  file(".next/standalone/public/img/a.svg", "<svg/>");
  file("scripts/import-waitlist.mjs", "export async function runImport() {}");
  for (const [rel, text] of Object.entries(extra)) file(rel, text);
  return root;
}

describe("makeBundle", () => {
  it("copies the standalone server, keeping pnpm's relative links, and adds the Dockerfile", async () => {
    const root = fakeBuild();
    const out = path.join(temp(), "web");
    await makeBundle({ root, out, env: {} });
    expect(readFileSync(path.join(out, "server.js"), "utf8")).toBe("server");
    expect(lstatSync(path.join(out, "node_modules/next")).isSymbolicLink()).toBe(true);
    expect(readlinkSync(path.join(out, "node_modules/next"))).toBe(".pnpm/next@1/node_modules/next");
    expect(readFileSync(path.join(out, "node_modules/next/index.js"), "utf8")).toBe("next");
    // The one-time importer runs in this container (the only place that reaches the private API).
    expect(readFileSync(path.join(out, "tools/import-waitlist.mjs"), "utf8")).toContain("runImport");
    const docker = readFileSync(path.join(out, "Dockerfile"), "utf8");
    expect(docker).toMatch(/^FROM node:22\.\d+\.\d+-bookworm-slim@sha256:[0-9a-f]{64}$/m);
    expect(docker).toMatch(/^USER node$/m);
    expect(docker).toMatch(/^CMD \["node", "server\.js"\]$/m);
  });

  it("refuses a bundle with a secret in what browsers download, and leaves nothing behind", async () => {
    const root = fakeBuild({ ".next/standalone/.next/static/chunks/b.js": 'x="cos_svc_9_fictional"' });
    const out = path.join(temp(), "web");
    await expect(makeBundle({ root, out, env: {} })).rejects.toThrow(/secret/);
    expect(existsSync(out)).toBe(false);
  });

  it("refuses an output folder inside the checkout, or one that isn't a previous bundle", async () => {
    const root = fakeBuild();
    await expect(makeBundle({ root, out: path.join(root, "bundle"), env: {} })).rejects.toThrow(/outside/);
    const busy = temp();
    writeFileSync(path.join(busy, "notes.txt"), "keep me");
    await expect(makeBundle({ root, out: busy, env: {} })).rejects.toThrow(/not empty/);
    expect(readFileSync(path.join(busy, "notes.txt"), "utf8")).toBe("keep me");
  });

  it("refuses a link that points outside the bundle (it would be missing on Railway)", async () => {
    const root = fakeBuild();
    symlinkSync("/etc", path.join(root, ".next/standalone/node_modules/outside"));
    const out = path.join(temp(), "web");
    await expect(makeBundle({ root, out, env: {} })).rejects.toThrow(/outside the bundle/);
    expect(existsSync(out)).toBe(false);
  });

  it("needs a server build", async () => {
    const root = temp();
    await expect(makeBundle({ root, out: path.join(temp(), "web"), env: {} })).rejects.toThrow(/build:server/);
  });
});
