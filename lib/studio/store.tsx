"use client";
/*
 * Studio's state: one base, saved in this browser, with undo and redo for every change. Each action takes
 * a snapshot first, so undo is always a whole step. A backend replaces load/save; the actions stay the same.
 */
import * as React from "react";
import { blankValue, newView, uid } from "./query";
import { seedBase } from "./seed";
import type { Base, CellValue, Collection, CollectionIcon, Field, StudioRecord, View, ViewType } from "./types";

const KEY = "bg-studio-v1";
const LIMIT = 60;

function load(): Base {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const b = JSON.parse(raw) as Base; if (b.version === 1 && Array.isArray(b.collections)) return b; }
  } catch { /* blocked or corrupt: start from the seed */ }
  return seedBase();
}

type Recipe = (draft: Base) => void;

export interface StudioActions {
  /** Applies a change as one undoable step. */
  change: (label: string, recipe: Recipe) => void;
  undo: () => void;
  redo: () => void;
  reset: () => void;
  replace: (base: Base) => void;
  addCollection: (name: string, icon: CollectionIcon, template: "blank" | "content" | "people") => string;
  addRecord: (collectionId: string, values?: Record<string, CellValue>) => string;
  setCell: (collectionId: string, recordId: string, fieldId: string, value: CellValue) => void;
  deleteRecords: (collectionId: string, ids: string[]) => void;
  duplicateRecord: (collectionId: string, id: string) => string;
  addField: (collectionId: string, field: Omit<Field, "id">) => string;
  updateField: (collectionId: string, fieldId: string, patch: Partial<Field>) => void;
  deleteField: (collectionId: string, fieldId: string) => void;
  addView: (collectionId: string, type: ViewType) => string;
  updateView: (collectionId: string, viewId: string, patch: Partial<View>) => void;
  deleteView: (collectionId: string, viewId: string) => void;
}

interface StudioState {
  base: Base | null;
  canUndo: boolean;
  canRedo: boolean;
  /** The last change, for the status line ("Saved · Renamed a field"). */
  lastChange: string;
  actions: StudioActions;
}

const Ctx = React.createContext<StudioState | null>(null);

export function useStudio() {
  const s = React.useContext(Ctx);
  if (!s) throw new Error("useStudio needs <StudioProvider>");
  return s;
}

const coll = (b: Base, id: string) => {
  const c = b.collections.find((x) => x.id === id);
  if (!c) throw new Error(`No collection ${id}`);
  return c;
};

