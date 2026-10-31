import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { parseCsv, readExport, runImport, toSubmissions } from "./import-waitlist.mjs";

// The one-time import of the old app's sign-ups (decision N-06) into Company OS `form_submission` records.
// Rule D1: every row here is made up; the importer is never run against real data in a test.
const lead = (o: Record<string, string>) => ({
  id: "", created_at: "2026-09-01T10:00:00.000Z", name: "", email: "", role: "offer", city: "", interests: "", feedback: "",
  consent_version: "professional-waitlist-v1", source: "professionals3", source_page: "", zip_code: "", category: "", ...o,
});
const leads = [
  lead({ id: "11111111-1111-4111-8111-111111111111", created_at: "2026-09-02T10:00:00.000Z", email: "  Sam.Fiction@Example.TEST ", zip_code: "90026", category: "wardrobe", interests: "Wardrobe", source_page: "/professionals" }),
  // Step 2 of the same person, a day later: adds details, keeps the ZIP.
  lead({ id: "22222222-2222-4222-8222-222222222222", created_at: "2026-09-03T10:00:00.000Z", email: "sam.fiction@example.test", category: "wardrobe", feedback: "Costume alterations", source: "feedback2-details:11111111-1111-4111-8111-111111111111" }),
  // An earlier, older-form sign-up for the same address: becomes the record's id and submitted_at.
  lead({ id: "00000000-0000-4000-8000-000000000000", created_at: "2026-08-15T09:00:00.000Z", email: "sam.fiction@example.test", city: "ZIP 90027", interests: "Set builds", source: "landing", consent_version: "la-waitlist-v1" }),
  lead({ id: "33333333-3333-4333-8333-333333333333", email: "kim.madeup@example.test", zip_code: "10001", category: "events" }),
  lead({ id: "44444444-4444-4444-8444-444444444444", email: "not-an-email" }),
];
const sketches = [
  { id: "55555555-5555-4555-8555-555555555555", created_at: "2026-09-05T12:00:00.000Z", updated_at: "2026-09-05T12:00:00.000Z", kind: "talent", name: "Lee Invented", email: "Lee@Example.test",
    details: JSON.stringify({ name: "Lee Invented", email: "lee@example.test", role: "Grip", services: "Rigging", location: "Burbank", availability: "Weekends", rate: "", details: "<script>alert(1)</script>" }), source: "interactive-sketchbook" },
  { id: "66666666-6666-4666-8666-666666666666", created_at: "2026-09-06T12:00:00.000Z", updated_at: "2026-09-06T13:00:00.000Z", kind: "buyer", name: "Pat Pretend", email: "pat@example.test",
    details: JSON.stringify({ name: "Pat Pretend", email: "pat@example.test", project: "Garden shed", location: "Pasadena", timing: "Spring", team_size: "One person", budget: "", details: "", secret_field: "dropped" }), source: "interactive-sketchbook" },
  { id: "77777777-7777-4777-8777-777777777777", created_at: "2026-09-07T12:00:00.000Z", updated_at: "2026-09-07T12:00:00.000Z", kind: "other", name: "X", email: "x@example.test", details: "{}", source: "s" },
];
const privacy = [{ id: "88888888-8888-4888-8888-888888888888", created_at: "2026-09-08T08:00:00.000Z", email: "Ana@Example.test", kind: "privacy-request", message: "Please delete my data." }];

