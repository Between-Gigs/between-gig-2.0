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

  it("PR checks also run the unit tests, the Pages route check and the server build with its checks", () => {
    const yml = read("checks.yml");
    expect(yml).toMatch(/pnpm test\b/);
    // Right after the plain export (the later one with a base path overwrites out/).
    expect(yml).toMatch(/- run: pnpm build\n\s+- run: node scripts\/check-pages\.mjs/);
    expect(yml).toContain("pnpm build:server && pnpm check:server");
  });

  it("the test deploy builds with its own address as the site origin, found before the build", () => {
    const s = steps(read("deploy-test.yml"));
    const domain = s.findIndex((x) => x.includes("railway domain"));
    const build = s.findIndex((x) => x.includes("pnpm build:server") && x.includes("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"));
    expect(domain).toBeGreaterThan(-1);
    expect(build).toBeGreaterThan(domain);
    expect(s[build]).toMatch(/NEXT_PUBLIC_SITE_ORIGIN: \$\{\{ steps\.\w+\.outputs\.url \}\}/);
  });
});
