import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { classify, normalizeScript, validateConfig } from "./affected-areas.mjs";
import { importProblems } from "./area-imports.mjs";

// scripts/ci/areas.json decides which checks a change runs (playbook rule E14). No check may be lost: every script
// the Signup checks workflow ran before CI by area (origin/main at e7f73aa) must sit in some area.
const root = new URL("../../", import.meta.url);
const config = JSON.parse(readFileSync(new URL("scripts/ci/areas.json", root), "utf8"));
const repoFiles = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" }).split("\n").filter(Boolean);

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
      config, files: repoFiles, read: (p: string) => readFileSync(new URL(p, root), "utf8"),
      aliases: { "@/": "", "@ds/": "packages/design-system/src/" },
    });
    expect(problems).toEqual([]);
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
    const mode = (...files: string[]) => classify(files, config, { protectedPaths: ["scripts/ci/areas.json"] });
    expect(mode("AGENTS.md", ".claude/settings.json").mode).toBe("none");
    expect(mode("docs/ui-rules.md").mode).toBe("fast");
    for (const shared of ["package.json", "pnpm-lock.yaml", "lib/auth/clerk.ts", "components/auth/LoginView.tsx", "app/layout.tsx",
      "app/globals.css", "lib/server/staff.ts", "components/ds/atoms/index.tsx", ".github/workflows/checks.yml", "scripts/ci/qa-flow.mjs"]) {
      expect(mode(shared).mode, shared).toBe("all");
    }
    expect(mode("app/totally-new/page.tsx").mode).toBe("all");
    expect(mode("app/profile/page.tsx")).toMatchObject({ mode: "areas", areas: ["profile"] });
    expect(mode("app/page.tsx", "app/owners/staff/page.tsx")).toMatchObject({ mode: "areas", areas: ["owners", "public", "staff"] });
    // A helper imported across areas is shared: a change to it runs everything.
    expect(mode("lib/profile/skills.ts").mode).toBe("all");
    // A QA script's own file runs its area.
    expect(mode("scripts/qa/home-hero.mjs")).toMatchObject({ mode: "areas", areas: ["public"] });
  });
});
