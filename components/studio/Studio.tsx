"use client";
/*
 * Studio: a no-code site designer and content manager for Between Gigs, built to become its own service. The frame
 * follows Webflow so it feels familiar: a left tool bar (Add, Navigator, Pages, CMS, Assets, Settings) with flyout
 * panels, the canvas in the middle with breakpoints, and a Style / Settings panel on the right. The CMS works like
 * Airtable: collections with Table, Gallery, Kanban, List and Calendar views.
 */
import { Badge, Button, Drawer, IconButton, Logo, Menu, Modal, SegmentedControl, Skeleton, ThemeToggle, cx } from "@ds/components";
import {
  AppWindow, Check, ChevronDown, CloudCheck, Code2, Database, Eye, EyeOff, FileText, Globe, Images, Layers, Menu as MenuIcon, Monitor, PanelRight, Plus,
  Redo2, Rocket, Settings, Share2, Smartphone, Tablet, Undo2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { breakpoints, findEl } from "@/lib/studio/pages";
import { viewRecords } from "@/lib/studio/query";
import { StudioProvider, useStudio } from "@/lib/studio/store";
import type { Breakpoint, CellValue } from "@/lib/studio/types";
import { basePath } from "@/lib/site";
import { appPages, collectionFor } from "@/lib/studio/app-pages";
import { makeLookup } from "./cells";
import { PageCode } from "./code/PageCode";
import { UiContext, type InspectorMode, type UiState } from "./context";
import { Canvas } from "./designer/Canvas";
import { DesignContext, type DesignState, type DragItem } from "./designer/context";
import { AddPanel, NavigatorPanel, PagesPanel } from "./designer/panels";
import { RenderElement } from "./designer/render";
import { SettingsPanel } from "./designer/SettingsPanel";
import { StylePanel } from "./designer/StylePanel";
import { AddFieldDialog } from "./dialogs";
import { InspectorBody } from "./Inspector";
import { AppDetails, AppInspector, AppPagesPanel, appTabs, type AppTab } from "./inspect/AppInspector";
import { PanelBody } from "./Navigator";
import { Toolbar, ViewTabs } from "./Toolbar";
import { collectionIcons } from "./ui";
import { CalendarView } from "./views/CalendarView";
import { GalleryView, KanbanView, ListView } from "./views/CardViews";
import { GridView } from "./views/GridView";

export function Studio() {
  return (
    <StudioProvider>
      <Shell />
    </StudioProvider>
  );
}

const PLACE = "studio-place";

type Tool = "add" | "navigator" | "pages" | "cms" | "site" | "code" | "assets" | "settings";
type Area = "design" | "cms" | "site" | "code";
type CodeFile = "html" | "css" | "custom";
const tools: { id: Tool; label: string; key: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "add", label: "Add elements", key: "A", icon: Plus },
  { id: "navigator", label: "Navigator", key: "Z", icon: Layers },
  { id: "pages", label: "Pages", key: "P", icon: FileText },
  { id: "cms", label: "CMS", key: "J", icon: Database },
  // The pages behind the pages: each Between Gigs page with its design, data, code and API.
  { id: "site", label: "Site pages", key: "G", icon: AppWindow },
  { id: "code", label: "Code", key: "C", icon: Code2 },
  { id: "assets", label: "Assets", key: "F", icon: Images },
];
const bpIcons: Record<Breakpoint, React.ComponentType<{ className?: string }>> = { base: Monitor, tablet: Tablet, phone: Smartphone };

