import fs from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { companyOs } from "./companyos";
import { testHubEmail } from "./email-hub";
import { sendReal } from "./manual-emails";

// Execute the actual private upstream declarations, never vendor them into this public repo.
const root = process.env.COMPANY_OS_CONTRACT_ROOT;
const read = (name: string) => {
  if (!root) throw new Error("Set COMPANY_OS_CONTRACT_ROOT to the private source checkout");
  const text = fs.readFileSync(path.join(root, name === "errors" ? "apps/api/src/errors.ts" : "apps/api/src/services/idempotency.ts"), "utf8");
  const sha = name === "errors" ? "f8c3e6be3ad3322b6e06c7792b6d970ea3a61297fe72fff184f76d7aaec252a4" : "69188b5c755cdbae4810bc9d5561261bcd21a3a0e9c113f99249bd8ff81b0718";
  if (createHash("sha256").update(text).digest("hex") !== sha) throw new Error("Company OS parser source changed; review and update the pinned contract before relying on it.");
  return text;
};
function declarations(text: string, names: string[]) {
  const source = ts.createSourceFile("upstream.ts", text, ts.ScriptTarget.Latest, true);
  return source.statements.filter(s =>
    (ts.isClassDeclaration(s) || ts.isFunctionDeclaration(s)) ? !!s.name && names.includes(s.name.text) :
      ts.isVariableStatement(s) && s.declarationList.declarations.some(d => ts.isIdentifier(d.name) && names.includes(d.name.text))
  ).map(s => s.getText(source)).join("\n");
}
function loadContract() {
  const compiled = ts.transpileModule(declarations(read("errors"), ["HttpError"]) + "\n" + declarations(read("idempotency"), ["KEY_PATTERN", "IDEMPOTENCY_TTL_HOURS", "idempotencyKeyOf"]), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const api = {} as { idempotencyKeyOf(req: { headers: Record<string, string> }): string; IDEMPOTENCY_TTL_HOURS: number };
  vm.runInNewContext(compiled, { exports: api });
  return api;
}
const api = root ? loadContract() : null;
const id = "11111111-1111-4111-8111-111111111111";
const now = Date.now();
function setup() {
  let sends = 0;
  const cos = companyOs({ url: "https://cos.test", tenant: "between-gigs", readerToken: "", submitterToken: "", fetch: (async (url, init) => {
    if (String(url).endsWith("/me")) return Response.json({ isSuperAdmin: true });
    if (String(url).endsWith("/query")) return Response.json({ data: [{ id, data: { key: "approved", channel: "email", active: true, subject: "Subject", body: "Text", body_html: "<p>Text</p>" } }] });
    api!.idempotencyKeyOf({ headers: { "idempotency-key": new Headers(init?.headers).get("Idempotency-Key")! } });
    sends++;
    return Response.json({ data: { status: "queued" } }, { status: 202 });
  }) as typeof fetch });
  return { ctx: { cos, cred: { kind: "session" as const, token: "owner" }, appUrl: "https://between-gigs.com" }, count: () => sends };
}
describe.skipIf(!root)("actual Company OS idempotency contract", () => {
  it("reproduces the old prefix rejection using the real parser", () => {
    expect(() => api!.idempotencyKeyOf({ headers: { "idempotency-key": `owner-email:${id}` } })).toThrow();
    expect(api!.idempotencyKeyOf({ headers: { "idempotency-key": `owner-email_${id}` } })).toBe(`owner-email_${id}`);
    expect(api!.IDEMPOTENCY_TTL_HOURS).toBe(24);
  });
  it("accepts the actual gateway key through the upstream parser", async () => {
    const f = setup();
    await expect(testHubEmail(f.ctx, [{ name: "approved", recipient: "a@example.org", requestId: id, startedAt: now }])).resolves.toEqual({ status: "queued" });
    expect(f.count()).toBe(1);
  });
  it("accepts the actual manual-resend gateway key through the upstream parser", async () => {
    const f = setup();
    await expect(sendReal(f.ctx, [{ name: "approved", requestId: id, binding: { templateKey: "approved", recipient: "a@example.org", contextId: id, eventId: id, releaseId: id, fingerprint: "a".repeat(64) } }])).resolves.toEqual({ status: "queued" });
    expect(f.count()).toBe(1);
  });
  it("never retries at or beyond the shorter site window, including after upstream expiry", async () => {
    for (const age of [23, api!.IDEMPOTENCY_TTL_HOURS, 25]) {
      const f = setup();
      await expect(testHubEmail(f.ctx, [{ name: "approved", recipient: "a@example.org", requestId: id, startedAt: now - age * 3600000 }])).rejects.toMatchObject({ status: 409, code: "test_retry_window_expired" });
      expect(f.count()).toBe(0);
    }
  });
});
