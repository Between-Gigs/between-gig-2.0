"use client";
import { Button, IconButton, Input, Menu, Popover, Select, Switch, cx } from "@ds/components";
import { ArrowUpDown, Copy, Ellipsis, Eye, ListFilter, Pencil, Plus, Rows3, Search, Settings2, Trash2, X } from "lucide-react";
import * as React from "react";
import { filterOps, uid, viewFields } from "@/lib/studio/query";
import { useStudio } from "@/lib/studio/store";
import type { Filter, View } from "@/lib/studio/types";
import { useUi } from "./context";
import { AddViewDialog } from "./dialogs";
import { fieldIcons, viewIcons } from "./ui";

/** The view tabs above the canvas: one per saved view, plus Add view. */
export function ViewTabs() {
  const ui = useUi();
  const { actions } = useStudio();
  const [adding, setAdding] = React.useState(false);
  const c = ui.collection;
  return (
    <div className="flex items-end gap-1 overflow-x-auto border-b border-line px-3 sm:px-4">
      <div role="tablist" aria-label="Views" className="flex items-end gap-1">
        {c.views.map((v) => {
          const Icon = viewIcons[v.type];
          const on = v.id === ui.view.id;
          return (
            <button key={v.id} type="button" role="tab" aria-selected={on} onClick={() => ui.open(c.id, v.id)}
              onDoubleClick={() => ui.inspect("view")}
              className={cx("-mb-px inline-flex h-10 shrink-0 items-center gap-2 border-b-2 px-3 text-label-sm whitespace-nowrap transition-colors duration-fast",
                on ? "border-action text-ink" : "border-transparent text-ink-muted hover:text-ink")}>
              <Icon className={cx("size-4", on ? "text-ink-brand" : "text-ink-subtle")} />
              {v.name}
            </button>
          );
        })}
      </div>
      <Menu align="start" trigger={<IconButton size="sm" variant="ghost" label="View options" icon={<Ellipsis />} className="mb-1" />}
        items={[
          { label: "View settings", icon: <Settings2 />, onSelect: () => ui.inspect("view") },
          { label: "Rename view", icon: <Pencil />, onSelect: () => ui.inspect("view") },
          { label: "Duplicate view", icon: <Copy />, onSelect: () => { const id = actions.addView(c.id, ui.view.type); actions.updateView(c.id, id, { ...structuredClone(ui.view), id, name: `${ui.view.name} copy` }); ui.open(c.id, id); } },
          "separator",
          { label: "Delete view", icon: <Trash2 />, danger: true, disabled: c.views.length < 2, description: c.views.length < 2 ? "A collection keeps at least one view" : undefined, onSelect: () => { actions.deleteView(c.id, ui.view.id); ui.open(c.id); } },
        ]} />
      <Button size="sm" variant="ghost" iconStart={<Plus />} className="mb-1 shrink-0" onClick={() => setAdding(true)}>Add view</Button>
      <AddViewDialog open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}

function Count({ n }: { n: number }) {
  return n ? <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-surface-selected px-1.5 text-label-sm text-ink-brand">{n}</span> : null;
}

function FilterPanel({ view }: { view: View }) {
  const ui = useUi();
  const { actions } = useStudio();
  const c = ui.collection;
  const set = (filters: Filter[], match = view.match) => actions.updateView(c.id, view.id, { filters, match });
  const add = () => { const f = c.fields[0]; set([...view.filters, { id: uid("flt"), fieldId: f.id, op: filterOps(f.type)[0].op, value: "" }]); };
  return (
    <div className="grid gap-3">
      {!view.filters.length && <p className="text-body-sm text-ink-muted">Show only the records that match. Nothing is deleted.</p>}
      {view.filters.length > 1 && (
        <Select size="sm" value={view.match} onValueChange={(m) => set(view.filters, m as View["match"])} aria-label="Match"
          options={[{ value: "and", label: "Match every condition" }, { value: "or", label: "Match any condition" }]} />
      )}
      {view.filters.map((f, i) => {
        const field = c.fields.find((x) => x.id === f.fieldId) ?? c.fields[0];
        const ops = filterOps(field.type);
        const op = ops.find((o) => o.op === f.op) ?? ops[0];
        const patch = (p: Partial<Filter>) => set(view.filters.map((x, j) => (j === i ? { ...x, ...p } : x)));
        const choices = field.type === "select" || field.type === "multiSelect" ? field.choices ?? [] : null;
        const linked = field.type === "link" ? ui.base.collections.find((x) => x.id === field.linkTable) : null;
        return (
          <div key={f.id} className="grid gap-1.5 rounded-md border border-line p-2">
            <div className="flex gap-1.5">
              <Select size="sm" className="min-w-0 flex-1" value={field.id} aria-label="Field"
                onValueChange={(id) => { const nf = c.fields.find((x) => x.id === id)!; patch({ fieldId: id, op: filterOps(nf.type)[0].op, value: "" }); }}
                options={c.fields.map((x) => ({ value: x.id, label: x.name }))} />
              <IconButton size="sm" variant="ghost" label="Remove condition" icon={<X />} onClick={() => set(view.filters.filter((_, j) => j !== i))} />
            </div>
            <Select size="sm" value={op.op} aria-label="Condition" onValueChange={(o) => patch({ op: o as Filter["op"] })} options={ops.map((o) => ({ value: o.op, label: o.label }))} />
            {op.needsValue && (choices || linked
              ? <Select size="sm" value={f.value ?? ""} placeholder="Choose…" aria-label="Value" onValueChange={(v) => patch({ value: v })}
                  options={choices ? choices.map((o) => ({ value: o.id, label: o.label })) : linked!.records.slice(0, 200).map((r) => ({ value: r.id, label: ui.lookup(r.id) }))} />
              : <Input size="sm" type={field.type === "date" ? "date" : field.type === "number" || field.type === "currency" || field.type === "rating" ? "number" : "text"}
                  value={f.value ?? ""} onChange={(e) => patch({ value: e.target.value })} placeholder="Value" aria-label="Value" />)}
          </div>
        );
      })}
      <Button size="sm" variant="ghost" iconStart={<Plus />} className="justify-start" onClick={add}>Add condition</Button>
    </div>
  );
}

function SortPanel({ view }: { view: View }) {
  const ui = useUi();
  const { actions } = useStudio();
  const c = ui.collection;
  const set = (sorts: View["sorts"]) => actions.updateView(c.id, view.id, { sorts });
  const unused = c.fields.filter((f) => !view.sorts.some((s) => s.fieldId === f.id));
  return (
    <div className="grid gap-2">
      {!view.sorts.length && <p className="text-body-sm text-ink-muted">Order records by one or more fields.</p>}
      {view.sorts.map((s, i) => (
        <div key={s.fieldId} className="flex gap-1.5">
          <Select size="sm" className="min-w-0 flex-1" value={s.fieldId} aria-label="Sort by" onValueChange={(id) => set(view.sorts.map((x, j) => (j === i ? { ...x, fieldId: id } : x)))}
            options={c.fields.filter((f) => f.id === s.fieldId || unused.includes(f)).map((f) => ({ value: f.id, label: f.name }))} />
          <Select size="sm" className="w-28" value={s.dir} aria-label="Direction" onValueChange={(d) => set(view.sorts.map((x, j) => (j === i ? { ...x, dir: d as "asc" | "desc" } : x)))}
            options={[{ value: "asc", label: "A → Z" }, { value: "desc", label: "Z → A" }]} />
          <IconButton size="sm" variant="ghost" label="Remove sort" icon={<X />} onClick={() => set(view.sorts.filter((_, j) => j !== i))} />
        </div>
      ))}
      {unused.length > 0 && <Button size="sm" variant="ghost" iconStart={<Plus />} className="justify-start" onClick={() => set([...view.sorts, { fieldId: unused[0].id, dir: "asc" }])}>Add sort</Button>}
    </div>
  );
}

export function FieldsPanel({ view }: { view: View }) {
  const ui = useUi();
  const { actions } = useStudio();
  const c = ui.collection;
  const fields = viewFields(c, view, true);
  const [drag, setDrag] = React.useState<string | null>(null);
  const move = (id: string, to: number) => {
    const ids = fields.map((f) => f.id).filter((x) => x !== c.primaryField);
    const from = ids.indexOf(id);
    if (from < 0 || to < 0 || to >= ids.length) return;
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    actions.updateView(c.id, view.id, { order: ids });
  };
  return (
    <div className="grid gap-1">
      <p className="mb-1 text-body-sm text-ink-muted">Drag to reorder. Hidden fields keep their data.</p>
      {fields.map((f, i) => {
        const Icon = fieldIcons[f.type];
        const primary = f.id === c.primaryField;
        const shown = primary || !view.hidden.includes(f.id);
        return (
          <div key={f.id} draggable={!primary} onDragStart={() => setDrag(f.id)} onDragEnd={() => setDrag(null)}
            onDragOver={(e) => { if (drag && !primary) e.preventDefault(); }} onDrop={() => { if (drag) move(drag, i - 1); }}
            className={cx("flex min-h-9 items-center gap-2 rounded-md px-1.5", drag === f.id && "opacity-50", !primary && "cursor-grab")}>
            <Icon className="size-4 shrink-0 text-ink-subtle" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-body-sm text-ink">{f.name}</span>
            {primary
              ? <span className="text-label-sm text-ink-subtle">Title</span>
              : <Switch aria-label={`Show ${f.name}`} checked={shown} onChange={(on) => actions.updateView(c.id, view.id, { hidden: on ? view.hidden.filter((x) => x !== f.id) : [...view.hidden, f.id] })}
                  onKeyDown={(e) => { if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) { e.preventDefault(); move(f.id, i - 1 + (e.key === "ArrowUp" ? -1 : 1)); } }} />}
          </div>
        );
      })}
      <div className="mt-1 flex gap-2 border-t border-line pt-2">
        <Button size="sm" variant="ghost" onClick={() => actions.updateView(c.id, view.id, { hidden: [] })}>Show all</Button>
        <Button size="sm" variant="ghost" onClick={() => actions.updateView(c.id, view.id, { hidden: c.fields.filter((f) => f.id !== c.primaryField).map((f) => f.id) })}>Hide all</Button>
        <Button size="sm" variant="ghost" iconStart={<Plus />} className="ml-auto" onClick={() => ui.setAddFieldOpen(true)}>Field</Button>
      </div>
    </div>
  );
}

