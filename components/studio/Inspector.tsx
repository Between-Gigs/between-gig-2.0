"use client";
import { Button, ConfirmDialog, IconButton, Input, Select, SegmentedControl, Textarea, cx } from "@ds/components";
import { ChevronLeft, ChevronRight, Copy, Plus, Trash2, X } from "lucide-react";
import * as React from "react";
import { fieldTypeLabel, fieldTypes, formatDate, recordTitle, viewTypes, viewRecords } from "@/lib/studio/query";
import { useStudio } from "@/lib/studio/store";
import type { Choice, FieldType, View, ViewType } from "@/lib/studio/types";
import { FieldInput } from "./cells";
import { useUi, type InspectorMode } from "./context";
import { FieldsPanel } from "./Toolbar";
import { Chip, Section, colorCount, dot, fieldIcons, viewIcons } from "./ui";

/** The right-hand panel, like a site builder's style panel: the selected record, field or view. */
export function InspectorBody({ onClose }: { onClose?: () => void }) {
  const ui = useUi();
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-line px-3 py-2">
        <SegmentedControl size="sm" label="Inspector" className="flex-1" value={ui.mode} onChange={(m) => ui.inspect(m as InspectorMode, m === "record" ? ui.recordId : m === "field" ? ui.fieldId : null)}
          options={[{ value: "record", label: "Item" }, { value: "field", label: "Field" }, { value: "view", label: "View" }]} />
        {onClose && <IconButton size="sm" variant="ghost" label="Close panel" icon={<X />} onClick={onClose} />}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {ui.mode === "record" ? <RecordPanel /> : ui.mode === "field" ? <FieldPanel /> : <ViewPanel />}
      </div>
    </div>
  );
}

function Nothing({ title, text }: { title: string; text: string }) {
  return (
    <div className="grid gap-1.5 px-5 py-10 text-center">
      <p className="text-label-md text-ink">{title}</p>
      <p className="text-body-sm text-ink-muted">{text}</p>
    </div>
  );
}

function RecordPanel() {
  const ui = useUi();
  const { actions } = useStudio();
  const [confirm, setConfirm] = React.useState(false);
  const c = ui.collection;
  const r = c.records.find((x) => x.id === ui.recordId);
  if (!r) return <Nothing title="No item selected" text="Click a row, card or day to see and edit every field of an item here." />;
  const rows = viewRecords(c, ui.view, ui.search, ui.lookup);
  const i = rows.findIndex((x) => x.id === r.id);
  const go = (d: number) => { const n = rows[i + d]; if (n) ui.inspect("record", n.id); };
  return (
    <div>
      <div className="flex items-start gap-2 px-4 pt-4 pb-2">
        <div className="grid min-w-0 flex-1 gap-0.5">
          <span className="text-eyebrow text-ink-brand uppercase">{c.name}</span>
          <h2 className="font-display text-heading-lg break-words text-ink">{recordTitle(c, r)}</h2>
          <span className="text-caption text-ink-subtle">Added {formatDate(r.createdAt)}</span>
        </div>
        <div className="flex shrink-0">
          <IconButton size="sm" variant="ghost" label="Previous item" icon={<ChevronLeft />} onClick={() => go(-1)} disabled={i <= 0} title={i <= 0 ? "This is the first item" : "Previous item"} />
          <IconButton size="sm" variant="ghost" label="Next item" icon={<ChevronRight />} onClick={() => go(1)} disabled={i < 0 || i >= rows.length - 1} title={i >= rows.length - 1 ? "This is the last item" : "Next item"} />
        </div>
      </div>
      <form className="grid gap-4 px-4 py-3" onSubmit={(e) => e.preventDefault()}>
        {c.fields.map((f) => {
          const Icon = fieldIcons[f.type];
          const id = `rec-${r.id}-${f.id}`;
          return (
            <div key={f.id} className="grid gap-1.5">
              <label htmlFor={id} className="flex items-center gap-1.5 text-label-sm text-ink-muted">
                <Icon className="size-3.5 text-ink-subtle" aria-hidden="true" />{f.name}
              </label>
              <FieldInput id={id} base={ui.base} field={f} value={r.values[f.id]} onCommit={(v) => actions.setCell(c.id, r.id, f.id, v)}
                onChoicesChange={(choices) => actions.updateField(c.id, f.id, { choices })} />
            </div>
          );
        })}
      </form>
      <div className="flex gap-2 border-t border-line px-4 py-3">
        <Button size="sm" variant="ghost" iconStart={<Copy />} onClick={() => ui.inspect("record", actions.duplicateRecord(c.id, r.id))}>Duplicate</Button>
        <Button size="sm" variant="ghost" iconStart={<Trash2 />} className="text-danger" onClick={() => setConfirm(true)}>Delete</Button>
      </div>
      <ConfirmDialog open={confirm} onCancel={() => setConfirm(false)} tone="danger" confirmLabel="Delete item"
        title={`Delete ${recordTitle(c, r)}?`} description="It disappears from every view and any links to it are removed. You can undo this."
        onConfirm={() => { actions.deleteRecords(c.id, [r.id]); setConfirm(false); ui.inspect("record", rows[i + 1]?.id ?? rows[i - 1]?.id ?? null); }} />
    </div>
  );
}

