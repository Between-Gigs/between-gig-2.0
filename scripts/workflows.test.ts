import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// What the GitHub workflows must keep doing (integrated review round 1). Read as text: each step is the lines from
// its `- ` to the next step or job at the same indent.
const dir = new URL("../.github/workflows/", import.meta.url);
const read = (name: string) => readFileSync(new URL(name, dir), "utf8");
const workflows = readdirSync(dir).filter((f) => f.endsWith(".yml"));

function steps(yml: string): string[] {
  const out: string[] = [];
  let cur: string[] | null = null;
  let indent = -1;
  for (const line of yml.split("\n")) {
    const m = /^(\s*)- /.exec(line);
    const lead = line.length - line.trimStart().length;
    if (m && /^\s*- (uses|name|run|id):/.test(line)) {
      if (cur) out.push(cur.join("\n"));
      cur = [line];
      indent = m[1].length;
    } else if (cur && line.trim() && lead <= indent) {
      out.push(cur.join("\n"));
      cur = null;
    } else if (cur) cur.push(line);
  }
  if (cur) out.push(cur.join("\n"));
  return out;
}

describe("the workflows", () => {
  it("keeps Railway test on approved main commits while production remains manually released", () => {
    expect(read("deploy-test.yml")).toMatch(/push:\n\s+branches: \[main\]/);
    expect(read("deploy-prod.yml")).not.toMatch(/^  push:/m);
  });
  it("every step starts at a job's step indent (6 spaces), so none hides inside the previous step's run: | block", () => {
    for (const name of workflows) {
      read(name).split("\n").forEach((line, i) => {
        if (/^\s*- (name|uses|run|id):/.test(line)) expect(line.length - line.trimStart().length, `${name}:${i + 1}`).toBe(6);
      });
    }
  });

  it("never leave the job's token in .git/config: every checkout sets persist-credentials: false", () => {
    for (const name of workflows) {
      const checkouts = steps(read(name)).filter((s) => /uses: actions\/checkout@/.test(s));
      for (const s of checkouts) expect(s, `${name}: ${s.split("\n")[0].trim()}`).toMatch(/persist-credentials: false/);
    }
  });

  it("every action is pinned to a full commit SHA, never a movable tag (pages.yml is the authors' Pages deploy: Known gaps)", () => {
    for (const name of workflows.filter((n) => n !== "pages.yml")) {
      for (const line of read(name).split("\n")) {
        const m = /^\s*-?\s*uses:\s*(\S+)/.exec(line);
        if (m && !m[1].startsWith("./")) expect(m[1], `${name}: ${m[1]}`).toMatch(/@[0-9a-f]{40}$/);
      }
    }
  });

  it("PR checks also run the unit tests, the Pages route check and the server build with its checks", () => {
    const yml = read("checks.yml");
    expect(yml).toMatch(/pnpm test\b/);
    // In the same step as the plain export (the Clerk build in scripts/ci/clerk-entry.mjs uses a base path).
    expect(yml).toContain("run: pnpm build && node scripts/check-pages.mjs");
    expect(yml).toContain("pnpm build:server && pnpm build:preview && pnpm check:server");
  });

  it("the test deploy takes its address from the APP_URL variable, never from Railway's generated domain", () => {
    for (const name of ["deploy-test.yml", "deploy-prod.yml"]) expect(read(name), name).not.toContain("railway domain");
    expect(read("deploy-test.yml")).not.toMatch(/steps\.site/);
  });

  it("test validates APP_URL in the Require step, before the infra plan", () => {
    const s = steps(read("deploy-test.yml"));
    const req = s.findIndex((x) => x.includes("Require test configuration"));
    const plan = s.findIndex((x) => x.includes("Infra plan"));
    expect(req).toBeGreaterThan(-1);
    expect(plan).toBeGreaterThan(req);
    expect(s[req]).toContain("APP_URL: ${{ vars.APP_URL }}");
    expect(s[req]).toContain("node scripts/check-app-url.mjs --test");
  });

  it("the test build uses the APP_URL variable as the site origin", () => {
    const build = steps(read("deploy-test.yml")).find((x) => x.includes("pnpm build:server") && x.includes("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"));
    expect(build).toBeDefined();
    expect(build!).toContain("NEXT_PUBLIC_SITE_ORIGIN: ${{ vars.APP_URL }}");
  });

  it("test sends APP_URL from the variable to Railway", () => {
    const sync = steps(read("deploy-test.yml")).find((x) => x.includes("railway variable set"))!;
    expect(sync).toContain("APP_URL: ${{ vars.APP_URL }}");
    expect(sync).toMatch(/for name in [^;]*\bAPP_URL\b/);
  });

  it("the last step of the test deploy checks, from outside, that the address serves the gated site", () => {
    const deploy = read("deploy-test.yml").split(/^ {2}deploy:/m)[1];
    const last = steps(deploy).at(-1)!;
    expect(last).toContain("node scripts/smoke-test-address.mjs");
    expect(last).toContain("APP_URL: ${{ vars.APP_URL }}");
  });

  it("every server build also builds the preview export before its checks (preview, split)", () => {
    for (const name of ["checks.yml", "deploy-test.yml", "deploy-prod.yml", "release.yml"]) {
      // A live build run only for the split check (checks.yml) needs no preview.
      for (const step of steps(read(name)).filter((x) => x.includes("pnpm build:server") && !x.includes("node scripts/check-split.mjs"))) {
        expect(step, `${name}: ${step.split("\n")[0].trim()}`).toMatch(/pnpm build:server && pnpm build:preview && pnpm check:server/);
      }
    }
  });

  it("the deployed builds are checked as live builds (no sample data shipped)", () => {
    for (const name of ["deploy-test.yml", "deploy-prod.yml"]) {
      const build = steps(read(name)).find((x) => x.includes("pnpm build:server") && x.includes("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"));
      expect(build, name).toBeDefined();
      expect(build!, name).toMatch(/NEXT_PUBLIC_DATA_SOURCE: api/);
      expect(build!, name).toMatch(/pnpm check:server/);
    }
  });

  it("test requires the gate's passphrase and the signing secret before any change, and sends both to Railway", () => {
    const s = steps(read("deploy-test.yml"));
    const require = s.find((x) => x.includes("Require test configuration"))!;
    for (const name of ["TEST_GATE_PASSPHRASE", "COOKIE_SIGNING_SECRET"]) {
      expect(require).toContain(`${name}: \${{ secrets.${name} }}`);
      expect(require).toMatch(new RegExp(`\\$\\{#${name}\\} -lt \\d+`));
    }
    const sync = s.find((x) => x.includes("railway variable set"))!;
    expect(sync).toMatch(/for name in [^;]*TEST_GATE_PASSPHRASE/);
    expect(sync).toMatch(/for name in [^;]*COOKIE_SIGNING_SECRET/);
  });

  it("production requires the signing secret, refuses a test gate passphrase, and never sends one", () => {
    const yml = read("deploy-prod.yml");
    const s = steps(yml);
    const require = s.find((x) => x.includes("Require production configuration"))!;
    expect(require).toContain("COOKIE_SIGNING_SECRET: ${{ secrets.COOKIE_SIGNING_SECRET }}");
    expect(require).toContain("TEST_GATE_PASSPHRASE: ${{ secrets.TEST_GATE_PASSPHRASE }}");
    expect(require).toMatch(/if \[ -n "\$TEST_GATE_PASSPHRASE" \]/);
    const sync = s.find((x) => x.includes("railway variable set"))!;
    expect(sync).toMatch(/for name in [^;]*COOKIE_SIGNING_SECRET/);
    expect(sync).not.toContain("TEST_GATE_PASSPHRASE");
  });

  it("PR checks also check a live (api) build's code splitting, so a sample-data leak fails the PR", () => {
    const live = steps(read("checks.yml")).find((x) => x.includes("check-split.mjs"));
    expect(live).toBeDefined();
    expect(live!).toMatch(/NEXT_PUBLIC_DATA_SOURCE: api/);
    expect(live!).toMatch(/pnpm build:server && node scripts\/check-split\.mjs/);
  });
});