function Shell() {
  const { base, actions, canUndo, canRedo, lastChange } = useStudio();
  const router = useRouter();
  // CMS state.
  const [collectionId, setCollectionId] = React.useState("gigsters");
  const [viewIds, setViewIds] = React.useState<Record<string, string>>({});
  const [search, setSearch] = React.useState("");
  const [recordId, setRecordId] = React.useState<string | null>(null);
  const [fieldId, setFieldId] = React.useState<string | null>(null);
  const [mode, setMode] = React.useState<InspectorMode>("view");
  const [inspectorOpen, setInspectorOpen] = React.useState(false);
  const [addFieldOpen, setAddFieldOpen] = React.useState(false);
  // Designer state.
  const [area, setArea] = React.useState<Area>("design");
  // Site pages and Code.
  const [appId, setAppId] = React.useState("public-maya");
  const [appTab, setAppTab] = React.useState<AppTab>("design");
  const [codeFile, setCodeFile] = React.useState<CodeFile>("html");
  const [tool, setTool] = React.useState<Tool | null>("navigator");
  const [pageId, setPageId] = React.useState("page_home");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [hoverId, setHoverId] = React.useState<string | null>(null);
  const [bp, setBp] = React.useState<Breakpoint>("base");
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [drag, setDrag] = React.useState<DragItem | null>(null);
  const [tick, setTick] = React.useState(0);
  const [rightTab, setRightTab] = React.useState<"style" | "settings">("style");
  const [preview, setPreview] = React.useState(false);
  // Chrome.
  const [navOpen, setNavOpen] = React.useState(false);
  const [rightShown, setRightShown] = React.useState(true);
  const [sharing, setSharing] = React.useState(false);
  const [publishing, setPublishing] = React.useState(false);
  const [restored, setRestored] = React.useState(false);

  // Remember where the editor was, per browser.
  React.useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(PLACE) ?? "{}");
      if (s.c) setCollectionId(s.c); // eslint-disable-line react-hooks/set-state-in-effect
      if (s.v) setViewIds(s.v);
      if (["cms", "design", "site", "code"].includes(s.a)) setArea(s.a);
      if (s.p) setPageId(s.p);
      if (appPages.some((x) => x.id === s.s)) setAppId(s.s);
      if (appTabs.some((x) => x.id === s.t)) setAppTab(s.t);
    } catch { /* ignore */ }
    // Links straight to a tool: ?site=public-maya&tab=code, or ?code=css.
    const q = new URLSearchParams(window.location.search);
    const site = q.get("site"), tab = q.get("tab") as AppTab | null, code = q.get("code") as CodeFile | null;
    if (site && appPages.some((x) => x.id === site)) { setArea("site"); setAppId(site); setTool("site"); if (tab && appTabs.some((x) => x.id === tab)) setAppTab(tab); }
    if (code && ["html", "css", "custom"].includes(code)) { setArea("code"); setCodeFile(code); setTool("code"); }
    // On a tablet or phone, design at that size.
    if (window.innerWidth <= 478) setBp("phone"); else if (window.innerWidth <= 991) setBp("tablet");
    setRestored(true);
  }, []);
  React.useEffect(() => { if (restored) try { localStorage.setItem(PLACE, JSON.stringify({ c: collectionId, v: viewIds, a: area, p: pageId, s: appId, t: appTab })); } catch { /* ignore */ } }, [restored, collectionId, viewIds, area, pageId, appId, appTab]);

  const openTool = React.useCallback((t: Tool) => {
    if (t === "cms") { setArea("cms"); setTool((x) => (x === "cms" ? null : "cms")); setPreview(false); return; }
    if (t === "site" || t === "code") { setArea(t); setTool((x) => (x === t ? null : t)); setPreview(false); return; }
    if (t === "add" || t === "navigator" || t === "pages") setArea("design");
    setTool((x) => (x === t ? null : t));
  }, []);

  // Undo, redo and Webflow's single-key panel shortcuts, except while typing.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable=true]")) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) actions.redo(); else actions.undo(); return; }
      if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); actions.redo(); return; }
      if (mod || e.altKey || t.closest("[role=dialog], dialog")) return;
      const hit = tools.find((x) => x.key.toLowerCase() === e.key.toLowerCase());
      if (hit) { e.preventDefault(); openTool(hit.id); }
      if (e.key.toLowerCase() === "s" && !t.closest("[role=grid]")) { e.preventDefault(); setTool((x) => (x === "settings" ? null : "settings")); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [actions, openTool]);

  const lookup = React.useMemo(() => (base ? makeLookup(base) : () => ""), [base]);
  const appPage = appPages.find((x) => x.id === appId) ?? appPages[0];
  // Site pages → Data shows the collection the page reads, in the CMS's own views.
  const dataCollection = area === "site" && appTab === "data" ? collectionFor(appPage) : null;
  React.useEffect(() => {
    if (dataCollection && dataCollection !== collectionId) { setCollectionId(dataCollection); setSearch(""); setRecordId(null); setFieldId(null); } // eslint-disable-line react-hooks/set-state-in-effect
  }, [dataCollection, collectionId]);

  if (!base) {
    return (
      <div className="flex h-dvh flex-col bg-bg" aria-busy="true" aria-label="Opening Studio">
        <div className="h-11 border-b border-line bg-surface" />
        <div className="grid gap-3 p-6"><Skeleton className="h-8 w-64" /><Skeleton shape="block" className="h-96" /></div>
      </div>
    );
  }

  const collection = base.collections.find((c) => c.id === collectionId) ?? base.collections[0];
  const view = collection.views.find((v) => v.id === viewIds[collection.id]) ?? collection.views[0];
  const rows = viewRecords(collection, view, search, lookup);
  const page = base.pages.find((p) => p.id === pageId) ?? base.pages[0];

  const ui: UiState = {
    base, collection, view, lookup, search, setSearch, recordId, fieldId, mode, inspectorOpen, setInspectorOpen, addFieldOpen, setAddFieldOpen,
    open: (cid, vid) => {
      setCollectionId(cid);
      if (vid) setViewIds((m) => ({ ...m, [cid]: vid }));
      if (cid !== collection.id) { setSearch(""); setRecordId(null); setFieldId(null); }
      setNavOpen(false);
    },
    inspect: (m, id) => {
      setMode(m);
      if (m === "record" && id !== undefined) setRecordId(id);
      if (m === "field" && id !== undefined) setFieldId(id);
      setRightShown(true);
      if (id || m === "view") setInspectorOpen(true);
    },
  };

  const design: DesignState = {
    page, setPageId: (id) => { setPageId(id); setSelectedId(null); setEditingId(null); setArea("design"); setNavOpen(false); },
    // Like Webflow, something is always selected: the Body when nothing else is.
    selectedId: selectedId && findEl(page.root, selectedId) ? selectedId : page.root.id, select: (id) => { setSelectedId(id); if (id) setInspectorOpen(true); }, hoverId, setHover: setHoverId, bp, setBp, editingId, setEditingId, drag, setDrag,
    tick, remeasure: () => setTick((n) => n + 1), openCms: () => { setArea("cms"); setTool("cms"); },
  };

  const onNew = (values?: Record<string, CellValue>) => {
    const id = actions.addRecord(collection.id, values);
    ui.inspect("record", id);
  };

  const Icon = collectionIcons[collection.icon];
  const cmsBody = view.type === "grid" ? <GridView rows={rows} onNew={onNew} />
    : view.type === "gallery" ? <GalleryView rows={rows} onNew={() => onNew()} />
    : view.type === "kanban" ? <KanbanView rows={rows} onNew={onNew} />
    : view.type === "list" ? <ListView rows={rows} onNew={() => onNew()} />
    : <CalendarView rows={rows} onNew={onNew} />;

  const cmsView = (
    <>
      <div className="flex items-start gap-3 px-3 pt-4 pb-3 sm:px-4">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-selected text-ink-brand"><Icon className="size-5" /></span>
        <div className="grid min-w-0 gap-0.5">
          {React.createElement(area === "site" ? "h2" : "h1", { className: "font-display text-heading-lg text-ink" }, collection.name)}
          <p className="truncate text-body-sm text-ink-muted">
            {rows.length === collection.records.length ? `${collection.records.length} item${collection.records.length === 1 ? "" : "s"}` : `${rows.length} of ${collection.records.length} items`}
            {collection.description ? ` · ${collection.description}` : ""}
          </p>
        </div>
        <span className="ml-auto shrink-0 sm:hidden"><Button size="sm" variant="secondary" iconStart={<Plus />} onClick={() => onNew()}>New</Button></span>
      </div>
      <ViewTabs />
      <Toolbar onNew={() => onNew()} />
      <div className="flex min-h-0 flex-1 flex-col">{cmsBody}</div>
    </>
  );
  const openApp = (id: string) => { setAppId(id); setArea("site"); setNavOpen(false); };
  const codePages = (
    <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
      <p className="px-2 pt-2 pb-1 text-body-sm text-ink-muted">The code for each page you design: generated HTML and CSS, plus your own custom CSS.</p>
      <ul className="grid gap-0.5">
        {base.pages.map((p) => (
          <li key={p.id}>
            <button type="button" onClick={() => { setPageId(p.id); setNavOpen(false); }} aria-current={p.id === page.id ? "page" : undefined}
              className={cx("flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-label-md", p.id === page.id ? "bg-info/15 text-info" : "text-ink hover:bg-surface-hover")}>
              <FileText className="size-4 shrink-0 text-ink-subtle" aria-hidden="true" /><span className="truncate">{p.name}</span><span className="ml-auto truncate font-mono text-data-sm text-ink-subtle">/{p.slug}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
  const panel = tool === "add" ? <AddPanel /> : tool === "navigator" ? <NavigatorPanel /> : tool === "pages" ? <PagesPanel />
    : tool === "site" ? <AppPagesPanel current={appPage.id} onOpen={openApp} /> : tool === "code" ? codePages
    : tool === "cms" ? <PanelBody panel="data" /> : tool === "assets" ? <PanelBody panel="assets" /> : tool === "settings" ? <PanelBody panel="settings" /> : null;
  const panelLabel = tool === "settings" ? "Settings" : tools.find((t) => t.id === tool)?.label;

  const right = area === "design" ? (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-line p-2">
        <SegmentedControl size="sm" label="Element panel" className="w-full" value={rightTab} onChange={(v) => setRightTab(v as "style" | "settings")}
          options={[{ value: "style", label: "Style" }, { value: "settings", label: "Settings" }]} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{rightTab === "style" ? <StylePanel /> : <SettingsPanel />}</div>
    </div>
  ) : area === "site" && appTab !== "data" ? <AppDetails page={appPage} onTab={setAppTab} /> : <InspectorBody />;

  const pageHref = (href: string) => {
    const target = base.pages.find((p) => `/${p.slug}` === href || (href === "/" && p.slug === ""));
    return target ? `${basePath}/studio/site/?p=${target.slug}` : href.startsWith("/") ? `${basePath}${href}` : href;
  };

  return (
    <UiContext.Provider value={ui}>
      <DesignContext.Provider value={design}>
        <div className="flex h-dvh flex-col overflow-hidden bg-bg text-ink">
          {/* Top bar: project and page on the left, breakpoints in the middle, history, preview and Publish on the right. */}
          <header className="flex h-11 shrink-0 items-center gap-1 border-b border-line bg-surface px-1.5 sm:gap-1.5 sm:px-2">
            <div className="flex min-w-0 flex-1 items-center gap-1 sm:gap-1.5">
              <IconButton size="sm" variant="ghost" label="Open panels" icon={<MenuIcon />} className="lg:hidden" onClick={() => setNavOpen(true)} />
              <Menu align="start" trigger={
                <button type="button" aria-label="Studio menu" className="inline-flex h-8 min-w-11 shrink-0 items-center gap-1.5 rounded-md px-1.5 hover:bg-surface-hover">
                  <Logo layout="mark" height={20} /><span className="hidden text-label-md text-ink sm:inline">Studio</span><ChevronDown className="hidden size-3.5 text-ink-subtle xs:block" aria-hidden="true" />
                </button>}
                items={[
                  { heading: base.name },
                  // Undo and Redo are here too: on phones the top bar drops their buttons to keep room for the page name.
                  { label: "Undo", icon: <Undo2 />, shortcut: "Ctrl+Z", disabled: !canUndo, onSelect: actions.undo },
                  { label: "Redo", icon: <Redo2 />, shortcut: "Ctrl+Shift+Z", disabled: !canRedo, onSelect: actions.redo },
                  "separator",
                  { label: "Workspace settings", icon: <Settings />, onSelect: () => setTool("settings") },
                  { label: "Open the site preview", icon: <Globe />, onSelect: () => window.open(`${basePath}/studio/site/?p=${page.slug}`, "_blank") },
                  { label: "Share", icon: <Share2 />, onSelect: () => setSharing(true) },
                  "separator",
                  { label: "Back to Between Gigs", onSelect: () => router.push("/") },
                ]} />
              <span className="hidden xl:inline-flex"><Badge size="sm" tone="brand">Prototype</Badge></span>
              <span aria-hidden="true" className="mx-0.5 hidden h-5 w-px bg-line sm:block" />
              {area === "design" || area === "code" ? (
                <Menu align="start" trigger={
                  <button type="button" aria-label={`Page: ${page.name}`} className="inline-flex h-8 min-w-0 items-center gap-1.5 rounded-md px-2 text-label-md text-ink hover:bg-surface-hover">
                    <FileText className="hidden size-4 shrink-0 text-ink-subtle xs:block" aria-hidden="true" /><span className="truncate">{page.name}</span><ChevronDown className="size-3.5 shrink-0 text-ink-subtle" aria-hidden="true" />
                  </button>}
                  items={[
                    { heading: "Pages" },
                    ...base.pages.map((p) => ({ label: p.name, description: `/${p.slug}`, checked: p.id === page.id, icon: <FileText />, onSelect: () => (area === "code" ? setPageId(p.id) : design.setPageId(p.id)) })),
                    "separator",
                    { label: "Manage pages", icon: <Settings />, onSelect: () => setTool("pages") },
                  ]} />
              ) : area === "site" ? (
                <span className="inline-flex min-w-0 items-center gap-1.5 px-1 text-label-md text-ink"><AppWindow className="hidden size-4 shrink-0 text-ink-subtle sm:block" aria-hidden="true" /><span className="truncate"><span className="hidden sm:inline">Site · </span>{appPage.title}</span></span>
              ) : (
                <span className="inline-flex min-w-0 items-center gap-1.5 px-1 text-label-md text-ink"><Database className="hidden size-4 shrink-0 text-ink-subtle sm:block" aria-hidden="true" /><span className="truncate"><span className="hidden sm:inline">CMS · </span>{collection.name}</span></span>
              )}
            </div>

            {(area === "design" || (area === "site" && appTab === "design")) && (
              <div role="radiogroup" aria-label="Breakpoint" className="hidden shrink-0 items-center gap-0.5 rounded-md bg-surface-sunken p-0.5 md:flex">
                {breakpoints.map((b) => {
                  const BIcon = bpIcons[b.id];
                  return (
                    <button key={b.id} type="button" role="radio" aria-checked={bp === b.id} aria-label={b.label} title={`${b.label}: ${b.hint}`} onClick={() => setBp(b.id)}
                      className={cx("inline-flex h-7 w-9 items-center justify-center rounded-sm transition-colors duration-fast", bp === b.id ? "bg-surface text-info shadow-xs" : "text-ink-muted hover:text-ink")}>
                      <BIcon className="size-4" />
                    </button>
                  );
                })}
                <span className="px-2 text-caption text-ink-subtle tabular-nums">{breakpoints.find((b) => b.id === bp)?.width ? `${breakpoints.find((b) => b.id === bp)?.width}px` : "Desktop"}</span>
              </div>
            )}

            {/* min-w-max: the controls never squeeze under each other; the page name on the left truncates instead. */}
            <div className="flex min-w-max flex-1 items-center justify-end gap-0.5 sm:gap-1">
              {/* Always say it's saved: the icon on every screen, the words where there's room. */}
              <span className="mr-1 hidden items-center gap-1.5 text-caption text-ink-subtle sm:flex" role="status" aria-live="polite"
                title={lastChange ? `${lastChange} · saved in this browser` : "Saved in this browser"}>
                <CloudCheck className="size-4 text-success" aria-hidden="true" />
                <span className="hidden 2xl:inline">{lastChange ? `${lastChange} · saved` : "Saved in this browser"}</span>
                <span className="sr-only 2xl:hidden">{lastChange ? `${lastChange}, saved` : "Saved in this browser"}</span>
              </span>
              <span className="hidden items-center gap-0.5 sm:inline-flex sm:gap-1">
                <IconButton size="sm" variant="ghost" label="Undo" icon={<Undo2 />} onClick={actions.undo} disabled={!canUndo} title={canUndo ? "Undo (Ctrl+Z)" : "Nothing to undo yet"} />
                <IconButton size="sm" variant="ghost" label="Redo" icon={<Redo2 />} onClick={actions.redo} disabled={!canRedo} title={canRedo ? "Redo (Ctrl+Shift+Z)" : "Nothing to redo"} />
              </span>
              <span className="hidden lg:inline-flex"><ThemeToggle size="sm" showLabel={false} className="pr-0.5!" /></span>
              {area === "design" && <IconButton size="sm" variant="ghost" label={preview ? "Exit preview" : "Preview"} icon={preview ? <EyeOff /> : <Eye />} pressed={preview} onClick={() => { setPreview(!preview); setEditingId(null); }} />}
              {area !== "code" && <IconButton size="sm" variant="ghost" label={rightShown ? "Hide the right panel" : "Show the right panel"} icon={<PanelRight />} pressed={rightShown}
                onClick={() => { if (window.matchMedia("(min-width: 80rem)").matches) setRightShown((s) => !s); else setInspectorOpen(true); }} />}
              <span className="hidden xl:inline-flex"><Button size="sm" variant="ghost" iconStart={<Share2 />} onClick={() => setSharing(true)}>Share</Button></span>
              {/* Webflow's blue Publish, in the same blue as the canvas selection. */}
              <button type="button" onClick={() => setPublishing(true)} aria-label="Publish"
                className="inline-flex h-8 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-md bg-info px-2.5 text-label-sm sm:px-3 text-bg transition-opacity duration-fast hover:opacity-90 [&_svg]:size-4">
                <Rocket aria-hidden="true" /><span className="hidden sm:inline">Publish</span>
              </button>
            </div>
          </header>

          <div className="flex min-h-0 flex-1">
            {/* The left tool bar, as in Webflow. */}
            {!preview && (
              <nav aria-label="Tools" className="hidden w-12 shrink-0 flex-col items-center gap-1 border-r border-line bg-surface py-2 md:flex">
                {tools.map((t) => {
                  const TIcon = t.icon;
                  const on = tool === t.id || (t.id === "cms" && area === "cms" && tool === null);
                  return (
                    <button key={t.id} type="button" aria-label={`${t.label} (${t.key})`} title={`${t.label} (${t.key})`} aria-pressed={on} onClick={() => openTool(t.id)}
                      className={cx("relative inline-flex size-9 items-center justify-center rounded-md transition-colors duration-fast", on ? "bg-info/15 text-info" : "text-ink-muted hover:bg-surface-hover hover:text-ink")}>
                      <TIcon className="size-5" />
                    </button>
                  );
                })}
                <button type="button" aria-label="Settings (S)" title="Settings (S)" aria-pressed={tool === "settings"} onClick={() => setTool((x) => (x === "settings" ? null : "settings"))}
                  className={cx("mt-auto inline-flex size-9 items-center justify-center rounded-md transition-colors duration-fast", tool === "settings" ? "bg-info/15 text-info" : "text-ink-muted hover:bg-surface-hover hover:text-ink")}>
                  <Settings className="size-5" />
                </button>
              </nav>
            )}
            {!preview && panel && (
              <aside aria-label={panelLabel} className="hidden w-72 shrink-0 flex-col border-r border-line bg-surface lg:flex">{panel}</aside>
            )}

            <main id="main" className="flex min-w-0 flex-1 flex-col">
              {area === "design" ? (
                preview ? (
                  <div className="min-h-0 flex-1 overflow-auto bg-surface-sunken">
                    <div className={cx("mx-auto min-h-full max-w-full bg-bg shadow-md", bp === "base" ? "w-full" : bp === "tablet" ? "w-192" : "w-98")}>
                      <RenderElement el={page.root} opts={{ base, bp, mode: "preview", href: pageHref, customCss: page.customCss }} />
                    </div>
                  </div>
                ) : <Canvas />
              ) : area === "site" ? (
                <AppInspector page={appPage} tab={appTab} onTab={setAppTab} bp={bp} renderData={() => cmsView} />
              ) : area === "code" ? (
                <PageCode page={page} file={codeFile} onFile={setCodeFile} />
              ) : cmsView}
            </main>

            {!preview && rightShown && area !== "code" && !(area === "site" && (appTab === "design" || appTab === "code")) && (
              <aside aria-label={area === "design" ? "Style and settings" : area === "site" && appTab !== "data" ? "Page details" : "Inspector"} className="hidden w-72 shrink-0 flex-col border-l border-line bg-surface xl:flex">{right}</aside>
            )}
          </div>
        </div>

        {/* Small screens: the panels slide in. */}
        <Drawer side="left" open={navOpen} onClose={() => setNavOpen(false)} title="Studio">
          <div className="-mx-5 -mt-2 flex min-h-0 flex-col">
            <div className="flex flex-wrap gap-1 px-5 pb-3">
              {[...tools, { id: "settings" as Tool, label: "Settings", key: "S", icon: Settings }].map((t) => {
                const TIcon = t.icon;
                return (
                  <button key={t.id} type="button" aria-pressed={tool === t.id} onClick={() => openTool(t.id)}
                    className={cx("inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-label-sm", tool === t.id ? "bg-info/15 text-info" : "text-ink-muted hover:bg-surface-hover")}>
                    <TIcon className="size-4" />{t.label}
                  </button>
                );
              })}
            </div>
            {navOpen && <div className="flex min-h-0 flex-col border-t border-line">{panel ?? <p className="p-5 text-body-sm text-ink-muted">Pick a tool above.</p>}</div>}
          </div>
        </Drawer>
        <RightDrawer title={area === "design" ? (rightTab === "style" ? "Style" : "Settings") : area === "site" && appTab !== "data" ? "Page details" : mode === "record" ? "Item" : mode === "field" ? "Field" : "View settings"}
          open={inspectorOpen} onClose={() => setInspectorOpen(false)}>{right}</RightDrawer>

        <AddFieldDialog />
        <Modal open={sharing} onClose={() => setSharing(false)} title="Share this workspace" description="Inviting your team arrives with accounts and a hosted database."
          footer={<Button variant="primary" onClick={() => setSharing(false)}>Got it</Button>}>
          <div className="grid gap-3 text-body-md text-ink-muted">
            <p>This prototype keeps everything in this browser, so nobody else sees your changes yet.</p>
            <p>To pass a copy on, use <strong className="font-semibold text-ink">Settings → Export as JSON</strong>; anyone can import it in their own Studio.</p>
          </div>
        </Modal>
        <Modal open={publishing} onClose={() => setPublishing(false)} title="Publish your site" description="Publishing to a domain arrives with hosting. For now, your site runs as a live preview in this browser."
          footer={<><Button variant="ghost" onClick={() => setPublishing(false)}>Close</Button><Button variant="primary" iconStart={<Globe />} onClick={() => { window.open(`${basePath}/studio/site/?p=${page.slug}`, "_blank"); setPublishing(false); }}>Open the site preview</Button></>}>
          <ul className="grid gap-2 text-body-md text-ink-muted">
            {base.pages.map((p) => (
              <li key={p.id} className="flex items-center gap-2"><Check className="size-4 text-success" aria-hidden="true" /><span className="text-ink">{p.name}</span><span className="text-body-sm">/{p.slug}</span></li>
            ))}
          </ul>
          <p className="mt-3 text-body-sm text-ink-subtle">Collection lists show the CMS as it is now. Links between pages work in the preview.</p>
        </Modal>
      </DesignContext.Provider>
    </UiContext.Provider>
  );
}

/** Below 1280px the right panel is a drawer, opened by selecting something or the panel button. */
function RightDrawer({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: React.ReactNode }) {
  const [wide, setWide] = React.useState(true);
  React.useEffect(() => {
    const m = window.matchMedia("(min-width: 80rem)");
    const on = () => setWide(m.matches);
    on(); m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return (
    <Drawer side="right" open={!wide && open} onClose={onClose} title={title}>
      {!wide && open && <div className="-mx-5 -mt-2 flex min-h-0 flex-col">{children}</div>}
    </Drawer>
  );
}