describe("toSubmissions", () => {
  const { records, counts } = toSubmissions({ leads, sketches, privacy_requests: privacy });
  const byForm = (k: string) => records.filter((r: { data: { form_key: string } }) => r.data.form_key === k);

  it("makes one call-sheet record per email: the earliest sign-up, with the non-empty answers merged", () => {
    const sam = byForm("call_sheet").find((r: { data: { email: string } }) => r.data.email === "sam.fiction@example.test");
    expect(byForm("call_sheet")).toHaveLength(2);
    expect(sam).toEqual({
      entity: "form_submission",
      id: "00000000-0000-4000-8000-000000000000",
      createdAt: "2026-08-15T09:00:00.000Z",
      data: {
        form_key: "call_sheet",
        email: "sam.fiction@example.test",
        // Later non-empty answers overwrite, empty ones never erase (the forms module's own merge rule).
        answers: { zip: "90026", category: "wardrobe", details: "Costume alterations" },
        placement: "landing",
        consent_version: "la-waitlist-v1",
        submitted_at: "2026-08-15T09:00:00.000Z",
        updated_at: "2026-09-03T10:00:00.000Z",
        unique_key: "call_sheet\nsam.fiction@example.test",
      },
    });
  });

  it("takes the ZIP from the old city column and free-text interests as details when nothing newer says otherwise", () => {
    const { records: only } = toSubmissions({ leads: [leads[2]], sketches: [], privacy_requests: [] });
    expect(only[0].data.answers).toEqual({ zip: "90027", details: "Set builds" });
  });

  it("does not use interests as details when it is just the category's label", () => {
    const kim = byForm("call_sheet").find((r: { data: { email: string } }) => r.data.email === "kim.madeup@example.test");
    expect(kim.data.answers).toEqual({ zip: "10001", category: "events" });
    expect(kim.data.placement).toBe("professionals3");
  });

  it("maps sketches to the talent and buyer forms, keeping only the form's answer keys, values verbatim", () => {
    const [talent] = byForm("storyboard_talent");
    const [buyer] = byForm("storyboard_buyer");
    expect(talent.data).toMatchObject({ email: "lee@example.test", placement: "interactive-sketchbook", submitted_at: "2026-09-05T12:00:00.000Z" });
    expect(talent.data.answers).toEqual({ name: "Lee Invented", role: "Grip", services: "Rigging", location: "Burbank", availability: "Weekends", details: "<script>alert(1)</script>" });
    expect(buyer.data.answers).toEqual({ name: "Pat Pretend", project: "Garden shed", location: "Pasadena", timing: "Spring", team_size: "One person" });
    expect(buyer.data.updated_at).toBe("2026-09-06T13:00:00.000Z");
    expect(talent.data.unique_key).toBeUndefined();
  });

  it("maps privacy requests", () => {
    expect(byForm("privacy_request")).toEqual([{
      entity: "form_submission", id: "88888888-8888-4888-8888-888888888888", createdAt: "2026-09-08T08:00:00.000Z",
      data: { form_key: "privacy_request", email: "ana@example.test", answers: { message: "Please delete my data." }, submitted_at: "2026-09-08T08:00:00.000Z", updated_at: "2026-09-08T08:00:00.000Z" },
    }]);
  });

  it("counts what it merged and refused, without values", () => {
    expect(counts).toEqual({
      call_sheet: { rows: 5, records: 2, merged: 2, invalid: 1 },
      storyboard_talent: { rows: 1, records: 1, merged: 0, invalid: 0 },
      storyboard_buyer: { rows: 1, records: 1, merged: 0, invalid: 0 },
      privacy_request: { rows: 1, records: 1, merged: 0, invalid: 0 },
      sketches: { unknown_kind: 1 },
    });
  });

  it("reads zone-less SQLite datetimes as UTC and epoch numbers as seconds or milliseconds, the same on any machine", () => {
    const at = (created_at: string | number) => toSubmissions({ leads: [], sketches: [], privacy_requests: [{ id: "", email: "a@example.test", kind: "privacy-request", message: "m", created_at }] }).records[0]?.data.submitted_at;
    expect(at("2026-09-01 10:00:00")).toBe("2026-09-01T10:00:00.000Z");
    expect(at("2026-09-01T10:00:00")).toBe("2026-09-01T10:00:00.000Z");
    expect(at(1788256800)).toBe("2026-09-01T10:00:00.000Z");
    expect(at("1788256800000")).toBe("2026-09-01T10:00:00.000Z");
    expect(at("2026-09-01T12:00:00+02:00")).toBe("2026-09-01T10:00:00.000Z");
  });

  it("leaves out storyboard answers that aren't text", () => {
    const row = { id: "", created_at: "2026-09-05T12:00:00.000Z", updated_at: "", kind: "talent", name: "N", email: "n@example.test", source: "",
      details: JSON.stringify({ role: ["a", "b"], services: { x: 1 }, location: 12, availability: "Weekends" }) };
    expect(toSubmissions({ leads: [], sketches: [row], privacy_requests: [] }).records[0].data.answers).toEqual({ name: "N", location: "12", availability: "Weekends" });
  });

  it("strips characters Postgres refuses and leaves no empty answers", () => {
    const { records: r } = toSubmissions({ leads: [lead({ email: "z@example.test", zip_code: "9\u000000 1", category: " " })], sketches: [], privacy_requests: [] });
    expect(r[0].data.answers).toEqual({ zip: "900 1" });
    expect(r[0].id).toBeUndefined();
  });
});

