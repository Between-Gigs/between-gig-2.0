"use client";
import { cx, useToast } from "@ds/components";
import { ChevronRight, GripVertical } from "lucide-react";
import * as React from "react";
import { accepts, cloneEl, contains, elementInfo, elementName, findEl, findParent, pathTo } from "@/lib/studio/pages";
import { useStudio } from "@/lib/studio/store";
import type { PageElement } from "@/lib/studio/types";
import { useUi } from "../context";
import { DRAG_MIME, useDesign, type DragItem } from "./context";
import { RenderElement } from "./render";

type Box = { top: number; left: number; width: number; height: number };
type Drop = { parentId: string; index: number; line?: Box; box?: Box };

/** The stage's content origin in viewport terms, so overlays inside it scroll with the page. */
const origin = (s: HTMLElement) => { const r = s.getBoundingClientRect(); return { top: r.top - s.scrollTop, left: r.left - s.scrollLeft }; };

const frames = { base: "w-full", tablet: "w-192", phone: "w-98" } as const;

/** Reads what's being dragged; dragover can't read dataTransfer contents, so the live drag state comes first. */
export function readDrag(e: React.DragEvent, live: DragItem | null): DragItem | null {
  if (live) return live;
  try { return JSON.parse(e.dataTransfer.getData(DRAG_MIME)) as DragItem; } catch { return null; }
}

/** Where a dragged element would land, from the pointer: inside a box, or before or after an element. */
export function dropAt(root: PageElement, frame: HTMLElement, origin: { top: number; left: number }, target: Element | null, x: number, y: number, drag: DragItem): Drop | null {
  const node = (id: string) => frame.querySelector<HTMLElement>(`[data-el="${id}"]`);
  const rel = (r: DOMRect): Box => ({ top: r.top - origin.top, left: r.left - origin.left, width: r.width, height: r.height });
  const moving = drag.kind === "move" ? findEl(root, drag.id) : null;
  const dragged: PageElement = moving ?? { id: "new", type: drag.kind === "new" ? drag.type : "div", styles: {} };
  let dom = target?.closest<HTMLElement>("[data-el]") ?? node(root.id);
  // Never drop an element into itself.
  while (dom && moving && contains(moving, dom.dataset.el!)) dom = dom.parentElement?.closest<HTMLElement>("[data-el]") ?? null;
  if (!dom) return null;
  let el = findEl(root, dom.dataset.el!);
  if (!el) return null;
  const r = dom.getBoundingClientRect();
  const edge = Math.min(12, r.height / 4);
  const inside = el.type === "body" || el.type === "item" || (elementInfo[el.type].container && y > r.top + edge && y < r.bottom - edge);

  if (inside && accepts(el, dragged)) {
    const kids = (el.children ?? []).filter((c) => c.id !== moving?.id);
    if (!kids.length) return { parentId: el.id, index: 0, box: rel(r) };
    for (let i = 0; i < kids.length; i++) {
      const k = node(kids[i].id);
      if (!k) continue;
      const kr = k.getBoundingClientRect();
      const before = y < kr.top ? true : y > kr.bottom ? false : x < kr.left + kr.width / 2 && kr.width < r.width * 0.8 ? true : y < kr.top + kr.height / 2;
      if (before) {
        const index = (el.children ?? []).findIndex((c) => c.id === kids[i].id);
        const row = kr.width < r.width * 0.8;
        return { parentId: el.id, index, line: row ? { top: kr.top - origin.top, left: kr.left - origin.left - 2, width: 3, height: kr.height } : { top: kr.top - origin.top - 2, left: kr.left - origin.left, width: kr.width, height: 3 } };
      }
    }
    const last = node(kids[kids.length - 1].id)!.getBoundingClientRect();
    return { parentId: el.id, index: el.children!.length, line: { top: last.bottom - origin.top - 1, left: last.left - origin.left, width: last.width, height: 3 } };
  }
  // Before or after this element, in its parent. Collection lists hold only their item, so go one level up.
  let at = findParent(root, el.id);
  while (at && !accepts(at.parent, dragged)) { el = at.parent; at = findParent(root, el.id); }
  if (!at) return null;
  const er = node(el.id)?.getBoundingClientRect() ?? r;
  const pr = node(at.parent.id)?.getBoundingClientRect();
  const row = !!pr && er.width < pr.width * 0.8;
  const after = row ? x > er.left + er.width / 2 : y > er.top + er.height / 2;
  const line = row
    ? { top: er.top - origin.top, left: (after ? er.right : er.left) - origin.left - 1, width: 3, height: er.height }
    : { top: (after ? er.bottom : er.top) - origin.top - 1, left: er.left - origin.left, width: er.width, height: 3 };
  return { parentId: at.parent.id, index: at.index + (after ? 1 : 0), line };
}

