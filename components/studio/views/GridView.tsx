"use client";
import { Menu, Popover, cx } from "@ds/components";
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, EyeOff, Maximize2, Pencil, Plus, Rows3, Trash2 } from "lucide-react";
import * as React from "react";
import { groupRecords, isEmpty, viewFields } from "@/lib/studio/query";
import { useStudio } from "@/lib/studio/store";
import type { CellValue, Field, StudioRecord } from "@/lib/studio/types";
import { CellView, ChoicePicker, ImagePicker, LinkPicker, choiceMaker } from "../cells";
import { useUi } from "../context";
import { Chip, fieldIcons } from "../ui";

const widths: Record<Field["type"], string> = {
  text: "w-52", longText: "w-72", number: "w-32", currency: "w-32", select: "w-44", multiSelect: "w-56", date: "w-36",
  checkbox: "w-28", image: "w-24", url: "w-52", email: "w-56", rating: "w-36", link: "w-56",
};
const heights = { short: "h-10", medium: "h-16", tall: "h-24" } as const;
const typed = (t: Field["type"]) => t === "text" || t === "longText" || t === "number" || t === "currency" || t === "url" || t === "email" || t === "date";
const picked = (t: Field["type"]) => t === "select" || t === "multiSelect" || t === "link" || t === "image";

