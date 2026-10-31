// One-time import of the old app's sign-ups into Company OS (decision N-06), at the DNS switch: the D1 tables
// `leads`, `sketches` and `privacy_requests` (between-gigs db/schema.ts) become `form_submission` records through the
// operator import API (POST /t/:t/import/batch). Re-runnable: it skips what is already there. Prints counts only.
//
//   COMPANY_OS_URL=… COMPANY_OS_TENANT=… COMPANY_OS_PLATFORM_KEY=… node scripts/import-waitlist.mjs <export-dir> [--dry-run]
//
// <export-dir> holds leads.json|csv, sketches.json|csv, privacy_requests.json|csv (at least one). The platform key is
// read from the environment only, never an argument (it would land in the shell history). Steps in
// docs/handoff/companyos-deploy.md. Rule D1: the export holds real people's data — never commit it or copy it here.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Each form's answer keys (Company OS deploy/recipes/between-gigs.json, `forms` settings). */
const FORMS = {
  call_sheet: ["zip", "category", "details"],
  storyboard_talent: ["name", "role", "services", "location", "availability", "rate", "details", "service"],
  storyboard_buyer: ["name", "project", "location", "timing", "team_size", "budget", "details", "service"],
  privacy_request: ["message"],
};
const TABLES = ["leads", "sketches", "privacy_requests"];
const BATCH = 500;
const PAGE = 500;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Text the forms module would accept: trimmed, without NUL or other control characters (tab and line breaks stay). */
const clean = (v) => (v == null ? "" : String(v)).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim();
const normEmail = (v) => clean(v).toLowerCase();
/**
 * A timestamp as ISO UTC, the same on any machine: D1/SQLite's zone-less "YYYY-MM-DD HH:MM:SS" is UTC, and a number
 * is epoch seconds (below 10^12) or milliseconds. Null when unreadable.
 */
const iso = (v) => {
  const t = clean(v);
  let d;
  if (/^\d{9,13}$/.test(t)) d = new Date(Number(t) < 1e12 ? Number(t) * 1000 : Number(t));
  else if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(t)) d = new Date(`${t.replace(" ", "T")}Z`);
  else d = new Date(t);
  return t && !Number.isNaN(d.getTime()) ? d.toISOString() : null;
};
const nonEmpty = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, clean(v)]).filter(([, v]) => v));
const blank = () => ({ rows: 0, records: 0, merged: 0, invalid: 0 });

/** RFC 4180 CSV with a header row → objects. */
export function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  const s = text.replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"' && s[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.length > 1 || r[0] !== "");
  return head ? body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), r[i] ?? ""]))) : [];
}

/** Rows from JSON: an array of rows, or wrangler's `d1 execute --json` shape `[{ results: [...] }]`. */
function parseJson(text) {
  const v = JSON.parse(text);
  if (Array.isArray(v) && v.every((x) => x && typeof x === "object" && Array.isArray(x.results))) return v.flatMap((x) => x.results);
  if (Array.isArray(v)) return v;
  throw new Error("expected an array of rows");
}

/** Reads the three tables from a folder of <table>.json / <table>.csv. */
export function readExport(dir) {
  const tables = {};
  for (const t of TABLES) {
    const json = path.join(dir, `${t}.json`), csv = path.join(dir, `${t}.csv`);
    if (fs.existsSync(json) && fs.existsSync(csv)) throw new Error(`import-waitlist: ${t} is given both as .json and .csv; keep one`);
    try {
      tables[t] = fs.existsSync(json) ? parseJson(fs.readFileSync(json, "utf8")) : fs.existsSync(csv) ? parseCsv(fs.readFileSync(csv, "utf8")) : [];
    } catch {
      // Never the parser's message: JSON.parse quotes part of the input, which is people's data.
      throw new Error(`import-waitlist: ${t}.${fs.existsSync(json) ? "json" : "csv"} is not valid ${fs.existsSync(json) ? "JSON" : "CSV"}`);
    }
  }
  if (!TABLES.some((t) => tables[t].length)) throw new Error(`import-waitlist: no rows in ${dir} (expected leads, sketches or privacy_requests as .json or .csv)`);
  return tables;
}

