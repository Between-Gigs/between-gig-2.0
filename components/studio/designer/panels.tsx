"use client";
import { Button, ConfirmDialog, IconButton, Input, Menu, cx } from "@ds/components";
import {
  AppWindow, Box, ChevronDown, Ellipsis, ChevronRight, Columns2, Copy, Database, FileText, Heading, Home, Image as ImageIcon, Link, Minus, MousePointerClick,
  Pencil, Pilcrow, Plus, RectangleHorizontal, Square, SquareDashed, Trash2, Type,
} from "lucide-react";
import * as React from "react";
import { accepts, addable, elementInfo, elementName, findEl, findParent } from "@/lib/studio/pages";
import { useStudio } from "@/lib/studio/store";
import type { ElementType, PageElement } from "@/lib/studio/types";
import { useUi } from "../context";
import { DRAG_MIME, useDesign, type DragItem } from "./context";
import { readDrag } from "./Canvas";

export const elementIcons: Record<ElementType, React.ComponentType<{ className?: string }>> = {
  body: AppWindow, section: RectangleHorizontal, container: Box, div: Square, columns: Columns2, heading: Heading, paragraph: Pilcrow,
  text: Type, link: Link, button: MousePointerClick, image: ImageIcon, divider: Minus, collection: Database, item: SquareDashed,
};

function Head({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-line pr-2 pl-4">
      <h2 className="text-label-md text-ink">{title}</h2>
      {action}
    </div>
  );
}

/** Where a click-to-add element goes: into the selected box, else after the selected element, else at the end of the page. */
function placeFor(root: PageElement, selectedId: string | null, type: ElementType): { parentId: string; index: number } {
  const probe: PageElement = { id: "new", type, styles: {} };
  const sel = selectedId ? findEl(root, selectedId) : null;
  if (sel && elementInfo[sel.type].container && accepts(sel, probe)) return { parentId: sel.id, index: sel.children?.length ?? 0 };
  let cur = sel;
  while (cur) {
    const at = findParent(root, cur.id);
    if (!at) break;
    if (accepts(at.parent, probe)) return { parentId: at.parent.id, index: at.index + 1 };
    cur = at.parent;
  }
  return { parentId: root.id, index: root.children?.length ?? 0 };
}

