// Owner-only evidence intake. Private JSON never belongs in public source or an export.
// Dry run: node scripts/import-product-development.mjs /private/intake.json
// Apply: BG_ADMIN_SESSION_TOKEN=<short-lived Clerk session> node scripts/import-product-development.mjs /private/intake.json --apply --base=https://test.between-gigs.com
// On the gated test host, also set BG_TEST_GATE_COOKIE to the current test gate Cookie header.
// The token and cookie are never logged or persisted. No email, invitation, role or unrelated data is changed.
import fs from "node:fs";
import { createHash } from "node:crypto";
const file = process.argv[2];
const apply = process.argv.includes("--apply");
const base = process.argv.find((a) => a.startsWith("--base="))?.slice(7);
if (!file) throw new Error("Provide a private intake JSON file.");
const source = JSON.parse(fs.readFileSync(file, "utf8"));
if (
  !Array.isArray(source) ||
  source.length > 150 ||
  source.some(
    (r) =>
      !r ||
      typeof r.sourceKey !== "string" ||
      !r.title ||
      !Array.isArray(r.evidence),
  )
)
  throw new Error("Expected up to 150 sourced work records.");
if (new Set(source.map((r) => r.sourceKey)).size !== source.length)
  throw new Error("Duplicate source keys.");
const requestId = (key) => {
  const h = createHash("sha256")
    .update("bg-product-evidence-v1:" + key)
    .digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
if (!apply) {
  console.log(
    JSON.stringify({
      mode: "dry-run",
      records: source.length,
      uniqueSourceKeys: true,
      note: "No network or database changes. Do not commit this intake file.",
    }),
  );
  process.exit(0);
}
if (
  !["https://test.between-gigs.com", "https://between-gigs.com"].includes(base)
)
  throw new Error("Use an approved test or production origin.");
const token = process.env.BG_ADMIN_SESSION_TOKEN;
if (!token)
  throw new Error(
    "A current superadmin Clerk session is required. No token is stored by this script.",
  );
async function call(body) {
  const res = await fetch(base + "/api/product-development/", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      ...(base === "https://test.between-gigs.com" &&
      process.env.BG_TEST_GATE_COOKIE
        ? { cookie: process.env.BG_TEST_GATE_COOKIE }
        : {}),
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  const parsed = await res.json().catch(() => ({}));
  if (!res.ok || !parsed.result)
    throw new Error(
      `Request refused or uncertain (${res.status}, ${parsed.error ?? "no_result"}). Stop and reconcile; no blind retry.`,
    );
  return parsed.result;
}
let snapshot = await call({ action: "snapshot" });
if (!snapshot.ready)
  throw new Error(
    "Initialize the protected workspace once before importing evidence.",
  );
const phase = snapshot.phases.find((p) => p.title === "Phase 1");
if (!phase)
  throw new Error("Phase 1 was not found; select the intended phase manually.");
let processed = 0;
for (const record of source) {
  const parentTitle =
    record.category === "infrastructure"
      ? "Finalize DNS"
      : record.category === "data"
        ? "Import all waitlist data"
        : record.category === "profile"
          ? "Finalize Profile Editor"
          : ["copy", "ui", "accessibility"].includes(record.category)
            ? "Finalize all Copy & Layout"
            : record.journey === "owner"
              ? "Owner review"
              : "Gigster onboarding";
  const parent =
    snapshot.items.find(
      (item) =>
        item.phase === phase.id &&
        item.title === parentTitle &&
        item.status !== "archived",
    )?.id ?? "";
  const fields = {
    title: record.title,
    phase: phase.id,
    kind: record.kind,
    parent,
    category: record.category,
    journey: record.journey,
    status: record.status,
    owner: "",
    description: record.description,
    acceptance: record.acceptance,
    blocker: record.blocker,
    startDate: "",
    dueDate: "",
    evidence: record.evidence,
    dependsOn: [],
    deployment: record.deployment,
  };
  snapshot = await call({
    action: "create",
    requestId: requestId(record.sourceKey),
    fields,
  });
  processed++;
  console.log(`Processed ${processed}/${source.length}; backend confirmed.`);
}
console.log(
  JSON.stringify({
    mode: "applied",
    processed,
    totalRecords: snapshot.items.length,
    observedAt: snapshot.observedAt,
    note: "Same source keys replay safely. This imports evidence; it does not verify deployments or send communications.",
  }),
);
