import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { HOLD, INTERNAL, LIVE_ROUTES, excludeInternal, restoreInternal } from "./server-build.mjs";

// The production/test build leaves out what public/artifacts/ship-list/ marks "Internal" or "Waiting on the client",
// by taking those folders out of the tree for the build (so they 404 and are not in the output), not by a runtime check.
const roots: string[] = [];
afterEach(() => { for (const r of roots.splice(0)) rmSync(r, { recursive: true, force: true }); });

function fakeRepo() {
  const root = mkdtempSync(path.join(tmpdir(), "bg-server-build-"));
  roots.push(root);
  const file = (rel: string, text = "x") => { mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); writeFileSync(path.join(root, rel), text); };
  file("app/page.tsx");
  file("app/workspace/page.tsx", "workspace");
  file("app/workspace/[project]/page.tsx");
  file("app/studio/site/page.tsx");
  file("app/preview/page.tsx");
  file("app/emails/page.tsx");
  file("app/crew-call/page.tsx");
  file("app/proposals/home/page.tsx");
  file("public/artifacts/ship-list/index.html");
  file("public/studio-source/manifest.json");
  file("public/img/logo.svg");
  return root;
}

describe("the internal and waiting routes", () => {
  it("are exactly the ship list's internal tools and the pages waiting on the client", () => {
    expect([...INTERNAL].sort()).toEqual([
      "app/crew-call", "app/emails", "app/preview", "app/proposals", "app/studio", "app/workspace",
      "public/artifacts", "public/studio-source",
    ]);
  });

  it("never include a live route", () => {
    expect(LIVE_ROUTES).toHaveLength(18);
    for (const route of LIVE_ROUTES) {
      for (const dir of INTERNAL.filter((d: string) => d.startsWith("app/"))) expect(route.startsWith(`/${dir.slice(4)}/`)).toBe(false);
    }
  });
});

describe("excludeInternal / restoreInternal", () => {
  it("moves the internal folders out of the tree, leaving the live ones, and puts them back", () => {
    const root = fakeRepo();
    excludeInternal(root);
    for (const dir of INTERNAL) expect(existsSync(path.join(root, dir))).toBe(false);
    expect(existsSync(path.join(root, "app/page.tsx"))).toBe(true);
    expect(existsSync(path.join(root, "public/img/logo.svg"))).toBe(true);
    // Held in a dot folder: invisible to Next's router and to TypeScript's ** globs.
    expect(HOLD.startsWith(".")).toBe(true);
    expect(readFileSync(path.join(root, HOLD, "app/workspace/page.tsx"), "utf8")).toBe("workspace");

    restoreInternal(root);
    for (const dir of INTERNAL) expect(existsSync(path.join(root, dir))).toBe(true);
    expect(readFileSync(path.join(root, "app/workspace/page.tsx"), "utf8")).toBe("workspace");
    expect(existsSync(path.join(root, HOLD))).toBe(false);
  });

  it("skips folders that don't exist (public/studio-source is generated)", () => {
    const root = fakeRepo();
    rmSync(path.join(root, "public/studio-source"), { recursive: true });
    excludeInternal(root);
    restoreInternal(root);
    expect(existsSync(path.join(root, "app/studio/site/page.tsx"))).toBe(true);
    expect(existsSync(path.join(root, "public/studio-source"))).toBe(false);
  });

  it("first restores what an interrupted build left held, so a rerun never loses a folder", () => {
    const root = fakeRepo();
    excludeInternal(root);
    // A second build after a crash: the folders are still held.
    excludeInternal(root);
    restoreInternal(root);
    expect(readFileSync(path.join(root, "app/workspace/page.tsx"), "utf8")).toBe("workspace");
  });

  it("refuses to overwrite: if a folder is both held and back in the tree, it stops and changes nothing", () => {
    const root = fakeRepo();
    excludeInternal(root);
    mkdirSync(path.join(root, "app/workspace"), { recursive: true });
    writeFileSync(path.join(root, "app/workspace/page.tsx"), "new");
    expect(() => restoreInternal(root)).toThrow(/both/);
    expect(readFileSync(path.join(root, "app/workspace/page.tsx"), "utf8")).toBe("new");
    expect(readFileSync(path.join(root, HOLD, "app/workspace/page.tsx"), "utf8")).toBe("workspace");
  });
});