/** Webflow's Add panel: drag a tile onto the canvas or the navigator, or click it to add it next to the selection. */
export function AddPanel() {
  const d = useDesign();
  const { actions } = useStudio();
  return (
    <>
      <Head title="Add elements" />
      <div className="grid content-start gap-4 overflow-y-auto p-3">
        <p className="text-body-sm text-ink-muted">Drag onto the canvas, or click to add next to what&apos;s selected.</p>
        {addable.map((g) => (
          <section key={g.group} className="grid gap-2">
            <h3 className="text-label-sm text-ink-muted">{g.group}</h3>
            <ul className="grid grid-cols-2 gap-1.5">
              {g.types.map((t) => {
                const Icon = elementIcons[t];
                return (
                  <li key={t}>
                    <button type="button" draggable title={elementInfo[t].hint}
                      onDragStart={(e) => { const item: DragItem = { kind: "new", type: t }; e.dataTransfer.setData(DRAG_MIME, JSON.stringify(item)); e.dataTransfer.setData("text/plain", elementInfo[t].label); e.dataTransfer.effectAllowed = "copy"; d.setDrag(item); }}
                      onDragEnd={() => d.setDrag(null)}
                      onClick={() => { const at = placeFor(d.page.root, d.selectedId, t); d.select(actions.addElement(d.page.id, t, at.parentId, at.index)); }}
                      className="grid h-18 w-full cursor-grab content-center justify-items-center gap-1.5 rounded-md border border-line bg-surface text-label-sm text-ink-muted transition-colors duration-fast hover:border-line-strong hover:bg-surface-hover hover:text-ink active:cursor-grabbing">
                      <Icon className="size-5" />
                      {elementInfo[t].label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}

/** The layer tree. Click to select, drag rows to reorder or nest, and the canvas highlights what you point at. */
export function NavigatorPanel() {
  const d = useDesign();
  const { actions } = useStudio();
  const [closed, setClosed] = React.useState<Set<string>>(new Set());
  const [over, setOver] = React.useState<{ id: string; where: "before" | "inside" | "after" } | null>(null);
  const root = d.page.root;

  const commit = (item: DragItem, target: PageElement, where: "before" | "inside" | "after") => {
    const probe: PageElement = item.kind === "move" ? findEl(root, item.id)! : { id: "new", type: item.type, styles: {} };
    let parentId: string, index: number;
    if (where === "inside" && accepts(target, probe)) { parentId = target.id; index = target.children?.length ?? 0; }
    else {
      const at = findParent(root, target.id);
      if (!at || !accepts(at.parent, probe)) return;
      parentId = at.parent.id; index = at.index + (where === "after" ? 1 : 0);
    }
    if (item.kind === "new") d.select(actions.addElement(d.page.id, item.type, parentId, index));
    else { actions.moveElement(d.page.id, item.id, parentId, index); d.select(item.id); }
  };

  const row = (el: PageElement, depth: number): React.ReactNode => {
    const Icon = elementIcons[el.type];
    const kids = el.children ?? [];
    const open = !closed.has(el.id);
    const on = d.selectedId === el.id;
    const mark = over?.id === el.id ? over.where : null;
    return (
      <li key={el.id} role="treeitem" aria-selected={on} aria-expanded={kids.length ? open : undefined}>
        <div draggable={el.type !== "body" && el.type !== "item"}
          onDragStart={(e) => { e.stopPropagation(); const item: DragItem = { kind: "move", id: el.id }; e.dataTransfer.setData(DRAG_MIME, JSON.stringify(item)); e.dataTransfer.setData("text/plain", elementName(el)); d.setDrag(item); }}
          onDragEnd={() => { d.setDrag(null); setOver(null); }}
          onDragOver={(e) => {
            const item = readDrag(e, d.drag);
            if (!item || (item.kind === "move" && (item.id === el.id || !!findEl(findEl(root, item.id)!, el.id)))) return;
            e.preventDefault(); e.stopPropagation();
            const r = e.currentTarget.getBoundingClientRect(), y = (e.clientY - r.top) / r.height;
            const where = elementInfo[el.type].container && y > 0.25 && y < 0.75 ? "inside" : y < 0.5 ? "before" : "after";
            setOver({ id: el.id, where: el.type === "body" ? "inside" : where });
          }}
          onDrop={(e) => { e.preventDefault(); e.stopPropagation(); const item = readDrag(e, d.drag); const m = over; setOver(null); d.setDrag(null); if (item && m) commit(item, el, m.where); }}
          onMouseEnter={() => d.setHover(el.id)} onMouseLeave={() => d.setHover(null)}
          className={cx("group relative flex h-8 items-center gap-1 rounded-xs pr-2 text-body-sm", on ? "bg-info/15 text-ink" : "text-ink-muted hover:bg-surface-hover hover:text-ink",
            mark === "inside" && "ring-2 ring-info ring-inset")}
          style={{ paddingLeft: `${4 + depth * 12}px` }}>
          {mark === "before" && <span aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5 bg-info" />}
          {mark === "after" && <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 bg-info" />}
          {kids.length ? (
            <button type="button" tabIndex={-1} aria-label={open ? `Collapse ${elementName(el)}` : `Expand ${elementName(el)}`} onClick={() => setClosed((s) => { const n = new Set(s); if (n.has(el.id)) n.delete(el.id); else n.add(el.id); return n; })}
              className="inline-flex size-5 shrink-0 items-center justify-center text-ink-subtle hover:text-ink">
              {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
            </button>
          ) : <span className="size-5 shrink-0" />}
          <button type="button" data-row={el.id} tabIndex={(d.selectedId ?? root.id) === el.id ? 0 : -1} onClick={() => d.select(el.id)} className="flex min-w-0 flex-1 items-center gap-1.5 rounded-xs text-left">
            <Icon className={cx("size-3.5 shrink-0", on ? "text-info" : el.bind ? "text-cat-5" : "text-ink-subtle")} />
            <span className="min-w-0 truncate">{elementName(el)}</span>
            {el.cls && <span className="min-w-0 shrink-3 truncate text-caption text-ink-subtle">.{el.cls}</span>}
          </button>
        </div>
        {kids.length > 0 && open && <ul role="group">{kids.map((k) => row(k, depth + 1))}</ul>}
      </li>
    );
  };

  return (
    <>
      <Head title="Navigator" />
      {/* One tab stop; arrows move through the tree, like a file list. */}
      <ul role="tree" aria-label={`Elements on ${d.page.name}`} className="min-h-0 flex-1 overflow-y-auto p-2" onKeyDown={(e) => {
        const rows = [...e.currentTarget.querySelectorAll<HTMLButtonElement>("[data-row]")];
        const i = rows.indexOf(document.activeElement as HTMLButtonElement);
        if (i < 0) return;
        const id = rows[i].dataset.row!;
        const go = (j: number) => { const r = rows[Math.max(0, Math.min(rows.length - 1, j))]; r.focus(); d.select(r.dataset.row!); };
        if (e.key === "ArrowDown") { e.preventDefault(); go(i + 1); }
        else if (e.key === "ArrowUp") { e.preventDefault(); go(i - 1); }
        else if (e.key === "Home") { e.preventDefault(); go(0); }
        else if (e.key === "End") { e.preventDefault(); go(rows.length - 1); }
        else if (e.key === "ArrowRight") { e.preventDefault(); if (closed.has(id)) setClosed((s) => { const n = new Set(s); n.delete(id); return n; }); else go(i + 1); }
        else if (e.key === "ArrowLeft") {
          e.preventDefault();
          const el = findEl(root, id);
          if (el?.children?.length && !closed.has(id)) setClosed((s) => new Set(s).add(id));
          else { const p = findParent(root, id)?.parent.id; const r = rows.find((x) => x.dataset.row === p); if (r) { r.focus(); d.select(p!); } }
        }
      }}>{row(root, 0)}</ul>
    </>
  );
}

/** Pages: switch, add, rename, duplicate and delete. */
export function PagesPanel() {
  const d = useDesign();
  const ui = useUi();
  const { actions } = useStudio();
  const [renaming, setRenaming] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState<string | null>(null);
  const victim = ui.base.pages.find((p) => p.id === deleting);
  return (
    <>
      <Head title="Pages" action={<IconButton size="sm" variant="ghost" label="New page" icon={<Plus />} onClick={() => { const id = actions.addPage(`Page ${ui.base.pages.length + 1}`); d.setPageId(id); setRenaming(id); }} />} />
      <ul className="grid content-start gap-0.5 overflow-y-auto p-2">
        {ui.base.pages.map((p) => {
          const on = p.id === d.page.id;
          return (
            <li key={p.id} className={cx("group flex min-h-10 items-center gap-2 rounded-md pr-1 pl-2", on ? "bg-surface-selected" : "hover:bg-surface-hover")}>
              {p.slug === "" ? <Home className="size-4 shrink-0 text-ink-subtle" aria-hidden="true" /> : <FileText className="size-4 shrink-0 text-ink-subtle" aria-hidden="true" />}
              {renaming === p.id ? (
                <Input size="sm" autoFocus defaultValue={p.name} aria-label="Page name" className="min-w-0 flex-1"
                  onBlur={(e) => { const n = e.target.value.trim(); if (n && n !== p.name) actions.updatePage(p.id, { name: n }); setRenaming(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setRenaming(null); }} />
              ) : (
                <button type="button" onClick={() => d.setPageId(p.id)} onDoubleClick={() => setRenaming(p.id)} aria-current={on ? "page" : undefined} className="grid min-w-0 flex-1 py-1 text-left">
                  <span className={cx("truncate text-body-sm text-ink", on && "font-semibold")}>{p.name}</span>
                  <span className="truncate text-caption text-ink-subtle">/{p.slug}</span>
                </button>
              )}
              <Menu align="end" trigger={<button type="button" aria-label={`${p.name} options`} className="inline-flex size-8 shrink-0 items-center justify-center rounded-xs text-ink-subtle hover:text-ink"><Ellipsis className="size-4" /></button>}
                items={[
                  { label: "Rename", icon: <Pencil />, onSelect: () => setRenaming(p.id) },
                  { label: "Duplicate", icon: <Copy />, onSelect: () => d.setPageId(actions.duplicatePage(p.id)) },
                  ...(p.slug === "" ? [] : [{ label: "Make home page", icon: <Home />, onSelect: () => actions.change("Changed the home page", (b) => { for (const x of b.pages) if (x.slug === "") x.slug = x.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "page"; const t = b.pages.find((x) => x.id === p.id); if (t) t.slug = ""; }) }]),
                  "separator",
                  { label: "Delete page", icon: <Trash2 />, danger: true, disabled: ui.base.pages.length < 2, onSelect: () => setDeleting(p.id) },
                ]} />
            </li>
          );
        })}
      </ul>
      <div className="mt-auto grid gap-2 border-t border-line p-3">
        <label className="grid gap-1.5"><span className="text-label-sm text-ink-muted">Address of {d.page.name}</span>
          <Input size="sm" key={d.page.id + d.page.slug} defaultValue={d.page.slug} disabled={d.page.slug === ""} placeholder="home" aria-describedby="slug-hint"
            onBlur={(e) => { const s = e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, ""); if (s && s !== d.page.slug && !ui.base.pages.some((x) => x.slug === s)) actions.updatePage(d.page.id, { slug: s }); }}
            start={<span className="text-body-sm text-ink-subtle">/</span>} />
          <span id="slug-hint" className="text-caption text-ink-subtle">{d.page.slug === "" ? "This is the home page." : "Letters, numbers and dashes."}</span>
        </label>
        <Button size="sm" variant="secondary" iconStart={<Plus />} onClick={() => { const id = actions.addPage(`Page ${ui.base.pages.length + 1}`); d.setPageId(id); setRenaming(id); }}>New page</Button>
      </div>
      <ConfirmDialog open={!!victim} onCancel={() => setDeleting(null)} tone="danger" confirmLabel="Delete page" title={`Delete ${victim?.name}?`}
        description="The page and everything on it goes. You can undo this."
        onConfirm={() => { const id = deleting!; actions.deletePage(id); setDeleting(null); const next = ui.base.pages.find((x) => x.id !== id); if (next) d.setPageId(next.id); }} />
    </>
  );
}
