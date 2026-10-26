"use client";
/*
 * The pages behind the pages: every Between Gigs page with the tooling that makes it. Design is the live page at a
 * breakpoint with its structure and styles; Data is the CMS collection it reads; Code is its source in the editor;
 * API is each data call, the route it becomes and the tables under it. The 3D build map stacks these behind each screen.
 */
import { Badge, EmptyState, Input, Skeleton, cx } from "@ds/components";
import { AppWindow, ArrowRight, Code2, Database, ExternalLink, Mail, Network, Search, UserRound } from "lucide-react";
import * as React from "react";
import { data } from "@/lib/data";
import { basePath } from "@/lib/site";
import { api, apiStateLabel, appPages, collectionFor, lanes, newTables, type AppPage } from "@/lib/studio/app-pages";
import type { Breakpoint } from "@/lib/studio/types";
import { SourceCode } from "../code/SourceCode";

export type AppTab = "design" | "data" | "code" | "api";
export const appTabs: { id: AppTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "design", label: "Design", icon: AppWindow },
  { id: "data", label: "Data", icon: Database },
  { id: "code", label: "Code", icon: Code2 },
  { id: "api", label: "API", icon: Network },
];

const laneTone: Record<AppPage["lane"], "brand" | "success" | "warning" | "info" | "neutral"> = { visitor: "brand", gigster: "success", owner: "warning", email: "info", tools: "neutral" };
const asLabel = (p: AppPage) => !p.as ? null : p.as.role === "owner" ? "the owner (sample)" : p.as.role === "invited" ? "a visitor with an invite (sample)" : `${p.as.id?.split("-")[0].replace(/^./, (c) => c.toUpperCase())} (sample Gigster)`;

