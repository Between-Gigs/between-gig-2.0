// Sets up a local Company OS for 2.0 (local development and the live contract run): the made-up tenant
// `between-gigs`, Between Gigs' recipe, the made-up test seed with its photos, and the two service identities
// 2.0's server uses. Writes the server's environment to .env.companyos.local (git-ignored). Idempotent.
// Needs Company OS running locally with dev auth and storage (see docs/handoff/companyos-local.md):
//   node scripts/companyos-local/setup.mjs [--cos ../Company-OS] [--api http://localhost:4000]
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback; };
const COS_DIR = resolve(arg("cos", "/Users/abasu/WORK/SIDES/Company-OS"));
const API = arg("api", "http://localhost:4000");
const SLUG = "between-gigs";
const KEY = process.env.PLATFORM_ADMIN_KEY ?? "dev-platform-key";
const OWNER = "owner@between-gigs.example";
const APP_URL = "http://localhost:3000";

async function call(method, path, body) {
  const res = await fetch(`${API}${path}`, { method, headers: { "x-platform-key": KEY, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, body: json };
}
const must = (r, what, ok = [200, 201]) => { if (!ok.includes(r.status)) throw new Error(`${what}: ${r.status} ${JSON.stringify(r.body)}`); return r.body; };

const tenants = must(await call("GET", "/platform/tenants"), "list tenants");
const list = Array.isArray(tenants) ? tenants : tenants.tenants ?? [];
if (!list.some((t) => t.slug === SLUG)) {
  must(await call("POST", "/provision", { template: "blank", tenantSlug: SLUG, tenantName: "Between Gigs (local, made up)", superAdmin: { email: OWNER, name: "Owner (local)" } }), "provision");
  console.log("provisioned", SLUG);
}

const recipe = spawnSync("node", ["scripts/apply-recipe.mjs", "--recipe", "deploy/recipes/between-gigs.json", "--tenant", SLUG, "--api", API,
  "--var", `app_url=${APP_URL}`, "--var", "email_from=hello@between-gigs.example", "--go-live"], { cwd: COS_DIR, env: { ...process.env, PLATFORM_ADMIN_KEY: KEY }, encoding: "utf8" });
if (recipe.status !== 0) throw new Error(`apply-recipe: ${recipe.stderr || recipe.stdout}`);
console.log("recipe applied");

const seedPath = resolve(COS_DIR, "deploy/seeds/between-gigs.json");
const seed = JSON.parse(readFileSync(seedPath, "utf8"));
const first = seed.records[0];
if ((await call("GET", `/t/${SLUG}/api/${first.entity}/${first.id}`)).status === 404) {
  for (let i = 0; i < seed.records.length; i += 1000) must(await call("POST", `/t/${SLUG}/import/batch`, { records: seed.records.slice(i, i + 1000) }), "import seed");
  console.log("seed imported:", seed.records.length, "records");
}
for (const f of seed.files ?? []) {
  const ready = must(await call("POST", `/t/${SLUG}/query`, { entity: "file", filter: { and: [{ field: "owner_id", op: "eq", value: f.owner_id }, { field: "kind", op: "eq", value: f.kind }, { field: "status", op: "eq", value: "ready" }] } }), "query file");
  if (ready.data.length) continue;
  const bytes = readFileSync(resolve(COS_DIR, "deploy/seeds", f.path));
  const created = must(await call("POST", `/t/${SLUG}/files`, { ownerEntity: f.owner_entity, ownerId: f.owner_id, kind: f.kind, filename: basename(f.path), mime: f.mime, sizeBytes: bytes.byteLength }), "create file");
  const put = await fetch(created.uploadUrl, { method: "PUT", headers: { "content-type": f.mime }, body: bytes });
  if (!put.ok) throw new Error(`upload ${f.path}: ${put.status}`);
  must(await call("POST", `/t/${SLUG}/files/${created.file.id}/confirm`), "confirm file");
}
console.log("seed photos ready:", (seed.files ?? []).length);

const identity = async (roleKey, mode) => must(await call("POST", `/platform/tenants/${SLUG}/service-identities`, { name: `between-gigs web local (${roleKey})`, roleKey, ...(mode ? { mode } : {}) }), `identity ${roleKey}`).token;
const reader = await identity("public_reader");
const submitter = await identity("form_submitter", "submit");
writeFileSync(".env.companyos.local", [
  "# Written by scripts/companyos-local/setup.mjs for a LOCAL Company OS with a made-up tenant. Never commit.",
  `COMPANY_OS_URL=${API}`, `COMPANY_OS_TENANT=${SLUG}`, `COMPANY_OS_READ_TOKEN=${reader}`, `COMPANY_OS_SUBMIT_TOKEN=${submitter}`,
  `APP_URL=${APP_URL}`, "NEXT_PUBLIC_DATA_SOURCE=api", `CONTRACT_OWNER_EMAIL=${OWNER}`, "",
].join("\n"));
console.log("wrote .env.companyos.local (service identity tokens; git-ignored)");