/** Search, filter, sort, group and fields for the open view, with the one primary action: a new record. */
export function Toolbar({ onNew }: { onNew: () => void }) {
  const ui = useUi();
  const { actions } = useStudio();
  const v = ui.view, c = ui.collection;
  const groupable = c.fields.filter((f) => f.type === "select" || f.type === "checkbox");
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto border-b border-line px-3 py-2 sm:px-4">
      <Input type="search" value={ui.search} onChange={(e) => ui.setSearch(e.target.value)} placeholder={`Search ${c.name.toLowerCase()}`} aria-label={`Search ${c.name}`} start={<Search />}
        className="w-44 shrink-0 sm:w-60" end={ui.search ? <button type="button" aria-label="Clear search" onClick={() => ui.setSearch("")} className="inline-flex size-6 items-center justify-center rounded-xs hover:bg-surface-hover"><X /></button> : undefined} />
      <Popover label="Filter" title="Filter" width="md" trigger={<Button size="sm" variant="ghost" iconStart={<ListFilter />} className="shrink-0">Filter<Count n={v.filters.length} /></Button>}>
        <FilterPanel view={v} />
      </Popover>
      <Popover label="Sort" title="Sort" width="md" trigger={<Button size="sm" variant="ghost" iconStart={<ArrowUpDown />} className="shrink-0">Sort<Count n={v.sorts.length} /></Button>}>
        <SortPanel view={v} />
      </Popover>
      {(v.type === "grid" || v.type === "kanban") && (
        <Popover label="Group" title={v.type === "kanban" ? "Columns" : "Group"} width="sm" trigger={<Button size="sm" variant="ghost" iconStart={<Rows3 />} className="shrink-0">{v.type === "kanban" ? "Columns" : "Group"}<Count n={v.groupBy ? 1 : 0} /></Button>}>
          {groupable.length
            ? <Select size="sm" value={v.groupBy ?? ""} aria-label="Group by" placeholder="Choose a field" onValueChange={(id) => actions.updateView(c.id, v.id, { groupBy: id || undefined })}
                options={[...(v.type === "grid" ? [{ value: "", label: "No grouping" }] : []), ...groupable.map((f) => ({ value: f.id, label: f.name }))]} />
            : <p className="text-body-sm text-ink-muted">Add a Single choice or Checkbox field to group by.</p>}
        </Popover>
      )}
      {v.type !== "calendar" && (
        <Popover label="Fields" title="Fields" width="sm" trigger={<Button size="sm" variant="ghost" iconStart={<Eye />} className="shrink-0">Fields<Count n={v.hidden.length} /></Button>}>
          <FieldsPanel view={v} />
        </Popover>
      )}
      <span className="ml-auto shrink-0" />
      <span className="hidden shrink-0 sm:inline-flex"><Button size="sm" variant="secondary" iconStart={<Plus />} onClick={onNew}>New item</Button></span>
    </div>
  );
}
