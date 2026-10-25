"use client";
import { Button, Input, Popover, Switch, Textarea, cx } from "@ds/components";
import { Check, ExternalLink, Plus, Search, Star, Upload } from "lucide-react";
import * as React from "react";
import { cellText, formatDate, isEmpty, recordTitle } from "@/lib/studio/query";
import type { Base, CellValue, Choice, Field } from "@/lib/studio/types";
import { Chip, Thumb, colorCount } from "./ui";

/** Record titles across the base, for link chips and link filters. */
export function makeLookup(base: Base) {
  const titles = new Map<string, string>();
  for (const c of base.collections) for (const r of c.records) titles.set(r.id, recordTitle(c, r));
  return (id: string) => titles.get(id) ?? "Removed record";
}

/** Every picture already in the base, for the image picker's library. */
export function baseImages(base: Base) {
  const seen = new Set<string>();
  for (const c of base.collections) for (const f of c.fields) if (f.type === "image")
    for (const r of c.records) { const v = r.values[f.id]; if (typeof v === "string" && v && !v.startsWith("data:")) seen.add(v); }
  return [...seen];
}

const lines = { short: "line-clamp-1", medium: "line-clamp-2", tall: "line-clamp-4" } as const;

/** A value as it reads in a table cell, card or list row. */
export function CellView({ field, value, lookup, rows = "short", numbers = "left", className }: {
  field: Field; value: CellValue | undefined; lookup: (id: string) => string; rows?: keyof typeof lines; numbers?: "left" | "right"; className?: string;
}) {
  if (isEmpty(value) && field.type !== "checkbox" && field.type !== "rating") return <span className={cx("text-ink-disabled", className)} aria-label="Empty" />;
  switch (field.type) {
    case "select": {
      const c = field.choices?.find((o) => o.id === value);
      return c ? <Chip label={c.label} color={c.color} className={className} /> : null;
    }
    case "multiSelect":
      return <span className={cx("flex min-w-0 flex-wrap gap-1", rows === "short" && "flex-nowrap overflow-hidden", className)}>{(value as string[]).map((id) => { const c = field.choices?.find((o) => o.id === id); return c ? <Chip key={id} label={c.label} color={c.color} /> : null; })}</span>;
    case "link":
      return (
        <span className={cx("flex min-w-0 flex-wrap gap-1", rows === "short" && "flex-nowrap overflow-hidden", className)}>
          {(value as string[]).map((id) => <span key={id} className="inline-flex h-6 shrink-0 items-center rounded-md border border-line bg-surface px-2 text-label-sm whitespace-nowrap text-ink">{lookup(id)}</span>)}
        </span>
      );
    case "checkbox":
      return (
        <span className={cx("inline-flex size-5 items-center justify-center rounded-xs border", value ? "border-action bg-action text-on-action" : "border-line-strong", className)}>
          {value ? <Check className="size-3.5" strokeWidth={3} aria-label="Yes" /> : <span className="sr-only">No</span>}
        </span>
      );
    case "rating":
      return (
        <span className={cx("inline-flex gap-0.5", className)} aria-label={`${Number(value ?? 0)} of 5 stars`}>
          {[1, 2, 3, 4, 5].map((n) => <Star key={n} aria-hidden="true" className={cx("size-4", n <= Number(value ?? 0) ? "fill-current text-warning" : "text-line-strong")} />)}
        </span>
      );
    case "image":
      return <Thumb src={String(value)} className={cx("size-8 rounded-sm", className)} />;
    case "number":
      return <span className={cx("block font-mono text-data-sm tabular-nums", numbers === "right" && "text-right", className)}>{Number(value).toLocaleString("en-US")}</span>;
    case "currency":
      return <span className={cx("block font-mono text-data-sm tabular-nums", numbers === "right" && "text-right", className)}>{cellText(field, value)}</span>;
    case "date":
      return <span className={cx("whitespace-nowrap", className)}>{formatDate(String(value))}</span>;
    case "url":
    case "email":
      return <span className={cx("block truncate text-link", className)}>{String(value)}</span>;
    case "longText":
      return <span className={cx("block whitespace-pre-line", lines[rows], className)}>{String(value)}</span>;
    default:
      return <span className={cx("block", lines[rows], className)}>{String(value)}</span>;
  }
}

