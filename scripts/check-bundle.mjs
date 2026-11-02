// Fails if anything a browser can download from the server build holds a server secret (decision N-03): a Company OS
// service token, a Clerk secret key or its name, or the private Company OS address. With this environment's real
// values set (the deploy workflows pass them), it looks for those too. Names the file and what matched, never a value.
//   node scripts/check-bundle.mjs [dir…]     (default: .next/static, public/ and preview-site/ of the standalone build)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PATTERNS = [
  ["a Company OS service token", /cos_svc_/],
  ["a Clerk live secret key", /sk_live_/],
  ["a Clerk test secret key", /sk_test_/],
  ["the Clerk secret's name", /CLERK_SECRET/],
  ["the private Company OS address", /\.railway\.internal\b/],
];

/** Folders of the preview export that hold source and documents as text (scripts/preview-build.mjs). */
const DOC_DIRS = new Set(["studio-source", "artifacts"]);

/** Environment values that must never reach a browser, when set. */
export const SECRET_ENV = [
  "COMPANY_OS_URL", "COMPANY_OS_READ_TOKEN", "COMPANY_OS_SUBMIT_TOKEN", "COMPANY_OS_PLATFORM_KEY", "CLERK_SECRET_KEY", "RAILWAY_TOKEN",
  "COOKIE_SIGNING_SECRET", "TEST_GATE_PASSPHRASE",
];

function* files(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* files(p);
    else if (e.isFile()) yield p;
  }
}

/** One line per file and finding; empty when clean. */
export async function findSecrets(dirs, env = {}) {
  const values = SECRET_ENV.map((name) => [name, env[name]]).filter(([, v]) => typeof v === "string" && v.length >= 8);
  const found = [];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    for (const file of files(dir)) {
      const text = fs.readFileSync(file).toString("latin1");
      // In the preview export, Studio's copy of the app's source and the handoff documents are text about the code:
      // they name these patterns on purpose. Only real values count there.
      const source = file.split(path.sep).some((part) => DOC_DIRS.has(part));
      if (!source) for (const [what, re] of PATTERNS) if (re.test(text)) found.push(`${file}: ${what}`);
      for (const [name, value] of values) if (text.includes(value)) found.push(`${file}: the value of ${name}`);
    }
  }
  return found;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const dirs = process.argv.length > 2 ? process.argv.slice(2)
    : [".next/standalone/.next/static", ".next/standalone/public", ".next/standalone/preview-site"].map((d) => path.join(root, d)).filter((d) => fs.existsSync(d));
  if (!dirs.some((d) => fs.existsSync(d))) { console.error(`❌ check-bundle: nothing to check (${dirs.join(", ")}). Run pnpm build:server first.`); process.exit(1); }
  const found = await findSecrets(dirs, process.env);
  if (found.length) { console.error(`❌ check-bundle: secrets in the client bundle:\n  - ${found.join("\n  - ")}`); process.exit(1); }
  console.log(`✅ check-bundle: no secret in ${dirs.map((d) => path.relative(root, d) || d).join(", ")}`);
}