export function Canvas() {
  const ui = useUi();
  const d = useDesign();
  const { actions } = useStudio();
  const toast = useToast();
  const stage = React.useRef<HTMLDivElement>(null);
  const frame = React.useRef<HTMLDivElement>(null);
  const [sel, setSel] = React.useState<Box | null>(null);
  const [hover, setHover] = React.useState<Box | null>(null);
  const [drop, setDrop] = React.useState<Drop | null>(null);
  const clip = React.useRef<PageElement | null>(null);
  const root = d.page.root;
  const selected = d.selectedId ? findEl(root, d.selectedId) : null;
  const hovered = d.hoverId && d.hoverId !== d.selectedId ? findEl(root, d.hoverId) : null;

  const measure = React.useCallback(() => {
    const f = frame.current, s = stage.current;
    if (!f || !s) return;
    const o = origin(s);
    const box = (id: string | null) => {
      const n = id ? f.querySelector(`[data-el="${id}"]`) : null;
      if (!n) return null;
      const r = n.getBoundingClientRect();
      return { top: r.top - o.top, left: r.left - o.left, width: r.width, height: r.height };
    };
    setSel(box(d.selectedId));
    setHover(d.hoverId !== d.selectedId ? box(d.hoverId) : null);
  }, [d.selectedId, d.hoverId]);

  React.useLayoutEffect(() => { measure(); }, [measure, ui.base, d.bp, d.tick, d.editingId, d.page.id]);
  React.useEffect(() => {
    const f = frame.current;
    if (!f) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(f);
    // Pictures change size as they load.
    const onLoad = () => measure();
    f.addEventListener("load", onLoad, true);
    return () => { ro.disconnect(); f.removeEventListener("load", onLoad, true); };
  }, [measure]);

  const idAt = (t: EventTarget | null) => (t as Element | null)?.closest?.<HTMLElement>("[data-el]")?.dataset.el ?? null;

  const onKey = (e: React.KeyboardEvent) => {
    if (d.editingId || !selected) return;
    const mod = e.metaKey || e.ctrlKey;
    if (e.key === "Delete" || e.key === "Backspace") {
      if (selected.type === "body" || selected.type === "item") return;
      e.preventDefault();
      const parent = findParent(root, selected.id)?.parent.id ?? null;
      actions.deleteElement(d.page.id, selected.id);
      d.select(parent);
    } else if (mod && e.key.toLowerCase() === "d") {
      e.preventDefault();
      const id = actions.duplicateElement(d.page.id, selected.id);
      if (id) d.select(id);
    } else if (mod && e.key.toLowerCase() === "c") {
      if (selected.type === "body" || selected.type === "item") return;
      clip.current = structuredClone(selected);
      toast({ message: `Copied ${elementName(selected)}`, tone: "success" });
    } else if (mod && e.key.toLowerCase() === "v" && clip.current) {
      e.preventDefault();
      const copy = cloneEl(clip.current);
      const into = elementInfo[selected.type].container && accepts(selected, copy);
      const at = into ? { parentId: selected.id, index: selected.children?.length ?? 0 } : (() => { const p = findParent(root, selected.id); return p ? { parentId: p.parent.id, index: p.index + 1 } : null; })();
      if (!at) return;
      actions.change("Pasted an element", (b) => {
        const pg = b.pages.find((p) => p.id === d.page.id);
        const parent = pg && findEl(pg.root, at.parentId);
        if (parent) { parent.children ??= []; parent.children.splice(at.index, 0, copy); }
      });
      d.select(copy.id);
    } else if (e.key === "Escape") {
      d.select(findParent(root, selected.id)?.parent.id ?? null);
    } else if (e.key === "Enter" && ["heading", "paragraph", "text", "link", "button"].includes(selected.type) && !selected.bind) {
      e.preventDefault();
      d.setEditingId(selected.id);
    }
  };

  const tag = (el: PageElement, b: Box, strong: boolean) => {
    const below = b.top < 26;
    return (
      <div className={cx("pointer-events-none absolute z-raised", strong ? "border-2 border-info" : "border border-info")} style={{ top: b.top, left: b.left, width: b.width, height: b.height }}>
        <div className={cx("absolute left-0 flex items-center", below ? "top-full mt-0.5" : "bottom-full mb-0.5", strong && "pointer-events-auto")}>
          <span draggable={strong && el.type !== "body" && el.type !== "item"}
            onDragStart={(e) => { const item: DragItem = { kind: "move", id: el.id }; e.dataTransfer.setData(DRAG_MIME, JSON.stringify(item)); e.dataTransfer.setData("text/plain", elementName(el)); e.dataTransfer.effectAllowed = "move"; d.setDrag(item); }}
            onDragEnd={() => { d.setDrag(null); setDrop(null); }}
            title={strong ? "Drag to move" : undefined}
            className={cx("inline-flex h-5 items-center gap-1 rounded-xs px-1.5 text-caption whitespace-nowrap", strong ? "cursor-grab bg-info text-bg" : "bg-info/80 text-bg")}>
            {strong && el.type !== "body" && el.type !== "item" && <GripVertical className="size-3" aria-hidden="true" />}
            {elementName(el)}{el.cls ? <span className="opacity-80"> · .{el.cls}</span> : null}
          </span>
        </div>
      </div>
    );
  };

  const path = d.selectedId ? pathTo(root, d.selectedId) : [];
  const [coarse, setCoarse] = React.useState(false);
  React.useEffect(() => { setCoarse(window.matchMedia("(pointer: coarse)").matches); }, []); // eslint-disable-line react-hooks/set-state-in-effect

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <p className="border-b border-line bg-info-soft px-3 py-2 text-body-sm text-ink md:hidden">The Designer works best on a larger screen. You can still select, edit text and change styles here.</p>
      <div ref={stage} onScroll={() => d.remeasure()}
        className={cx("relative min-h-0 flex-1 overflow-auto bg-surface-sunken", d.bp !== "base" && "sm:px-6 sm:py-6")}>
        <div ref={frame} role="application" aria-label={`Canvas: ${d.page.name}`} tabIndex={0} onKeyDown={onKey}
          className={cx("relative mx-auto min-h-full max-w-full bg-bg shadow-md outline-none transition-[width] duration-slow", frames[d.bp])}
          onClick={(e) => { const id = idAt(e.target); if (d.editingId && id === d.editingId) return; if (d.editingId) d.setEditingId(null); d.select(id); }}
          onDoubleClick={(e) => { const id = idAt(e.target); const el = id ? findEl(root, id) : null; if (el && ["heading", "paragraph", "text", "link", "button"].includes(el.type) && !el.bind) d.setEditingId(el.id); }}
          onMouseMove={(e) => { if (!d.drag) { const id = idAt(e.target); if (id !== d.hoverId) d.setHover(id); } }}
          onMouseLeave={() => d.setHover(null)}
          onDragOver={(e) => {
            const item = readDrag(e, d.drag);
            if (!item || !frame.current || !stage.current) return;
            const at = dropAt(root, frame.current, origin(stage.current), e.target as Element, e.clientX, e.clientY, item);
            if (!at) { setDrop(null); return; }
            e.preventDefault();
            e.dataTransfer.dropEffect = item.kind === "new" ? "copy" : "move";
            setDrop(at);
          }}
          onDragLeave={(e) => { if (!frame.current?.contains(e.relatedTarget as Node)) setDrop(null); }}
          onDrop={(e) => {
            e.preventDefault();
            const item = readDrag(e, d.drag);
            const at = drop;
            setDrop(null); d.setDrag(null);
            if (!item || !at) return;
            if (item.kind === "new") d.select(actions.addElement(d.page.id, item.type, at.parentId, at.index));
            else { actions.moveElement(d.page.id, item.id, at.parentId, at.index); d.select(item.id); }
          }}>
          <RenderElement el={root} opts={{ base: ui.base, bp: d.bp, mode: "canvas", editingId: d.editingId, onTextCommit: (id, text) => { d.setEditingId(null); const el = findEl(root, id); if (el && el.text !== text) actions.updateElement(d.page.id, id, { text: text.trim() }, "Edited text"); } }} />
        </div>
        {hovered && hover && !d.drag && tag(hovered, hover, false)}
        {selected && sel && !d.editingId && !d.drag && tag(selected, sel, true)}
        {drop?.line && <div aria-hidden="true" className="pointer-events-none absolute z-raised rounded-full bg-info" style={drop.line} />}
        {drop?.box && <div aria-hidden="true" className="pointer-events-none absolute z-raised border-2 border-dashed border-info bg-info/10" style={drop.box} />}
      </div>
      {/* Webflow's breadcrumb: where the selection sits in the page. */}
      <nav aria-label="Selected element path" className={cx("flex h-8 shrink-0 items-center gap-0.5 border-t border-line bg-surface px-2", path.length ? "overflow-x-auto" : "overflow-hidden")}>
        {path.length ? path.map((el, i) => (
          <React.Fragment key={el.id}>
            {i > 0 && <ChevronRight className="size-3 shrink-0 text-ink-subtle" aria-hidden="true" />}
            <button type="button" onClick={() => d.select(el.id)} onMouseEnter={() => d.setHover(el.id)} onMouseLeave={() => d.setHover(null)}
              className={cx("inline-flex h-6 shrink-0 items-center rounded-xs px-1.5 text-caption whitespace-nowrap", el.id === d.selectedId ? "bg-info/15 text-ink" : "text-ink-muted hover:bg-surface-hover hover:text-ink")}>
              {elementName(el)}{el.cls ? ` .${el.cls}` : ""}
            </button>
          </React.Fragment>
        )) : <span className="truncate px-1.5 text-caption text-ink-subtle">{coarse ? "Tap anything to select it. Double-tap text to edit it." : "Click anything on the canvas to select it. Double-click text to edit it."}</span>}
      </nav>
    </div>
  );
}
