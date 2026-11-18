import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { findReleaseEvidence } from "./release-check-reuse.mjs";

const sha = "a".repeat(40), repository = "Between-Gigs/between-gig-2.0";
const run = { id: 123, run_attempt: 1, head_sha: sha, head_branch: "main", path: ".github/workflows/release.yml", event: "workflow_dispatch", status: "completed", conclusion: "success", repository: { full_name: repository }, head_repository: { full_name: repository } };
const jobs = { total_count: 3, jobs: ["guard", "checks", "tag"].map(name => ({ name, run_id: 123, head_sha: sha, status: "completed", conclusion: "success" })) };
function lookup(responses: unknown[]) { let calls = 0; return { get: async () => { calls++; const result = responses.shift(); if (result instanceof Error) throw result; return result; }, count: () => calls }; }
const opts = { sha, repository, ref: "refs/tags/v1.6.1" };
describe("E9 release provenance", () => {
  it("reuses a successful exact-commit release with successful required jobs", async () => {
    const api = lookup([{ workflow_runs: [run] }, run, jobs, run]);
    expect(await findReleaseEvidence({ ...opts, get: api.get })).toEqual({ reuse: true, runId: 123, url: `https://github.com/${repository}/actions/runs/123` });
  });
  it("accepts GitHub main-qualified workflow paths", async () => {
    const qualified = { ...run, path: ".github/workflows/release.yml@main" };
    const api = lookup([{ workflow_runs: [qualified] }, qualified, jobs, qualified]);
    expect((await findReleaseEvidence({ ...opts, get: api.get })).reuse).toBe(true);
  });
  it.each([".github/workflows/release.yml@evil", ".github/workflows/release.yml@refs/heads/evil"])("refuses qualified path %s", async path => {
    const api = lookup([{ workflow_runs: [{ ...run, path }] }]);
    expect((await findReleaseEvidence({ ...opts, get: api.get })).reuse).toBe(false);
  });
  it("refuses a rerun started while evidence is read", async () => {
    const api = lookup([{ workflow_runs: [run] }, run, jobs, { ...run, run_attempt: 2 }]);
    expect((await findReleaseEvidence({ ...opts, get: api.get })).reuse).toBe(false);
  });
  it.each(["run_id", "head_sha"])("refuses jobs from a different %s", async key => {
    const api = lookup([{ workflow_runs: [run] }, run, { ...jobs, jobs: jobs.jobs.map(j => ({ ...j, [key]: "wrong" })) }, run]);
    expect((await findReleaseEvidence({ ...opts, get: api.get })).reuse).toBe(false);
  });
  it("pins jobs to the verified release attempt", async () => {
    const paths: string[] = [];
    const responses = [{ workflow_runs: [run] }, run, jobs, run];
    await findReleaseEvidence({ ...opts, get: async (path: string) => { paths.push(path); return responses.shift(); } });
    expect(paths[2]).toBe(`/repos/${repository}/actions/runs/123/attempts/1/jobs?per_page=100`);
  });
  it.each(["head_sha", "head_branch", "path", "event", "status", "conclusion", "run_attempt"])("refuses mismatching %s", async key => {
    const api = lookup([{ workflow_runs: [{ ...run, [key]: "wrong" }] }]);
    expect((await findReleaseEvidence({ ...opts, get: api.get })).reuse).toBe(false);
  });
  it.each(["repository", "head_repository"])("refuses another %s", async key => {
    const api = lookup([{ workflow_runs: [{ ...run, [key]: { full_name: "attacker/fork" } }] }]);
    expect((await findReleaseEvidence({ ...opts, get: api.get })).reuse).toBe(false);
  });
  it("does not fall back to an older success when latest run fails", async () => {
    const api = lookup([{ workflow_runs: [{ ...run, conclusion: "failure" }, run] }]);
    expect((await findReleaseEvidence({ ...opts, get: api.get })).reuse).toBe(false);
  });
  it("revalidates the run after listing", async () => {
    const api = lookup([{ workflow_runs: [run] }, { ...run, status: "in_progress" }]);
    expect((await findReleaseEvidence({ ...opts, get: api.get })).reuse).toBe(false);
  });
  it.each(["failure", "skipped", "cancelled", null])("refuses checks conclusion %s", async conclusion => {
    const api = lookup([{ workflow_runs: [run] }, run, { ...jobs, jobs: jobs.jobs.map(j => j.name === "checks" ? { ...j, conclusion } : j) }]);
    expect((await findReleaseEvidence({ ...opts, get: api.get })).reuse).toBe(false);
  });
  it.each([undefined, {}, { total_count: 3, jobs: [] }, { ...jobs, total_count: 101 }, { ...jobs, jobs: [...jobs.jobs, jobs.jobs[1]] }])("refuses incomplete or ambiguous jobs", async response => {
    const api = lookup([{ workflow_runs: [run] }, run, response]);
    expect((await findReleaseEvidence({ ...opts, get: api.get })).reuse).toBe(false);
  });
  it.each(["refs/heads/main", "refs/tags/not-semver", ""]) ("keeps full checks for %s", async ref => {
    const api = lookup([]); expect((await findReleaseEvidence({ ...opts, ref, get: api.get })).reuse).toBe(false); expect(api.count()).toBe(0);
  });
  it.each([new Error("API unavailable"), {}, { workflow_runs: [] }])("falls back to full checks when provenance cannot be read", async response => {
    const api = lookup([response]); expect((await findReleaseEvidence({ ...opts, get: api.get })).reuse).toBe(false);
  });
});
describe("deployment safeguards", () => {
  for (const environment of ["test", "prod"]) {
    const text = readFileSync(new URL(`../.github/workflows/deploy-${environment}.yml`, import.meta.url), "utf8");
    it(`${environment} only skips generic checks with proven release evidence`, () => {
      expect(text).toContain("node scripts/release-check-reuse.mjs");
      expect(text).toContain("actions: read");
      expect(text).toContain("if: steps.release-checks.outputs.reuse != 'true'");
      expect(text).toContain("pnpm typecheck && pnpm lint && pnpm lint:values && pnpm test");
      const deploy = text.split("\n  deploy:\n")[1];
      expect(deploy).not.toContain("outputs.reuse");
      expect(deploy).toContain("pnpm build:server && pnpm build:preview && pnpm check:server");
      expect(deploy).toContain("node scripts/make-bundle.mjs");
      expect(deploy).toContain("node scripts/check-profile-activation.mjs");
    });
  }
});