function ChoicesEditor({ choices, onChange }: { choices: Choice[]; onChange: (c: Choice[]) => void }) {
  const [label, setLabel] = React.useState("");
  const add = () => { if (!label.trim()) return; onChange([...choices, { id: `opt_${Math.random().toString(36).slice(2, 8)}`, label: label.trim(), color: (choices.length % colorCount) + 1 }]); setLabel(""); };
  return (
    <div className="grid gap-1.5">
      {choices.map((o, i) => (
        <div key={o.id} className="flex items-center gap-1.5">
          <button type="button" aria-label={`Change colour of ${o.label}`} title="Change colour" onClick={() => onChange(choices.map((x) => (x.id === o.id ? { ...x, color: (x.color % colorCount) + 1 } : x)))}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md hover:bg-surface-hover">
            <span className={cx("size-3.5 rounded-full", dot(o.color))} />
          </button>
          <Input size="sm" className="min-w-0 flex-1" defaultValue={o.label} aria-label={`Option ${i + 1}`}
            onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== o.label) onChange(choices.map((x) => (x.id === o.id ? { ...x, label: v } : x))); }} />
          <IconButton size="sm" variant="ghost" label={`Remove ${o.label}`} icon={<X />} onClick={() => onChange(choices.filter((x) => x.id !== o.id))} />
        </div>
      ))}
      <form className="flex gap-1.5" onSubmit={(e) => { e.preventDefault(); add(); }}>
        <Input size="sm" className="min-w-0 flex-1" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="New option" aria-label="New option" />
        <IconButton size="sm" variant="secondary" type="submit" label="Add option" icon={<Plus />} />
      </form>
    </div>
  );
}

