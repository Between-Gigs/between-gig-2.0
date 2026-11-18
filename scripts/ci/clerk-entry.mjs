// An area script (scripts/ci/areas.json): the Pages build with Clerk (base path and test publishable key from the
// area's env), then scripts/qa/clerk-entry.mjs against it. The plain export in out/ and .next/ (the server build
// scripts/qa/server-hub.mjs serves) are moved aside first and put back afterwards, so the other area scripts see the
// same builds whatever order they run in.
import { spawnSync } from "node:child_process";
import fs from "node:fs";

// Kept under node_modules/.cache: same disk (a rename, not a copy), and ignored by git and eslint.
const KEEP = [["out", "node_modules/.cache/ci-keep/out"], [".next", "node_modules/.cache/ci-keep/next"]];
const run = (cmd, args, env = process.env) => spawnSync(cmd, args, { stdio: "inherit", shell: false, env }).status ?? 1;

fs.mkdirSync("node_modules/.cache/ci-keep", { recursive: true });
for (const [dir, keep] of KEEP) {
  fs.rmSync(keep, { recursive: true, force: true });
  if (fs.existsSync(dir)) fs.renameSync(dir, keep);
}
let status = 1;
try {
  status = run("pnpm", ["build"]);
  if (status === 0) {
    // The old workflow ran the check without the build's settings; it reads its base path itself.
    const env = { ...process.env };
    delete env.NEXT_PUBLIC_BASE_PATH;
    delete env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    status = run(process.execPath, ["scripts/qa/clerk-entry.mjs"], env);
  }
} finally {
  for (const [dir, keep] of KEEP) {
    if (!fs.existsSync(keep)) continue;
    fs.rmSync(dir, { recursive: true, force: true });
    fs.renameSync(keep, dir);
  }
}
process.exitCode = status;
