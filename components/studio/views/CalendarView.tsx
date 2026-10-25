"use client";
import { Button, IconButton, cx } from "@ds/components";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import * as React from "react";
import { recordTitle } from "@/lib/studio/query";
import type { CellValue, StudioRecord } from "@/lib/studio/types";
import { useUi } from "../context";
import { dot } from "../ui";

const iso = (d: Date) => d.toISOString().slice(0, 10);
const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** A month of records on their date field. Click a day's + to add a record on that day. */
export function CalendarView({ rows, onNew }: { rows: StudioRecord[]; onNew: (values?: Record<string, CellValue>) => void }) {
  const ui = useUi();
  const c = ui.collection, v = ui.view;
  const field = v.dateField ? c.fields.find((f) => f.id === v.dateField) : c.fields.find((f) => f.type === "date");
  const colorField = c.fields.find((f) => f.type === "select");
  const latest = React.useMemo(() => {
    const ds = rows.map((r) => (field ? String(r.values[field.id] ?? "") : "")).filter(Boolean).sort();
    return ds.length ? new Date(`${ds[ds.length - 1].slice(0, 7)}-01T12:00:00Z`) : new Date();
  }, [rows, field]);
  const [month, setMonth] = React.useState(() => new Date(Date.UTC(latest.getUTCFullYear(), latest.getUTCMonth(), 1)));
  if (!field) {
    return (
      <div className="grid flex-1 place-content-center gap-2 p-10 text-center">
        <h2 className="font-display text-heading-lg text-ink">Add a Date field</h2>
        <p className="max-w-sm text-body-md text-ink-muted">The calendar places records on a date. Add a Date field to {c.name}, then choose it in the view settings.</p>
      </div>
    );
  }
  const start = new Date(month); start.setUTCDate(1 - month.getUTCDay());
  const cells = Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setUTCDate(start.getUTCDate() + i); return d; });
  const byDay = new Map<string, StudioRecord[]>();
  for (const r of rows) { const d = String(r.values[field.id] ?? "").slice(0, 10); if (d) byDay.set(d, [...(byDay.get(d) ?? []), r]); }
  const today = iso(new Date());
  const shift = (n: number) => setMonth((m) => new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth() + n, 1)));
  const undated = rows.filter((r) => !r.values[field.id]).length;
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto p-4 sm:p-6">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="mr-2 font-display text-heading-lg text-ink">{month.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}</h2>
        <IconButton size="sm" variant="ghost" label="Previous month" icon={<ChevronLeft />} onClick={() => shift(-1)} />
        <IconButton size="sm" variant="ghost" label="Next month" icon={<ChevronRight />} onClick={() => shift(1)} />
        <Button size="sm" variant="secondary" onClick={() => { const n = new Date(); setMonth(new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), 1))); }}>Today</Button>
        {undated > 0 && <span className="ml-auto text-body-sm text-ink-muted">{undated} without a {field.name.toLowerCase()}</span>}
      </div>
      <div aria-label={`${c.name} by ${field.name}`} role="group" className="grid min-w-160 flex-1 grid-cols-7 overflow-hidden rounded-lg border border-line bg-line gap-px">
        {days.map((d) => <div key={d} aria-hidden="true" className="bg-surface-sunken px-2 py-1.5 text-label-sm text-ink-muted">{d}</div>)}
        {cells.map((d) => {
          const key = iso(d), inMonth = d.getUTCMonth() === month.getUTCMonth();
          const list = byDay.get(key) ?? [];
          return (
            <div key={key} role="group" aria-label={d.toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" })}
              className={cx("group/day flex min-h-28 flex-col gap-1 p-1.5", inMonth ? "bg-surface" : "bg-surface-sunken")}>
              <div className="flex items-center justify-between">
                <span className={cx("inline-flex size-6 items-center justify-center rounded-full text-label-sm", key === today ? "bg-action text-on-action" : inMonth ? "text-ink" : "text-ink-subtle")}>{d.getUTCDate()}</span>
                <button type="button" aria-label={`New record on ${key}`} onClick={() => onNew({ [field.id]: key })}
                  className="inline-flex size-6 items-center justify-center rounded-xs text-ink-subtle opacity-0 group-hover/day:opacity-100 hover:bg-surface-hover hover:text-ink focus-visible:opacity-100"><Plus className="size-3.5" /></button>
              </div>
              {list.slice(0, 3).map((r) => {
                const color = colorField ? colorField.choices?.find((o) => o.id === r.values[colorField.id])?.color ?? 0 : 1;
                return (
                  <button key={r.id} type="button" onClick={() => ui.inspect("record", r.id)}
                    className={cx("flex min-h-8 items-center gap-1.5 rounded-xs px-1.5 text-left text-label-sm text-ink hover:bg-surface-hover", ui.recordId === r.id && "bg-surface-selected")}>
                    <span aria-hidden="true" className={cx("size-2 shrink-0 rounded-full", dot(color))} />
                    <span className="truncate">{recordTitle(c, r)}</span>
                  </button>
                );
              })}
              {list.length > 3 && <span className="px-1.5 text-caption text-ink-subtle">+{list.length - 3} more</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