function FieldPanel() {
  const ui = useUi();
  const { actions } = useStudio();
  const [confirm, setConfirm] = React.useState(false);
  const c = ui.collection;
  const f = c.fields.find((x) => x.id === ui.fieldId);
  if (!f) {
    return (
      <div>
        <Nothing title="No field selected" text="Click a column heading, or pick a field below, to rename it, change its type or edit its options." />
        <Section title={`Fields in ${c.name}`} action={<Button size="sm" variant="ghost" iconStart={<Plus />} onClick={() => ui.setAddFieldOpen(true)}>Add field</Button>}>
          <ul className="grid gap-0.5">
            {c.fields.map((x) => { const Icon = fieldIcons[x.type]; return (
              <li key={x.id}><button type="button" onClick={() => ui.inspect("field", x.id)} className="flex min-h-9 w-full items-center gap-2 rounded-md px-2 text-left text-body-sm text-ink hover:bg-surface-hover">
                <Icon className="size-4 text-ink-subtle" aria-hidden="true" /><span className="flex-1 truncate">{x.name}</span><span className="text-caption text-ink-subtle">{fieldTypeLabel(x.type)}</span>
              </button></li>
            ); })}
          </ul>
        </Section>
      </div>
    );
  }
  const primary = c.primaryField === f.id;
  const used = c.records.filter((r) => { const v = r.values[f.id]; return v !== null && v !== "" && v !== false && !(Array.isArray(v) && !v.length); }).length;
  return (
    <div>
      <Section title="Field">
        <label className="grid gap-1.5"><span className="text-label-sm text-ink-muted">Name</span>
          <Input key={f.id + f.name} defaultValue={f.name} onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== f.name) actions.updateField(c.id, f.id, { name: v }); }} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />
        </label>
        <label className="grid gap-1.5"><span className="text-label-sm text-ink-muted">Type</span>
          <Select value={f.type} aria-label="Type" onValueChange={(t) => actions.updateField(c.id, f.id, { type: t as FieldType, choices: f.choices ?? (t === "select" || t === "multiSelect" ? [] : undefined), linkTable: t === "link" ? f.linkTable ?? ui.base.collections.find((x) => x.id !== c.id)?.id : f.linkTable })}
            options={fieldTypes.filter((t) => !primary || ["text", "email", "url", "number", "date"].includes(t.type)).map((t) => ({ value: t.type, label: t.label }))} />
          <span className="text-caption text-ink-subtle">Changing type keeps what it can. You can undo it.</span>
        </label>
        <label className="grid gap-1.5"><span className="text-label-sm text-ink-muted">Help text</span>
          <Textarea key={`d-${f.id}`} rows={2} defaultValue={f.description ?? ""} placeholder="Shown to editors under the field name" onBlur={(e) => { if (e.target.value !== (f.description ?? "")) actions.updateField(c.id, f.id, { description: e.target.value }); }} />
        </label>
      </Section>
      {(f.type === "select" || f.type === "multiSelect") && (
        <Section title="Options"><ChoicesEditor choices={f.choices ?? []} onChange={(choices) => actions.updateField(c.id, f.id, { choices })} /></Section>
      )}
      {f.type === "link" && (
        <Section title="Links to">
          <Select value={f.linkTable ?? ""} aria-label="Links to" onValueChange={(id) => actions.updateField(c.id, f.id, { linkTable: id })}
            options={ui.base.collections.filter((x) => x.id !== c.id).map((x) => ({ value: x.id, label: x.name }))} />
        </Section>
      )}
      <Section title="In this view">
        {!primary && <p className="text-body-sm text-ink-muted">{ui.view.hidden.includes(f.id) ? "Hidden in" : "Shown in"} {ui.view.name}.</p>}
        <div className="flex flex-wrap gap-2">
          {!primary && <Button size="sm" variant="secondary" onClick={() => actions.updateView(c.id, ui.view.id, { hidden: ui.view.hidden.includes(f.id) ? ui.view.hidden.filter((x) => x !== f.id) : [...ui.view.hidden, f.id] })}>{ui.view.hidden.includes(f.id) ? "Show" : "Hide"}</Button>}
          {!primary && ["text", "email", "url", "number", "date"].includes(f.type) && <Button size="sm" variant="ghost" onClick={() => actions.change("Changed the title field", (b) => { const x = b.collections.find((y) => y.id === c.id); if (x) x.primaryField = f.id; })}>Use as title</Button>}
          {primary && <span className="text-body-sm text-ink-muted">This is the title field: it names each item on cards and in links.</span>}
        </div>
      </Section>
      {!primary && (
        <Section>
          <Button size="sm" variant="ghost" iconStart={<Trash2 />} className="justify-self-start text-danger" onClick={() => setConfirm(true)}>Delete field</Button>
        </Section>
      )}
      <ConfirmDialog open={confirm} onCancel={() => setConfirm(false)} tone="danger" confirmLabel="Delete field" title={`Delete ${f.name}?`}
        description={`${used} item${used === 1 ? "" : "s"} have a value in it. The values go with the field. You can undo this.`}
        onConfirm={() => { actions.deleteField(c.id, f.id); setConfirm(false); ui.inspect("field", null); }} />
    </div>
  );
}