/** The spreadsheet: click a cell to select it, type or press Enter to edit, arrows to move, Delete to clear. */
export function GridView({ rows, onNew }: { rows: StudioRecord[]; onNew: (values?: Record<string, CellValue>) => void }) {
  const ui = useUi();
  const { actions } = useStudio();
  const c = ui.collection, v = ui.view;
  const fields = viewFields(c, v);
  const group = v.groupBy ? c.fields.find((f) => f.id === v.groupBy) : undefined;
  const groups = groupRecords(group, rows);
  const [closed, setClosed] = React.useState<Set<string>>(new Set());
  const flat = groups.flatMap((g) => (closed.has(g.id) ? [] : g.rows));
  const [sel, setSel] = React.useState<{ r: string; f: string } | null>(null);
  const [edit, setEdit] = React.useState<{ seed?: string } | null>(null);
  const wrap = React.useRef<HTMLDivElement>(null);

  // Keep keyboard focus on the selected cell.
  React.useEffect(() => {
    if (!sel || edit) return;
    wrap.current?.querySelector<HTMLElement>(`[data-cell="${sel.r}:${sel.f}"]`)?.focus({ preventScroll: false });
  }, [sel, edit]);

  const set = (r: StudioRecord, f: Field, value: CellValue) => {
    if (JSON.stringify(value ?? null) !== JSON.stringify(r.values[f.id] ?? null)) actions.setCell(c.id, r.id, f.id, value);
  };
  const move = (dr: number, df: number) => {
    if (!sel) return;
    const ri = flat.findIndex((r) => r.id === sel.r), fi = fields.findIndex((f) => f.id === sel.f);
    const r = flat[Math.max(0, Math.min(flat.length - 1, ri + dr))], f = fields[Math.max(0, Math.min(fields.length - 1, fi + df))];
    if (r && f) setSel({ r: r.id, f: f.id });
  };
  const onKey = (e: React.KeyboardEvent, r: StudioRecord, f: Field) => {
    if (edit) return;
    const k = e.key;
    if (k === "ArrowDown" || k === "ArrowUp" || k === "ArrowLeft" || k === "ArrowRight") { e.preventDefault(); move(k === "ArrowDown" ? 1 : k === "ArrowUp" ? -1 : 0, k === "ArrowRight" ? 1 : k === "ArrowLeft" ? -1 : 0); return; }
    if (k === "Tab") { e.preventDefault(); move(0, e.shiftKey ? -1 : 1); return; }
    if (k === "Enter" || k === "F2") { e.preventDefault(); if (f.type === "checkbox") set(r, f, !r.values[f.id]); else setEdit({}); return; }
    if (k === " " && f.type === "checkbox") { e.preventDefault(); set(r, f, !r.values[f.id]); return; }
    if (k === "Delete" || k === "Backspace") { e.preventDefault(); set(r, f, f.type === "multiSelect" || f.type === "link" ? [] : f.type === "checkbox" ? false : null); return; }
    if (k.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey && typed(f.type) && f.type !== "date") { e.preventDefault(); setEdit({ seed: k }); }
    if (k >= "1" && k <= "5" && f.type === "rating") set(r, f, Number(k));
  };

  const header = (f: Field) => {
    const Icon = fieldIcons[f.type];
    const primary = f.id === c.primaryField;
    return (
      <th key={f.id} scope="col" className={cx("sticky top-0 z-raised border-r border-b border-line bg-surface-sunken p-0 text-left font-normal", widths[f.type], primary && "left-12 z-sticky")}>
        <Menu align="start" trigger={
          <button type="button" className="flex h-10 w-full items-center gap-2 px-3 text-label-sm text-ink-muted hover:bg-surface-hover hover:text-ink">
            <Icon className="size-4 shrink-0 text-ink-subtle" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-left">{f.name}</span>
            <ChevronDown className="size-3.5 shrink-0 text-ink-subtle" aria-hidden="true" />
          </button>}
          items={[
            { label: "Edit field", icon: <Pencil />, onSelect: () => ui.inspect("field", f.id) },
            { label: "Sort A → Z", icon: <ArrowUp />, onSelect: () => actions.updateView(c.id, v.id, { sorts: [{ fieldId: f.id, dir: "asc" }] }) },
            { label: "Sort Z → A", icon: <ArrowDown />, onSelect: () => actions.updateView(c.id, v.id, { sorts: [{ fieldId: f.id, dir: "desc" }] }) },
            ...(f.type === "select" || f.type === "checkbox" ? [{ label: "Group by this field", icon: <Rows3 />, onSelect: () => actions.updateView(c.id, v.id, { groupBy: f.id }) }] : []),
            ...(primary ? [] : [
              { label: "Hide in this view", icon: <EyeOff />, onSelect: () => actions.updateView(c.id, v.id, { hidden: [...v.hidden, f.id] }) },
              "separator" as const,
              { label: "Delete field", icon: <Trash2 />, danger: true, onSelect: () => ui.inspect("field", f.id) },
            ]),
          ]} />
      </th>
    );
  };

  const cell = (r: StudioRecord, f: Field, rowIndex: number) => {
    const on = sel?.r === r.id && sel?.f === f.id;
    const editing = on && !!edit;
    const primary = f.id === c.primaryField;
    const value = r.values[f.id];
    const display = <CellView field={f} value={value} lookup={ui.lookup} rows={v.rowHeight} numbers="right" className={f.type === "image" ? (v.rowHeight === "short" ? "size-7" : v.rowHeight === "medium" ? "size-12" : "size-20") : undefined} />;
    return (
      <td key={f.id} role="gridcell" aria-selected={on} data-cell={`${r.id}:${f.id}`} tabIndex={on ? 0 : -1}
        aria-label={`${f.name}, row ${rowIndex + 1}`}
        onClick={() => { if (on && f.type === "checkbox") set(r, f, !value); setSel({ r: r.id, f: f.id }); }}
        onDoubleClick={() => { if (f.type !== "checkbox") setEdit({}); }}
        onKeyDown={(e) => onKey(e, r, f)}
        className={cx("relative border-r border-b border-line p-0 align-middle text-body-sm text-ink outline-none", widths[f.type],
          primary ? "sticky left-12 z-raised bg-surface font-medium" : "bg-surface",
          on && "z-raised ring-2 ring-action ring-inset")}>
        <div className={cx("flex items-center overflow-hidden px-3", heights[v.rowHeight], f.type === "checkbox" && "justify-center")}>
          {picked(f.type) && editing ? (
            <Popover label={`Edit ${f.name}`} width={f.type === "image" ? "md" : "sm"} open onOpenChange={(o) => { if (!o) setEdit(null); }}
              trigger={<button type="button" className="flex h-full w-full min-w-0 items-center text-left">{display}</button>}>
              {f.type === "image" ? <ImagePicker base={ui.base} value={value} onChange={(x) => { set(r, f, x); setEdit(null); }} />
                : f.type === "link" ? <LinkPicker base={ui.base} field={f} value={value} onChange={(x) => set(r, f, x)} />
                : <ChoicePicker field={f} value={value} multi={f.type === "multiSelect"} onChange={(x) => { set(r, f, x); if (f.type === "select") setEdit(null); }}
                    onCreate={choiceMaker(f, (choices) => actions.updateField(c.id, f.id, { choices }))} />}
            </Popover>
          ) : f.type === "rating" && on ? (
            <span className="flex gap-0.5">{[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" aria-label={`${n} stars`} onClick={(e) => { e.stopPropagation(); set(r, f, Number(value) === n ? 0 : n); }} className="text-body-sm">
                <svg viewBox="0 0 24 24" className={cx("size-4", n <= Number(value ?? 0) ? "fill-current text-warning" : "text-line-strong")} fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.2-6.2 3.2 1.2-6.8-5-4.9 6.9-1z" /></svg>
              </button>
            ))}</span>
          ) : (
            <div className="min-w-0 flex-1">{display}</div>
          )}
          {primary && !editing && (
            <button type="button" aria-label={`Open ${ui.lookup(r.id)}`} onClick={(e) => { e.stopPropagation(); ui.inspect("record", r.id); }}
              className="ml-1 inline-flex size-6 shrink-0 items-center justify-center rounded-xs text-ink-subtle opacity-0 group-hover/row:opacity-100 hover:bg-surface-hover hover:text-ink focus-visible:opacity-100">
              <Maximize2 className="size-3.5" />
            </button>
          )}
        </div>
        {typed(f.type) && editing && (
          <CellEditor field={f} value={value} seed={edit?.seed} onDone={(x, next) => { if (x !== undefined) set(r, f, x); setEdit(null); if (next) move(next === "down" ? 1 : 0, next === "right" ? 1 : 0); }} />
        )}
      </td>
    );
  };

  if (!c.records.length) return <Empty onNew={() => onNew()} name={c.name} />;

  return (
    <div ref={wrap} className="min-h-0 flex-1 overflow-auto bg-bg">
      <table role="grid" aria-label={`${c.name}: ${v.name}`} aria-rowcount={flat.length} className="w-max table-fixed border-separate border-spacing-0">
        <thead>
          <tr>
            <th scope="col" className="sticky top-0 left-0 z-sticky w-12 border-r border-b border-line bg-surface-sunken p-0"><span className="sr-only">Row</span></th>
            {fields.map(header)}
            <th scope="col" className="sticky top-0 z-raised w-14 border-b border-line bg-surface-sunken p-0">
              <button type="button" aria-label="Add a field" title="Add a field" onClick={() => ui.setAddFieldOpen(true)} className="flex h-10 w-full items-center justify-center text-ink-muted hover:bg-surface-hover hover:text-ink"><Plus className="size-4" /></button>
            </th>
          </tr>
        </thead>
        {groups.map((g) => (
          <tbody key={g.id}>
            {group && (
              <tr>
                <td colSpan={fields.length + 2} className="sticky left-0 border-b border-line bg-surface-sunken p-0">
                  <button type="button" aria-expanded={!closed.has(g.id)} onClick={() => setClosed((s) => { const n = new Set(s); if (n.has(g.id)) n.delete(g.id); else n.add(g.id); return n; })}
                    className="flex h-10 items-center gap-2 px-3 text-label-sm text-ink">
                    {closed.has(g.id) ? <ChevronRight className="size-4" aria-hidden="true" /> : <ChevronDown className="size-4" aria-hidden="true" />}
                    <Chip label={g.label} color={g.color} />
                    <span className="text-ink-subtle">{g.rows.length}</span>
                  </button>
                </td>
              </tr>
            )}
            {!closed.has(g.id) && g.rows.map((r) => {
              const i = flat.indexOf(r);
              return (
                <tr key={r.id} className="group/row" aria-rowindex={i + 1}>
                  <td className={cx("sticky left-0 z-raised border-r border-b border-line bg-surface p-0 text-center text-label-sm text-ink-subtle", ui.recordId === r.id && ui.mode === "record" && "bg-surface-selected")}>
                    <button type="button" onClick={() => ui.inspect("record", r.id)} aria-label={`Open row ${i + 1}`} className={cx("w-full", heights[v.rowHeight])}>{i + 1}</button>
                  </td>
                  {fields.map((f) => cell(r, f, i))}
                  <td className="border-b border-line bg-surface" />
                </tr>
              );
            })}
            {!closed.has(g.id) && (
              <tr>
                <td colSpan={fields.length + 2} className="sticky left-0 border-b border-line bg-surface p-0">
                  <button type="button" onClick={() => onNew(group && g.id ? { [group.id]: group.type === "checkbox" ? g.id === "yes" : g.id } : undefined)}
                    className="flex h-10 items-center gap-2 px-3 text-label-sm text-ink-muted hover:text-ink">
                    <Plus className="size-4" aria-hidden="true" /> New record{group && g.id ? ` in ${g.label}` : ""}
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        ))}
      </table>
      {!rows.length && <p className="px-4 py-6 text-body-md text-ink-muted">No records match. Clear the search or filters to see everything.</p>}
    </div>
  );
}

/** The inline editor that sits over a cell. Enter saves and moves down, Tab saves and moves right, Escape cancels. */
function CellEditor({ field, value, seed, onDone }: { field: Field; value: CellValue | undefined; seed?: string; onDone: (v: CellValue | undefined, next?: "down" | "right") => void }) {
  const initial = seed ?? (isEmpty(value) ? "" : String(value));
  const [text, setText] = React.useState(field.type === "date" ? initial.slice(0, 10) : initial);
  const done = React.useRef(false);
  const out = (next?: "down" | "right") => {
    if (done.current) return;
    done.current = true;
    const t = text.trim();
    onDone(field.type === "number" || field.type === "currency" ? (t === "" ? null : Number(t)) : t === "" ? null : field.type === "longText" ? text : t, next);
  };
  const cancel = () => { done.current = true; onDone(undefined); };
  const common = {
    autoFocus: true, value: text, "aria-label": field.name,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setText(e.target.value),
    onBlur: () => out(),
    onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => { const n = e.target.value.length; if (field.type !== "date") e.target.setSelectionRange?.(n, n); },
  };
  if (field.type === "longText") {
    return (
      <textarea {...common} rows={5}
        onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); cancel(); } if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); out("down"); } }}
        className="absolute top-0 left-0 z-dropdown min-h-full w-96 rounded-sm border-2 border-action bg-surface-raised p-3 text-body-sm text-ink shadow-lg outline-none" />
    );
  }
  return (
    <input {...common} type={field.type === "number" || field.type === "currency" ? "number" : field.type === "date" ? "date" : field.type === "email" ? "email" : field.type === "url" ? "url" : "text"}
      onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); cancel(); } if (e.key === "Enter") { e.preventDefault(); out("down"); } if (e.key === "Tab") { e.preventDefault(); out("right"); } }}
      className="absolute inset-0 z-dropdown w-full min-w-full border-2 border-action bg-surface-raised px-3 text-body-sm text-ink shadow-md outline-none" />
  );
}

export function Empty({ name, onNew }: { name: string; onNew: () => void }) {
  return (
    <div className="grid flex-1 place-content-center justify-items-center gap-3 p-10 text-center">
      <span className="inline-flex size-12 items-center justify-center rounded-xl bg-surface-sunken text-ink-subtle"><Plus className="size-6" aria-hidden="true" /></span>
      <h2 className="font-display text-heading-lg text-ink">{name} is empty</h2>
      <p className="max-w-sm text-body-md text-ink-muted">Add your first record with <strong className="font-semibold text-ink">New record</strong>, or add fields to shape what each record holds.</p>
      <button type="button" onClick={onNew} className="text-label-md text-link underline underline-offset-2">Add a record</button>
    </div>
  );
}