/** The old rows as Company OS import records, plus counts. Pure: no network, no output. */
export function toSubmissions({ leads = [], sketches = [], privacy_requests = [] }) {
  const counts = { call_sheet: blank(), storyboard_talent: blank(), storyboard_buyer: blank(), privacy_request: blank(), sketches: { unknown_kind: 0 } };
  const records = [];
  const record = (formKey, row, email, answers, extra = {}) => {
    const at = iso(row.created_at);
    const id = UUID.test(clean(row.id)) ? clean(row.id).toLowerCase() : undefined;
    return {
      entity: "form_submission",
      ...(id ? { id } : {}),
      createdAt: at,
      data: { form_key: formKey, email, answers, ...extra, submitted_at: at, updated_at: iso(row.updated_at) ?? at },
    };
  };

  // Call sheet: one per email. The earliest row is the record (its id and submitted_at); answers merge in time order
  // as the forms module merges a later submission (non-empty values overwrite, empty ones never erase). Where they
  // first signed up (placement) and the consent they saw then stay the earliest non-empty ones.
  const byEmail = new Map();
  for (const row of leads) {
    counts.call_sheet.rows++;
    const email = normEmail(row.email);
    if (!EMAIL.test(email) || !iso(row.created_at)) { counts.call_sheet.invalid++; continue; }
    if (!byEmail.has(email)) byEmail.set(email, []);
    byEmail.get(email).push(row);
  }
  for (const [email, rows] of byEmail) {
    rows.sort((a, b) => iso(a.created_at).localeCompare(iso(b.created_at)));
    let answers = {}, placement = "", consent = "";
    for (const row of rows) {
      const category = clean(row.category);
      // The newer forms store the ZIP in zip_code (city holds "ZIP …"); "What would you offer?" is in feedback, and
      // interests then holds the category's label. The oldest form had no category, and its interests were free text.
      const zip = clean(row.zip_code) || (/^ZIP\s+(.+)$/i.exec(clean(row.city))?.[1] ?? "");
      const details = clean(row.feedback) || (category ? "" : clean(row.interests));
      answers = { ...answers, ...nonEmpty({ zip, category, details }) };
      // A step-2 row's source is "…-details:<first row's id>": not a placement.
      const source = clean(row.source).includes("details:") ? "" : clean(row.source_page) || clean(row.source);
      placement ||= source;
      consent ||= clean(row.consent_version);
    }
    const first = rows[0], last = rows[rows.length - 1];
    const r = record("call_sheet", first, email, answers, {
      ...(placement ? { placement } : {}), ...(consent ? { consent_version: consent } : {}),
    });
    r.data.updated_at = iso(last.created_at);
    r.data.unique_key = `call_sheet\n${email}`;
    records.push(r);
    counts.call_sheet.records++;
    counts.call_sheet.merged += rows.length - 1;
  }

  // Storyboard: the old route kept every answer as JSON in `details` (app/api/sketches/route.ts).
  for (const row of sketches) {
    const formKey = clean(row.kind) === "talent" ? "storyboard_talent" : clean(row.kind) === "buyer" ? "storyboard_buyer" : null;
    if (!formKey) { counts.sketches.unknown_kind++; continue; }
    counts[formKey].rows++;
    const email = normEmail(row.email);
    if (!EMAIL.test(email) || !iso(row.created_at)) { counts[formKey].invalid++; continue; }
    let given;
    try { given = JSON.parse(row.details); } catch { given = null; }
    if (!given || typeof given !== "object" || Array.isArray(given)) given = { details: row.details };
    // Text answers only (a number is kept as text); lists or objects are left out rather than flattened.
    const scalar = (v) => (typeof v === "string" || typeof v === "number" ? v : "");
    const answers = nonEmpty(Object.fromEntries(FORMS[formKey].map((k) => [k, k === "name" ? scalar(given.name) || row.name : scalar(given[k])])));
    const source = clean(row.source);
    records.push(record(formKey, row, email, answers, source ? { placement: source } : {}));
    counts[formKey].records++;
  }

  for (const row of privacy_requests) {
    counts.privacy_request.rows++;
    const email = normEmail(row.email);
    if (!EMAIL.test(email) || !iso(row.created_at)) { counts.privacy_request.invalid++; continue; }
    records.push(record("privacy_request", row, email, nonEmpty({ message: row.message })));
    counts.privacy_request.records++;
  }
  return { records, counts };
}

