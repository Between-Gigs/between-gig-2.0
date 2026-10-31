// The server build for Railway (decision N-03): `pnpm build:server`. Production and test serve only the ship list's
// "Make live" routes (public/artifacts/ship-list/). The build runs in a temporary copy of the working tree that leaves
// out the internal tools and the pages still waiting on the client, so they are not in the output and 404 — no
// runtime check — and the real app/ is never touched, whatever happens to the build. Only .next comes back.
//   node scripts/server-build.mjs        (BG_BUILD=server is set here; checked by scripts/check-server.mjs)
import { execFileSync, spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Internal (workspace, Studio, previews, email gallery; the handoff pages, Studio's source copy, the preview guide's
 * thumbnails and the workspace's covers) and waiting on the client (Crew Call, proposals).
 */
export const INTERNAL = [
  "app/workspace", "app/studio", "app/preview", "app/emails", "app/crew-call", "app/proposals",
  "public/artifacts", "public/studio-source", "public/thumbs", "public/workspace",
];

/** The 18 "Make live" pages, as app routes. A page in neither this list nor INTERNAL fails `pnpm test`. */
export const LIVE_PAGES = [
  "/", "/join", "/licensing-insurance", "/login", "/owners", "/owners/people", "/owners/people/[id]", "/owners/review",
  "/owners/waitlist", "/p/[slug]", "/privacy", "/professionals", "/profile", "/profile/canvas", "/profile/edit",
  "/provider-standards", "/storyboard", "/terms",
];

/** The same, as URLs to request, with a made-up sample id for the dynamic ones. */
export const LIVE_ROUTES = [
  "/", "/professionals/", "/storyboard/", "/privacy/", "/terms/", "/licensing-insurance/", "/provider-standards/",
  "/join/", "/login/", "/profile/canvas/", "/profile/edit/", "/profile/", "/p/maya/",
  "/owners/", "/owners/review/", "/owners/people/", "/owners/people/maya/", "/owners/waitlist/",
];

/** Top-level public/ folders the live pages and the emails use. Any other must be in INTERNAL. */
export const PUBLIC_LIVE = ["art", "cursors", "email", "img", "og"];

const isInternal = (rel) => INTERNAL.some((dir) => rel === dir || rel.startsWith(`${dir}/`));

/** node_modules into the copy: a copy-on-write clone (macOS) or hard links (Linux), else a plain copy. */
function cloneNodeModules(from, to) {
  const tries = process.platform === "darwin" ? [["-cR"], ["-R"]] : [["-al"], ["-R"]];
  for (const flags of tries) if (spawnSync("cp", [...flags, from, to], { stdio: "ignore" }).status === 0) return;
  throw new Error("server-build: could not copy node_modules");
}

/** Copies the working tree as git sees it (committed, changed and new files; not ignored ones) minus INTERNAL. */
export function stageCopy(root, dest) {
  const listed = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], { cwd: root, encoding: "utf8" });
  const files = [...new Set(listed.split("\0").filter(Boolean))];
  fs.mkdirSync(dest, { recursive: true });
  for (const rel of files) {
    if (isInternal(rel)) continue;
    const from = path.join(root, rel);
    const st = fs.lstatSync(from, { throwIfNoEntry: false });
    if (!st) continue; // deleted in the working tree
    fs.mkdirSync(path.dirname(path.join(dest, rel)), { recursive: true });
    if (st.isSymbolicLink()) fs.symlinkSync(fs.readlinkSync(from), path.join(dest, rel));
    else fs.copyFileSync(from, path.join(dest, rel));
  }
  if (fs.existsSync(path.join(root, "node_modules"))) cloneNodeModules(path.join(root, "node_modules"), path.join(dest, "node_modules"));
}

function moveDir(from, to) {
  fs.rmSync(to, { recursive: true, force: true });
  try { fs.renameSync(from, to); } catch (err) {
    if (err?.code !== "EXDEV") throw err;
    fs.cpSync(from, to, { recursive: true, verbatimSymlinks: true });
  }
}

/** Builds in a temporary copy; on success replaces root/.next with its .next. Resolves to the exit status. */
export async function build(root, { nextBin, tmp = os.tmpdir(), quiet = false } = {}) {
  // The real path: macOS's temp folder is behind a symlink, and Next loaded through two paths breaks the build.
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(tmp, "bg-server-build-")));
  const src = path.join(dir, "src");
  const cleanup = () => fs.rmSync(dir, { recursive: true, force: true });
  let child;
  const onSignal = (sig) => { child?.kill(sig); cleanup(); process.exit(130); };
  process.once("SIGINT", onSignal);
  process.once("SIGTERM", onSignal);
  try {
    stageCopy(root, src);
    // The copy has no .git: next.config.ts takes the build's commit from GITHUB_SHA.
    let sha = process.env.GITHUB_SHA ?? "";
    if (!sha) { try { sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(); } catch { /* not a checkout */ } }
    // The copy's own next: the one its code imports (two instances of Next break the build).
    child = spawn(process.execPath, [nextBin ?? path.join(src, "node_modules/next/dist/bin/next"), "build"], { cwd: src, stdio: quiet ? "ignore" : "inherit", env: { ...process.env, BG_BUILD: "server", ...(sha ? { GITHUB_SHA: sha } : {}) } });
    const status = await new Promise((resolve) => child.on("close", (code) => resolve(code ?? 1)));
    if (status !== 0) return status;
    // The standalone server serves .next/static and public/ only from its own folder (the copy's public/ has no
    // internal folder).
    const out = path.join(src, ".next/standalone");
    if (!fs.existsSync(path.join(out, "server.js"))) { console.error("server-build: no .next/standalone/server.js"); return 1; }
    fs.cpSync(path.join(src, ".next/static"), path.join(out, ".next/static"), { recursive: true });
    if (fs.existsSync(path.join(src, "public"))) fs.cpSync(path.join(src, "public"), path.join(out, "public"), { recursive: true });
    moveDir(path.join(src, ".next"), path.join(root, ".next"));
    return 0;
  } finally {
    process.off("SIGINT", onSignal);
    process.off("SIGTERM", onSignal);
    cleanup();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(await build(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")));
}
