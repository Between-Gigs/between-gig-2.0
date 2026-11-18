import { describe, expect, it } from "vitest";
import { handleProductDevelopment } from "./product-development";
import { CompanyOsError, type CompanyOs, type Row } from "./companyos";
import {
  SCHEMA,
  PHASE_ENTITY,
  WORK_ENTITY,
} from "@/lib/product-development/schema";
import type { WorkFields } from "@/lib/product-development/types";
const verifiedIdentity = { user: { id: "00000000-0000-4000-8000-000000000010", email: "qa@example.test" }, roleKeys: ["super_admin"], isSuperAdmin: true, tenant: { slug: "between-gigs", id: "38c1218b-1c1f-4fd3-874a-a8b2ea547628" } };
const phase = "00000000-0000-4000-8000-000000000001";
const action = "00000000-0000-4000-8000-000000000099";
const fields: WorkFields = {
  title: "Verify the owner queue",
  phase,
  kind: "task",
  parent: "",
  category: "review",
  journey: "owner",
  status: "not_started",
  owner: "",
  description: "",
  acceptance: "Reload after save",
  blocker: "",
  startDate: "",
  dueDate: "",
  evidence: [],
  dependsOn: [],
  deployment: "unknown",
};
const req = (body: unknown) =>
  new Request("https://example.org/api/product-development/", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer session-token",
    },
    body: JSON.stringify(body),
  });