it("forwards the Department retirement flag only as a public variable into deployed API builds",()=>{
 for(const name of ["deploy-test.yml","deploy-prod.yml"]){
  const build=steps(read(name)).find(step=>step.includes("NEXT_PUBLIC_DATA_SOURCE: api")&&step.includes("pnpm build:server"));
  expect(build,name).toBeDefined();expect(build).toContain("NEXT_PUBLIC_PROFILE_NO_DEPARTMENT: ${{ vars.PROFILE_NO_DEPARTMENT }}");
  expect(read(name)).not.toContain("secrets.PROFILE_NO_DEPARTMENT");
 }
});

// Local activation candidate: preserve guard independently when hiding new UI.
describe("profile feature activation deployment", () => {
  it.each(["deploy-test.yml", "deploy-prod.yml"])("%s validates activation before its first infra mutation and wires the UI", name => {
    const s=steps(read(name));
    const require=s.findIndex(x=>x.includes(name==="deploy-test.yml"?"Require test configuration":"Require production configuration"));
    const mutation=s.findIndex(x=>x.includes("run: railway config plan"));
    expect(s[require]).toContain("node scripts/check-profile-activation.mjs");
    expect(mutation).toBeGreaterThan(require);
    const build=s.find(x=>x.includes("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY")&&x.includes("pnpm build:server"))!;
    expect(build).toContain("NEXT_PUBLIC_CUSTOM_SERVICE_REVIEW: ${{ vars.CUSTOM_SERVICE_REVIEW }}");
    const sync=s.find(x=>x.includes("railway variable set"))!;
    expect(sync).toContain("CUSTOM_SERVICE_REVIEW_ENABLED: ${{ vars.CUSTOM_SERVICE_REVIEW_ENABLED }}");
    expect(sync).toContain('if [ "$CUSTOM_SERVICE_REVIEW_ENABLED" = "1" ]; then');
    expect(sync).toContain('railway variable set CUSTOM_SERVICE_REVIEW_ENABLED --stdin');
  });
  it("IaC preserves the optional runtime guard without defaulting a previous activation off",()=>{
    expect(readFileSync(new URL("../.railway/railway.ts",import.meta.url),"utf8")).toMatch(/CUSTOM_SERVICE_REVIEW_ENABLED:\s*preserve\(\)/);
  });
});

