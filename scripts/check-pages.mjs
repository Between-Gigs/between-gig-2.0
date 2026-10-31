// Checks the GitHub Pages export (`pnpm build`, out/): every page route is there (a dynamic one with at least one
// prerendered value), and nothing that exists only in the server build (*.server.ts(x): F1's API and media route
// handlers) is. Exits 1 on any failure.
//   node scripts/check-pages.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { appRoutes } from "./routes.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "out");
const failures = [];
if (!fs.existsSync(path.join(OUT, "index.html"))) { console.error("❌ check-pages: no out/index.html. Run pnpm build first."); process.exit(1); }

/** The route's path up to its first dynamic segment. */
const staticPart = (p) => p.split("/").slice(0, p.split("/").findIndex((s) => s.startsWith("[")) >>> 0).join("/");

const pages = appRoutes(ROOT, { server: false }).filter((r) => r.kind === "page");
for (const r of pages) {
  if (!r.dynamic) {
    if (!fs.existsSync(path.join(OUT, r.path, "index.html"))) failures.push(`${r.path}: no out${r.path}/index.html`);
    continue;
  }
  const dir = path.join(OUT, staticPart(r.path));
  const some = fs.existsSync(dir) && fs.readdirSync(dir, { withFileTypes: true }).some((e) => e.isDirectory() && fs.existsSync(path.join(dir, e.name, "index.html")));
  if (!some) failures.push(`${r.path}: nothing prerendered under out${staticPart(r.path)}/`);
}

const serverOnly = appRoutes(ROOT, { server: true }).filter((r) => r.serverOnly);
for (const r of serverOnly) {
  const p = r.dynamic ? staticPart(r.path) : r.path;
  if (p && fs.existsSync(path.join(OUT, p))) failures.push(`${r.path} exists only in the server build, but out${p} is there`);
}

if (failures.length) { console.error(`❌ check-pages: ${failures.length} problem(s):\n  - ${failures.join("\n  - ")}`); process.exit(1); }
console.log(`✅ check-pages: all ${pages.length} page routes in out/; none of the ${serverOnly.length} server-only routes`);
