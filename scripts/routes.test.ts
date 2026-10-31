import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { appRoutes } from "./routes.mjs";

// Files that exist only in the server build are named *.server.ts / *.server.tsx (F1: app/api/**/route.server.ts,
// app/media/[id]/route.server.ts). The Pages export must never see them; the server build must.
const roots: string[] = [];
afterEach(() => { for (const r of roots.splice(0)) rmSync(r, { recursive: true, force: true }); vi.unstubAllEnvs(); vi.resetModules(); });
function fakeApp(files: string[]) {
  const root = mkdtempSync(path.join(tmpdir(), "bg-routes-"));
  roots.push(root);
  for (const f of files) { mkdirSync(path.dirname(path.join(root, f)), { recursive: true }); writeFileSync(path.join(root, f), ""); }
  return root;
}

describe("appRoutes", () => {
  const root = () => fakeApp([
    "app/page.tsx", "app/layout.tsx", "app/join/page.tsx", "app/p/[slug]/page.tsx", "app/_journal/page.tsx",
    "app/(group)/terms/page.tsx", "app/api/forms/[form]/route.server.ts", "app/media/[id]/route.server.ts",
    "app/owners/page.server.tsx", "app/join/helpers.ts", "app/join/View.server.tsx",
  ]);

  it("lists the export's routes: no server-only file, no private folder, groups dropped", () => {
    expect(appRoutes(root(), { server: false })).toEqual([
      { path: "/", kind: "page", dynamic: false, serverOnly: false },
      { path: "/join", kind: "page", dynamic: false, serverOnly: false },
      { path: "/p/[slug]", kind: "page", dynamic: true, serverOnly: false },
      { path: "/terms", kind: "page", dynamic: false, serverOnly: false },
    ]);
  });

  it("adds the server-only pages and route handlers for the server build", () => {
    const server = appRoutes(root(), { server: true }).filter((r: { serverOnly: boolean }) => r.serverOnly);
    expect(server).toEqual([
      { path: "/api/forms/[form]", kind: "route", dynamic: true, serverOnly: true },
      { path: "/media/[id]", kind: "route", dynamic: true, serverOnly: true },
      { path: "/owners", kind: "page", dynamic: false, serverOnly: true },
    ]);
  });
});

describe("next.config.ts pageExtensions", () => {
  it("the Pages export uses only Next's defaults, so no *.server.* file is a page, route or proxy", async () => {
    vi.stubEnv("BG_BUILD", "");
    const { default: config } = await import("../next.config.ts");
    expect(config.output).toBe("export");
    expect(config.pageExtensions ?? ["tsx", "ts", "jsx", "js"]).toEqual(["tsx", "ts", "jsx", "js"]);
  });

  it("the server build adds server.tsx and server.ts", async () => {
    vi.stubEnv("BG_BUILD", "server");
    const { default: config } = await import("../next.config.ts");
    expect(config.output).toBe("standalone");
    expect(config.pageExtensions).toEqual(expect.arrayContaining(["tsx", "ts", "server.tsx", "server.ts"]));
  });
});