it("both deployed builds and their preflights get the optional location-controls flag",()=>{
 for(const name of ["deploy-test.yml","deploy-prod.yml"]){
  const s=steps(read(name));for(const step of [s.find(x=>x.includes("Require ")&&x.includes(" configuration")),s.find(x=>x.includes("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY")&&x.includes("pnpm build:server"))])expect(step).toContain("NEXT_PUBLIC_PROFILE_LOCATION_CONTROLS: ${{ vars.PROFILE_LOCATION_CONTROLS }}");
 }
});

it("passes the optional custom-skills flag to both deployment preflight and checked build",()=>{
 for(const name of ["deploy-test.yml","deploy-prod.yml"]){const s=steps(read(name));for(const step of [s.find(x=>x.includes("Require ")&&x.includes(" configuration")),s.find(x=>x.includes("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY")&&x.includes("pnpm build:server"))])expect(step).toContain("NEXT_PUBLIC_PROFILE_CUSTOM_SKILLS: ${{ vars.PROFILE_CUSTOM_SKILLS }}");}
});

it('passes the dormant travel preference flag to preflight and build in both environments',()=>{
 for(const name of['deploy-test.yml','deploy-prod.yml']){const s=steps(read(name));for(const step of[s.find(x=>x.includes('Require ')&&x.includes(' configuration')),s.find(x=>x.includes('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY')&&x.includes('pnpm build:server'))])expect(step).toContain('NEXT_PUBLIC_PROFILE_TRAVEL_PREFERENCE: ${{ vars.PROFILE_TRAVEL_PREFERENCE }}');}
});
it("passes the publish gate flag to preflight and the checked build",()=>{for(const name of["deploy-test.yml","deploy-prod.yml"]){const s=steps(read(name));for(const step of[s.find(x=>x.includes("Require ")&&x.includes(" configuration")),s.find(x=>x.includes("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY")&&x.includes("pnpm build:server"))])expect(step).toContain("NEXT_PUBLIC_PROFILE_PUBLISH_GATE: ${{ vars.PROFILE_PUBLISH_GATE }}");}});

