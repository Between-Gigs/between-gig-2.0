import { describe, expect, it } from "vitest";
import { fromProfile, toProfile } from "@/lib/data/companyos/fields";
import { completeFields } from "@/lib/data/contract/fixtures";
import type { Row } from "./companyos";
import { draftOps } from "./gigs";

// The autosave batch: the first save creates the profile and its items; later saves send only what changed, since
// any stored change to an approved profile sends it back to review (N-09).
const PERSON = "p-1";
const fields = completeFields("Maya Ríos", "/media/f");

function stored(f = fields): { profile: Row; items: Row[] } {
  const { data, items } = toProfile(f);
  return {
    profile: { id: "prof", data: { ...data, person: PERSON, status: "approved" }, createdAt: "", updatedAt: "" },
    items: items.map((i, n) => ({ id: `item-${n}`, data: { ...i, profile: "prof", visible: i.visible ?? true }, createdAt: "", updatedAt: "" })),
  };
}

describe("draftOps", () => {
  it("the first save creates the profile, then its items pointing at it", () => {
    const ops = draftOps(PERSON, fields, { items: [] });
    expect(ops[0]).toMatchObject({ op: "create", entity: "profile", data: { person: PERSON, display_name: "Maya Ríos", position: "Set decoration" } });
    expect(ops.slice(1).every((o) => o.op === "create" && o.entity === "profile_item" && (o.data!.profile as { $ref: number }).$ref === 0)).toBe(true);
    expect(ops).toHaveLength(1 + 5);
  });

  it("saving the same answers sends nothing", () => {
    expect(draftOps(PERSON, fields, stored())).toEqual([]);
  });

  it("sends the editor's tenant fields only when Company OS has them (COMPANY_OS_PROFILE_EXTRAS)", () => {
    const next = { ...fields, title: "Wardrobe stylist" };
    expect(draftOps(PERSON, next, stored(), false)).toEqual([]);
    expect(draftOps(PERSON, next, stored(), true)).toEqual([{ op: "update", entity: "profile", id: "prof", data: { professional_title: "Wardrobe stylist" } }]);
  });

  it("only the changed field goes in the update", () => {
    expect(draftOps(PERSON, { ...fields, about: "Seven years now." }, stored())).toEqual([{ op: "update", entity: "profile", id: "prof", data: { about: "Seven years now." } }]);
  });

  it("a cleared number or month is cleared, not left as it was", () => {
    expect(draftOps(PERSON, { ...fields, years: "", month: "" }, stored())).toEqual([{ op: "update", entity: "profile", id: "prof", data: { years_experience: null, availability_month: null } }]);
  });

  it("items by difference: a new one created, a removed one deleted, a moved or re-pinned one updated", () => {
    const next = { ...fields, credits: ["Old commercial", "Night Shift (feature)", "New show"], creditPins: [true, true, true], skills: ["Props"] };
    const ops = draftOps(PERSON, next, stored());
    expect(ops).toEqual(expect.arrayContaining([
      { op: "update", entity: "profile_item", id: "item-1", data: { position: 0, visible: true } },
      { op: "update", entity: "profile_item", id: "item-0", data: { position: 1 } },
      { op: "create", entity: "profile_item", data: { kind: "credit", value: "New show", position: 2, visible: true, profile: "prof" } },
      { op: "create", entity: "profile_item", data: { kind: "skill", value: "props", position: 0, profile: "prof" } },
      { op: "delete", entity: "profile_item", id: "item-2" },
    ]));
    expect(ops).toHaveLength(5);
  });

  it("changing only availability touches only availability fields", () => {
    const ops = draftOps(PERSON, { ...fields, monthStatus: "limited", dates: "Mornings" }, stored());
    expect(ops).toEqual([{ op: "update", entity: "profile", id: "prof", data: { availability_status: "limited", availability_notes: "Mornings" } }]);
  });
});

describe("draftOps keeps what 2.0 can't show", () => {
  it("a stored value 2.0 reads as its nearest (work mode remote) isn't overwritten by an availability edit", async () => {
    const { fromProfile } = await import("@/lib/data/companyos/fields");
    const s = stored();
    s.profile.data.work_mode = "remote";
    const shown = fromProfile(s.profile.data, s.items.map((r) => ({ kind: r.data.kind as "credit", value: String(r.data.value), position: Number(r.data.position), ...(r.data.visible === false ? { visible: false } : {}) })), "/media/f");
    expect(draftOps(PERSON, { ...shown, monthStatus: "limited" }, s)).toEqual([{ op: "update", entity: "profile", id: "prof", data: { availability_status: "limited" } }]);
  });
});

