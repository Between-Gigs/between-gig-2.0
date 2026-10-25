"use client";
import { Menu, cx } from "@ds/components";
import { ChevronRight, Ellipsis, GripVertical, Plus } from "lucide-react";
import * as React from "react";
import { groupRecords, isEmpty, recordTitle, viewFields } from "@/lib/studio/query";
import { useStudio } from "@/lib/studio/store";
import type { CellValue, StudioRecord } from "@/lib/studio/types";
import { CellView } from "../cells";
import { useUi } from "../context";
import { Chip, Thumb, rail } from "../ui";
import { Empty } from "./GridView";

/** One record as a card: cover, title and the view's visible fields with their names. */
function RecordCard({ r, cover = true, dense = false, className }: { r: StudioRecord; cover?: boolean; dense?: boolean; className?: string }) {
  const ui = useUi();
  const c = ui.collection, v = ui.view;
  const coverField = v.coverField ? c.fields.find((f) => f.id === v.coverField) : undefined;
  const fields = viewFields(c, v).filter((f) => f.id !== c.primaryField && f.id !== v.coverField && f.id !== v.groupBy);
  const shown = fields.filter((f) => !isEmpty(r.values[f.id])).slice(0, dense ? 3 : 5);
  const on = ui.mode === "record" && ui.recordId === r.id;
  const src = coverField ? r.values[coverField.id] : null;
  return (
    <button type="button" onClick={() => ui.inspect("record", r.id)} aria-pressed={on}
      className={cx("group grid w-full content-start overflow-hidden rounded-lg border bg-surface text-left shadow-xs transition duration-fast hover:-translate-y-0.5 hover:shadow-md",
        on ? "border-action ring-2 ring-action" : "border-line", className)}>
      {cover && coverField && (!dense || (typeof src === "string" && src)) && (
        <Thumb src={typeof src === "string" ? src : null} initials={recordTitle(c, r)} className={cx("w-full", dense ? "aspect-video" : v.cardSize === "lg" ? "aspect-4/3" : "aspect-video")} />
      )}
      <span className={cx("grid gap-2", dense ? "p-3" : "p-4")}>
        <span className={cx("line-clamp-2 text-ink", dense ? "text-label-md" : "text-heading-sm")}>{recordTitle(c, r)}</span>
        {shown.map((f) => (
          dense && !["select", "multiSelect", "link", "image"].includes(f.type)
            // Small cards: a bare "4" means nothing, so values that aren't tags say what they are.
            ? <span key={f.id} className="flex min-w-0 items-baseline gap-1.5 text-body-sm"><span className="shrink-0 text-ink-subtle">{f.name}</span><CellView field={f} value={r.values[f.id]} lookup={ui.lookup} rows="short" className="min-w-0 truncate text-ink" /></span>
            : (
              <span key={f.id} className="grid justify-items-start gap-0.5">
                {!dense && <span className="text-caption text-ink-subtle">{f.name}</span>}
                <CellView field={f} value={r.values[f.id]} lookup={ui.lookup} rows={dense ? "short" : "medium"} className="text-body-sm text-ink-muted" />
              </span>
            )
        ))}
      </span>
    </button>
  );
}

