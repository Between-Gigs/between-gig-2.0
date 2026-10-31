import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { appRoutes } from "./routes.mjs";
import { INTERNAL, LIVE_PAGES, LIVE_ROUTES, PUBLIC_LIVE, build, stageCopy } from "./server-build.mjs";

// The production/test build serves only what public/artifacts/ship-list/ marks "Make live". It is built from a
// temporary copy of the working tree without the internal and waiting folders, so the real app/ is never touched.
const REPO = path.resolve(import.meta.dirname, "..");
const roots: string[] = [];
afterEach(() => { for (const r of roots.splice(0)) rmSync(r, { recursive: true, force: true }); });
const temp = (prefix = "bg-server-build-") => { const d = mkdtempSync(path.join(tmpdir(), prefix)); roots.push(d); return d; };
const git = (cwd: string, ...args: string[]) => execFileSync("git", args, { cwd, encoding: "utf8" });

function fakeRepo() {
  const root = temp();
  const file = (rel: string, text = "x") => { mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); writeFileSync(path.join(root, rel), text); };
  for (const f of ["app/page.tsx", "app/workspace/page.tsx", "app/studio/site/page.tsx", "app/preview/page.tsx", "app/emails/page.tsx",
    "app/crew-call/page.tsx", "app/proposals/home/page.tsx", "public/artifacts/ship-list/index.html", "public/thumbs/home.jpg",
    "public/workspace/covers/a.jpg", "public/img/logo.svg", "lib/x.ts"]) file(f);
  file(".gitignore", "node_modules/\n.next/\nout/\npublic/studio-source/\n");
  file("node_modules/next/package.json", "{}");
  file("public/studio-source/manifest.json");
  git(root, "init", "-q");
  git(root, "add", "-A");
  git(root, "-c", "user.name=t", "-c", "user.email=t@example.test", "commit", "-qm", "init");
  file("app/join/page.tsx", "uncommitted, untracked");
  file("app/page.tsx", "uncommitted edit");
  return root;
}

describe("the route lists", () => {
  it("INTERNAL is the ship list's internal tools and the pages waiting on the client", () => {
    expect([...INTERNAL].sort()).toEqual([
      "app/crew-call", "app/emails", "app/preview", "app/proposals", "app/studio", "app/workspace",
      "public/artifacts", "public/studio-source", "public/thumbs", "public/workspace",
    ]);
  });

  it("every page in the repo is either live or internal, so a new route can't ship by default", () => {
    const pages = appRoutes(REPO, { server: true }).filter((r: { kind: string }) => r.kind === "page").map((r: { path: string }) => r.path);
    const internal = INTERNAL.filter((d: string) => d.startsWith("app/")).map((d: string) => `/${d.slice(4)}`);
    const unclassified = pages.filter((p: string) => !LIVE_PAGES.includes(p) && !internal.some((i: string) => p === i || p.startsWith(`${i}/`)));
    expect(unclassified).toEqual([]);
    expect(LIVE_PAGES).toHaveLength(18);
    expect(LIVE_ROUTES).toHaveLength(18);
  });

  it("every top-level public folder is either live or internal", () => {
    const internal = INTERNAL.filter((d: string) => d.startsWith("public/")).map((d: string) => d.slice(7));
    const entries = readdirSync(path.join(REPO, "public")).filter((n) => !n.startsWith("."));
    expect(entries.filter((n) => !PUBLIC_LIVE.includes(n) && !internal.includes(n))).toEqual([]);
  });
});

describe("stageCopy", () => {
  it("copies the working tree (with uncommitted and untracked files) without the internal folders or ignored files", () => {
    const root = fakeRepo();
    const dest = path.join(temp(), "src");
    stageCopy(root, dest);
    expect(readFileSync(path.join(dest, "app/page.tsx"), "utf8")).toBe("uncommitted edit");
    expect(readFileSync(path.join(dest, "app/join/page.tsx"), "utf8")).toBe("uncommitted, untracked");
    expect(existsSync(path.join(dest, "public/img/logo.svg"))).toBe(true);
    for (const dir of INTERNAL) expect(existsSync(path.join(dest, dir))).toBe(false);
    expect(existsSync(path.join(dest, ".git"))).toBe(false);
    // node_modules is cloned in (Turbopack refuses a link out of the project).
    expect(existsSync(path.join(dest, "node_modules/next/package.json"))).toBe(true);
  });

  it("leaves the real tree exactly as it was", () => {
    const root = fakeRepo();
    const before = git(root, "status", "--porcelain");
    stageCopy(root, path.join(temp(), "src"));
    expect(git(root, "status", "--porcelain")).toBe(before);
    for (const dir of INTERNAL) expect(existsSync(path.join(root, dir))).toBe(true);
  });
});

describe("build", () => {
  it("a failing build leaves git status as it was and no temporary copy behind", async () => {
    const root = fakeRepo();
    const before = git(root, "status", "--porcelain");
    const fail = path.join(temp(), "fail.mjs");
    writeFileSync(fail, "process.exit(3)");
    const scratch = temp("bg-scratch-");
    const status = await build(root, { nextBin: fail, tmp: scratch, quiet: true });
    expect(status).toBe(3);
    expect(git(root, "status", "--porcelain")).toBe(before);
    expect(readdirSync(scratch)).toEqual([]);
    expect(existsSync(path.join(root, ".next"))).toBe(false);
  });

  it("a successful build brings back only .next, with the standalone server's static files", async () => {
    const root = fakeRepo();
    const before = git(root, "status", "--porcelain");
    // Stands in for `next build`: writes what a standalone build writes, in the copy.
    const ok = path.join(temp(), "ok.mjs");
    writeFileSync(ok, `import fs from "node:fs";
      if (process.env.BG_BUILD !== "server") process.exit(9);
      fs.mkdirSync(".next/standalone", { recursive: true }); fs.writeFileSync(".next/standalone/server.js", "");
      fs.mkdirSync(".next/static/chunks", { recursive: true }); fs.writeFileSync(".next/static/chunks/a.js", "");`);
    const status = await build(root, { nextBin: ok, tmp: temp("bg-scratch-"), quiet: true });
    expect(status).toBe(0);
    expect(existsSync(path.join(root, ".next/standalone/server.js"))).toBe(true);
    expect(existsSync(path.join(root, ".next/standalone/.next/static/chunks/a.js"))).toBe(true);
    expect(existsSync(path.join(root, ".next/standalone/public/img/logo.svg"))).toBe(true);
    expect(existsSync(path.join(root, ".next/standalone/public/thumbs"))).toBe(false);
    expect(git(root, "status", "--porcelain")).toBe(before);
  });
});