function backend() {
  const records: Record<string, Row[]> = {
    [PHASE_ENTITY]: [
      {
        id: phase,
        data: {
          title: "Phase 0",
          order: 0,
          state: "complete",
          summary: "Owner reported",
          doneLooksLike: "Accepted",
          sourceNote: "Owner",
          revision: 0,
          seedKey: "phase-0",
        },
        createdAt: "2026-11-15T00:00:00Z",
        updatedAt: "2026-11-15T00:00:00Z",
      },
    ],
    [WORK_ENTITY]: [],
  };
  let count = 10;
  let batches = 0;
  let conflict = false;
  const cos = {
    me: async () => (verifiedIdentity),
    query: async (
      _cred: unknown,
      spec: { entity: string; offset?: number; limit?: number },
    ) =>
      structuredClone(
        records[spec.entity]!.slice(
          spec.offset ?? 0,
          (spec.offset ?? 0) + (spec.limit ?? 500),
        ),
      ),
    call: async (
      _cred: unknown,
      method: string,
      path: string,
      body?: {
        ops: {
          op: string;
          entity: string;
          id?: string;
          data: Record<string, unknown>;
          ifMatch?: { field: string; value: unknown };
        }[];
      },
    ) => {
      if (path === "/admin/roles") return { roles: [{ key: "super_admin", permissions: SCHEMA.flatMap(entity => ["read", "create", "update", "delete"].map(action => ({entity: entity.key, action, scope: "all"}))) }] };
      if (path === "/meta/entities") return { entities: SCHEMA };
      if (method !== "POST" || path !== "/batch")
        throw new Error("Unexpected API call " + path);
      if (conflict) throw new CompanyOsError(409, "precondition_failed");
      const draft = structuredClone(records);
      const ids: string[] = [];
      for (const op of body!.ops) {
        if (op.op === "update") {
          const row = draft[op.entity]!.find((r) => r.id === op.id)!;
          if (op.ifMatch && row.data[op.ifMatch.field] !== op.ifMatch.value)
            throw new CompanyOsError(409, "precondition_failed");
          row.data = { ...row.data, ...op.data };
          ids.push(row.id);
        } else {
          const id = `00000000-0000-4000-8000-${String(count++).padStart(12, "0")}`;
          draft[op.entity]!.push({
            id,
            data: op.data,
            createdAt: "2026-11-15T00:00:00Z",
            updatedAt: "2026-11-15T00:00:00Z",
          });
          ids.push(id);
        }
      }
      Object.assign(records, draft);
      batches++;
      return { ids };
    },
  } as unknown as CompanyOs;
  return {
    cos,
    records,
    batches: () => batches,
    setConflict: () => {
      conflict = true;
    },
  };
}
describe("management route persistence contract (isolated backend)", () => {
  it("creates once across repeated action IDs and reloads the backend", async () => {
    const db = backend();
    const body = { action: "create", fields, requestId: action };
    for (let i = 0; i < 2; i++)
      expect(
        (await handleProductDevelopment(req(body), { cos: db.cos })).status,
      ).toBe(200);
    expect(db.records[WORK_ENTITY]).toHaveLength(1);
    expect(db.batches()).toBe(1);
    const read = await handleProductDevelopment(req({ action: "snapshot" }), {
      cos: db.cos,
    });
    expect((await read.json()).result.items[0].title).toBe(fields.title);
    expect(
      (
        await handleProductDevelopment(
          req({ ...body, fields: { ...fields, title: "Different" } }),
          { cos: db.cos },
        )
      ).status,
    ).toBe(409);
  });
  it("guards revisions and never overwrites a newer record", async () => {
    const db = backend();
    await handleProductDevelopment(
      req({ action: "create", fields, requestId: action }),
      { cos: db.cos },
    );
    const id = db.records[WORK_ENTITY]![0]!.id;
    const body = {
      action: "update",
      id,
      revision: 0,
      fields: { ...fields, title: "Updated" },
    };
    expect(
      (await handleProductDevelopment(req(body), { cos: db.cos })).status,
    ).toBe(200);
    expect(
      (
        await handleProductDevelopment(
          req({ ...body, fields: { ...fields, title: "Stale" } }),
          { cos: db.cos },
        )
      ).status,
    ).toBe(409);
    expect(db.records[WORK_ENTITY]![0]!.data.title).toBe("Updated");
  });
  it("refuses forged references and concurrent workspace edits without writing", async () => {
    const db = backend();
    expect(
      (
        await handleProductDevelopment(
          req({
            action: "create",
            fields: { ...fields, parent: action },
            requestId: action,
          }),
          { cos: db.cos },
        )
      ).status,
    ).toBe(400);
    db.setConflict();
    expect(
      (
        await handleProductDevelopment(
          req({ action: "create", fields, requestId: action }),
          { cos: db.cos },
        )
      ).status,
    ).toBe(409);
    expect(db.records[WORK_ENTITY]).toHaveLength(0);
  });
  it("creates and edits a phase once, with revision protection", async () => {
    const db = backend();
    const f = {
      title: "Next phase",
      order: 2,
      state: "planned",
      summary: "Not committed",
      doneLooksLike: "Define scope",
      sourceNote: "",
    };
    const create = { action: "savePhase", fields: f, requestId: action };
    expect(
      (await handleProductDevelopment(req(create), { cos: db.cos })).status,
    ).toBe(200);
    expect(
      (await handleProductDevelopment(req(create), { cos: db.cos })).status,
    ).toBe(200);
    expect(db.records[PHASE_ENTITY]).toHaveLength(2);
    const id = db.records[PHASE_ENTITY]![1]!.id;
    expect(
      (
        await handleProductDevelopment(
          req({
            action: "savePhase",
            id,
            revision: 0,
            fields: { ...f, title: "Phase 2" },
          }),
          { cos: db.cos },
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await handleProductDevelopment(
          req({ action: "savePhase", id, revision: 0, fields: f }),
          { cos: db.cos },
        )
      ).status,
    ).toBe(409);
  });
  it("initialize on an existing workspace is read-only", async () => {
    const db = backend();
    expect(
      (
        await handleProductDevelopment(req({ action: "initialize" }), {
          cos: db.cos,
          initializeBatch: async () => {
            throw new Error("Must not seed again");
          },
        })
      ).status,
    ).toBe(200);
    expect(db.batches()).toBe(0);
  });
});
