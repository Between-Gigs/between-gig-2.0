import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildGraph, classify, graphProblems, matchGlob, normalizeScript, validateConfig } from "./affected-areas.mjs";
import { importProblems } from "./area-imports.mjs";

// scripts/ci/areas.json decides which checks a change runs (playbook rule E14). No check may be lost: every script
// the Signup checks workflow ran before CI by area (origin/main at e7f73aa) must sit in some area.
const root = new URL("../../", import.meta.url);
const config = JSON.parse(readFileSync(new URL("scripts/ci/areas.json", root), "utf8"));
const repoFiles = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" }).split("\n").filter(Boolean);
const read = (p: string) => readFileSync(new URL(p, root), "utf8");
// v2: app/, components/, lib/, emails/ and styles/ are classified by their importers (graph in areas.json).
const graph = buildGraph({ config, files: repoFiles.filter((f) => existsSync(new URL(f, root))), read });

// The QA scripts the old checks.yml ran, as `node <path>`, in workflow order.
const OLD_QA_SCRIPTS = [
  "scripts/qa/auth-data.mjs",
  "scripts/qa/auth-preview.mjs",
  "scripts/qa/auth-flow.mjs",
  "scripts/qa/profile-entry.mjs",
  "scripts/qa/hub-staff.mjs",
  "scripts/qa/owner-sidebar.mjs",
  "scripts/qa/admin-shell.mjs",
  "scripts/qa/admin-navigation.mjs",
  "scripts/qa/navigation-modes.mjs",
  "scripts/qa/staff-navigation.mjs",
  "scripts/qa/staff-access-planner.mjs",
  "scripts/qa/social-preview.mjs",
  "scripts/qa/signed-out-navigation.mjs",
  "scripts/qa/home-hero.mjs",
  "scripts/qa/storyboard-profile.mjs",
  "scripts/qa/professionals-copy.mjs",
  "scripts/qa/sample-order.mjs",
  "scripts/qa/portfolio-edit-guards.mjs",
  "scripts/qa/patti-editor-presentation.mjs",
  "scripts/qa/profile-guidance.mjs",
  "scripts/qa/service-labels.mjs",
  "scripts/qa/service-guidance.mjs",
  "scripts/qa/service-conversion-guard.mjs",
  "scripts/qa/gigster-priority.mjs",
  "scripts/qa/funnel-cohort.mjs",
  "scripts/qa/clerk-entry.mjs",
  "scripts/qa/clerk-contract.mjs",
  "scripts/qa/server-hub.mjs",
];
// Removed on purpose by the CI-by-area plan: PR #89's approval capture, a one-off screenshot step, not a check.
const REMOVED = ["scripts/qa/auth-preview.mjs"];
// Old steps that needed more than `node <script>` run through a wrapper; the old command → the area script.
const WRAPPED: Record<string, string> = {
  "pnpm qa:flow": "scripts/ci/qa-flow.mjs",
  // after the Clerk Pages build (base path + test publishable key)
  "scripts/qa/clerk-entry.mjs": "scripts/ci/clerk-entry.mjs",
};
// Old steps that stay as the fast job's own workflow steps (they run whenever the mode is not none).
const FAST_STEPS = ["pnpm typecheck", "pnpm lint", "pnpm lint:values", "pnpm test", "pnpm build", "node scripts/check-pages.mjs",
  "pnpm build:server && pnpm build:preview && pnpm check:server", "pnpm build:server && node scripts/check-split.mjs"];

const areaScripts = Object.values(config.areas as Record<string, { scripts: unknown[] }>).flatMap((a) => a.scripts.map((s) => normalizeScript(s)));
const listed = new Set(areaScripts.map((s) => s.name));