const cols = { sm: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6", md: "sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4", lg: "sm:grid-cols-2 2xl:grid-cols-3" } as const;

export function GalleryView({ rows, onNew }: { rows: StudioRecord[]; onNew: () => void }) {
  const ui = useUi();
  if (!ui.collection.records.length) return <Empty name={ui.collection.name} onNew={onNew} />;
  return (
    <div className="min-h-0 flex-1 overflow-auto p-4 sm:p-6">
      <ul className={cx("grid gap-4", cols[ui.view.cardSize])}>
        {rows.map((r) => <li key={r.id}><RecordCard r={r} dense={ui.view.cardSize === "sm"} /></li>)}
        <li>
          <button type="button" onClick={onNew} className="flex h-full min-h-40 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line-strong text-label-md text-ink-muted hover:bg-surface-hover hover:text-ink">
            <Plus className="size-5" aria-hidden="true" /> New record
          </button>
        </li>
      </ul>
      {!rows.length && <p className="pt-4 text-body-md text-ink-muted">No records match. Clear the search or filters to see everything.</p>}
    </div>
  );
}

/** Columns by a choice field. Drag a card to another column, or use its menu (keyboard and touch friendly). */
export function KanbanView({ rows, onNew }: { rows: StudioRecord[]; onNew: (values?: Record<string, CellValue>) => void }) {
  const ui = useUi();
  const { actions } = useStudio();
  const c = ui.collection, v = ui.view;
  const field = v.groupBy ? c.fields.find((f) => f.id === v.groupBy) : c.fields.find((f) => f.type === "select");
  const [drag, setDrag] = React.useState<string | null>(null);
  const [over, setOver] = React.useState<string | null>(null);
  if (!field || (field.type !== "select" && field.type !== "checkbox")) {
    return (
      <div className="grid flex-1 place-content-center gap-2 p-10 text-center">
        <h2 className="font-display text-heading-lg text-ink">Pick the field for the columns</h2>
        <p className="max-w-sm text-body-md text-ink-muted">Kanban needs a Single choice field, like Status. Choose it under <strong className="font-semibold text-ink">Columns</strong>, or add one.</p>
      </div>
    );
  }
  const groups = groupRecords(field, rows);
  const valueFor = (gid: string): CellValue => (field.type === "checkbox" ? gid === "yes" : gid || null);
  const moveTo = (id: string, gid: string) => actions.setCell(c.id, id, field.id, valueFor(gid));
  return (
    <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto p-4 sm:p-6">
      {groups.map((g) => (
        <section key={g.id} aria-label={`${g.label}, ${g.rows.length} records`}
          onDragOver={(e) => { if (drag) { e.preventDefault(); setOver(g.id); } }} onDragLeave={() => setOver((o) => (o === g.id ? null : o))}
          onDrop={() => { if (drag) moveTo(drag, g.id); setDrag(null); setOver(null); }}
          className={cx("flex max-h-full w-72 shrink-0 flex-col rounded-lg border-t-4 bg-surface-sunken", rail(g.color), over === g.id && "ring-2 ring-action")}>
          <header className="flex items-center gap-2 px-3 pt-3 pb-2">
            <Chip label={g.label} color={g.color} />
            <span className="text-label-sm text-ink-subtle">{g.rows.length}</span>
            <button type="button" onClick={() => onNew({ [field.id]: valueFor(g.id) })} aria-label={`New record in ${g.label}`} className="ml-auto inline-flex size-7 items-center justify-center rounded-md text-ink-muted hover:bg-surface-hover hover:text-ink"><Plus className="size-4" /></button>
          </header>
          <ul className="grid min-h-16 content-start gap-2 overflow-y-auto px-2 pb-2">
            {g.rows.map((r) => (
              <li key={r.id} draggable onDragStart={() => setDrag(r.id)} onDragEnd={() => { setDrag(null); setOver(null); }}
                className={cx("relative cursor-grab active:cursor-grabbing", drag === r.id && "opacity-40")}>
                <RecordCard r={r} dense cover={!!v.coverField} />
                <span className="absolute top-2 right-2 flex gap-0.5">
                  <span aria-hidden="true" className="hidden size-7 items-center justify-center rounded-md bg-surface/80 text-ink-subtle sm:inline-flex"><GripVertical className="size-4" /></span>
                  <Menu align="end" trigger={<button type="button" aria-label={`Move ${recordTitle(c, r)}`} className="inline-flex size-7 items-center justify-center rounded-md bg-surface/80 text-ink-muted hover:bg-surface hover:text-ink"><Ellipsis className="size-4" /></button>}
                    items={[{ heading: "Move to" }, ...groups.filter((x) => x.id !== g.id).map((x) => ({ label: x.label, icon: <ChevronRight />, onSelect: () => moveTo(r.id, x.id) }))]} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** A content library: thumbnail, title, a summary line and a few details on the right. */
export function ListView({ rows, onNew }: { rows: StudioRecord[]; onNew: () => void }) {
  const ui = useUi();
  const c = ui.collection, v = ui.view;
  if (!c.records.length) return <Empty name={c.name} onNew={onNew} />;
  const coverField = v.coverField ? c.fields.find((f) => f.id === v.coverField) : undefined;
  const fields = viewFields(c, v).filter((f) => f.id !== c.primaryField && f.id !== v.coverField);
  const summary = fields.find((f) => f.type === "longText");
  const details = fields.filter((f) => f !== summary && f.type !== "longText").slice(0, 4);
  return (
    <div className="min-h-0 flex-1 overflow-auto p-4 sm:p-6">
      <ul className="mx-auto grid max-w-5xl divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
        {rows.map((r) => {
          const on = ui.mode === "record" && ui.recordId === r.id;
          const src = coverField ? r.values[coverField.id] : null;
          return (
            <li key={r.id}>
              <button type="button" onClick={() => ui.inspect("record", r.id)} aria-pressed={on}
                className={cx("flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-surface-hover", on && "bg-surface-selected")}>
                {coverField && <Thumb src={typeof src === "string" ? src : null} initials={recordTitle(c, r)} className="size-14 shrink-0 rounded-md text-heading-sm" />}
                <span className="grid min-w-0 flex-1 gap-1">
                  <span className="truncate text-label-md text-ink">{recordTitle(c, r)}</span>
                  {summary && <CellView field={summary} value={r.values[summary.id]} lookup={ui.lookup} rows="short" className="text-body-sm text-ink-muted" />}
                </span>
                <span className="hidden shrink-0 items-center gap-3 md:flex">
                  {details.map((f) => <span key={f.id} className="max-w-40 text-body-sm text-ink-muted"><CellView field={f} value={r.values[f.id]} lookup={ui.lookup} /></span>)}
                </span>
                <ChevronRight className="size-4 shrink-0 text-ink-subtle" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>
      {!rows.length && <p className="pt-4 text-center text-body-md text-ink-muted">No records match. Clear the search or filters to see everything.</p>}
    </div>
  );
}