/** Calls the operator API. A refusal throws with its status and error code only: never the body's details. */
async function call(api, route, body) {
  const res = await api.fetch(`${api.url.replace(/\/+$/, "")}/t/${encodeURIComponent(api.tenant)}${route}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-platform-key": api.platformKey },
    body: JSON.stringify(body),
  });
  let json = null;
  try { json = await res.json(); } catch { /* not JSON */ }
  if (!res.ok) {
    const code = json && typeof json.error === "string" ? json.error.replace(/[^\w.-]/g, "").slice(0, 40) : "error";
    const index = json && Number.isInteger(json.index) ? ` (record ${json.index})` : "";
    throw new Error(`import-waitlist: ${route} answered ${res.status} ${code}${index}`);
  }
  return json;
}

/**
 * Every form_submission already in the tenant: ids, call-sheet emails and (form, email, submitted_at) keys. Paged by
 * id (a cursor), so submissions arriving meanwhile can't shift the pages.
 */
async function existingSubmissions(api) {
  const ids = new Set(), callSheet = new Set(), keys = new Set();
  for (let after; ;) {
    const { data = [] } = await call(api, "/query", {
      entity: "form_submission", sort: [{ field: "id", dir: "asc" }], limit: PAGE,
      ...(after === undefined ? {} : { filter: { field: "id", op: "gt", value: after } }),
    });
    for (const row of data) {
      const d = row.data ?? row;
      const email = normEmail(d.email);
      ids.add(String(row.id));
      if (d.form_key === "call_sheet") callSheet.add(email);
      keys.add(`${d.form_key}\n${email}\n${iso(d.submitted_at)}`);
    }
    if (data.length < PAGE) break;
    after = String(data[data.length - 1].id);
  }
  return { ids, callSheet, keys };
}

/** Imports what isn't there yet (or, with dryRun, only counts it). Logs counts, never values. */
export async function runImport({ tables, api, dryRun, log = console.log }) {
  const { records, counts } = toSubmissions(tables);
  const existing = await existingSubmissions(api);
  const skipped = {};
  const todo = records.filter((r) => {
    const { form_key: f, email, submitted_at: at } = r.data;
    const present = (r.id && existing.ids.has(r.id)) || (f === "call_sheet" ? existing.callSheet.has(email) : existing.keys.has(`${f}\n${email}\n${at}`));
    if (present) skipped[f] = (skipped[f] ?? 0) + 1;
    return !present;
  });

  log(`import-waitlist → tenant ${api.tenant}${dryRun ? " (dry run: nothing is written)" : ""}`);
  for (const [form, c] of Object.entries(counts)) {
    if (form === "sketches") { if (c.unknown_kind) log(`  sketches with an unknown kind, left out: ${c.unknown_kind}`); continue; }
    const go = todo.filter((r) => r.data.form_key === form).length;
    log(`  ${form}: ${c.rows} rows → ${c.records} records (${c.merged} merged by email, ${c.invalid} invalid left out); ${skipped[form] ?? 0} already there; ${go} to import`);
  }

  let created = 0;
  if (!dryRun) {
    for (let i = 0; i < todo.length; i += BATCH) {
      const { ids = [] } = await call(api, "/import/batch", { records: todo.slice(i, i + BATCH) });
      created += ids.length;
      log(`  imported ${created} of ${todo.length}`);
    }
    // Every real run, so a re-run completes an import whose finish failed.
    const { counts: total = {} } = await call(api, "/import/finish", {});
    log(`  form_submission records in the tenant now: ${Number(total.form_submission) || 0}`);
  }
  log(dryRun ? `Would import ${todo.length}.` : `Imported ${created}.`);
  return { created, wouldCreate: todo.length, skipped, counts };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const dir = args.find((a) => !a.startsWith("--"));
  const unknown = args.filter((a) => a.startsWith("--") && a !== "--dry-run");
  const { COMPANY_OS_URL: url, COMPANY_OS_TENANT: tenant, COMPANY_OS_PLATFORM_KEY: platformKey } = process.env;
  const problems = [
    !dir && "give the export folder",
    unknown.length && `unknown option ${unknown[0].split("=")[0]} (the platform key comes from COMPANY_OS_PLATFORM_KEY only)`,
    !url && "set COMPANY_OS_URL", !tenant && "set COMPANY_OS_TENANT", !platformKey && "set COMPANY_OS_PLATFORM_KEY",
    tenant && !/^[a-z0-9][a-z0-9-]*$/.test(tenant) && "COMPANY_OS_TENANT is not a tenant slug",
  ].filter(Boolean);
  if (problems.length) {
    console.error(`import-waitlist: ${problems.join("; ")}.\n  COMPANY_OS_URL=… COMPANY_OS_TENANT=… COMPANY_OS_PLATFORM_KEY=… node scripts/import-waitlist.mjs <export-dir> [--dry-run]`);
    process.exit(2);
  }
  try {
    await runImport({ tables: readExport(dir), api: { url, tenant, platformKey, fetch }, dryRun });
  } catch (err) {
    console.error(err instanceof Error ? err.message : "import-waitlist failed");
    process.exit(1);
  }
}
