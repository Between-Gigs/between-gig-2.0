// Code splitting (owner, 2026-11-02), checked on the server build (`pnpm build:server`): the public site's pages load
// no dashboard code (the owners' workspace, the profile builder and canvas), and a live build (NEXT_PUBLIC_DATA_SOURCE
// =api) ships no sample data on any page. Reads each page's client manifest and the chunks it lists. Exits 1 on any
// problem.
//   node scripts/check-split.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { LIVE_PAGES } from "./server-build.mjs";

/** The public site: anyone may open these. */
export const SITE_ROUTES = [
  "/", "/professionals", "/storyboard", "/privacy", "/terms", "/licensing-insurance", "/provider-standards",
  "/p/[slug]", "/join", "/login", "/preview-access",
];
/** The dashboards: signed-in Gigsters (profile) and owners. */
export const DASHBOARD_ROUTES = [
  "/owners", "/owners/people", "/owners/people/[id]", "/owners/review", "/owners/waitlist", "/profile", "/profile/canvas", "/profile/edit",
];
/** Client modules only the dashboards may load. The public profile's own views (PublicProfile, ProfileView) are the site's. */
export const DASHBOARD_MODULES = [
  /^components\/owners\//, /^components\/builder\//, /^components\/canvas\//,
  /^components\/profile\/(MyProfile|PhotoPicker|ChipPicker|LiveEditWarning)\.tsx$/,
];
/** The sample store's localStorage key, in lib/data/sample.ts only. */
export const SAMPLE_MARKER = "bg2-sample-v2";
/** The made-up people's IMDb link, in lib/data/seed.ts only. */
export const SEED_MARKER = "nm0000000";
/** What every dashboard file puts in its chunk (lib/split-area.ts). Unlike the manifest, it shows however the code got in. */
export const DASHBOARD_MARKER = "bg-split:dashboard";

/**
 * Problems, one line each. pages: [{ route, modules: project-relative client module paths, chunks: [{ name, text }] }].
 * live: a live build (no sample data allowed). expect: routes that must be in the build.
 */
export function splitProblems(pages, { live, expect = [] }) {
  const problems = [];
  const known = new Set([...SITE_ROUTES, ...DASHBOARD_ROUTES]);
  for (const p of pages) {
    if (!known.has(p.route)) { problems.push(`${p.route} is neither a site nor a dashboard route (scripts/check-split.mjs)`); continue; }
    if (SITE_ROUTES.includes(p.route)) {
      for (const mod of p.modules) if (DASHBOARD_MODULES.some((re) => re.test(mod))) problems.push(`${p.route} loads dashboard code: ${mod}`);
      const dash = p.chunks.find((c) => c.text.includes(DASHBOARD_MARKER));
      if (dash) problems.push(`${p.route} ships dashboard code (${dash.name})`);
    }
    if (live) {
      const leaked = p.chunks.find((c) => c.text.includes(SAMPLE_MARKER) || c.text.includes(SEED_MARKER));
      if (leaked) problems.push(`${p.route} ships the sample data (${leaked.name})`);
    }
  }
  for (const route of expect) if (!pages.some((p) => p.route === route)) problems.push(`${route} is not in the build`);
  return problems;
}

/** Each live page's client modules (project-relative) and chunks, from the server build's client reference manifests. */
export function readPages(root) {
  const app = path.join(root, ".next/server/app");
  const pages = [];
  for (const route of LIVE_PAGES) {
    const file = path.join(app, route === "/" ? "" : route.slice(1), "page_client-reference-manifest.js");
    if (!fs.existsSync(file)) continue;
    const sandbox = { globalThis: {} };
    sandbox.globalThis = sandbox;
    vm.runInNewContext(fs.readFileSync(file, "utf8"), sandbox);
    const manifest = Object.values(sandbox.__RSC_MANIFEST ?? {})[0] ?? {};
    const modules = Object.keys(manifest.clientModules ?? {}).map((k) => k.replace(/^\[project\]\//, "").replace(/ <.*$/, ""));
    const names = new Set(Object.values(manifest.entryJSFiles ?? {}).flat());
    for (const m of Object.values(manifest.clientModules ?? {})) for (const c of m.chunks ?? []) names.add(c);
    const chunks = [...names].map((name) => {
      const p = path.join(root, ".next", name.replace(/^\/_next\//, ""));
      return { name, text: fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "" };
    });
    pages.push({ route, modules, chunks });
  }
  return pages;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const live = process.env.NEXT_PUBLIC_DATA_SOURCE === "api";
  const problems = splitProblems(readPages(root), { live, expect: LIVE_PAGES });
  if (problems.length) {
    console.error(`❌ check-split: ${problems.length} problem(s):\n  - ${problems.join("\n  - ")}`);
    process.exit(1);
  }
  console.log(`✅ check-split: ${LIVE_PAGES.length} pages; the site loads no dashboard code${live ? "; no page ships the sample data" : " (sample build: the sample data is expected)"}`);
}
