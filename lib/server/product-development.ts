import { createHash } from "node:crypto";
import {
  CompanyOsError,
  companyOs,
  configFromEnv,
  type CompanyOs,
  type Credential,
  type Row,
} from "./companyos";
import { bearer, failure, readCapped } from "./routes";
import {
  PHASE_ENTITY,
  SCHEMA,
  WORK_ENTITY,
} from "@/lib/product-development/schema";
import {
  object,
  uuid,
  validateRelations,
  validateWork,
  validatePhase,
  WorkValidationError,
} from "@/lib/product-development/validation";
import type {
  Phase,
  WorkItem,
  WorkspaceSnapshot,
} from "@/lib/product-development/types";

type Meta = {
  key: string;
  fields: { key: string; type: string; config?: Record<string, unknown> }[];
};
type Op = {
  op: "create" | "update";
  entity: string;
  id?: string;
  data: Record<string, unknown>;
  ifMatch?: { field: string; value: unknown };
};
export interface ProductDeps {
  cos?: CompanyOs;
  initializeBatch?: (cred: Credential, ops: Op[]) => Promise<unknown>;
}
const json = (status: number, value: unknown) =>
  new Response(JSON.stringify(value), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
const invalid = (message: string): never => {
  throw new CompanyOsError(400, "invalid_product_request", message);
};
const bodyKeys = (input: Record<string, unknown>, keys: string[]) => {
  if (Object.keys(input).some((key) => !keys.includes(key)))
    invalid("Unexpected request fields.");
};
const phaseOf = (row: Row): Phase => ({
  id: row.id,
  revision: Number(row.data.revision ?? 0),
  title: String(row.data.title ?? ""),
  order: Number(row.data.order ?? 0),
  summary: String(row.data.summary ?? ""),
  state: row.data.state as Phase["state"],
  doneLooksLike: String(row.data.doneLooksLike ?? ""),
  sourceNote: String(row.data.sourceNote ?? ""),
});
function workOf(row: Row): WorkItem {
  const d = row.data;
  return {
    ...validateWork({
      title: d.title,
      phase: d.phase,
      kind: d.kind,
      parent: d.parent ?? "",
      category: d.category,
      journey: d.journey,
      status: d.status,
      owner: d.owner ?? "",
      description: d.description ?? "",
      acceptance: d.acceptance ?? "",
      blocker: d.blocker ?? "",
      startDate: d.startDate ?? "",
      dueDate: d.dueDate ?? "",
      evidence: d.evidence ?? [],
      dependsOn: d.dependsOn ?? [],
      deployment: d.deployment ?? "unknown",
    }),
    id: row.id,
    revision: Number(d.revision ?? 0),
    updatedAt: row.updatedAt,
  };
}
async function metadata(cos: CompanyOs, cred: Credential) {
  return (await cos.call<{ entities: Meta[] }>(cred, "GET", "/meta/entities"))
    .entities;
}
function schemaState(meta: Meta[]) {
  for (const definition of SCHEMA) {
    const entity = meta.find((m) => m.key === definition.key);
    if (!entity) return false;
    for (const expected of definition.fields) {
      const actual = entity.fields.find((f) => f.key === expected.key);
      if (
        !actual ||
        actual.type !== expected.type ||
        actual.config?.serverOnly === true ||
        (expected.type === "reference" &&
          actual.config?.referenceEntityKey !==
            expected.config.referenceEntityKey)
      )
        throw new CompanyOsError(
          409,
          "product_schema_mismatch",
          "The private workspace schema needs review; existing fields were not overwritten.",
        );
    }
  }
  return true;
}
async function rows(cos: CompanyOs, cred: Credential, entity: string) {
  const result: Row[] = [];
  for (let offset = 0; offset < 10000; offset += 500) {
    const page = await cos.query(cred, {
      entity,
      limit: 500,
      offset,
      sort: [{ field: "id", dir: "asc" }],
    });
    result.push(...page);
    if (page.length < 500) return result;
  }
  throw new CompanyOsError(
    409,
    "workspace_limit",
    "This workspace needs a larger paginated view. No partial progress is shown.",
  );
}
async function load(cos: CompanyOs, cred: Credential) {
  const ready = schemaState(await metadata(cos, cred));
  if (!ready)
    return {
      snapshot: {
        ready: false,
        phases: [],
        items: [],
        observedAt: new Date().toISOString(),
        mode: "database",
      } satisfies WorkspaceSnapshot,
      phaseRows: [] as Row[],
      itemRows: [] as Row[],
    };
  // Read phase revisions first. Every participating write guards and advances the same first phase.
  const phaseRows = await rows(cos, cred, PHASE_ENTITY);
  const itemRows = await rows(cos, cred, WORK_ENTITY);
  const phases = phaseRows.map(phaseOf).sort((a, b) => a.order - b.order);
  if (
    phaseRows.length &&
    !phaseRows.some((row) => row.data.seedKey === "phase-0")
  )
    throw new CompanyOsError(
      409,
      "workspace_incomplete",
      "The workspace coordination record needs review.",
    );
  return {
    snapshot: {
      ready: !!phaseRows.length,
      phases,
      items: itemRows.map(workOf),
      observedAt: new Date().toISOString(),
      mode: "database",
    } satisfies WorkspaceSnapshot,
    phaseRows,
    itemRows,
  };
}

/** This seed is only the owner's project brief, not client correspondence or invented completed tasks. */
function initialOps(): Op[] {
  const phases = [
    {
      title: "Phase 0",
      order: 0,
      state: "complete",
      summary: "Complete — reported by Justin.",
      doneLooksLike:
        "Initial project foundation accepted by the project owner.",
      sourceNote:
        "Owner brief, 15 November 2026. Historical status; not a new automated acceptance test.",
      seedKey: "phase-0",
    },
    {
      title: "Phase 1",
      order: 1,
      state: "active",
      summary:
        "Near completion — reported by Justin. Remaining acceptance is tracked below.",
      doneLooksLike:
        "Gigsters can join, complete and submit their profile. Owners can review, request changes and approve the profile. Live data, copy and layout are verified.",
      sourceNote:
        "Owner brief, 15 November 2026. Meters measure only recorded actionable items, not the entire project.",
      seedKey: "phase-1",
    },
    {
      title: "Next phases",
      order: 2,
      state: "planned",
      summary: "Backlog for later work; scope and dates are not committed.",
      doneLooksLike:
        "Define and approve the next phase before delivery starts.",
      sourceNote: "Planning placeholder. No completion percentage inferred.",
      seedKey: "future",
    },
  ];
  const ops: Op[] = phases.map((data) => ({
    op: "create",
    entity: PHASE_ENTITY,
    data: { ...data, revision: 0 },
  }));
  for (const [title, kind, journey, category, acceptance] of [
    [
      "Gigster onboarding",
      "project",
      "gigster",
      "profile",
      "Invitation, signup, profile editing, submission and confirmation verified with a real account.",
    ],
    [
      "Owner review",
      "project",
      "owner",
      "review",
      "Review queue, change requests, approval and access verified end to end.",
    ],
    [
      "Finalize DNS",
      "milestone",
      "shared",
      "infrastructure",
      "Verify production routing and resolve remaining device-specific edge errors.",
    ],
    [
      "Import all waitlist data",
      "milestone",
      "owner",
      "data",
      "Reconcile source and imported counts, consent and duplicate handling without guessing missing fields.",
    ],
    [
      "Finalize Profile Editor",
      "milestone",
      "gigster",
      "profile",
      "Accept the outstanding annotation requests and verify real saved profiles and portfolio media.",
    ],
    [
      "Finalize all Copy & Layout",
      "milestone",
      "shared",
      "copy",
      "Confirm approved wording and responsive layouts on production, with screenshot evidence.",
    ],
  ])
    ops.push({
      op: "create",
      entity: WORK_ENTITY,
      data: {
        title,
        kind,
        journey,
        category,
        acceptance,
        phase: { $ref: 1 },
        parent: null,
        status: "unreconciled",
        owner: "",
        description:
          "Focus identified by Justin. Reconcile detailed checklist and release evidence before marking complete.",
        blocker: "",
        startDate: null,
        dueDate: null,
        evidence: [],
        dependsOn: [],
        deployment: "unknown",
        revision: 0,
        seedKey: title.toLowerCase().replace(/\W+/g, "-"),
      },
    });
  return ops;
}
/** Only setup needs a stable replay key. The key is independent of tokens and client input. */
async function initializeBatch(cred: Credential, ops: Op[]) {
  if (cred.kind !== "session") throw new CompanyOsError(401, "unauthorized");
  const cfg = configFromEnv();
  let res: Response;
  try {
    res = await fetch(`${cfg.url}/t/${encodeURIComponent(cfg.tenant)}/batch`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${cred.token}`,
        "content-type": "application/json",
        "Idempotency-Key": "product-development-initial-workspace-v1",
      },
      body: JSON.stringify({ ops }),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new CompanyOsError(
      502,
      "company_os_unreachable",
      "Refresh before trying setup again.",
    );
  }
  if (!res.ok)
    throw new CompanyOsError(
      res.status,
      "workspace_setup_failed",
      "Refresh before trying setup again.",
    );
  return res.json();
}
export async function handleProductDevelopment(
  request: Request,
  deps: ProductDeps = {},
): Promise<Response> {
  if (request.method !== "POST")
    return json(405, { error: "method_not_allowed" });
  const token = bearer(request);
  if (!token) return json(401, { error: "unauthorized" });
  if (request.url && new URL(request.url).search)
    return json(400, { error: "invalid_product_request" });
  if (
    !(request.headers.get("content-type") ?? "").startsWith("application/json")
  )
    return json(415, { error: "unsupported_media_type" });
  const raw = await readCapped(request, 64 * 1024);
  if (!raw) return json(413, { error: "too_large" });
  let input: Record<string, unknown>;
  try {
    const decoded: unknown = JSON.parse(new TextDecoder().decode(raw));
    if (!object(decoded))
      return json(400, { error: "invalid_product_request" });
    input = decoded;
  } catch {
    return json(400, { error: "invalid_product_request" });
  }
  try {
    const cos = deps.cos ?? companyOs(configFromEnv());
    const cred: Credential = { kind: "session", token };
    if (!(await cos.me(cred)).isSuperAdmin)
      throw new CompanyOsError(
        403,
        "super_admin_only",
        "Only a superadmin can access product development.",
      );
    if (
      !["snapshot", "initialize", "create", "update", "savePhase"].includes(
        String(input.action),
      )
    )
      invalid("Unknown workspace action.");
    bodyKeys(
      input,
      input.action === "create"
        ? ["action", "fields", "requestId"]
        : input.action === "savePhase"
          ? ["action", "id", "revision", "fields", "requestId"]
          : input.action === "update"
            ? ["action", "id", "revision", "fields"]
            : ["action"],
    );
    if (input.action === "initialize") {
      let meta = await metadata(cos, cred);
      for (const definition of SCHEMA) {
        if (!meta.some((m) => m.key === definition.key)) {
          try {
            await cos.call(cred, "POST", "/meta/entities", definition);
          } catch (error) {
            if (!(error instanceof CompanyOsError && error.status === 409))
              throw error;
          }
          meta = await metadata(cos, cred);
        }
      }
      if (!schemaState(meta))
        throw new CompanyOsError(409, "workspace_incomplete");
      const existing = await load(cos, cred);
      if (!existing.snapshot.phases.length) {
        if (existing.snapshot.items.length)
          throw new CompanyOsError(409, "workspace_incomplete");
        await (deps.initializeBatch ?? initializeBatch)(cred, initialOps());
      }
    } else if (input.action === "savePhase") {
      const fields = validatePhase(input.fields);
      const { snapshot, phaseRows } = await load(cos, cred);
      const hash = createHash("sha256")
        .update(JSON.stringify(fields))
        .digest("hex");
      if (!input.id) {
        if (!uuid(input.requestId)) invalid("Provide a unique action ID.");
        const existing = phaseRows.find(
          (row) => row.data.seedKey === `request:${input.requestId}`,
        );
        if (existing) {
          if (existing.data.creationHash !== hash)
            throw new CompanyOsError(
              409,
              "request_reused",
              "A saved action ID cannot be reused with different content. Refresh first.",
            );
          return json(200, { result: snapshot });
        }
      }
      if (!snapshot.ready)
        throw new CompanyOsError(409, "workspace_not_initialized");
      if (
        input.id !== undefined &&
        (!uuid(input.id) || !Number.isSafeInteger(input.revision))
      )
        invalid("Choose a valid phase revision.");
      const current = phaseRows.find((row) => row.id === input.id);
      if (input.id && (!current || current.data.revision !== input.revision))
        throw new CompanyOsError(
          409,
          "phase_changed",
          "This phase changed. Refresh before saving.",
        );
      if (
        fields.state === "complete" &&
        snapshot.items.some(
          (item) =>
            item.phase === input.id &&
            item.kind !== "communication" &&
            !["done", "archived"].includes(item.status),
        )
      )
        invalid("Complete the active work in this phase first.");
      const lock = phaseRows.find((row) => row.data.seedKey === "phase-0")!;
      const ops: Op[] = [
        {
          op: "update",
          entity: PHASE_ENTITY,
          id: lock.id,
          data: {
            ...(current?.id === lock.id ? fields : {}),
            revision: Number(lock.data.revision) + 1,
          },
          ifMatch: { field: "revision", value: lock.data.revision },
        },
      ];
      if (current?.id !== lock.id)
        ops.push(
          current
            ? {
                op: "update",
                entity: PHASE_ENTITY,
                id: current.id,
                data: {
                  ...fields,
                  revision: Number(current.data.revision) + 1,
                },
                ifMatch: { field: "revision", value: current.data.revision },
              }
            : {
                op: "create",
                entity: PHASE_ENTITY,
                data: {
                  ...fields,
                  revision: 0,
                  seedKey: `request:${input.requestId}`,
                  creationHash: hash,
                },
              },
        );
      await cos.call(cred, "POST", "/batch", { ops });
    } else if (input.action === "create" || input.action === "update") {
      const fields = validateWork(input.fields);
      const { snapshot, phaseRows, itemRows } = await load(cos, cred);
      if (!snapshot.ready)
        throw new CompanyOsError(
          409,
          "workspace_not_initialized",
          "Initialize the private database workspace first.",
        );
      const hash = createHash("sha256")
        .update(JSON.stringify(fields))
        .digest("hex");
      if (input.action === "create") {
        if (!uuid(input.requestId)) invalid("Provide a unique action ID.");
        const existing = itemRows.find(
          (row) => row.data.seedKey === `request:${input.requestId}`,
        );
        if (existing) {
          if (existing.data.creationHash !== hash)
            throw new CompanyOsError(
              409,
              "request_reused",
              "A saved action ID cannot be reused with different content. Refresh first.",
            );
          return json(200, { result: snapshot });
        }
      }
      const id = input.action === "update" ? input.id : "";
      if (
        input.action === "update" &&
        (!uuid(id) ||
          !Number.isSafeInteger(input.revision) ||
          Number(input.revision) < 0)
      )
        invalid("Choose a valid saved record and revision.");
      const current = snapshot.items.find((item) => item.id === id);
      if (input.action === "update" && !current)
        throw new CompanyOsError(404, "work_item_not_found");
      if (current && current.revision !== input.revision)
        throw new CompanyOsError(
          409,
          "work_changed",
          "Someone changed this item. Refresh and compare before saving.",
        );
      validateRelations(fields, String(id), snapshot.phases, snapshot.items);
      const lock = phaseRows.find((row) => row.data.seedKey === "phase-0")!;
      const revision = Number(lock.data.revision ?? 0);
      if (!Number.isSafeInteger(revision))
        throw new CompanyOsError(409, "workspace_revision_invalid");
      const ops: Op[] = [
        {
          op: "update",
          entity: PHASE_ENTITY,
          id: lock.id,
          data: { revision: revision + 1 },
          ifMatch: { field: "revision", value: lock.data.revision ?? 0 },
        },
      ];
      ops.push(
        current
          ? {
              op: "update",
              entity: WORK_ENTITY,
              id: current.id,
              data: { ...fields, revision: current.revision + 1 },
              ifMatch: { field: "revision", value: current.revision },
            }
          : {
              op: "create",
              entity: WORK_ENTITY,
              data: {
                ...fields,
                revision: 0,
                seedKey: `request:${input.requestId}`,
                creationHash: hash,
              },
            },
      );
      await cos.call(cred, "POST", "/batch", { ops });
    }
    return json(200, { result: (await load(cos, cred)).snapshot });
  } catch (error) {
    if (error instanceof WorkValidationError)
      return json(400, {
        error: "invalid_product_request",
        message: error.message,
      });
    return failure(error);
  }
}