describe("scripts/ci/areas.json", () => {
  it("is valid, every glob matches a tracked file, and every old workflow script is in an area (no check lost)", () => {
    expect(OLD_QA_SCRIPTS).toHaveLength(28); // 28 `node scripts/qa/…` lines; 27 once the auth-preview capture is removed
    const workflowScripts = [
      ...OLD_QA_SCRIPTS.filter((s) => !REMOVED.includes(s)).map((s) => WRAPPED[s] ?? s),
      WRAPPED["pnpm qa:flow"],
    ];
    expect(validateConfig(config, { workflowScripts, repoFiles })).toEqual([]);
  });

  it("no file in an area is imported from shared, fast, unknown or another area's code (areas.json cannot fail open)", () => {
    const problems = importProblems({
      config, files: repoFiles, read,
      aliases: { "@/": "", "@ds/": "packages/design-system/src/" },
    });
    expect(problems).toEqual([]);
  });

  it("the import graph has no blind spot (no non-literal import, no unresolved specifier, no dead glob or seam)", () => {
    expect(graphProblems({ config, files: repoFiles, read })).toEqual([]);
  });

  // Every page a QA script visits (and the layouts above it) is an entry of each area that runs the script: a change
  // only that page imports must run the script. Visits are the route-like string literals in the script, matched to
  // app/**/page.tsx and route handlers (route groups dropped, [param] and [[...path]] segments as wildcards).
  it("each area's graph.entries cover every page its QA scripts visit", () => {
    const appFiles = repoFiles.filter((f) => f.startsWith("app/"));
    const pages = appFiles.filter((f) => /(^|\/)(page\.tsx|route\.server\.ts|route\.ts)$/.test(f));
    const routeOf = (f: string) => "/" + f.replace(/^app\/?/, "").replace(/(^|\/)(page\.tsx|route\.server\.ts|route\.ts)$/, "").split("/").filter((x) => x && !/^\(.*\)$/.test(x)).join("/");
    const re = (r: string) => new RegExp("^" + r.replace(/\/\[\[\.\.\.[^\]]+\]\]/g, "(?:/.*)?").replace(/\[\.\.\.[^\]]+\]/g, ".+").replace(/\[[^\]]+\]/g, "[^/]+") + "/?$");
    const table = pages.map((f) => ({ f, r: re(routeOf(f)), route: routeOf(f) }));
    const pageFor = (u: string) => {
      const hits = table.filter((t) => t.r.test(u));
      const exact = hits.filter((t) => !t.route.includes("["));
      return (exact.length ? exact : hits).map((t) => t.f);
    };
    const layoutsAbove = (f: string) => {
      const parts = f.split("/");
      const out: string[] = [];
      for (let i = parts.length - 1; i >= 2; i--) {
        const l = `${parts.slice(0, i).join("/")}/layout.tsx`;
        if (appFiles.includes(l)) out.push(l);
      }
      return out;
    };
    const missing: string[] = [];
    for (const [area, a] of Object.entries(config.areas as Record<string, { scripts: unknown[] }>)) {
      for (const sc of a.scripts.map((x) => normalizeScript(x).name as string)) {
        for (const m of read(sc).matchAll(/["'`](\/(?:between-gig-2\.0\/)?[a-z][a-z0-9\-/[\]]*)/g)) {
          const u = m[1].replace(/^\/between-gig-2\.0/, "").replace(/\/+$/, "") || "/";
          for (const p of pageFor(u)) for (const f of [p, ...layoutsAbove(p)]) {
            if (!config.graph.entries[area].some((g: string) => matchGlob(g, f))) missing.push(`${area}: ${f} (${sc} visits ${u})`);
          }
        }
      }
    }
    expect([...new Set(missing)]).toEqual([]);
  });

  it("runs every script with node, and every listed script exists", () => {
    expect(config.runner).toEqual(["node"]);
    for (const name of listed) expect(existsSync(new URL(name, root)), name).toBe(true);
  });

  it("the removed capture step is not run anywhere", () => {
    for (const s of REMOVED) expect(listed.has(s), s).toBe(false);
    expect(readFileSync(new URL(".github/workflows/checks.yml", root), "utf8")).not.toContain("auth-preview");
  });

  it("the fast job keeps every old non-QA step", () => {
    const yml = readFileSync(new URL(".github/workflows/checks.yml", root), "utf8");
    for (const s of FAST_STEPS) expect(yml, s).toContain(s);
  });

  it("the wrappers run what the old steps ran", () => {
    expect(readFileSync(new URL("scripts/ci/qa-flow.mjs", root), "utf8")).toMatch(/"qa:flow"/);
    const clerk = readFileSync(new URL("scripts/ci/clerk-entry.mjs", root), "utf8");
    expect(clerk).toContain("scripts/qa/clerk-entry.mjs");
    const entry = areaScripts.find((s) => s.name === "scripts/ci/clerk-entry.mjs")!;
    expect(entry.env).toEqual({ NEXT_PUBLIC_BASE_PATH: "/between-gig-2.0", NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: expect.stringMatching(/^pk_test_/) });
    expect(areaScripts.find((s) => s.name === "scripts/qa/server-hub.mjs")!.env).toEqual({ QA_SCREENSHOT_DIR: "deliverables/server-hub" });
  });

  it("the cross-area flow script runs for every area it covers", () => {
    for (const area of ["signup", "profile", "owners", "preview"]) {
      expect(config.areas[area].scripts.map((s: unknown) => normalizeScript(s).name), area).toContain("scripts/ci/qa-flow.mjs");
    }
  });

  it("classifies the shapes the plan names", () => {
    const mode = (...files: string[]) => classify(files, config, { protectedPaths: ["scripts/ci/areas.json"], graph });
    expect(mode("AGENTS.md", ".claude/settings.json").mode).toBe("none");
    expect(mode("docs/ui-rules.md").mode).toBe("fast");
    for (const shared of ["package.json", "pnpm-lock.yaml", "lib/auth/clerk.ts", "components/auth/LoginView.tsx", "app/layout.tsx",
      "app/globals.css", "components/ds/atoms/index.tsx", ".github/workflows/checks.yml", "scripts/ci/qa-flow.mjs"]) {
      expect(mode(shared).mode, shared).toBe("all");
    }
    // A page no area lists, and code the root layout mounts on every page (AdminRoutes wraps every page in OwnerFrame).
    expect(mode("app/totally-new/page.tsx").mode).toBe("all");
    expect(mode("components/owners/OwnerShell.tsx").mode).toBe("all");
    expect(mode("components/site/Page.tsx").mode).toBe("all");
    // v2: a page or helper runs the areas whose QA scripts visit a page that imports it (other areas' scripts visit
    // these routes too, so most changes run several areas).
    const areas = (...files: string[]) => mode(...files).areas.join(",");
    expect(areas("app/profile/page.tsx")).toBe("profile,public,signup");
    expect(areas("app/page.tsx", "app/owners/staff/page.tsx")).toBe("emails,hub,owners,preview,profile,public,staff");
    expect(areas("lib/profile/skills.ts")).toBe("hub,owners,preview,profile,signup,staff");
    expect(areas("lib/server/staff.ts")).toBe("emails,hub,owners,preview,staff");
    expect(areas("components/emails/EmailPreview.tsx")).toBe("emails,hub,owners,preview,staff");
    expect(areas("components/landing/ForProfessionals.tsx")).toBe("hub,owners,public");
    for (const f of ["lib/profile/skills.ts", "components/landing/ForProfessionals.tsx"]) expect(mode(f).mode, f).toBe("areas");
    // A QA script's own file runs its area.
    expect(mode("scripts/qa/home-hero.mjs")).toMatchObject({ mode: "areas", areas: ["public"] });
  });
});