it('passes the dormant video-links flag to preflight and build in both environments',()=>{
 for(const name of['deploy-test.yml','deploy-prod.yml']){const s=steps(read(name));for(const step of[s.find(x=>x.includes('Require ')&&x.includes(' configuration')),s.find(x=>x.includes('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY')&&x.includes('pnpm build:server'))])expect(step).toContain('NEXT_PUBLIC_PROFILE_VIDEO_LINKS: ${{ vars.PROFILE_VIDEO_LINKS }}');}
});

it('passes the dormant profile details flag to preflight and build in both environments',()=>{
 for(const name of['deploy-test.yml','deploy-prod.yml']){const s=steps(read(name));for(const step of[s.find(x=>x.includes('Require ')&&x.includes(' configuration')),s.find(x=>x.includes('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY')&&x.includes('pnpm build:server'))])expect(step).toContain('NEXT_PUBLIC_PROFILE_DETAILS: ${{ vars.PROFILE_DETAILS }}');}
});

it("the deploy preflight asks for no activation receipts, and the server healthcheck decides readiness", () => {
  expect(readFileSync(new URL("./check-profile-activation.mjs", import.meta.url), "utf8")).not.toMatch(/apiCommit|settingsEvidence|libfile_/);
  for (const name of ["deploy-test.yml", "deploy-prod.yml"]) expect(read(name)).not.toMatch(/settingsEvidence|apiCommit|libfile_/);
  expect(readFileSync(new URL("../.railway/railway.ts", import.meta.url), "utf8")).toMatch(/healthcheck: "\/healthz\/"/);
});

// CI by area (playbook rule E14): the PR checks and Cut release run only what a change needs (scripts/ci/areas.json).
const jobs = (yml: string) => [...yml.matchAll(/^ {2}([a-z][a-z0-9_-]*):$/gm)].map((m) => m[1]);
const job = (yml: string, name: string) => yml.split(new RegExp(`^ {2}${name}:$`, "m"))[1].split(/^ {2}[a-z][a-z0-9_-]*:$/m)[0];
const runOf = (step: string) => step.split(/^\s*(?:- )?run: /m)[1] ?? "";
const AREAS_OR_ALL = "if: steps.plan.outputs.mode == 'areas' || steps.plan.outputs.mode == 'all'";