/** Search a list of choices, pick one or several, or create a new one by typing it. */
export function ChoicePicker({ field, value, multi, onChange, onCreate }: {
  field: Field; value: CellValue | undefined; multi: boolean; onChange: (v: CellValue) => void; onCreate?: (label: string) => Choice;
}) {
  const [q, setQ] = React.useState("");
  const picked = multi ? ((value as string[] | null) ?? []) : value ? [String(value)] : [];
  const list = (field.choices ?? []).filter((c) => c.label.toLowerCase().includes(q.trim().toLowerCase()));
  const exact = (field.choices ?? []).some((c) => c.label.toLowerCase() === q.trim().toLowerCase());
  const toggle = (id: string) => onChange(multi ? (picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id]) : picked[0] === id ? null : id);
  return (
    <div className="grid gap-2">
      <Input size="sm" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find or create an option" aria-label="Find or create an option" start={<Search />}
        onKeyDown={(e) => { if (e.key === "Enter" && q.trim() && !exact && onCreate) { e.preventDefault(); const c = onCreate(q.trim()); toggle(c.id); setQ(""); } }} />
      <ul className="grid max-h-64 gap-0.5 overflow-y-auto" role="listbox" aria-multiselectable={multi} aria-label={field.name}>
        {list.map((c) => {
          const on = picked.includes(c.id);
          return (
            <li key={c.id} role="option" aria-selected={on}>
              <button type="button" onClick={() => toggle(c.id)} className={cx("flex min-h-9 w-full items-center gap-2 rounded-md px-2 text-left hover:bg-surface-hover", on && "bg-surface-selected")}>
                <Chip label={c.label} color={c.color} />
                {on && <Check className="ml-auto size-4 text-ink-brand" aria-hidden="true" />}
              </button>
            </li>
          );
        })}
        {!list.length && !q && <li className="px-2 py-2 text-body-sm text-ink-subtle">No options yet. Type one above.</li>}
      </ul>
      {q.trim() && !exact && onCreate && (
        <Button size="sm" variant="ghost" iconStart={<Plus />} className="justify-start" onClick={() => { const c = onCreate(q.trim()); toggle(c.id); setQ(""); }}>Create “{q.trim()}”</Button>
      )}
    </div>
  );
}

