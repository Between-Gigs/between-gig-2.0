// The app's routes as each build sees them, from the file tree. The Pages export uses Next's default page extensions;
// the server build adds "server.tsx" and "server.ts" (next.config.ts), so *.server.* files exist only there
// (F1's route handlers under app/api and app/media, proxy.server.ts). Used by check-pages.mjs and check-server.mjs.
import fs from "node:fs";
import path from "node:path";

const EXPORT_EXTS = ["tsx", "ts", "jsx", "js"];
export const SERVER_EXTS = [...EXPORT_EXTS, "server.tsx", "server.ts"];

/** [{ path, kind: "page" | "route", dynamic, serverOnly }], sorted by path; private (_x) folders skipped, groups dropped. */
export function appRoutes(root, { server }) {
  const exts = server ? SERVER_EXTS : EXPORT_EXTS;
  const routes = [];
  const walk = (dir, segments) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) {
        if (e.name.startsWith("_") || e.name === "node_modules") continue;
        const keep = !/^\(.*\)$/.test(e.name) && !e.name.startsWith("@");
        walk(path.join(dir, e.name), keep ? [...segments, e.name] : segments);
        continue;
      }
      const m = /^(page|route)\.(.+)$/.exec(e.name);
      if (!m || !exts.includes(m[2])) continue;
      const p = `/${segments.join("/")}`;
      routes.push({ path: p, kind: m[1], dynamic: segments.some((s) => s.startsWith("[")), serverOnly: m[2].startsWith("server.") });
    }
  };
  walk(path.join(root, "app"), []);
  return routes.sort((a, b) => a.path.localeCompare(b.path));
}
