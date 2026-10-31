// The server build for Railway (decision N-03): `pnpm build:server`. Production and test serve only the ship list's
// "Make live" routes (public/artifacts/ship-list/). The internal tools and the pages still waiting on the client are
// taken out of the tree for the build, into a dot folder Next and TypeScript don't look in, and put back afterwards,
// so they are not in the output and 404 — no runtime check. Then the standalone server gets its static files.
//   node scripts/server-build.mjs        (BG_BUILD=server is set here; checked by scripts/check-server.mjs)
import { spawnSync } from "node:child_process";
import fs from "node:fs";
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

/** The 18 "Make live" routes, with a made-up sample id for the dynamic ones. */
export const LIVE_ROUTES = [
  "/", "/professionals/", "/storyboard/", "/privacy/", "/terms/", "/licensing-insurance/", "/provider-standards/",
  "/join/", "/login/", "/profile/canvas/", "/profile/edit/", "/profile/", "/p/maya/",
  "/owners/", "/owners/review/", "/owners/people/", "/owners/people/maya/", "/owners/waitlist/",
];

/** Where the internal folders wait during the build (gitignored). */
export const HOLD = ".server-build-held";

const held = (root, dir) => path.join(root, HOLD, dir);

/** Puts back whatever is held. Checks every folder first, so a conflict changes nothing. */
export function restoreInternal(root) {
  const moves = INTERNAL.filter((dir) => fs.existsSync(held(root, dir)));
  const both = moves.filter((dir) => fs.existsSync(path.join(root, dir)));
  if (both.length) {
    throw new Error(`server-build: ${both.join(", ")} exist both in the tree and in ${HOLD}/. Compare them, keep one, and delete the other by hand.`);
  }
  for (const dir of moves) fs.renameSync(held(root, dir), path.join(root, dir));
  fs.rmSync(path.join(root, HOLD), { recursive: true, force: true });
}

/** Takes the internal folders out of the tree (restoring a previous, interrupted build's first). */
export function excludeInternal(root) {
  restoreInternal(root);
  for (const dir of INTERNAL) {
    if (!fs.existsSync(path.join(root, dir))) continue;
    fs.mkdirSync(path.dirname(held(root, dir)), { recursive: true });
    fs.renameSync(path.join(root, dir), held(root, dir));
  }
}

function build(root) {
  excludeInternal(root);
  const restore = () => { try { restoreInternal(root); } catch (err) { console.error(String(err)); } };
  const onSignal = (sig) => { restore(); process.kill(process.pid, sig); };
  process.once("SIGINT", onSignal);
  process.once("SIGTERM", onSignal);
  try {
    fs.rmSync(path.join(root, ".next"), { recursive: true, force: true });
    const next = spawnSync(process.execPath, [path.join(root, "node_modules/next/dist/bin/next"), "build"], {
      cwd: root, stdio: "inherit", env: { ...process.env, BG_BUILD: "server" },
    });
    if (next.status !== 0) return next.status ?? 1;
    // The standalone server serves .next/static and public/ only from its own folder. Copied while the internal
    // public folders are still held, so they never reach it.
    const out = path.join(root, ".next/standalone");
    if (!fs.existsSync(path.join(out, "server.js"))) { console.error("server-build: no .next/standalone/server.js"); return 1; }
    fs.cpSync(path.join(root, ".next/static"), path.join(out, ".next/static"), { recursive: true });
    fs.cpSync(path.join(root, "public"), path.join(out, "public"), { recursive: true });
    return 0;
  } finally {
    restore();
    process.off("SIGINT", onSignal);
    process.off("SIGTERM", onSignal);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(build(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")));
}
