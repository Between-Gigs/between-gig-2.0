"use client";
/*
 * Live site: every Between Gigs page with the tooling that makes it. Design is the real page in a device frame, with
 * its structure, click-to-inspect and computed styles; Data is the CMS collection it reads; Code is its source in the
 * editor; API is each data call, the route it becomes and the tables under it. The 3D build map stacks these behind
 * each screen. Pages open in a frame with its own sample session, so the browser's own sign-in never changes.
 */
import { Badge, Drawer, EmptyState, IconButton, Input, Skeleton, cx } from "@ds/components";
import {
  AppWindow, ArrowRight, Box, Check, Code2, Copy, Database, ExternalLink, FileInput, Heading, LayoutPanelTop, List, ListTree, Mail,
  Maximize, Minus, MousePointerClick, Navigation, Network, PanelBottom, PanelLeft, PanelTop, Plus, RefreshCw, Search, Square, Table2, UserRound,
} from "lucide-react";
import * as React from "react";
import { data } from "@/lib/data";
import { basePath } from "@/lib/site";
import { api, apiStateLabel, appPages, collectionFor, lanes, newTables, previewAs, previewLabel, type AppPage } from "@/lib/studio/app-pages";
import type { Breakpoint } from "@/lib/studio/types";
import { SourceCode } from "../code/SourceCode";

export type AppTab = "design" | "data" | "code" | "api";
export const appTabs: { id: AppTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "design", label: "Design", icon: AppWindow },
  { id: "data", label: "Data", icon: Database },
  { id: "code", label: "Code", icon: Code2 },
  { id: "api", label: "API", icon: Network },
];

/** Each audience's colour, from the system's accent palette. */
export const laneDot: Record<AppPage["lane"], string> = { visitor: "bg-cat-1", gigster: "bg-cat-3", owner: "bg-cat-6", email: "bg-cat-2", tools: "bg-cat-4" };
const laneName = (p: AppPage) => lanes.find((l) => l.id === p.lane)?.name ?? "";