/** Left panel: the site's pages, by who they're for. */
export function AppPagesPanel({ current, onOpen }: { current: string; onOpen: (id: string) => void }) {
  const [q, setQ] = React.useState("");
  const match = (p: AppPage) => !q || `${p.title} ${p.path}`.toLowerCase().includes(q.toLowerCase());
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-line p-3">
        <p className="mb-2 text-body-sm text-ink-muted">Every page of Between Gigs, with the design, data, code and API behind it.</p>
        <Input type="search" size="sm" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a page" aria-label="Find a page" start={<Search />} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
        {lanes.map((l) => {
          const list = appPages.filter((p) => p.lane === l.id && match(p));
          if (!list.length) return null;
          return (
            <section key={l.id} aria-label={l.name} className="mb-2">
              <h3 className="px-2 pt-2 pb-1 text-label-sm text-ink-subtle">{l.name} <span className="font-normal">· {l.sub}</span></h3>
              <ul className="grid gap-0.5">
                {list.map((p) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => onOpen(p.id)} aria-current={p.id === current ? "page" : undefined}
                      className={cx("grid w-full gap-0.5 rounded-md px-2 py-1.5 text-left", p.id === current ? "bg-info/15" : "hover:bg-surface-hover")}>
                      <span className={cx("truncate text-label-md", p.id === current ? "text-info" : "text-ink")}>{p.title}</span>
                      <span className="truncate font-mono text-data-sm text-ink-subtle">{p.path}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

/** The middle: the page's tabs and the tool for each. */
export function AppInspector({ page, tab, onTab, bp, renderData }: {
  page: AppPage; tab: AppTab; onTab: (t: AppTab) => void; bp: Breakpoint; renderData: (collectionId: string) => React.ReactNode;
}) {
  const collection = collectionFor(page);
  const counts: Partial<Record<AppTab, number>> = { code: page.files.length, api: page.calls.length };
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-2 border-b border-line px-3 pt-3 sm:px-4">
        <div className="grid min-w-0 gap-0.5 pb-2">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate font-display text-heading-md text-ink">{page.title}</h1>
            <Badge size="sm" tone={laneTone[page.lane]}>{lanes.find((l) => l.id === page.lane)?.name}</Badge>
          </div>
          <a href={`${basePath}${page.path}`} target="_blank" rel="noreferrer" className="inline-flex min-h-8 w-fit items-center gap-1 font-mono text-data-sm text-link hover:underline">
            {page.path}<ExternalLink className="size-3" aria-hidden="true" /><span className="sr-only"> (opens the live page in a new tab)</span>
          </a>
        </div>
        <div role="tablist" aria-label="Behind this page" className="ml-auto flex items-end gap-1">
          {appTabs.map((t) => {
            const TIcon = t.icon;
            return (
              <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => onTab(t.id)}
                className={cx("-mb-px inline-flex h-10 items-center gap-1.5 border-b-2 px-2.5 text-label-md transition-colors duration-fast",
                  tab === t.id ? "border-info text-ink" : "border-transparent text-ink-muted hover:text-ink")}>
                <TIcon className="size-4" />{t.label}
                {counts[t.id] !== undefined && <span className="rounded-full bg-surface-sunken px-1.5 text-caption text-ink-muted tabular-nums">{counts[t.id]}</span>}
              </button>
            );
          })}
        </div>
      </div>
      <div role="tabpanel" aria-label={appTabs.find((t) => t.id === tab)?.label} className="flex min-h-0 flex-1 flex-col">
        {tab === "design" ? <LivePage page={page} bp={bp} />
          : tab === "data" ? (collection ? renderData(collection) : (
            <div className="grid flex-1 place-items-center p-6"><EmptyState icon={<Database />} title="No CMS data on this page">Its words and pictures are part of the page itself. The API tab shows anything it sends.</EmptyState></div>
          ))
          : tab === "code" ? <SourceCode files={page.files} />
          : <ApiView page={page} />}
      </div>
    </div>
  );
}

/** Right panel: what the page is, at a glance. */
export function AppDetails({ page, onTab }: { page: AppPage; onTab: (t: AppTab) => void }) {
  const collection = collectionFor(page);
  return (
    <div className="grid content-start gap-5 overflow-y-auto p-4 text-body-sm">
      <p className="text-body-md text-ink">{page.text}</p>
      <dl className="grid gap-3">
        <div><dt className="text-label-sm text-ink-subtle">Route</dt><dd className="font-mono text-data-sm text-ink">{page.path}</dd></div>
        {page.as && <div><dt className="text-label-sm text-ink-subtle">Shown as</dt><dd className="flex items-center gap-1.5 text-ink"><UserRound className="size-3.5 text-ink-subtle" aria-hidden="true" />{asLabel(page)}</dd></div>}
        <div><dt className="text-label-sm text-ink-subtle">CMS collection</dt><dd className="text-ink">{collection ? <button type="button" className="text-link underline underline-offset-2" onClick={() => onTab("data")}>{collection[0].toUpperCase() + collection.slice(1)}</button> : "None"}</dd></div>
        <div><dt className="text-label-sm text-ink-subtle">Source</dt><dd><button type="button" className="text-link underline underline-offset-2" onClick={() => onTab("code")}>{page.files.length} file{page.files.length === 1 ? "" : "s"}</button></dd></div>
        <div><dt className="text-label-sm text-ink-subtle">Data calls</dt><dd>{page.calls.length ? <button type="button" className="text-link underline underline-offset-2" onClick={() => onTab("api")}>{page.calls.length} call{page.calls.length === 1 ? "" : "s"}</button> : <span className="text-ink">None: a static page</span>}</dd></div>
        {page.emails?.length ? (
          <div><dt className="text-label-sm text-ink-subtle">Emails it sends</dt>
            <dd className="mt-1 flex flex-wrap gap-1.5">{page.emails.map((m) => <a key={m} href={`${basePath}/emails/${m}/`} target="_blank" rel="noreferrer" className="inline-flex min-h-6 items-center gap-1 rounded-full bg-surface-sunken px-2 text-caption text-ink hover:bg-surface-hover"><Mail className="size-3" aria-hidden="true" />{m}</a>)}</dd></div>
        ) : null}
      </dl>
    </div>
  );
}

const frameWidth: Record<Breakpoint, number> = { base: 1440, tablet: 768, phone: 390 };

interface OutlineNode { el: Element; depth: number; kind: string; label: string }

/** Landmarks, sections, headings, forms and lists: the page's structure, the way the Navigator shows a Studio page. */
function outline(doc: Document): OutlineNode[] {
  const out: OutlineNode[] = [];
  const name = (el: Element) => (el.getAttribute("aria-label") || el.querySelector("h1,h2,h3")?.textContent || "").trim().replace(/\s+/g, " ").slice(0, 48);
  const kinds: Record<string, string> = { HEADER: "Header", NAV: "Navigation", MAIN: "Main", SECTION: "Section", ASIDE: "Aside", FOOTER: "Footer", FORM: "Form", ARTICLE: "Article", UL: "List", OL: "List", H1: "Heading 1", H2: "Heading 2", H3: "Heading 3" };
  const visit = (el: Element, depth: number) => {
    for (const c of Array.from(el.children)) {
      if (out.length > 160) return;
      if (c.closest("[aria-hidden=true], script, style, svg, [hidden]")) continue;
      const kind = c.getAttribute("role") === "dialog" ? "Dialog" : kinds[c.tagName];
      const r = c.getBoundingClientRect();
      if (kind && r.width > 0 && r.height > 0) {
        const label = c.tagName.startsWith("H") ? (c.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 48)
          : kind === "List" ? `${c.children.length} item${c.children.length === 1 ? "" : "s"}` : name(c);
        out.push({ el: c, depth, kind, label });
        if (!c.tagName.startsWith("H") && kind !== "List") visit(c, depth + 1);
      } else visit(c, depth);
    }
  };
  visit(doc.body, 0);
  return out;
}

function stylesOf(el: Element) {
  const s = getComputedStyle(el), r = el.getBoundingClientRect();
  const box = (p: string) => ["top", "right", "bottom", "left"].map((k) => s.getPropertyValue(`${p}-${k}`)).join(" ").replace(/^(\S+) \1 \1 \1$/, "$1");
  return [
    ["Size", `${Math.round(r.width)} × ${Math.round(r.height)}`],
    ["Display", s.display + (s.display.includes("grid") && s.gridTemplateColumns !== "none" ? ` · ${s.gridTemplateColumns.split(" ").length} columns` : "")],
    ["Font", `${s.fontFamily.split(",")[0].replace(/"/g, "")} ${s.fontWeight}`],
    ["Text", `${s.fontSize} / ${s.lineHeight}`],
    ["Colour", s.color],
    ["Background", s.backgroundColor],
    ["Padding", box("padding")],
    ["Margin", box("margin")],
    ...(s.gap !== "normal" ? [["Gap", s.gap]] : []),
  ] as [string, string][];
}

/** The real page in a frame at a breakpoint, with its structure beside it. Click a row to frame it on the page. */
function LivePage({ page, bp }: { page: AppPage; bp: Breakpoint }) {
  const holder = React.useRef<HTMLDivElement>(null);
  const frame = React.useRef<HTMLIFrameElement>(null);
  const [src, setSrc] = React.useState<string | null>(null);
  const [size, setSize] = React.useState({ w: 0, h: 0 });
  const [tree, setTree] = React.useState<OutlineNode[]>([]);
  const [sel, setSel] = React.useState<number | null>(null);

  // Sample mode: sign in as the person the page is for, then load it.
  React.useEffect(() => {
    let live = true;
    setSrc(null); setTree([]); setSel(null); // eslint-disable-line react-hooks/set-state-in-effect
    void (async () => {
      if (page.as && data.demo) await data.demo.signInAs(page.as.role, page.as.id);
      if (live) setSrc(`${basePath}${page.path}${page.path.includes("?") ? "&" : "?"}studio=1`);
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
  const scale = size.w ? Math.min(1, (size.w - 32) / W) : 1;

  const read = () => {
    const doc = frame.current?.contentDocument;
    if (!doc) return;
    if (!doc.getElementById("studio-hl")) {
      const st = doc.createElement("style"); st.id = "studio-hl";
      st.textContent = "[data-studio-hl]{outline:2px solid var(--info) !important;outline-offset:2px;border-radius:2px}[data-studio-hover]{outline:1px dashed var(--info) !important;outline-offset:2px}";
      doc.head.appendChild(st);
    }
    setTree(outline(doc));
  };
  // The page settles (data, fonts, images) after load; read the structure again shortly after.
  const onLoad = () => { read(); setTimeout(read, 900); };
  const mark = (attr: string, el: Element | null) => {
    frame.current?.contentDocument?.querySelectorAll(`[${attr}]`).forEach((x) => x.removeAttribute(attr));
    el?.setAttribute(attr, "");
  };
  const pick = (i: number) => { setSel(i); const el = tree[i]?.el; mark("data-studio-hl", el ?? null); el?.scrollIntoView({ block: "center", behavior: "smooth" }); };

  return (
    <div className="flex min-h-0 flex-1">
      <div ref={holder} className="relative min-w-0 flex-1 overflow-hidden bg-surface-sunken">
        {src && size.w > 0 ? (
          <div className="absolute top-4 left-1/2 overflow-hidden rounded-md bg-bg shadow-md"
            style={{ width: W * scale, height: size.h - 32, transform: "translateX(-50%)" }}>
            <iframe ref={frame} key={src} src={src} title={`${page.title}, live at ${W}px`} onLoad={onLoad}
              style={{ width: W, height: (size.h - 32) / scale, transform: `scale(${scale})`, transformOrigin: "0 0", border: 0 }} />
          </div>
        ) : <div className="p-6"><Skeleton shape="block" className="h-96" /></div>}
        <span className="absolute bottom-2 left-3 rounded-sm bg-surface/85 px-1.5 py-0.5 text-caption text-ink-muted tabular-nums">{W}px{scale < 1 ? ` · shown at ${Math.round(scale * 100)}%` : ""}</span>
      </div>
      <aside aria-label="Structure" className="hidden w-64 shrink-0 flex-col border-l border-line bg-surface lg:flex">
        <p className="border-b border-line px-3 py-2 text-label-md text-ink">Structure</p>
        <ul role="tree" aria-label="Page structure" className="min-h-0 flex-1 overflow-y-auto py-1">
          {!tree.length && <li className="px-3 py-2 text-body-sm text-ink-muted">Reading the page…</li>}
          {tree.map((n, i) => (
            <li key={i} role="treeitem" aria-selected={sel === i}>
              <button type="button" onClick={() => pick(i)} onMouseEnter={() => mark("data-studio-hover", n.el)} onMouseLeave={() => mark("data-studio-hover", null)}
                className={cx("flex h-7 w-full min-w-0 items-center gap-1.5 pr-2 text-left text-body-sm", sel === i ? "bg-info/15 text-info" : "text-ink hover:bg-surface-hover")}
                style={{ paddingLeft: 12 + n.depth * 12 }}>
                <span className={cx("shrink-0 text-label-sm", sel === i ? "text-info" : "text-ink-subtle")}>{n.kind}</span>
                <span className="min-w-0 truncate text-ink-muted">{n.label}</span>
              </button>
            </li>
          ))}
        </ul>
        {sel !== null && tree[sel] && (
          <div className="border-t border-line p-3">
            <p className="mb-2 text-label-md text-ink">Style · {tree[sel].kind}</p>
            <dl className="grid gap-1 text-caption">
              {stylesOf(tree[sel].el).map(([k, v]) => <div key={k} className="flex min-w-0 gap-3"><dt className="w-20 shrink-0 text-ink-subtle">{k}</dt><dd className="min-w-0 truncate font-mono text-ink" title={v}>{v}</dd></div>)}
            </dl>
          </div>
        )}
      </aside>
    </div>
  );
}

const stateTone = { build: "warning", live: "success", clerk: "info", sample: "neutral" } as const;

function ApiView({ page }: { page: AppPage }) {
  if (!page.calls.length) {
    return <div className="grid flex-1 place-items-center p-6"><EmptyState icon={<Network />} title="A static page">It makes no data calls, so there's nothing to build behind it.</EmptyState></div>;
  }
  return (
    <div tabIndex={0} role="region" aria-label="Data calls, routes and tables" className="min-h-0 flex-1 overflow-auto p-3 sm:p-4">
      <p className="mb-3 max-w-prose text-body-sm text-ink-muted">Each data call the page makes, the API route it becomes on the backend, and the tables underneath. Amber is still to build; green is live today.</p>
      <ul className="grid gap-2">
        {page.calls.map((c) => {
          const [route, tables, state] = api[c] ?? ["Not mapped yet", [], "sample"];
          return (
            <li key={c} className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-3 md:flex-row md:items-center [&>*:nth-child(odd)]:min-w-0 [&>*:nth-child(odd)]:flex-1">
              <code className="truncate font-mono text-data-sm text-ink" title={c}>{c}</code>
              <ArrowRight className="hidden size-4 text-ink-subtle md:block" aria-hidden="true" />
              <span className="flex min-w-0 items-center gap-2"><Badge size="sm" tone={stateTone[state]}>{apiStateLabel[state]}</Badge><code className="min-w-0 font-mono text-data-sm break-all text-ink-muted">{route}</code></span>
              <ArrowRight className="hidden size-4 text-ink-subtle md:block" aria-hidden="true" />
              <span className="flex flex-wrap gap-1">
                {tables.length ? tables.map((t) => (
                  <span key={t} className={cx("rounded-full px-2 py-0.5 font-mono text-caption", newTables.has(t) ? "bg-warning-soft text-ink" : "bg-surface-sunken text-ink-muted")}>{t}{newTables.has(t) ? " · new" : ""}</span>
                )) : <span className="text-caption text-ink-subtle">No tables</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