function ViewPanel() {
  const ui = useUi();
  const { actions } = useStudio();
  const c = ui.collection, v = ui.view;
  const set = (p: Partial<View>) => actions.updateView(c.id, v.id, p);
  const images = c.fields.filter((f) => f.type === "image");
  const choices = c.fields.filter((f) => f.type === "select" || f.type === "checkbox");
  const dates = c.fields.filter((f) => f.type === "date");
  return (
    <div>
      <Section title="View">
        <label className="grid gap-1.5"><span className="text-label-sm text-ink-muted">Name</span>
          <Input key={v.id + v.name} defaultValue={v.name} onBlur={(e) => { const n = e.target.value.trim(); if (n && n !== v.name) set({ name: n }); }} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />
        </label>
      </Section>
      <Section title="Layout">
        <div role="radiogroup" aria-label="Layout" className="grid grid-cols-3 gap-1.5">
          {viewTypes.map((t) => { const Icon = viewIcons[t.type]; const on = v.type === t.type; return (
            <button key={t.type} type="button" role="radio" aria-checked={on} title={t.hint}
              onClick={() => set({ type: t.type as ViewType, groupBy: t.type === "kanban" ? v.groupBy ?? choices[0]?.id : v.groupBy, dateField: v.dateField ?? dates[0]?.id, coverField: v.coverField ?? images[0]?.id })}
              className={cx("grid justify-items-center gap-1 rounded-md border px-1 py-2.5 text-label-sm", on ? "border-action bg-surface-selected text-ink" : "border-line text-ink-muted hover:bg-surface-hover")}>
              <Icon className={cx("size-5", on ? "text-ink-brand" : "text-ink-subtle")} />{t.label}
            </button>
          ); })}
        </div>
        {(v.type === "gallery" || v.type === "kanban" || v.type === "list") && (
          <label className="grid gap-1.5"><span className="text-label-sm text-ink-muted">Card image</span>
            <Select value={v.coverField ?? ""} aria-label="Card image" onValueChange={(id) => set({ coverField: id || undefined })}
              options={[{ value: "", label: "No image" }, ...images.map((f) => ({ value: f.id, label: f.name }))]} />
          </label>
        )}
        {v.type === "kanban" && (
          <label className="grid gap-1.5"><span className="text-label-sm text-ink-muted">Columns from</span>
            <Select value={v.groupBy ?? ""} placeholder="Choose a field" aria-label="Columns from" onValueChange={(id) => set({ groupBy: id })} options={choices.map((f) => ({ value: f.id, label: f.name }))} />
          </label>
        )}
        {v.type === "calendar" && (
          <label className="grid gap-1.5"><span className="text-label-sm text-ink-muted">Dates from</span>
            <Select value={v.dateField ?? ""} placeholder="Choose a field" aria-label="Dates from" onValueChange={(id) => set({ dateField: id })} options={dates.map((f) => ({ value: f.id, label: f.name }))} />
          </label>
        )}
        {v.type === "gallery" && (
          <SegmentedControl size="sm" label="Card size" value={v.cardSize} onChange={(s) => set({ cardSize: s as View["cardSize"] })} options={[{ value: "sm", label: "Small" }, { value: "md", label: "Medium" }, { value: "lg", label: "Large" }]} />
        )}
        {v.type === "grid" && (
          <SegmentedControl size="sm" label="Row height" value={v.rowHeight} onChange={(s) => set({ rowHeight: s as View["rowHeight"] })} options={[{ value: "short", label: "Short" }, { value: "medium", label: "Medium" }, { value: "tall", label: "Tall" }]} />
        )}
      </Section>
      {v.type !== "calendar" && <Section title="Fields"><FieldsPanel view={v} /></Section>}
      <Section title="Shown">
        <div className="flex flex-wrap gap-1.5">
          {v.filters.length ? <Chip label={`${v.filters.length} filter${v.filters.length > 1 ? "s" : ""}`} color={6} /> : <span className="text-body-sm text-ink-muted">Every item, no filters.</span>}
          {v.sorts.length > 0 && <Chip label={`Sorted by ${v.sorts.map((s) => c.fields.find((f) => f.id === s.fieldId)?.name).join(", ")}`} color={4} />}
        </div>
      </Section>
    </div>
  );
}
