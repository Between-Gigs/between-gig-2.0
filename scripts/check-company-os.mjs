// Checks company-os.json: { "requires": ">=MAJOR.MINOR.PATCH" }, the Company OS release this frontend needs
// (playbook rule E9: deploy that API release first). A "todo" key marks the owner's placeholder: a release refuses it,
// a test deploy (--allow-todo) only warns.
//   node scripts/check-company-os.mjs [--allow-todo]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function checkRequirement(text, { allowTodo = false } = {}) {
  let v;
  try { v = JSON.parse(text); } catch { return { ok: false, error: "company-os.json is not JSON" }; }
  const requires = v && typeof v.requires === "string" ? v.requires : null;
  if (!requires || !/^>=\d+\.\d+\.\d+$/.test(requires)) return { ok: false, error: 'company-os.json needs { "requires": ">=MAJOR.MINOR.PATCH" }' };
  const todo = v.todo !== undefined;
  if (todo && !allowTodo) return { ok: false, todo, requires, error: "company-os.json still has the owner's placeholder (its \"todo\" key): set the Company OS release it needs first" };
  return { ok: true, todo, requires };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../company-os.json");
  const r = checkRequirement(fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "", { allowTodo: process.argv.includes("--allow-todo") });
  if (!r.ok) { console.error(`::error::${r.error}`); process.exit(1); }
  if (r.todo) console.warn(`::warning::company-os.json is still the placeholder (requires ${r.requires}); a release will refuse it`);
  console.log(`Requires Company OS ${r.requires}`);
}
