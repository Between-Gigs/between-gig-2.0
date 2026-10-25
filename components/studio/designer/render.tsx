"use client";
import * as React from "react";
import { resolveStyles, toCss } from "@/lib/studio/pages";
import { cellText, isEmpty } from "@/lib/studio/query";
import type { Base, Breakpoint, Collection, PageElement, StudioRecord } from "@/lib/studio/types";
import { asset } from "@/lib/site";

export interface RenderOptions {
  base: Base;
  bp: Breakpoint;
  /** canvas: selectable, editable, with placeholders; preview: the page as visitors see it. */
  mode: "canvas" | "preview";
  editingId?: string | null;
  onTextCommit?: (id: string, text: string) => void;
  /** preview: turns an element's link into a real URL. */
  href?: (href: string) => string;
}

/** The records a collection list shows: its filter, sort and limit. */
export function listRecords(base: Base, el: PageElement): { collection: Collection | undefined; records: StudioRecord[] } {
  const s = el.source;
  const collection = s ? base.collections.find((c) => c.id === s.collectionId) : undefined;
  if (!s || !collection) return { collection, records: [] };
  let records = collection.records;
  if (s.filterField && s.filterValue) {
    records = records.filter((r) => {
      const v = r.values[s.filterField!];
      return Array.isArray(v) ? v.includes(s.filterValue!) : String(v ?? "") === s.filterValue || (s.filterValue === "true" && v === true);
    });
  }
  if (s.sortField) {
    const f = collection.fields.find((x) => x.id === s.sortField);
    records = records.slice().sort((a, b) => {
      const x = a.values[s.sortField!], y = b.values[s.sortField!];
      const d = typeof x === "number" && typeof y === "number" ? x - y : cellText(f, x).localeCompare(cellText(f, y), "en", { numeric: true });
      return s.sortDir === "desc" ? -d : d;
    });
  }
  return { collection, records: records.slice(0, Math.max(1, s.limit || 1)) };
}

const placeholder: React.CSSProperties = { outline: "1px dashed var(--line-strong)", outlineOffset: "-1px", minHeight: "64px" };

/** Draws one element and its children, with the record a collection list hands down. */
export function RenderElement({ el, opts, ctx }: { el: PageElement; opts: RenderOptions; ctx?: { collection: Collection; record: StudioRecord; lookup: (id: string) => string } }) {
  const canvas = opts.mode === "canvas";
  const style = toCss(resolveStyles(el, opts.base.classes, opts.bp));
  const data = canvas ? { "data-el": el.id } : {};
  const kids = (list = el.children ?? []) => list.map((c) => <RenderElement key={c.id} el={c} opts={opts} ctx={ctx} />);
  const field = ctx && el.bind ? ctx.collection.fields.find((f) => f.id === el.bind) : undefined;
  const bound = field ? ctx!.record.values[field.id] : undefined;
  const text = field ? cellText(field, bound, ctx!.lookup) || (canvas ? `No ${field.name.toLowerCase()}` : "") : el.text ?? "";
  const editing = canvas && opts.editingId === el.id && !field;
  const editable = editing ? {
    contentEditable: true, suppressContentEditableWarning: true,
    onBlur: (e: React.FocusEvent<HTMLElement>) => opts.onTextCommit?.(el.id, e.currentTarget.innerText),
    onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => { if (e.key === "Escape" || (e.key === "Enter" && !e.shiftKey && el.type !== "paragraph")) { e.preventDefault(); e.currentTarget.blur(); } },
    ref: (n: HTMLElement | null) => { if (n && document.activeElement !== n) { n.focus(); const r = document.createRange(); r.selectNodeContents(n); r.collapse(false); const s = getSelection(); s?.removeAllRanges(); s?.addRange(r); } },
  } : {};
  const link = (href?: string) => (canvas ? "#" : opts.href ? opts.href(href ?? "#") : href ?? "#");
  const empty = canvas && el.type !== "collection" && el.type !== "item" && !(el.children?.length);

  switch (el.type) {
    case "body":
      return <div {...data} style={{ ...style, ...(canvas && !el.children?.length ? placeholder : {}) }}>{kids()}</div>;
    case "section":
      return <section {...data} style={{ ...style, ...(empty ? placeholder : {}) }}>{kids()}</section>;
    case "container": case "div": case "columns":
      return <div {...data} style={{ ...style, ...(empty ? placeholder : {}) }}>{kids()}</div>;
    case "item":
      return <div role="listitem" {...data} style={{ ...style, ...(empty ? placeholder : {}) }}>{kids()}</div>;
    case "heading": {
      const Tag = `h${Math.min(6, Math.max(1, el.level ?? 2))}` as "h2";
      return <Tag {...data} {...editable} style={style}>{text}</Tag>;
    }
    case "paragraph":
      return <p {...data} {...editable} style={{ whiteSpace: "pre-line", ...style }}>{text}</p>;
    case "text":
      return <div {...data} {...editable} style={style}>{text}</div>;
    case "link": case "button": {
      const href = field?.type === "url" ? String(bound ?? "#") : el.href;
      return (
        <a {...data} {...editable} href={link(href)} target={!canvas && el.newTab ? "_blank" : undefined} rel={el.newTab ? "noreferrer" : undefined}
          onClick={canvas ? (e) => e.preventDefault() : undefined} style={style}>{field?.type === "url" ? el.text : text}</a>
      );
    }
    case "image": {
      const src = field ? (typeof bound === "string" ? bound : "") : el.src ?? "";
      if (!src || isEmpty(src)) {
        if (!canvas) return null;
        return (
          <div {...data} style={{ ...style, minHeight: "120px", background: "var(--surface-sunken)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-subtle)", fontSize: "14px" }}>
            {field ? `No ${field.name.toLowerCase()}` : "Image: choose one in Settings"}
          </div>
        );
      }
      return <img {...data} src={asset(src)} alt={el.alt ?? ""} style={style} draggable={false} />;
    }
    case "divider":
      return <div {...data} role="separator" style={style} />;
    case "collection": {
      const { collection, records } = listRecords(opts.base, el);
      const template = el.children?.[0];
      if (!collection || !template) return canvas ? <div {...data} style={{ ...style, ...placeholder, padding: "16px", color: "var(--ink-subtle)" }}>Choose a collection in Settings.</div> : null;
      if (!records.length) return canvas ? <div {...data} style={{ ...style, ...placeholder, padding: "16px", color: "var(--ink-subtle)" }}>No {collection.name.toLowerCase()} match this list&apos;s filter.</div> : null;
      const lookup = makeTitleLookup(opts.base);
      return (
        <div role="list" {...data} style={style}>
          {records.map((r) => <RenderElement key={r.id} el={template} opts={opts} ctx={{ collection, record: r, lookup }} />)}
        </div>
      );
    }
  }
}

const cache = new WeakMap<Base, (id: string) => string>();
function makeTitleLookup(base: Base) {
  let f = cache.get(base);
  if (!f) {
    const titles = new Map<string, string>();
    for (const c of base.collections) {
      const pf = c.fields.find((x) => x.id === c.primaryField);
      for (const r of c.records) titles.set(r.id, cellText(pf, r.values[c.primaryField]));
    }
    f = (id) => titles.get(id) ?? "";
    cache.set(base, f);
  }
  return f;
}
