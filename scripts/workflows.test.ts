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
    // Right after the plain export (the later one with a base path overwrites out/).
    expect(yml).toMatch(/- run: pnpm build\n\s+- run: node scripts\/check-pages\.mjs/);
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
