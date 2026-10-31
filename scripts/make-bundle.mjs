// Assembles what `railway up` uploads for the 2.0 server (`web` in Railway project "Between Gigs OS"): the standalone
// Next server from `pnpm build:server`, and a Dockerfile that only runs it (.railway/railway.ts builds with it).
// `railway up` drops symlinks from its upload, and pnpm's node_modules is made of them, so node_modules travels as
// node_modules.tar (links kept) and the Dockerfile's ADD unpacks it. Refuses a bundle whose browser files carry a
// secret (check-bundle.mjs).
//   node scripts/make-bundle.mjs <out-dir>     (outside the checkout)
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findSecrets } from "./check-bundle.mjs";

const MARKER = ".bg-web-bundle";
// Pinned by digest: the image is part of what a release deploys.
const DOCKERFILE = `# Written by scripts/make-bundle.mjs: runs the prebuilt standalone Next server. Nothing is installed or built here.
FROM node:22.22.0-bookworm-slim@sha256:dd9d21971ec4395903fa6143c2b9267d048ae01ca6d3ea96f16cb30df6187d94
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
COPY --chown=node:node . .
ADD --chown=node:node node_modules.tar /app/
USER node
CMD ["node", "server.js"]
`;

/**
 * Copies a tree, keeping symlinks as they are: pnpm's node_modules resolve through them (a package finds its own
 * dependencies next to its real folder under .pnpm/). Each must be relative and stay inside the bundle.
 */
function copyTree(from, to, top = to, skip = new Set()) {
  if (skip.has(from)) return;
  const stat = fs.lstatSync(from);
  if (stat.isSymbolicLink()) {
    const target = fs.readlinkSync(from);
    const lands = path.relative(top, path.resolve(path.dirname(to), target));
    if (path.isAbsolute(target) || lands.startsWith("..") || path.isAbsolute(lands)) {
      throw new Error(`make-bundle: ${path.relative(top, to)} links outside the bundle`);
    }
    fs.symlinkSync(target, to);
  } else if (stat.isDirectory()) {
    fs.mkdirSync(to, { recursive: true });
    for (const name of fs.readdirSync(from)) copyTree(path.join(from, name), path.join(to, name), top, skip);
  } else if (stat.isFile()) fs.copyFileSync(from, to);
}

export async function makeBundle({ root, out, env = process.env }) {
  const src = path.join(root, ".next/standalone");
  const outAbs = path.resolve(out);
  const rel = path.relative(path.resolve(root), outAbs);
  const inside = rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
  const holds = !path.relative(outAbs, path.resolve(root)).startsWith("..");
  if (inside || holds) throw new Error("make-bundle: give an output folder outside the checkout (and not one that contains it)");
  if (!fs.existsSync(path.join(src, "server.js"))) throw new Error("make-bundle: no .next/standalone/server.js — run pnpm build:server first");
  const existing = fs.existsSync(outAbs) ? fs.readdirSync(outAbs) : [];
  if (existing.length && !existing.includes(MARKER)) throw new Error(`make-bundle: ${outAbs} is not empty and is not a previous bundle; refusing to replace it`);

  fs.rmSync(outAbs, { recursive: true, force: true });
  const staging = fs.mkdtempSync(path.join(os.tmpdir(), "bg-web-modules-"));
  try {
    const modules = path.join(src, "node_modules");
    copyTree(src, outAbs, outAbs, new Set([modules]));
    if (fs.existsSync(modules)) {
      // Copied first so its links are checked against the bundle's root, then archived with them.
      copyTree(modules, path.join(staging, "node_modules"), staging);
      // COPYFILE_DISABLE: no macOS metadata files in the archive (the workflows run on Linux).
      execFileSync("tar", ["-cf", path.join(outAbs, "node_modules.tar"), "-C", staging, "node_modules"], { env: { ...process.env, COPYFILE_DISABLE: "1" } });
    }
    // The one-time waitlist importer, run from a shell in this service (docs/handoff/companyos-deploy.md). Not under
    // public/: nothing serves it.
    fs.mkdirSync(path.join(outAbs, "tools"));
    fs.copyFileSync(path.join(root, "scripts/import-waitlist.mjs"), path.join(outAbs, "tools/import-waitlist.mjs"));
    fs.writeFileSync(path.join(outAbs, "Dockerfile"), DOCKERFILE);
    fs.writeFileSync(path.join(outAbs, ".dockerignore"), "Dockerfile\n.dockerignore\n");
    fs.writeFileSync(path.join(outAbs, MARKER), "Built by scripts/make-bundle.mjs; safe to replace.\n");
    const found = await findSecrets([path.join(outAbs, ".next/static"), path.join(outAbs, "public")], env);
    if (found.length) throw new Error(`make-bundle: secrets in the browser files:\n  - ${found.join("\n  - ")}`);
  } catch (err) {
    fs.rmSync(outAbs, { recursive: true, force: true });
    throw err;
  } finally {
    fs.rmSync(staging, { recursive: true, force: true });
  }
  return outAbs;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!process.argv[2]) { console.error("make-bundle: give an output folder outside the checkout"); process.exit(1); }
  try {
    const out = await makeBundle({ root: path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), out: process.argv[2] });
    console.log(`✅ make-bundle: ${out}, no secret in its browser files`);
  } catch (err) {
    console.error(`❌ ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
}