describe("parseCsv / readExport", () => {
  it("parses quoted fields with commas, quotes and line breaks", () => {
    expect(parseCsv('id,email,feedback\r\n1,a@example.test,"Hello, ""you""\nthere"\n')).toEqual([{ id: "1", email: "a@example.test", feedback: 'Hello, "you"\nthere' }]);
  });

  const dirs: string[] = [];
  afterEach(() => { for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true }); });

  it("reads each table from JSON (plain rows or wrangler's [{ results }]) or CSV, and needs at least one", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "bg-import-"));
    dirs.push(dir);
    writeFileSync(path.join(dir, "leads.json"), JSON.stringify([{ results: [lead({ email: "a@example.test" })] }]));
    writeFileSync(path.join(dir, "privacy_requests.csv"), "id,created_at,email,kind,message\n9,2026-09-01T00:00:00Z,b@example.test,privacy-request,Hi\n");
    const tables = readExport(dir);
    expect(tables.leads).toHaveLength(1);
    expect(tables.sketches).toEqual([]);
    expect(tables.privacy_requests[0].email).toBe("b@example.test");
    mkdirSync(path.join(dir, "empty"));
    expect(() => readExport(path.join(dir, "empty"))).toThrow(/leads/);
  });

  it("never quotes the file in a read error (JSON.parse messages include part of the input)", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "bg-import-"));
    dirs.push(dir);
    writeFileSync(path.join(dir, "leads.json"), '[{"email":"ana@example.test" oops');
    expect(() => readExport(dir)).toThrow(/^import-waitlist: leads\.json is not valid JSON$/);
  });

  it("refuses a table given twice", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "bg-import-"));
    dirs.push(dir);
    writeFileSync(path.join(dir, "leads.json"), "[]");
    writeFileSync(path.join(dir, "leads.csv"), "id\n");
    expect(() => readExport(dir)).toThrow(/both/);
  });
});