describe("draftOps writes what isn't stored yet", () => {
  it("a profile created by the photo upload (name only) gets every answer on the next save, defaults included", () => {
    const s = { profile: { id: "prof", data: { person: PERSON, display_name: "Maya Ríos", status: "draft" }, createdAt: "", updatedAt: "" }, items: [] };
    const [update] = draftOps(PERSON, fields, s);
    expect(update!.data).toMatchObject({ home_market: "la", work_mode: "at_provider", insurance_disclosure: "discuss_privately", rate_basis: "hourly", position: "Set decoration" });
  });
});

it("multiline equipment stays a tools-only autosave with unchanged legacy transport and media", () => {
  const tools = "Special Cameras\nLighting Kit\nMakeup kit";
  const ops = draftOps(PERSON, { ...fields, tools }, stored());
  expect(ops).toHaveLength(1);
  expect(ops[0]).toMatchObject({ op: "update", entity: "profile", id: "prof", data: { tools } });
  expect(ops[0].data).not.toHaveProperty("transport");
  expect(ops[0].data).not.toHaveProperty("photo");
});


it("reorders service item positions without rewriting descriptions, private fields or service identities", () => {
  const services = ["Interior Styling", "Event Styling", "Photography & Portraits"];
  const serviceLines = Object.fromEntries(services.map((name, i) => [name, `Fictional service ${i + 1}`]));
  const start = { ...fields, services, serviceLines };
  const raw = toProfile(start, { extras: true });
  const old = { profile: { id: "prof", data: { ...raw.data, person: PERSON, insurance_notes: "Private fictional note" }, createdAt: "", updatedAt: "" },
    items: raw.items.map((data, i) => ({ id: `item-${i}`, data: { ...data, profile: "prof" }, createdAt: "", updatedAt: "" })) };
  const ordered = [services[1], services[2], services[0]];
  const ops = draftOps(PERSON, { ...start, services: ordered }, old, true);
  expect(ops).toHaveLength(3);
  for (const op of ops) {
    expect(op).toMatchObject({ op: "update", entity: "profile_item" });
    expect(Object.keys(op.data ?? {})).toEqual(["position"]);
  }
  const items = old.items.map(row => { const op = ops.find(op => "id" in op && op.id === row.id); return { ...row.data, ...(op && "data" in op ? op.data : {}) }; });
  expect(fromProfile(old.profile.data, items as Parameters<typeof fromProfile>[1], start.photo)).toMatchObject({ services: ordered, serviceLines });
  expect(old.profile.data.insurance_notes).toBe("Private fictional note");
});

it("editing equipment preserves a retired nonempty transport answer without sending a transport mutation",()=>{
  const legacy={...fields,transport:"Fictional legacy transport answer"};
  expect(draftOps(PERSON,{...legacy,tools:"Fictional updated lighting kit"},stored(legacy))).toEqual([{op:"update",entity:"profile",id:"prof",data:{tools:"Fictional updated lighting kit"}}]);
  const mapped=toProfile(legacy);expect(fromProfile(mapped.data,mapped.items,legacy.photo).transport).toBe(legacy.transport);
});

it("changing both work locations updates only work_mode and preserves private notes and media", () => {
  const previous = stored(); previous.profile.data.insurance_notes = "Private fictional coverage";
  const ops = draftOps(PERSON, { ...fields, mode: "both" }, previous);
  expect(ops).toEqual([{ op: "update", entity: "profile", id: "prof", data: { work_mode: "on_site_or_at_provider" } }]);
});

it("private insurance notes autosave alone; legacy payloads preserve existing notes", () => {
  const previous = stored();
  previous.profile!.data.insurance_notes = "Existing private description";
  expect(draftOps(PERSON, fields, previous)).toEqual([]);
  expect(draftOps(PERSON, { ...fields, insuranceNotes: "Updated private description" }, previous)).toEqual([
    { op: "update", entity: "profile", id: "prof", data: { insurance_notes: "Updated private description" } },
  ]);
  expect(draftOps(PERSON, { ...fields, insuranceNotes: "" }, previous)).toEqual([
    { op: "update", entity: "profile", id: "prof", data: { insurance_notes: "" } },
  ]);
});

it("changing a mileage choice only patches existing travel_notes and preserves historical areas/private notes/media",()=>{
 const legacy={...fields,travel:"Within 20 miles, by arrangement"};const previous=stored(legacy);previous.profile.data.insurance_notes="Fictional private coverage";
 expect(draftOps(PERSON,{...legacy,travel:"Up to 25 miles"},previous)).toEqual([{op:"update",entity:"profile",id:"prof",data:{travel_notes:"Up to 25 miles"}}]);
 expect(draftOps(PERSON,{...legacy,about:"Updated fictional experience."},previous)).toEqual([{op:"update",entity:"profile",id:"prof",data:{about:"Updated fictional experience."}}]);
 expect(previous.items.filter(i=>i.data.kind==="area")).toHaveLength(legacy.areas.length);expect(previous.profile.data.insurance_notes).toBe("Fictional private coverage");
 expect(toProfile({...legacy,areas:[]}).items.filter(i=>i.kind==="area")).toHaveLength(0);
});
