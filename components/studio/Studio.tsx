"use client";
/*
 * Studio: a no-code editor and content manager for Between Gigs, built to become its own service. The frame
 * follows site builders like Webflow and Wix: tools on a left rail, a navigator panel, the canvas in the middle
 * and an inspector on the right. Data and views work like Airtable.
 */
import { Badge, Drawer, IconButton, Logo, Modal, Button, SegmentedControl, Skeleton, ThemeToggle, cx } from "@ds/components";
import { CloudCheck, Menu as MenuIcon, PanelRight, Plus, Redo2, Share2, Undo2 } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { viewRecords } from "@/lib/studio/query";
import { StudioProvider, useStudio } from "@/lib/studio/store";
import type { CellValue } from "@/lib/studio/types";
import { makeLookup } from "./cells";
import { UiContext, type InspectorMode, type Panel, type UiState } from "./context";
import { AddFieldDialog } from "./dialogs";
import { InspectorBody } from "./Inspector";
import { PanelBody, Rail, panels } from "./Navigator";
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

function Shell() {
  const { base, actions, canUndo, canRedo, lastChange } = useStudio();
  const [collectionId, setCollectionId] = React.useState("gigsters");
  const [viewIds, setViewIds] = React.useState<Record<string, string>>({});
  const [search, setSearch] = React.useState("");
  const [recordId, setRecordId] = React.useState<string | null>(null);
  const [fieldId, setFieldId] = React.useState<string | null>(null);
  const [mode, setMode] = React.useState<InspectorMode>("view");
  const [panel, setPanel] = React.useState<Panel>("data");
  const [navOpen, setNavOpen] = React.useState(false);
  const [inspectorOpen, setInspectorOpen] = React.useState(false);
  const [inspectorShown, setInspectorShown] = React.useState(true);
  const [addFieldOpen, setAddFieldOpen] = React.useState(false);
  const [sharing, setSharing] = React.useState(false);
  const [restored, setRestored] = React.useState(false);

  // Remember where the editor was, per browser.
  React.useEffect(() => {
    try { const s = JSON.parse(localStorage.getItem(PLACE) ?? "{}"); if (s.c) setCollectionId(s.c); if (s.v) setViewIds(s.v); } catch { /* ignore */ } // eslint-disable-line react-hooks/set-state-in-effect
    setRestored(true);
  }, []);
  React.useEffect(() => { if (restored) try { localStorage.setItem(PLACE, JSON.stringify({ c: collectionId, v: viewIds })); } catch { /* ignore */ } }, [restored, collectionId, viewIds]);

  // Undo and redo from the keyboard, except while typing in a field.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, [contenteditable=true]")) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) actions.redo(); else actions.undo(); }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") { e.preventDefault(); actions.redo(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [actions]);

  const lookup = React.useMemo(() => (base ? makeLookup(base) : () => ""), [base]);

  if (!base) {
    return (
      <div className="flex h-dvh flex-col bg-bg" aria-busy="true" aria-label="Opening Studio">
        <div className="h-12 border-b border-line bg-surface" />
        <div className="grid gap-3 p-6"><Skeleton className="h-8 w-64" /><Skeleton shape="block" className="h-96" /></div>
      </div>
    );
  }

  const collection = base.collections.find((c) => c.id === collectionId) ?? base.collections[0];
  const view = collection.views.find((v) => v.id === viewIds[collection.id]) ?? collection.views[0];
  const rows = viewRecords(collection, view, search, lookup);

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
      setInspectorShown(true);
      if (id || m === "view") setInspectorOpen(true);
    },
  };

  const onNew = (values?: Record<string, CellValue>) => {
    const id = actions.addRecord(collection.id, values);
    ui.inspect("record", id);
  };

  const Icon = collectionIcons[collection.icon];
  const body = view.type === "grid" ? <GridView rows={rows} onNew={onNew} />
    : view.type === "gallery" ? <GalleryView rows={rows} onNew={() => onNew()} />
    : view.type === "kanban" ? <KanbanView rows={rows} onNew={onNew} />
    : view.type === "list" ? <ListView rows={rows} onNew={() => onNew()} />
    : <CalendarView rows={rows} onNew={onNew} />;

  return (
    <UiContext.Provider value={ui}>
      <div className="flex h-dvh flex-col overflow-hidden bg-bg text-ink">
        {/* Top bar: workspace on the left, history and sharing on the right. */}
        <header className="flex h-12 shrink-0 items-center gap-1.5 border-b border-line bg-surface px-2 sm:gap-2 sm:px-3">
          <IconButton size="sm" variant="ghost" label="Open collections" icon={<MenuIcon />} className="lg:hidden" onClick={() => setNavOpen(true)} />
          <Link href="/" aria-label="Between Gigs home" className="inline-flex min-h-8 min-w-11 shrink-0 items-center justify-center rounded-md"><Logo layout="mark" height={22} /></Link>
          <span className="hidden text-label-md text-ink sm:inline">Studio</span>
          <span className="hidden sm:inline-flex"><Badge size="sm" tone="brand">Prototype</Badge></span>
          <span aria-hidden="true" className="mx-1 hidden h-5 w-px bg-line sm:block" />
          <span className="min-w-0 truncate text-label-md text-ink-muted"><span className="hidden md:inline">{base.name} / </span><span className="text-ink">{collection.name}</span></span>
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <span className="mr-1 hidden items-center gap-1.5 text-caption text-ink-subtle lg:flex" role="status" aria-live="polite">
              <CloudCheck className="size-4" aria-hidden="true" />{lastChange ? `${lastChange} · saved in this browser` : "Saved in this browser"}
            </span>
            <IconButton size="sm" variant="ghost" label="Undo" icon={<Undo2 />} onClick={actions.undo} disabled={!canUndo} title={canUndo ? "Undo (Ctrl+Z)" : "Nothing to undo yet"} />
            <IconButton size="sm" variant="ghost" label="Redo" icon={<Redo2 />} onClick={actions.redo} disabled={!canRedo} title={canRedo ? "Redo (Ctrl+Shift+Z)" : "Nothing to redo"} />
            <span aria-hidden="true" className="mx-1 hidden h-5 w-px bg-line sm:block" />
            <span className="hidden sm:inline-flex"><ThemeToggle size="sm" showLabel={false} className="pr-0.5!" /></span>
            <IconButton size="sm" variant="ghost" label={inspectorShown ? "Hide the panel" : "Show the panel"} icon={<PanelRight />} pressed={inspectorShown}
              onClick={() => { if (window.matchMedia("(min-width: 80rem)").matches) setInspectorShown((s) => !s); else setInspectorOpen(true); }} />
            <Button size="sm" variant="secondary" iconStart={<Share2 />} onClick={() => setSharing(true)}><span className="hidden sm:inline">Share</span><span className="sr-only sm:hidden">Share</span></Button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <Rail panel={panel} onPanel={(p) => setPanel(p)} />
          <aside aria-label={panels.find((p) => p.id === panel)?.label} className="hidden w-64 shrink-0 flex-col border-r border-line bg-surface lg:flex">
            <PanelBody panel={panel} />
          </aside>

          <main id="main" className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-start gap-3 px-3 pt-4 pb-3 sm:px-4">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-selected text-ink-brand"><Icon className="size-5" /></span>
              <div className="grid min-w-0 gap-0.5">
                <h1 className="font-display text-heading-lg text-ink">{collection.name}</h1>
                <p className="truncate text-body-sm text-ink-muted">
                  {rows.length === collection.records.length ? `${collection.records.length} record${collection.records.length === 1 ? "" : "s"}` : `${rows.length} of ${collection.records.length} records`}
                  {collection.description ? ` · ${collection.description}` : ""}
                </p>
              </div>
              <span className="ml-auto shrink-0 sm:hidden"><Button size="sm" variant="primary" iconStart={<Plus />} onClick={() => onNew()}>New</Button></span>
            </div>
            <ViewTabs />
            <Toolbar onNew={() => onNew()} />
            <div className="flex min-h-0 flex-1 flex-col">{body}</div>
          </main>

          {inspectorShown && (
            <aside aria-label="Inspector" className="hidden w-80 shrink-0 flex-col border-l border-line bg-surface xl:flex">
              <InspectorBody />
            </aside>
          )}
        </div>
      </div>

      {/* Small screens: the navigator and inspector slide in. */}
      <Drawer side="left" open={navOpen} onClose={() => setNavOpen(false)} title="Studio">
        <div className="-mx-5 -mt-2 flex min-h-0 flex-col">
          <div className="px-5 pb-3"><SegmentedControl size="sm" label="Tools" value={panel} onChange={(p) => setPanel(p as Panel)} options={panels.map((p) => ({ value: p.id, label: p.label }))} /></div>
          <div className="flex min-h-0 flex-col border-t border-line"><PanelBody panel={panel} /></div>
        </div>
      </Drawer>
      <InspectorDrawer />

      <AddFieldDialog />
      <Modal open={sharing} onClose={() => setSharing(false)} title="Share this workspace" description="Sharing with your team arrives with accounts and a hosted database."
        footer={<Button variant="primary" onClick={() => setSharing(false)}>Got it</Button>}>
        <div className="grid gap-3 text-body-md text-ink-muted">
          <p>This prototype keeps everything in this browser, so nobody else sees your changes yet.</p>
          <p>To pass a copy on, use <strong className="font-semibold text-ink">Settings → Export as JSON</strong>; anyone can import it in their own Studio.</p>
        </div>
      </Modal>
    </UiContext.Provider>
  );
}

/** Below 1280px the inspector is a drawer; it opens when a record or field is chosen. */
function InspectorDrawer() {
  const ui = React.useContext(UiContext)!;
  const [wide, setWide] = React.useState(true);
  React.useEffect(() => {
    const m = window.matchMedia("(min-width: 80rem)");
    const on = () => setWide(m.matches);
    on(); m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return (
    <Drawer side="right" open={!wide && ui.inspectorOpen} onClose={() => ui.setInspectorOpen(false)} title={ui.mode === "record" ? "Record" : ui.mode === "field" ? "Field" : "View settings"}>
      <div className={cx("-mx-5 -mt-2 flex min-h-0 flex-col")}><InspectorBody /></div>
    </Drawer>
  );
}