describe("runImport", () => {
  const api = (existing: Array<{ id: string; data: Record<string, unknown> }>) => {
    const calls: Array<{ url: string; init: RequestInit & { headers: Record<string, string> } }> = [];
    const fetch = async (url: string, init: RequestInit & { headers: Record<string, string> }) => {
      calls.push({ url, init });
      const body = JSON.parse(String(init.body ?? "{}"));
      if (url.endsWith("/query")) {
        const after = body.filter?.value;
        const rows = [...existing].sort((a, b) => a.id.localeCompare(b.id)).filter((r) => after === undefined || r.id > after);
        if (body.offset) throw new Error("offset paging");
        return Response.json({ data: rows.slice(0, body.limit) });
      }
      if (url.endsWith("/import/batch")) return Response.json({ ids: body.records.map((_: unknown, i: number) => `id-${i}`) });
      if (url.endsWith("/import/finish")) return Response.json({ counts: { form_submission: 99 } });
      return new Response("not found", { status: 404 });
    };
    return { calls, fetch };
  };
  const tables = { leads, sketches, privacy_requests: privacy };
  const base = { url: "http://fictional-api.test:4000", tenant: "between-gigs-dev", platformKey: "fictional-platform-key" };

  it("skips emails already on the call sheet and submissions already imported, then imports the rest", async () => {
    const { calls, fetch } = api([
      { id: "x1", data: { form_key: "call_sheet", email: "kim.madeup@example.test", submitted_at: "2026-10-01T00:00:00.000Z" } },
      { id: "88888888-8888-4888-8888-888888888888", data: { form_key: "privacy_request", email: "ana@example.test", submitted_at: "2026-09-08T08:00:00.000Z" } },
    ]);
    const lines: string[] = [];
    const summary = await runImport({ tables, api: { ...base, fetch }, dryRun: false, log: (l: string) => lines.push(l) });

    const batches = calls.filter((c) => c.url.endsWith("/import/batch"));
    expect(batches).toHaveLength(1);
    expect(batches[0].url).toBe("http://fictional-api.test:4000/t/between-gigs-dev/import/batch");
    expect(batches[0].init.headers["x-platform-key"]).toBe("fictional-platform-key");
    const sent = JSON.parse(String(batches[0].init.body)).records;
    expect(sent.map((r: { data: { form_key: string } }) => r.data.form_key).sort()).toEqual(["call_sheet", "storyboard_buyer", "storyboard_talent"]);
    expect(summary.created).toBe(3);
    expect(summary.skipped).toEqual({ call_sheet: 1, privacy_request: 1 });
    // Never a value in the log: no email, no answer, no key.
    const out = lines.join("\n");
    for (const v of ["@example.test", "Costume", "Grip", "fictional-platform-key", "90026"]) expect(out).not.toContain(v);
  });

  it("dry run: reads what is there, prints counts only and writes nothing", async () => {
    const { calls, fetch } = api([]);
    const lines: string[] = [];
    const summary = await runImport({ tables, api: { ...base, fetch }, dryRun: true, log: (l: string) => lines.push(l) });
    expect(calls.some((c) => c.url.includes("/import/"))).toBe(false);
    expect(summary.created).toBe(0);
    expect(summary.wouldCreate).toBe(5);
    expect(lines.join("\n")).not.toMatch(/@|Costume|Grip|90026/);
  });

  it("is re-runnable: a second run over the same export imports nothing", async () => {
    const first = api([]);
    await runImport({ tables, api: { ...base, fetch: first.fetch }, dryRun: false, log: () => {} });
    const sent = JSON.parse(String(first.calls.find((c) => c.url.endsWith("/import/batch"))!.init.body)).records;
    const second = api(sent.map((r: { id?: string; data: Record<string, unknown> }, i: number) => ({ id: r.id ?? `new-${i}`, data: r.data })));
    const summary = await runImport({ tables, api: { ...base, fetch: second.fetch }, dryRun: false, log: () => {} });
    expect(second.calls.some((c) => c.url.endsWith("/import/batch"))).toBe(false);
    expect(summary.created).toBe(0);
  });

  it("finishes the import on every real run, so a re-run after a failed finish completes it", async () => {
    const { calls, fetch } = api([]);
    await runImport({ tables: { leads: [], sketches: [], privacy_requests: [] }, api: { ...base, fetch }, dryRun: false, log: () => {} });
    expect(calls.filter((c) => c.url.endsWith("/import/finish"))).toHaveLength(1);
  });

  it("pages through existing submissions by id, so rows arriving meanwhile can't shift the pages", async () => {
    const many = Array.from({ length: 1203 }, (_, i) => ({ id: `e${i}`, data: { form_key: "call_sheet", email: `p${i}@example.test`, submitted_at: "2026-01-01T00:00:00.000Z" } }));
    const { calls, fetch } = api(many);
    await runImport({ tables: { leads: [], sketches: [], privacy_requests: [] }, api: { ...base, fetch }, dryRun: true, log: () => {} });
    expect(calls.filter((c) => c.url.endsWith("/query"))).toHaveLength(3);
  });

  it("stops on an API refusal, reporting the status and error code but not the response's details", async () => {
    const fetch = async (url: string) => url.endsWith("/query")
      ? Response.json({ data: [] })
      : Response.json({ error: "validation", index: 0, details: ["answers.zip: sam.fiction@example.test"] }, { status: 400 });
    await expect(runImport({ tables, api: { ...base, fetch }, dryRun: false, log: () => {} })).rejects.toThrow(/400 validation \(record 0\)$/);
  });
});