/** Left panel: the site's pages, by who they're for. */
export function AppPagesPanel({ current, onOpen }: { current: string; onOpen: (id: string) => void }) {
  const [q, setQ] = React.useState("");
  const match = (p: AppPage) => !q || `${p.title} ${p.path}`.toLowerCase().includes(q.toLowerCase());
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="grid gap-2.5 border-b border-line p-3">
        <p className="text-body-sm text-ink-muted">The real Between Gigs pages, each with the design, data, code and API behind it.</p>
        <Input type="search" size="sm" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a page" aria-label="Find a page" start={<Search />} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-3">
        {lanes.map((l) => {
          const list = appPages.filter((p) => p.lane === l.id && match(p));
          if (!list.length) return null;
          return (
            <section key={l.id} aria-label={l.name} className="pt-3">
              <h3 className="flex items-center gap-2 px-2 pb-1.5 text-label-sm text-ink">
                <span aria-hidden="true" className={cx("size-2 rounded-full", laneDot[l.id])} />{l.name}
                <span className="font-normal text-ink-subtle">{l.sub}</span>
                <span className="ml-auto rounded-full bg-surface-sunken px-1.5 text-caption text-ink-muted tabular-nums">{list.length}</span>
              </h3>
              <ul className="grid gap-0.5">
                {list.map((p) => {
                  const on = p.id === current;
                  return (
                    <li key={p.id}>
                      <button type="button" onClick={() => onOpen(p.id)} aria-current={on ? "page" : undefined}
                        className={cx("group relative grid w-full gap-0.5 rounded-md py-1.5 pr-2 pl-4 text-left transition-colors duration-fast",
                          on ? "bg-info/12" : "hover:bg-surface-hover")}>
                        <span aria-hidden="true" className={cx("absolute top-2 bottom-2 left-1.5 w-0.5 rounded-full", on ? "bg-info" : "bg-transparent group-hover:bg-line-strong")} />
                        <span className={cx("truncate text-label-md", on ? "text-info" : "text-ink")}>{p.title}</span>
                        <span className="truncate font-mono text-data-sm text-ink-subtle">{p.path}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

/** The top bar's page picker for the Live site. */
export const appPageMenu = (current: string, onOpen: (id: string) => void) => lanes.flatMap((l) => [
  { heading: l.name },
  ...appPages.filter((p) => p.lane === l.id).map((p) => ({ label: p.title, description: p.path, checked: p.id === current, onSelect: () => onOpen(p.id) })),
]);

/** The middle: the page's tabs and the tool for each. */
export function AppInspector({ page, tab, onTab, bp, renderData }: {
  page: AppPage; tab: AppTab; onTab: (t: AppTab) => void; bp: Breakpoint; renderData: (collectionId: string) => React.ReactNode;
}) {
  const collection = collectionFor(page);
  const counts: Partial<Record<AppTab, number>> = { code: page.files.length, api: page.calls.length };
  const refs = React.useRef<Record<string, HTMLButtonElement | null>>({});
  const [copied, setCopied] = React.useState(false);
  // Tabs: one tab stop; arrows, Home and End move between them (WAI-ARIA tabs pattern).
  const onKey = (e: React.KeyboardEvent) => {
    const i = appTabs.findIndex((t) => t.id === tab);
    const n = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? appTabs.length - 1 : null;
    if (n === null) return;
    e.preventDefault();
    const next = appTabs[(n + appTabs.length) % appTabs.length];
    onTab(next.id); refs.current[next.id]?.focus();
  };
  const live = `${typeof window === "undefined" ? "" : window.location.origin}${basePath}${page.path}`;
  const copy = async () => { try { await navigator.clipboard.writeText(live); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* blocked */ } };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3 border-b border-line bg-surface px-3 pt-3 sm:px-5 sm:pt-4">
        <div className="grid min-w-0 gap-1 pb-3">
          <p className="flex items-center gap-2 text-label-sm text-ink-subtle">
            <span aria-hidden="true" className={cx("size-2 rounded-full", laneDot[page.lane])} />Live site · {laneName(page)}
          </p>
          <h1 className="truncate font-display text-heading-lg text-ink">{page.title}</h1>
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span className="inline-flex h-11 min-w-0 items-center gap-0.5 rounded-full border border-line bg-surface-sunken pr-0.5 pl-3 sm:h-8">
              <span className="truncate font-mono text-data-sm text-ink-muted">{page.path}</span>
              <button type="button" onClick={copy} aria-label={copied ? "Link copied" : "Copy the link"} title="Copy the link"
                className="inline-flex size-11 items-center justify-center rounded-full text-ink-subtle hover:bg-surface-hover hover:text-ink sm:size-8">
                {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
              </button>
              <a href={`${basePath}${page.path}`} target="_blank" rel="noreferrer" aria-label="Open the live page in a new tab" title="Open the live page"
                className="inline-flex size-11 items-center justify-center rounded-full text-ink-subtle hover:bg-surface-hover hover:text-ink sm:size-8"><ExternalLink className="size-3.5" /></a>
            </span>
            <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-surface-sunken px-3 text-caption text-ink-muted"><UserRound className="size-3.5" aria-hidden="true" />{previewLabel(page)}</span>
          </div>
        </div>
        <div role="tablist" aria-label="Behind this page" onKeyDown={onKey} className="ml-auto flex items-end gap-0.5 self-end">
          {appTabs.map((t) => {
            const TIcon = t.icon;
            const on = tab === t.id;
            return (
              <button key={t.id} ref={(n) => { refs.current[t.id] = n; }} id={`apptab-${t.id}`} type="button" role="tab" aria-selected={on} aria-controls="apptab-panel" tabIndex={on ? 0 : -1}
                onClick={() => onTab(t.id)}
                className={cx("relative inline-flex h-11 items-center gap-1.5 px-3 text-label-md transition-colors duration-fast",
                  on ? "text-ink after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-info" : "text-ink-muted hover:text-ink")}>
                <TIcon className={cx("size-4", on && "text-info")} />{t.label}
                {counts[t.id] !== undefined && <span className={cx("rounded-full px-1.5 text-caption tabular-nums", on ? "bg-info/15 text-info" : "bg-surface-sunken text-ink-muted")}>{counts[t.id]}</span>}
              </button>
            );
          })}
        </div>
      </div>
      <div role="tabpanel" id="apptab-panel" aria-labelledby={`apptab-${tab}`} className="flex min-h-0 flex-1 flex-col">
        {tab === "design" ? <LivePage page={page} bp={bp} />
          : tab === "data" ? (collection ? (
            <>
              <p className="flex flex-wrap items-center gap-2 border-b border-line bg-info-soft px-3 py-2 text-body-sm text-ink sm:px-5">
                <Database className="size-4 text-info" aria-hidden="true" /><span>This page reads the <strong className="font-semibold">{collection[0].toUpperCase() + collection.slice(1)}</strong> collection. Edits here change what it shows.</span>
              </p>
              {renderData(collection)}
            </>
          ) : (
            <div className="studio-canvas grid flex-1 place-items-center p-6">
              <div className="max-w-md rounded-xl border border-line bg-surface p-6 shadow-sm">
                <EmptyState icon={<Database />} title="No CMS data on this page">Its words and pictures are part of the page itself. The API tab shows anything it sends.</EmptyState>
              </div>
            </div>
          ))
          : tab === "code" ? <SourceCode files={page.files} />
          : <ApiView page={page} />}
      </div>
    </div>
  );
}

/** Right panel (API tab, or a page with no CMS data): what the page is, at a glance. */
export function AppDetails({ page, onTab }: { page: AppPage; onTab: (t: AppTab) => void }) {
  const collection = collectionFor(page);
  // Each row is a dt/dd pair (the icon sits in the dt), so the list reads properly in a screen reader.
  const row = (icon: React.ReactNode, label: string, value: React.ReactNode) => (
    <div className="grid grid-cols-1 gap-0.5 rounded-lg border border-line bg-surface p-3 pl-14 relative">
      <dt className="text-label-sm text-ink-subtle"><span aria-hidden="true" className="absolute top-3 left-3 grid size-8 place-items-center rounded-md bg-surface-sunken text-ink-brand">{icon}</span>{label}</dt>
      <dd className="min-w-0 text-body-sm text-ink">{value}</dd>
    </div>
  );
  const link = (t: AppTab, text: string) => <button type="button" className="text-link underline underline-offset-2" onClick={() => onTab(t)}>{text}</button>;
  return (
    <div className="grid content-start gap-4 overflow-y-auto p-4">
      <p className="text-body-md text-ink">{page.text}</p>
      <dl className="grid gap-2">
        {row(<UserRound className="size-4" />, "Shown as", previewLabel(page))}
        {row(<Database className="size-4" />, "CMS collection", collection ? link("data", collection[0].toUpperCase() + collection.slice(1)) : "None")}
        {row(<Code2 className="size-4" />, "Source", link("code", `${page.files.length} file${page.files.length === 1 ? "" : "s"}`))}
        {row(<Network className="size-4" />, "Data calls", page.calls.length ? link("api", `${page.calls.length} call${page.calls.length === 1 ? "" : "s"}`) : "None: a static page")}
        {page.emails?.length ? row(<Mail className="size-4" />, "Emails it sends", (
          <span className="mt-1 flex flex-wrap gap-1.5">{page.emails.map((m) => <a key={m} href={`${basePath}/emails/${m}/`} target="_blank" rel="noreferrer" className="inline-flex min-h-6 items-center rounded-full bg-surface-sunken px-2 text-caption text-ink hover:bg-surface-hover">{m}</a>)}</span>
        )) : null}
      </dl>
    </div>
  );
}

/* ——— Design: the page in a device frame ——— */

const frameWidth: Record<Breakpoint, number> = { base: 1440, tablet: 768, phone: 390 };
const ZOOMS = [0.25, 0.33, 0.5, 0.67, 0.75, 1];

interface OutlineNode { el: Element; depth: number; kind: string; label: string }

const kinds: Record<string, string> = { HEADER: "Header", NAV: "Navigation", MAIN: "Main", SECTION: "Section", ASIDE: "Aside", FOOTER: "Footer", FORM: "Form", ARTICLE: "Article", UL: "List", OL: "List", H1: "Heading 1", H2: "Heading 2", H3: "Heading 3" };
const kindIcon: Record<string, React.ComponentType<{ className?: string }>> = {
  Header: PanelTop, Footer: PanelBottom, Navigation: Navigation, Main: LayoutPanelTop, Section: Square, Aside: PanelLeft, Article: Square, Form: FileInput,
  List: List, Dialog: AppWindow, "Heading 1": Heading, "Heading 2": Heading, "Heading 3": Heading,
};

/** Readable text for a node: its label, its heading, or its words with spaces kept between the parts. */
const clean = (s: string) => s.replace(/\s*\n+\s*/g, " · ").replace(/\s+/g, " ").replace(/^( · )+|( · )+$/g, "").trim();
function labelOf(el: Element): string {
  const doc = el.ownerDocument;
  const lab = el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")?.split(" ").map((id) => doc.getElementById(id)?.textContent ?? "").join(" ");
  if (lab) return clean(lab);
  const h = el.querySelector("h1,h2,h3") as HTMLElement | null;
  return clean(h?.innerText ?? (el as HTMLElement).innerText ?? "");
}

/** Landmarks, sections, headings, forms and lists: the page's structure, the way the Navigator shows a Studio page. */
function outline(doc: Document): OutlineNode[] {
  const out: OutlineNode[] = [];
  const visit = (el: Element, depth: number) => {
    for (const c of Array.from(el.children)) {
      if (out.length > 200) return;
      if (c.closest("[aria-hidden=true], script, style, svg, [hidden]")) continue;
      const kind = c.getAttribute("role") === "dialog" ? "Dialog" : kinds[c.tagName];
      const r = c.getBoundingClientRect();
      if (kind && r.width > 0 && r.height > 0) {
        const label = kind === "List" ? `${c.children.length} item${c.children.length === 1 ? "" : "s"}` : labelOf(c);
        out.push({ el: c, depth, kind, label: label.slice(0, 60) });
        if (!c.tagName.startsWith("H") && kind !== "List") visit(c, depth + 1);
      } else visit(c, depth);
    }
  };
  visit(doc.body, 0);
  return out;
}

/** What a clicked element is, in plain words. */
function describe(el: Element): string {
  const t = el.tagName;
  if (kinds[t]) return kinds[t];
  return ({ A: "Link", BUTTON: "Button", IMG: "Image", P: "Paragraph", SPAN: "Text", INPUT: "Field", TEXTAREA: "Text box", SELECT: "Menu", LABEL: "Label", LI: "List item", H4: "Heading 4", H5: "Heading 5", H6: "Heading 6", svg: "Icon", SVG: "Icon", FIGURE: "Figure", TABLE: "Table", DL: "Details" } as Record<string, string>)[t] ?? "Box";
}

function LivePage({ page, bp }: { page: AppPage; bp: Breakpoint }) {
  const holder = React.useRef<HTMLDivElement>(null);
  const frame = React.useRef<HTMLIFrameElement>(null);
  const [src, setSrc] = React.useState<string | null>(null);
  const [nonce, setNonce] = React.useState(0);
  const [size, setSize] = React.useState({ w: 0, h: 0 });
  const [tree, setTree] = React.useState<OutlineNode[]>([]);
  const [sel, setSel] = React.useState<Element | null>(null);
  const [zoom, setZoom] = React.useState<"fit" | number>("fit");
  const [inspect, setInspect] = React.useState(true);
  const [drawer, setDrawer] = React.useState(false);
  const inspectRef = React.useRef(inspect);
  React.useEffect(() => { inspectRef.current = inspect; if (!inspect) mark("data-studio-hover", null); }, [inspect]);

  // The frame gets its own sample session (its name says who), so the browser's own sign-in stays as it was.
  React.useEffect(() => {
    let live = true;
    setSrc(null); setTree([]); setSel(null); // eslint-disable-line react-hooks/set-state-in-effect
    void (async () => {
      if (page.as?.role === "invited") await data.demo?.rearmInvite();
      if (live) setSrc(`${basePath}${page.path}`);
    })();
    return () => { live = false; };
  }, [page]);

  React.useEffect(() => {
    const el = holder.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const W = frameWidth[bp];
  const pad = 32, chrome = bp === "phone" ? 28 : 40;
  const fit = size.w ? Math.min(1, (size.w - pad * 2) / W) : 1;
  const scale = zoom === "fit" ? fit : zoom;
  const frameH = Math.max(240, size.h - pad * 2 - chrome - 56);

  const mark = (attr: string, el: Element | null) => {
    frame.current?.contentDocument?.querySelectorAll(`[${attr}]`).forEach((x) => x.removeAttribute(attr));
    el?.setAttribute(attr, "");
  };
  const select = React.useCallback((el: Element | null, scroll = true) => {
    setSel(el); mark("data-studio-hl", el);
    if (el && scroll) el.scrollIntoView({ block: "center", behavior: "smooth" });
  }, []);

  const read = () => {
    const doc = frame.current?.contentDocument;
    if (!doc?.body) return;
    if (!doc.getElementById("studio-hl")) {
      const st = doc.createElement("style"); st.id = "studio-hl";
      st.textContent = "[data-studio-hl]{outline:2px solid var(--info) !important;outline-offset:2px}[data-studio-hover]{outline:1px dashed var(--info) !important;outline-offset:2px;cursor:crosshair !important}";
      doc.head.appendChild(st);
      // Inspect: hover outlines, click selects (and doesn't follow links or press buttons).
      // The frame's elements belong to its own window, so check the node type rather than instanceof Element.
      const isEl = (t: EventTarget | null): t is Element => !!t && (t as Node).nodeType === 1;
      doc.addEventListener("mouseover", (e) => { if (inspectRef.current && isEl(e.target)) mark("data-studio-hover", e.target); }, true);
      doc.addEventListener("mouseout", () => { if (inspectRef.current) mark("data-studio-hover", null); }, true);
      doc.addEventListener("click", (e) => {
        if (!inspectRef.current || !isEl(e.target)) return;
        e.preventDefault(); e.stopPropagation(); select(e.target, false);
      }, true);
    }
    setTree(outline(doc));
  };
  // The page settles (data, fonts, images) after load; read the structure again shortly after.
  const onLoad = () => { read(); setTimeout(read, 900); };

  const selIndex = React.useMemo(() => {
    if (!sel) return -1;
    for (let el: Element | null = sel; el; el = el.parentElement) { const i = tree.findIndex((n) => n.el === el); if (i >= 0) return i; }
    return -1;
  }, [sel, tree]);

  const zoomStep = (dir: 1 | -1) => {
    const cur = scale;
    const next = dir > 0 ? ZOOMS.find((z) => z > cur + 0.001) : [...ZOOMS].reverse().find((z) => z < cur - 0.001);
    if (next) setZoom(next);
  };

  const structure = <StructurePanel tree={tree} selIndex={selIndex} sel={sel} onPick={(i) => select(tree[i]?.el ?? null)} onHover={(el) => mark("data-studio-hover", el)} />;
  const who = previewLabel(page);

  return (
    <div className="flex min-h-0 flex-1">
      <div className="relative min-w-0 flex-1">
      <div ref={holder} className="studio-canvas absolute inset-0 overflow-auto">
        {src && size.w > 0 ? (
          <div className="mx-auto" style={{ width: W * scale + pad * 2, padding: pad }}>
            <div className={cx("overflow-hidden bg-bg shadow-lg ring-1 ring-line", bp === "phone" ? "rounded-3xl border-8 border-forest-950" : "rounded-xl")}>
              {/* Browser chrome: the address and who the page is shown as. */}
              {bp === "phone" ? (
                <div className="flex items-center justify-center bg-forest-950 pb-1.5" style={{ height: chrome - 8 }}>
                  <span className="h-1.5 w-16 rounded-full bg-forest-700" aria-hidden="true" />
                </div>
              ) : (
                <div className="flex items-center gap-3 border-b border-line bg-surface px-3" style={{ height: chrome }}>
                  <span className="flex gap-1.5" aria-hidden="true"><span className="size-2.5 rounded-full bg-danger/70" /><span className="size-2.5 rounded-full bg-warning/80" /><span className="size-2.5 rounded-full bg-success/70" /></span>
                  <span className="flex min-w-0 flex-1 items-center gap-1.5 rounded-full bg-surface-sunken px-3 py-1 font-mono text-data-sm text-ink-muted">
                    <span className="truncate">between-gigs{page.path}</span>
                  </span>
                  <span className="hidden shrink-0 items-center gap-1 text-caption text-ink-subtle sm:inline-flex"><UserRound className="size-3.5" aria-hidden="true" />{who}</span>
                </div>
              )}
              <div style={{ width: W * scale, height: frameH }} className="overflow-hidden">
                <iframe ref={frame} key={`${src}-${nonce}`} name={`bg-preview:${previewAs(page)}`} src={src} title={`${page.title}, live at ${W}px, shown as ${who}`} onLoad={onLoad}
                  style={{ width: W, height: frameH / scale, transform: `scale(${scale})`, transformOrigin: "0 0", border: 0, display: "block" }} />
              </div>
            </div>
          </div>
        ) : <div className="p-8"><Skeleton shape="block" className="mx-auto h-96 max-w-4xl rounded-xl" /></div>}
      </div>

        {/* The canvas toolbar, floating at the bottom like a design tool's. */}
        <div role="toolbar" aria-label="Canvas" className="absolute bottom-4 left-1/2 z-raised flex max-w-full -translate-x-1/2 items-center gap-0.5 rounded-full border border-line bg-surface/95 p-1 shadow-lg backdrop-blur-sm">
          <IconButton size="sm" variant="ghost" label={inspect ? "Inspect is on: click the page to select" : "Inspect is off: the page works as normal"} icon={<MousePointerClick />} pressed={inspect} onClick={() => setInspect((x) => !x)} className="rounded-full" />
          <span aria-hidden="true" className="mx-0.5 h-5 w-px bg-line" />
          <IconButton size="sm" variant="ghost" label="Zoom out" icon={<Minus />} onClick={() => zoomStep(-1)} disabled={scale <= ZOOMS[0] + 0.001} className="rounded-full" />
          <button type="button" onClick={() => setZoom("fit")} title="Fit to the canvas" className="h-8 min-w-14 rounded-full px-2 text-label-sm whitespace-nowrap text-ink tabular-nums hover:bg-surface-hover">
            {zoom === "fit" ? `Fit ${Math.round(scale * 100)}%` : `${Math.round(scale * 100)}%`}
          </button>
          <IconButton size="sm" variant="ghost" label="Zoom in" icon={<Plus />} onClick={() => zoomStep(1)} disabled={scale >= 1} className="rounded-full" />
          <span className="hidden sm:inline-flex"><IconButton size="sm" variant="ghost" label="Actual size" icon={<Maximize />} onClick={() => setZoom(1)} pressed={zoom === 1} className="rounded-full" /></span>
          <span aria-hidden="true" className="mx-0.5 hidden h-5 w-px bg-line sm:block" />
          <span className="hidden px-2 text-caption text-ink-muted tabular-nums sm:inline">{W}px</span>
          <IconButton size="sm" variant="ghost" label="Reload the page" icon={<RefreshCw />} onClick={() => setNonce((n) => n + 1)} className="rounded-full" />
          <span className="lg:hidden"><IconButton size="sm" variant="ghost" label="Structure and style" icon={<ListTree />} onClick={() => setDrawer(true)} className="rounded-full" /></span>
        </div>
      </div>
      <aside aria-label="Structure" className="hidden w-72 shrink-0 flex-col border-l border-line bg-surface lg:flex">{structure}</aside>
      <Drawer side="right" open={drawer} onClose={() => setDrawer(false)} title="Structure and style">
        {drawer && <div className="-mx-5 -mt-2 flex min-h-0 flex-col">{structure}</div>}
      </Drawer>
    </div>
  );
}

/** The structure tree (one tab stop, arrows to move) and the selected element's style. */
function StructurePanel({ tree, selIndex, sel, onPick, onHover }: {
  tree: OutlineNode[]; selIndex: number; sel: Element | null; onPick: (i: number) => void; onHover: (el: Element | null) => void;
}) {
  const [focus, setFocus] = React.useState(0);
  const rows = React.useRef<(HTMLButtonElement | null)[]>([]);
  React.useEffect(() => { if (selIndex >= 0) { setFocus(selIndex); rows.current[selIndex]?.scrollIntoView({ block: "nearest" }); } }, [selIndex]); // eslint-disable-line react-hooks/set-state-in-effect
  const onKey = (e: React.KeyboardEvent) => {
    const n = e.key === "ArrowDown" ? focus + 1 : e.key === "ArrowUp" ? focus - 1 : e.key === "Home" ? 0 : e.key === "End" ? tree.length - 1 : null;
    if (n === null) return;
    e.preventDefault();
    const i = Math.max(0, Math.min(tree.length - 1, n));
    setFocus(i); rows.current[i]?.focus();
  };
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <p className="flex items-center gap-2 border-b border-line px-3 py-2.5 text-label-md text-ink">
        <ListTree className="size-4 text-ink-subtle" aria-hidden="true" />Structure
        <span className="ml-auto text-caption text-ink-subtle tabular-nums">{tree.length || ""}</span>
      </p>
      <ul role="tree" aria-label="Page structure" onKeyDown={onKey} className="min-h-0 flex-1 overflow-y-auto py-1.5">
        {!tree.length && Array.from({ length: 8 }, (_, i) => <li key={i} role="none" className="px-3 py-1.5"><Skeleton className={cx("h-3.5", ["w-4/5", "w-3/5", "w-1/2"][i % 3])} /></li>)}
        {tree.map((n, i) => {
          const KIcon = kindIcon[n.kind] ?? Box;
          const on = selIndex === i;
          return (
            <li key={i} role="none">
              <button ref={(b) => { rows.current[i] = b; }} type="button" role="treeitem" aria-level={n.depth + 1} aria-selected={on} tabIndex={i === focus ? 0 : -1}
                onClick={() => { setFocus(i); onPick(i); }} onMouseEnter={() => onHover(n.el)} onMouseLeave={() => onHover(null)}
                className={cx("relative flex h-8 w-full min-w-0 items-center gap-2 pr-3 text-left text-body-sm transition-colors duration-fast",
                  on ? "bg-info/12 text-info" : "text-ink hover:bg-surface-hover")}
                style={{ paddingLeft: 12 + n.depth * 14 }}>
                {Array.from({ length: n.depth }, (_, d) => <span key={d} aria-hidden="true" className="absolute top-0 bottom-0 w-px bg-line" style={{ left: 18 + d * 14 }} />)}
                <KIcon className={cx("size-3.5 shrink-0", on ? "text-info" : "text-ink-subtle")} />
                <span className={cx("shrink-0 text-label-sm", on ? "text-info" : "text-ink")}>{n.kind}</span>
                <span className="min-w-0 truncate text-ink-muted">{n.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {sel && <StyleCard el={sel} />}
    </div>
  );
}

/** The selected element's computed style: size, type, colour swatches and a box model. */
function StyleCard({ el }: { el: Element }) {
  const s = getComputedStyle(el), r = el.getBoundingClientRect();
  const sides = (p: string) => ["top", "right", "bottom", "left"].map((k) => Math.round(parseFloat(s.getPropertyValue(`${p}-${k}`)) || 0));
  const [mt, mr, mb, ml] = sides("margin"), [pt, pr, pb, pl] = sides("padding");
  const swatch = (label: string, v: string) => (
    <div className="flex min-w-0 items-center gap-2">
      <span aria-hidden="true" className="size-4 shrink-0 rounded-sm ring-1 ring-line" style={{ background: v }} />
      <span className="text-ink-subtle">{label}</span><span className="min-w-0 truncate font-mono text-ink" title={v}>{/^rgba\(\d+, \d+, \d+, 0\)$/.test(v) || v === "transparent" ? "none" : v}</span>
    </div>
  );
  const cls = (el.getAttribute("class") ?? "").split(/\s+/).filter(Boolean);
  return (
    <div className="grid max-h-80 gap-3 overflow-y-auto border-t border-line bg-surface-sunken/60 p-3 text-caption">
      <div className="flex min-w-0 items-baseline gap-2">
        <span className="text-label-md text-ink">{describe(el)}</span>
        <code className="min-w-0 truncate font-mono text-data-sm text-ink-subtle">&lt;{el.tagName.toLowerCase()}&gt; · {Math.round(r.width)} × {Math.round(r.height)}</code>
      </div>
      <div className="grid gap-1.5">
        <div className="flex gap-2"><span className="w-16 shrink-0 text-ink-subtle">Font</span><span className="min-w-0 truncate font-mono text-ink">{s.fontFamily.split(",")[0].replace(/"/g, "")} {s.fontWeight}</span></div>
        <div className="flex gap-2"><span className="w-16 shrink-0 text-ink-subtle">Text</span><span className="font-mono text-ink">{s.fontSize} / {s.lineHeight}</span></div>
        <div className="flex gap-2"><span className="w-16 shrink-0 text-ink-subtle">Layout</span><span className="font-mono text-ink">{s.display}{s.display.includes("grid") && s.gridTemplateColumns !== "none" ? ` · ${s.gridTemplateColumns.split(" ").length} cols` : ""}{s.gap !== "normal" ? ` · gap ${s.gap}` : ""}</span></div>
        {swatch("Colour", s.color)}
        {swatch("Fill", s.backgroundColor)}
      </div>
      {/* Box model: margin outside, padding inside, the element's size in the middle. */}
      <div className="rounded-md border border-dashed border-warning/60 bg-warning-soft/40 p-1.5 text-center font-mono text-data-sm text-ink-muted" aria-label={`Margin ${mt} ${mr} ${mb} ${ml}, padding ${pt} ${pr} ${pb} ${pl}`}>
        <div className="flex justify-between px-1"><span className="text-ink-subtle">margin</span><span>{mt}</span><span /></div>
        <div className="flex items-center gap-1"><span className="w-6">{ml}</span>
          <div className="flex-1 rounded-sm border border-success/50 bg-success-soft/50 p-1.5">
            <div className="flex justify-between px-1"><span className="text-ink-subtle">padding</span><span>{pt}</span><span /></div>
            <div className="flex items-center gap-1"><span className="w-6">{pl}</span><div className="flex-1 rounded-sm bg-info/15 py-1 text-ink">{Math.round(r.width)} × {Math.round(r.height)}</div><span className="w-6">{pr}</span></div>
            <div>{pb}</div>
          </div>
          <span className="w-6">{mr}</span></div>
        <div>{mb}</div>
      </div>
      {cls.length > 0 && <p className="line-clamp-3 font-mono text-data-sm text-ink-subtle" title={cls.join(" ")}>{cls.map((c) => `.${c}`).join(" ")}</p>}
    </div>
  );
}

/* ——— API: calls → routes → tables ——— */

const stateTone = { build: "warning", live: "success", clerk: "info", sample: "neutral" } as const;
/** A route that wraps at its slashes, never mid-word. */
const breakable = (route: string) => route.split("/").map((part, i, all) => <React.Fragment key={i}>{part}{i < all.length - 1 && <>/<wbr /></>}</React.Fragment>);

function ApiView({ page }: { page: AppPage }) {
  if (!page.calls.length) {
    return (
      <div className="studio-canvas grid flex-1 place-items-center p-6">
        <div className="max-w-md rounded-xl border border-line bg-surface p-6 shadow-sm">
          <EmptyState icon={<Network />} title="A static page">It makes no data calls, so there&apos;s nothing to build behind it.</EmptyState>
        </div>
      </div>
    );
  }
  const rows = page.calls.map((c) => ({ c, def: api[c] ?? ["Not mapped yet", [], "sample"] as const }));
  const tables = [...new Set(rows.flatMap((r) => r.def[1]))];
  const toBuild = rows.filter((r) => r.def[2] === "build").length;
  const stat = (n: number, label: string, tone: string) => (
    <div className="grid gap-0.5 rounded-lg border border-line bg-surface px-4 py-3"><span className={cx("font-display text-heading-lg tabular-nums", tone)}>{n}</span><span className="text-body-sm text-ink-muted">{label}</span></div>
  );
  return (
    <div tabIndex={0} role="region" aria-label="Data calls, routes and tables" className="studio-canvas min-h-0 flex-1 overflow-auto p-3 sm:p-5">
      <div className="mx-auto grid max-w-5xl gap-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {stat(rows.length, `data call${rows.length === 1 ? "" : "s"}`, "text-ink")}
          {stat(toBuild, "routes to build", toBuild ? "text-warning" : "text-ink")}
          {stat(rows.length - toBuild, "live or handled", "text-success")}
          {stat(tables.filter((t) => newTables.has(t)).length, `new table${tables.filter((t) => newTables.has(t)).length === 1 ? "" : "s"}`, "text-ink")}
        </div>
        <div className="hidden grid-cols-3 gap-4 px-4 text-label-sm text-ink-subtle md:grid"><span>Data call in the page</span><span>API route on the backend</span><span>Tables underneath</span></div>
        <ul className="grid gap-2">
          {rows.map(({ c, def: [route, tbls, state] }) => (
            <li key={c} className="grid gap-3 rounded-xl border border-line bg-surface p-4 shadow-xs md:grid-cols-3 md:items-center md:gap-4">
              <span className="flex min-w-0 items-center gap-2"><span className="grid size-7 shrink-0 place-items-center rounded-md bg-surface-sunken text-ink-brand"><Code2 className="size-3.5" aria-hidden="true" /></span><code className="min-w-0 font-mono text-data-sm break-words text-ink">{c}</code></span>
              <span className="relative grid min-w-0 gap-1.5 md:before:absolute md:before:top-1/2 md:before:-left-4 md:before:h-px md:before:w-3 md:before:bg-line-strong">
                <Badge size="sm" tone={stateTone[state]} className="w-fit">{apiStateLabel[state]}</Badge>
                <code className="min-w-0 font-mono text-data-sm text-ink-muted">{breakable(route)}</code>
              </span>
              <span className="relative flex flex-wrap gap-1 md:before:absolute md:before:top-1/2 md:before:-left-4 md:before:h-px md:before:w-3 md:before:bg-line-strong">
                {tbls.length ? tbls.map((t) => (
                  <span key={t} className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-caption", newTables.has(t) ? "bg-warning-soft text-ink" : "bg-surface-sunken text-ink-muted")}>
                    <Table2 className="size-3" aria-hidden="true" />{t}{newTables.has(t) && <span className="font-sans text-ink-subtle">new</span>}
                  </span>
                )) : <span className="text-caption text-ink-subtle">No tables</span>}
              </span>
            </li>
          ))}
        </ul>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm text-ink-muted">
          <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-warning" aria-hidden="true" />To build: the backend route doesn&apos;t exist yet</span>
          <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-success" aria-hidden="true" />Live today</span>
          <span className="inline-flex items-center gap-1.5"><ArrowRight className="size-3" aria-hidden="true" />Amber tables are new</span>
        </p>
      </div>
    </div>
  );
}