/** Picks records from the linked collection. */
export function LinkPicker({ base, field, value, onChange }: { base: Base; field: Field; value: CellValue | undefined; onChange: (v: CellValue) => void }) {
  const [q, setQ] = React.useState("");
  const target = base.collections.find((c) => c.id === field.linkTable);
  if (!target) return <p className="text-body-sm text-ink-subtle">Choose which collection this field links to in its settings.</p>;
  const picked = (value as string[] | null) ?? [];
  const rows = target.records.map((r) => ({ id: r.id, title: recordTitle(target, r) })).filter((r) => r.title.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 60);
  return (
    <div className="grid gap-2">
      <Input size="sm" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Find in ${target.name}`} aria-label={`Find in ${target.name}`} start={<Search />} />
      <ul className="grid max-h-64 gap-0.5 overflow-y-auto" role="listbox" aria-multiselectable aria-label={field.name}>
        {rows.map((r) => {
          const on = picked.includes(r.id);
          return (
            <li key={r.id} role="option" aria-selected={on}>
              <button type="button" onClick={() => onChange(on ? picked.filter((x) => x !== r.id) : [...picked, r.id])}
                className={cx("flex min-h-9 w-full items-center gap-2 rounded-md px-2 text-left text-body-sm text-ink hover:bg-surface-hover", on && "bg-surface-selected")}>
                <span className="min-w-0 flex-1 truncate">{r.title}</span>
                {on && <Check className="size-4 shrink-0 text-ink-brand" aria-hidden="true" />}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Pick from pictures already in the base, paste a link, or upload one (resized in the browser). */
export function ImagePicker({ base, value, onChange }: { base: Base; value: CellValue | undefined; onChange: (v: CellValue) => void }) {
  const [url, setUrl] = React.useState("");
  const file = React.useRef<HTMLInputElement>(null);
  const library = React.useMemo(() => baseImages(base), [base]);
  const upload = (f: File) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 800 / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
      onChange(canvas.toDataURL("image/jpeg", 0.82));
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(f);
  };
  return (
    <div className="grid gap-3">
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" iconStart={<Upload />} onClick={() => file.current?.click()}>Upload</Button>
        {!isEmpty(value) && <Button size="sm" variant="ghost" onClick={() => onChange(null)}>Remove</Button>}
        <input ref={file} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
      </div>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (url.trim()) { onChange(url.trim()); setUrl(""); } }}>
        <Input size="sm" className="min-w-0 flex-1" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Or paste an image link" aria-label="Image link" />
        <Button size="sm" type="submit" variant="secondary">Use</Button>
      </form>
      <div>
        <p className="mb-2 text-label-sm text-ink-muted">From your assets</p>
        <ul className="grid max-h-56 grid-cols-4 gap-1.5 overflow-y-auto">
          {library.map((src) => (
            <li key={src}>
              <button type="button" onClick={() => onChange(src)} aria-label={`Use ${src.split("/").pop()}`} aria-pressed={value === src}
                className={cx("block aspect-square w-full overflow-hidden rounded-sm ring-offset-2 ring-offset-surface-raised", value === src && "ring-2 ring-action")}>
                <Thumb src={src} className="size-full" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Adds a choice to a field, in the next colour. */
export const choiceMaker = (field: Field, save: (choices: Choice[]) => void) => (label: string): Choice => {
  const c: Choice = { id: `opt_${Math.random().toString(36).slice(2, 8)}`, label, color: ((field.choices?.length ?? 0) % colorCount) + 1 };
  save([...(field.choices ?? []), c]);
  return c;
};

/** The full editor for one value: used in the record inspector and anywhere a form shows a field. */
export function FieldInput({ base, field, value, onCommit, onChoicesChange, id }: {
  base: Base; field: Field; value: CellValue | undefined; onCommit: (v: CellValue) => void; onChoicesChange: (choices: Choice[]) => void; id?: string;
}) {
  const [draft, setDraft] = React.useState(value);
  React.useEffect(() => setDraft(value), [value]); // eslint-disable-line react-hooks/set-state-in-effect
  const lookup = React.useMemo(() => makeLookup(base), [base]);
  const commit = (v: CellValue) => { if (JSON.stringify(v ?? null) !== JSON.stringify(value ?? null)) onCommit(v); };
  const text = draft === null || draft === undefined ? "" : String(draft);

  switch (field.type) {
    case "longText":
      return <Textarea id={id} rows={4} value={text} onChange={(e) => setDraft(e.target.value)} onBlur={() => commit(text || null)} />;
    case "number": case "currency":
      return <Input id={id} type="number" inputMode="decimal" value={text} start={field.type === "currency" ? <span className="text-body-sm text-ink-subtle">$</span> : undefined}
        onChange={(e) => setDraft(e.target.value)} onBlur={() => commit(text === "" ? null : Number(text))} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />;
    case "date":
      return <Input id={id} type="date" value={text.slice(0, 10)} onChange={(e) => { setDraft(e.target.value); commit(e.target.value || null); }} />;
    case "checkbox":
      return <Switch id={id} checked={!!value} onChange={(v) => onCommit(v)} label={value ? "Yes" : "No"} />;
    case "rating":
      return (
        <div className="flex gap-1" role="radiogroup" aria-label={field.name}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={Number(value ?? 0) === n} aria-label={`${n} star${n > 1 ? "s" : ""}`} onClick={() => onCommit(Number(value) === n ? 0 : n)}
              className="inline-flex size-9 items-center justify-center rounded-md hover:bg-surface-hover">
              <Star className={cx("size-5", n <= Number(value ?? 0) ? "fill-current text-warning" : "text-line-strong")} aria-hidden="true" />
            </button>
          ))}
        </div>
      );
    case "select": case "multiSelect": case "link": {
      const multi = field.type !== "select";
      const ids = multi ? ((value as string[] | null) ?? []) : value ? [String(value)] : [];
      return (
        <div className="flex flex-wrap items-center gap-1.5">
          {field.type === "link"
            ? ids.map((x) => <Chip key={x} label={lookup(x)} color={0} onRemove={() => onCommit(ids.filter((y) => y !== x))} />)
            : ids.map((x) => { const c = field.choices?.find((o) => o.id === x); return c ? <Chip key={x} label={c.label} color={c.color} onRemove={() => onCommit(multi ? ids.filter((y) => y !== x) : null)} /> : null; })}
          <Popover label={`Choose ${field.name}`} width="sm" trigger={<Button id={id} size="sm" variant="ghost" iconStart={<Plus />}>{ids.length ? (multi ? "Add" : "Change") : "Choose"}</Button>}>
            {field.type === "link"
              ? <LinkPicker base={base} field={field} value={value} onChange={onCommit} />
              : <ChoicePicker field={field} value={value} multi={multi} onChange={onCommit} onCreate={choiceMaker(field, onChoicesChange)} />}
          </Popover>
        </div>
      );
    }
    case "image":
      return (
        <div className="flex items-center gap-3">
          <Thumb src={typeof value === "string" ? value : null} className="size-16 rounded-md" />
          <Popover label={`Choose ${field.name}`} width="md" trigger={<Button id={id} size="sm" variant="secondary">{isEmpty(value) ? "Add image" : "Change"}</Button>}>
            <ImagePicker base={base} value={value} onChange={onCommit} />
          </Popover>
        </div>
      );
    case "url": case "email":
      return (
        <Input id={id} type={field.type === "email" ? "email" : "url"} value={text} onChange={(e) => setDraft(e.target.value)} onBlur={() => commit(text || null)}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          end={text ? <a href={field.type === "email" ? `mailto:${text}` : text} target="_blank" rel="noreferrer" aria-label={field.type === "email" ? "Write an email" : "Open link"} className="inline-flex size-6 items-center justify-center rounded-xs hover:bg-surface-hover"><ExternalLink /></a> : undefined} />
      );
    default:
      return <Input id={id} value={text} onChange={(e) => setDraft(e.target.value)} onBlur={() => commit(text || null)} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />;
  }
}