describe("CI by area", () => {
  it("PR checks stay one job, on pull requests only (main relies on Cut release), with full history for the diff", () => {
    const yml = read("checks.yml");
    expect(jobs(yml.split(/^jobs:$/m)[1])).toEqual(["signup"]);
    expect(yml).toMatch(/^on:\n {2}pull_request:\n/m);
    expect(yml).not.toMatch(/^ {2}push:/m);
    const checkout = steps(yml).find((s) => s.includes("actions/checkout@"))!;
    expect(checkout).toContain("fetch-depth: '0'");
    expect(checkout).toContain("persist-credentials: false");
  });

  it("the plan step reads the PR's base and head through env, never interpolated into run:", () => {
    const s = steps(read("checks.yml"));
    const plan = s.find((x) => x.includes("id: plan"))!;
    expect(plan).toContain("BASE_SHA: ${{ github.event.pull_request.base.sha }}");
    expect(plan).toContain("HEAD_SHA: ${{ github.event.pull_request.head.sha }}");
    expect(runOf(plan)).toBe('node scripts/ci/affected-areas.mjs --base "$BASE_SHA" --head "$HEAD_SHA"');
    expect(s.findIndex((x) => x.includes("id: plan"))).toBeLessThan(s.findIndex((x) => x.includes("pnpm install")));
  });

  it("the fast job runs whenever the mode is not none; browser setup and the area scripts only for areas or all", () => {
    const s = steps(read("checks.yml")).filter((x) => !x.includes("actions/checkout@") && !x.includes("id: plan"));
    for (const step of s.filter((x) => /pnpm (install|typecheck|build)|action-setup|setup-node/.test(x))) {
      expect(step, step.split("\n")[0]).toContain("if: steps.plan.outputs.mode != 'none'");
    }
    const chrome = s.find((x) => x.includes("google-chrome"))!;
    expect(chrome).toContain(AREAS_OR_ALL);
    const areas = s.find((x) => x.includes("scripts/ci/run-areas.mjs"))!;
    expect(areas).toContain(AREAS_OR_ALL);
    expect(areas).toContain("MODE: ${{ steps.plan.outputs.mode }}");
    expect(areas).toContain("AREAS: ${{ steps.plan.outputs.areas }}");
    expect(runOf(areas)).toBe('node scripts/ci/run-areas.mjs --mode "$MODE" --areas "$AREAS"');
    for (const upload of s.filter((x) => x.includes("actions/upload-artifact@"))) {
      expect(upload).toContain("if: always() && (steps.plan.outputs.mode == 'areas' || steps.plan.outputs.mode == 'all')");
    }
    // The QA scripts run only through the areas now: no browser script is a step of its own.
    expect(read("checks.yml")).not.toMatch(/node scripts\/qa\//);
  });

  it("PR #89's approval capture step is gone", () => {
    expect(read("checks.yml")).not.toMatch(/auth-preview|auth-eyebrow-approval-evidence/);
  });

  it("no run: block in the CI-by-area workflows interpolates an expression (event data, inputs, tag or branch names go through env)", () => {
    for (const name of ["checks.yml", "release.yml"]) {
      for (const step of steps(read(name))) expect(runOf(step), `${name}: ${step.split("\n")[0].trim()}`).not.toContain("${{");
    }
  });

  it("Cut release keeps its guard, checks and tag jobs (scripts/release-check-reuse.mjs reads those names)", () => {
    expect(jobs(read("release.yml").split(/^jobs:$/m)[1])).toEqual(["guard", "checks", "tag"]);
    expect(job(read("release.yml"), "tag")).toMatch(/needs: \[guard, checks\]/);
  });

  it("Cut release no longer needs package.json to hold the version, and still refuses a version not higher than the last tag", () => {
    const guard = job(read("release.yml"), "guard");
    expect(guard).not.toMatch(/package\.json/);
    expect(guard).toContain("is not higher than the last release");
    expect(guard).toContain('already exists. Choose the next version.');
    for (const name of workflows) expect(read(name), name).not.toMatch(/jq -er '\.version' package\.json/);
  });

  it("Cut release checks what changed since the last verified release: the fast job always (none counts as fast), then the areas", () => {
    const checks = job(read("release.yml"), "checks");
    const s = steps(checks);
    const checkout = s.find((x) => x.includes("actions/checkout@"))!;
    expect(checkout).toContain("fetch-depth: '0'");
    expect(checkout).toContain("persist-credentials: false");
    const plan = s.find((x) => x.includes("id: plan"))!;
    expect(plan).toContain("SHA: ${{ needs.guard.outputs.sha }}");
    expect(runOf(plan)).toBe('node scripts/ci/affected-areas.mjs --release --head "$SHA"');
    for (const cmd of ["pnpm typecheck && pnpm lint && pnpm lint:values && pnpm test", "pnpm build && node scripts/check-pages.mjs",
      "pnpm build:server && pnpm build:preview && pnpm check:server", "pnpm build:server && node scripts/check-split.mjs"]) {
      const step = s.find((x) => runOf(x).includes(cmd));
      expect(step, cmd).toBeDefined();
      expect(step!, cmd).not.toMatch(/\n\s+if:/);
    }
    const areas = s.find((x) => x.includes("scripts/ci/run-areas.mjs"))!;
    expect(areas).toContain(AREAS_OR_ALL);
    expect(s.find((x) => x.includes("google-chrome"))!).toContain(AREAS_OR_ALL);
  });

  it("the tag carries the verified-baseline marker, written only after the checks job passed", () => {
    const tag = job(read("release.yml"), "tag");
    expect(tag).toContain("printf 'checks: areas-v1\\n");
  });

  it("the version comes from the tag: production deploys and labels the tag it was started from", () => {
    const prod = read("deploy-prod.yml");
    expect(prod).toMatch(/^ {2}TAG: \$\{\{ github\.ref_name \}\}$/m);
    expect(steps(prod).find((x) => x.includes("railway up"))!).toContain('--message "$TAG"');
    expect(read("release.yml")).not.toMatch(/Bump package\.json/);
  });
});
