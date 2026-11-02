// The preview for the server builds (owner, 2026-11-02): the GitHub Pages build of the whole site, every route on the
// sample data, with base path /preview, into .next/standalone/preview-site/, where lib/server/preview.ts serves it to
// super admins at /preview/. Built from a temporary copy of the working tree (as server-build.mjs does), with no Clerk
// key and no data source, so it never signs anyone in or calls Company OS. Run after `pnpm build:server`.
//   node scripts/preview-build.mjs
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stageCopy } from "./server-build.mjs";

export const PREVIEW_BASE = "/preview";

/** The export's environment: the caller's, without anything that would make it live. */
export function previewEnv(env, sha) {
  const out = { ...env, NEXT_PUBLIC_BASE_PATH: PREVIEW_BASE, ...(sha ? { GITHUB_SHA: sha } : {}) };
  for (const name of ["BG_BUILD", "NEXT_PUBLIC_DATA_SOURCE", "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY", "COMPANY_OS_URL",
    "COMPANY_OS_READ_TOKEN", "COMPANY_OS_SUBMIT_TOKEN", "COOKIE_SIGNING_SECRET", "TEST_GATE_PASSPHRASE"]) delete out[name];
  return out;
}

const run = (cmd, args, opts) => new Promise((resolve) => { const c = spawn(cmd, args, opts); c.on("close", (code) => resolve(code ?? 1)); });

export async function buildPreview(root, { tmp = os.tmpdir() } = {}) {
  const target = path.join(root, ".next/standalone");
  if (!fs.existsSync(path.join(target, "server.js"))) { console.error("preview-build: no .next/standalone/server.js. Run pnpm build:server first."); return 1; }
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(tmp, "bg-preview-build-")));
  const src = path.join(dir, "src");
  try {
    stageCopy(root, src, []);
    let sha = process.env.GITHUB_SHA ?? "";
    if (!sha) { try { sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(); } catch { /* not a checkout */ } }
    const env = previewEnv(process.env, sha);
    const opts = { cwd: src, stdio: "inherit", env };
    if (await run(process.execPath, ["scripts/studio-source.mjs"], opts) !== 0) return 1;
    if (await run(process.execPath, [path.join(src, "node_modules/next/dist/bin/next"), "build"], opts) !== 0) return 1;
    if (!fs.existsSync(path.join(src, "out/index.html"))) { console.error("preview-build: the export has no out/index.html"); return 1; }
    fs.rmSync(path.join(target, "preview-site"), { recursive: true, force: true });
    fs.cpSync(path.join(src, "out"), path.join(target, "preview-site"), { recursive: true });
    return 0;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(await buildPreview(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")));
}