export function StudioProvider({ children }: { children: React.ReactNode }) {
  const [base, setBase] = React.useState<Base | null>(null);
  const [lastChange, setLastChange] = React.useState("");
  const past = React.useRef<Base[]>([]);
  const future = React.useRef<Base[]>([]);
  const [history, setHistory] = React.useState({ undo: 0, redo: 0 });
  const current = React.useRef<Base | null>(null);

  React.useEffect(() => { const b = load(); current.current = b; setBase(b); }, []); // eslint-disable-line react-hooks/set-state-in-effect

  // Save shortly after changes settle, so typing in a cell doesn't write on every key.
  React.useEffect(() => {
    if (!base) return;
    const t = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(base)); } catch { /* storage full: keep working in memory */ } }, 300);
    return () => clearTimeout(t);
  }, [base]);

  const actions = React.useMemo<StudioActions>(() => {
    const commit = (next: Base, label: string) => { current.current = next; setBase(next); setLastChange(label); setHistory({ undo: past.current.length, redo: future.current.length }); };
    const change = (label: string, recipe: Recipe) => {
      const prev = current.current;
      if (!prev) return;
      const draft = structuredClone(prev);
      recipe(draft);
      past.current = [...past.current.slice(-LIMIT + 1), prev];
      future.current = [];
      commit(draft, label);
    };
    return {
      change,
      undo: () => { const prev = past.current.pop(); if (!prev || !current.current) return; future.current.push(current.current); commit(prev, "Undid a change"); },
      redo: () => { const next = future.current.pop(); if (!next || !current.current) return; past.current.push(current.current); commit(next, "Redid a change"); },
      reset: () => change("Restored the sample data", (b) => { Object.assign(b, seedBase()); }),
      replace: (next) => change("Imported a base", (b) => { Object.assign(b, next); }),
      addCollection: (name, icon, template) => {
        const id = uid("col");
        change(`Added ${name}`, (b) => {
          const fields: Field[] = template === "content"
            ? [{ id: "title", name: "Title", type: "text" }, { id: "cover", name: "Cover", type: "image" }, { id: "status", name: "Status", type: "select", choices: [{ id: "draft", label: "Draft", color: 3 }, { id: "published", label: "Published", color: 1 }] }, { id: "date", name: "Publish date", type: "date" }, { id: "body", name: "Body", type: "longText" }]
            : template === "people"
              ? [{ id: "name", name: "Name", type: "text" }, { id: "photo", name: "Photo", type: "image" }, { id: "role", name: "Role", type: "text" }, { id: "email", name: "Email", type: "email" }, { id: "phone", name: "Phone", type: "text" }]
              : [{ id: "name", name: "Name", type: "text" }, { id: "notes", name: "Notes", type: "longText" }];
          const c: Collection = { id, name, icon, primaryField: fields[0].id, fields, records: [], views: [] };
          c.views = [newView("grid", c, "All records")];
          if (template === "content") c.views.push(newView("gallery", c, "Gallery"));
          b.collections.push(c);
        });
        return id;
      },
      addRecord: (cid, values = {}) => {
        const id = uid("rec");
        change("Added a record", (b) => {
          const c = coll(b, cid);
          const v: Record<string, CellValue> = {};
          for (const f of c.fields) v[f.id] = values[f.id] ?? blankValue(f.type);
          c.records.push({ id, values: v, createdAt: new Date().toISOString() });
        });
        return id;
      },
      setCell: (cid, rid, fid, value) => change("Edited a cell", (b) => {
        const r = coll(b, cid).records.find((x) => x.id === rid);
        if (r) r.values[fid] = value;
      }),
      deleteRecords: (cid, ids) => change(ids.length === 1 ? "Deleted a record" : `Deleted ${ids.length} records`, (b) => {
        const c = coll(b, cid);
        c.records = c.records.filter((r) => !ids.includes(r.id));
        // Links to deleted records go with them.
        for (const o of b.collections) for (const f of o.fields) if (f.type === "link" && f.linkTable === cid)
          for (const r of o.records) if (Array.isArray(r.values[f.id])) r.values[f.id] = (r.values[f.id] as string[]).filter((x) => !ids.includes(x));
      }),
      duplicateRecord: (cid, rid) => {
        const id = uid("rec");
        change("Duplicated a record", (b) => {
          const c = coll(b, cid);
          const i = c.records.findIndex((r) => r.id === rid);
          if (i < 0) return;
          const copy: StudioRecord = { ...structuredClone(c.records[i]), id, createdAt: new Date().toISOString() };
          c.records.splice(i + 1, 0, copy);
        });
        return id;
      },
      addField: (cid, field) => {
        const id = uid("fld");
        change(`Added the field ${field.name}`, (b) => {
          const c = coll(b, cid);
          c.fields.push({ ...field, id });
          for (const r of c.records) r.values[id] = blankValue(field.type);
        });
        return id;
      },
      updateField: (cid, fid, patch) => change("Changed a field", (b) => {
        const c = coll(b, cid);
        const f = c.fields.find((x) => x.id === fid);
        if (!f) return;
        const was = f.type;
        Object.assign(f, patch);
        if (patch.type && patch.type !== was) convertValues(c, f, was);
      }),
      deleteField: (cid, fid) => change("Deleted a field", (b) => {
        const c = coll(b, cid);
        if (c.primaryField === fid) return;
        c.fields = c.fields.filter((f) => f.id !== fid);
        for (const r of c.records) delete r.values[fid];
        for (const v of c.views) {
          v.filters = v.filters.filter((f) => f.fieldId !== fid);
          v.sorts = v.sorts.filter((s) => s.fieldId !== fid);
          if (v.groupBy === fid) v.groupBy = undefined;
          if (v.coverField === fid) v.coverField = undefined;
          if (v.dateField === fid) v.dateField = undefined;
        }
      }),
      addView: (cid, type) => {
        let id = "";
        change("Added a view", (b) => { const c = coll(b, cid); const v = newView(type, c); id = v.id; c.views.push(v); });
        return id;
      },
      updateView: (cid, vid, patch) => change("Changed the view", (b) => {
        const v = coll(b, cid).views.find((x) => x.id === vid);
        if (v) Object.assign(v, patch);
      }),
      deleteView: (cid, vid) => change("Deleted a view", (b) => {
        const c = coll(b, cid);
        if (c.views.length > 1) c.views = c.views.filter((v) => v.id !== vid);
      }),
    };
  }, []);

  const value: StudioState = { base, canUndo: history.undo > 0, canRedo: history.redo > 0, lastChange, actions };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Keeps what it can when a field changes type: text becomes a choice, a choice becomes text, numbers stay numbers. */
function convertValues(c: Collection, f: Field, was: Field["type"]) {
  const textOf = (v: CellValue) => (Array.isArray(v) ? v.join(", ") : v === null || v === undefined ? "" : String(v));
  const prevChoices = c.fields.find((x) => x.id === f.id)?.choices ?? [];
  const labelOf = (id: unknown) => prevChoices.find((o) => o.id === id)?.label ?? String(id ?? "");
  for (const r of c.records) {
    const v = r.values[f.id];
    let text = was === "select" ? labelOf(v) : was === "multiSelect" && Array.isArray(v) ? v.map(labelOf).join(", ") : textOf(v);
    if (was === "checkbox") text = v ? "Yes" : "";
    switch (f.type) {
      case "number": case "currency": case "rating": { const n = parseFloat(text.replace(/[^0-9.-]/g, "")); r.values[f.id] = Number.isFinite(n) ? (f.type === "rating" ? Math.max(0, Math.min(5, Math.round(n))) : n) : null; break; }
      case "checkbox": r.values[f.id] = !!text && text !== "0" && text.toLowerCase() !== "no"; break;
      case "select": case "multiSelect": {
        const labels = text.split(",").map((s) => s.trim()).filter(Boolean);
        f.choices ??= [];
        const ids = labels.map((l) => {
          let o = f.choices!.find((x) => x.label.toLowerCase() === l.toLowerCase());
          if (!o) { o = { id: uid("opt"), label: l, color: (f.choices!.length % 8) + 1 }; f.choices!.push(o); }
          return o.id;
        });
        r.values[f.id] = f.type === "select" ? ids[0] ?? null : ids;
        break;
      }
      case "link": r.values[f.id] = []; break;
      case "date": { const d = new Date(text); r.values[f.id] = text && !Number.isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : null; break; }
      default: r.values[f.id] = text || null;
    }
  }
}
