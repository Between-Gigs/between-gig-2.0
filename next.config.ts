import { execSync } from "node:child_process";
import type { NextConfig } from "next";
import { securityHeaders } from "./lib/security/headers";

/**
 * Two builds from one config:
 * - The GitHub Pages preview (default, `pnpm build`): a static export on the client-side sample data, every route.
 *   NEXT_PUBLIC_BASE_PATH is "/between-gig-2.0" on Pages and empty locally.
 * - The server build (BG_BUILD=server, `pnpm build:server`): a standalone Next server for Railway, next to Company OS
 *   (decision N-03). scripts/server-build.mjs takes the internal and waiting routes out of the tree for it, and
 *   proxy.server.ts sets the per-request CSP. See docs/handoff/companyos-deploy.md.
 */
const server = process.env.BG_BUILD === "server";
const basePath = server ? "" : process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** The build's commit and time, for the workspace status bar. */
const sha = process.env.GITHUB_SHA ?? (() => { try { return execSync("git rev-parse HEAD").toString().trim(); } catch { return ""; } })();

const config: NextConfig = {
  env: { NEXT_PUBLIC_BUILD_SHA: sha, NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(), BG_BUILD: server ? "server" : "export" },
  output: server ? "standalone" : "export",
  basePath: basePath || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  ...(server && {
    // *.server.ts(x) files exist only in this build (proxy.server.ts, F1's route handlers): the export never sees them.
    pageExtensions: ["tsx", "ts", "jsx", "js", "server.tsx", "server.ts"],
    // The repo itself, not a parent folder with its own lockfile: server.js lands at .next/standalone/server.js.
    outputFileTracingRoot: process.cwd(),
    poweredByHeader: false,
    productionBrowserSourceMaps: false,
    headers: async () => [{ source: "/:path*", headers: securityHeaders() }],
  }),
};

export default config;
