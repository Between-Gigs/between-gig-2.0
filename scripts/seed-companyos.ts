// Writes 2.0's made-up sample as Company OS's test seed for Between Gigs (Company OS ADR 0025 amendment 2026-10-30):
// <seeds>/between-gigs.json and the photo people's pictures in <seeds>/between-gigs/. Fictional data only.
//   node scripts/seed-companyos.ts ../Company-OS/deploy/seeds
// Run it again whenever lib/data/seed.ts changes, and commit the result in Company OS.
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildSeed, buildWaitlist } from "../lib/data/seed.ts";
import { toCompanyOsSeed } from "../lib/data/companyos/seed.ts";

const out = process.argv[2];
if (!out) {
  console.error("usage: node scripts/seed-companyos.ts <Company OS deploy/seeds folder>");
  process.exit(1);
}
const state = buildSeed();
const seed = toCompanyOsSeed(state, buildWaitlist(state.people));
mkdirSync(join(out, "between-gigs"), { recursive: true });
for (const f of seed.files) copyFileSync(new URL(`../public/${f.source}`, import.meta.url), join(out, f.path));
// `source` is where the picture is in this repo; the seed names only its copy under the seeds folder.
const written = { ...seed, files: seed.files.map((f) => ({ owner_entity: f.owner_entity, owner_id: f.owner_id, kind: f.kind, path: f.path, mime: f.mime })) };
writeFileSync(join(out, "between-gigs.json"), `${JSON.stringify(written, null, 2)}\n`);
console.log(`seed-companyos: ${seed.records.length} records, ${seed.files.length} photos → ${out}`);
