"use client";
import { Button, ConfirmDialog, IconButton, Input, Menu, cx, useToast } from "@ds/components";
import { ChevronDown, ChevronRight, Database, Download, Ellipsis, Images, Pencil, Plus, RotateCcw, Settings, Trash2, Upload } from "lucide-react";
import * as React from "react";
import { useStudio } from "@/lib/studio/store";
import type { Base } from "@/lib/studio/types";
import { baseImages } from "./cells";
import { useUi, type Panel } from "./context";
import { NewCollectionDialog } from "./dialogs";
import { Thumb, collectionIcons, viewIcons } from "./ui";

export const panels: { id: Panel; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "data", label: "Collections", icon: Database },
  { id: "assets", label: "Assets", icon: Images },
  { id: "settings", label: "Settings", icon: Settings },
];

/** The thin column of tools on the far left, as in a site builder. */
export function Rail({ panel, onPanel }: { panel: Panel; onPanel: (p: Panel) => void }) {
  return (
    <nav aria-label="Tools" className="hidden w-14 shrink-0 flex-col items-center gap-1 border-r border-line bg-surface py-2 md:flex">
      {panels.map((p) => {
        const Icon = p.icon;
        const on = panel === p.id;
        return (
          <button key={p.id} type="button" aria-label={p.label} title={p.label} aria-pressed={on} onClick={() => onPanel(p.id)}
            className={cx("relative inline-flex size-10 items-center justify-center rounded-md transition-colors duration-fast", on ? "bg-surface-selected text-ink-brand" : "text-ink-muted hover:bg-surface-hover hover:text-ink")}>
            {on && <span aria-hidden="true" className="absolute top-2 bottom-2 -left-2 w-0.5 rounded-full bg-action" />}
            <Icon className="size-5" />
          </button>
        );
      })}
    </nav>
  );
}

export function PanelBody({ panel }: { panel: Panel }) {
  return panel === "data" ? <Collections /> : panel === "assets" ? <Assets /> : <SettingsPanel />;
}

function Head({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-line pr-2 pl-4">
      <h2 className="text-label-md text-ink">{title}</h2>
      {action}
    </div>
  );
}

/** Collections and their views as a tree, like a site builder's navigator. */
function Collections() {
  const ui = useUi();
  const { actions } = useStudio();
  const [adding, setAdding] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set());
  const [deleting, setDeleting] = React.useState<string | null>(null);
  const [renaming, setRenaming] = React.useState<string | null>(null);
  const toBeDeleted = ui.base.collections.find((c) => c.id === deleting);
  return (
    <>
      <Head title="Collections" action={<IconButton size="sm" variant="ghost" label="New collection" icon={<Plus />} onClick={() => setAdding(true)} />} />
      <ul className="grid gap-0.5 overflow-y-auto p-2">
        {ui.base.collections.map((c) => {
          const Icon = collectionIcons[c.icon];
          const active = c.id === ui.collection.id;
          const open = !collapsed.has(c.id);
          return (
            <li key={c.id}>
              <div className={cx("group flex min-h-9 items-center rounded-md", active ? "bg-surface-selected" : "hover:bg-surface-hover")}>
                <button type="button" aria-label={open ? `Collapse ${c.name}` : `Expand ${c.name}`} aria-expanded={open}
                  onClick={() => setCollapsed((s) => { const n = new Set(s); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); return n; })}
                  className="inline-flex size-7 shrink-0 items-center justify-center text-ink-subtle hover:text-ink">
                  {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                </button>
                {renaming === c.id ? (
                  <Input size="sm" autoFocus defaultValue={c.name} aria-label="Collection name" className="mr-1 min-w-0 flex-1"
                    onBlur={(e) => { const n = e.target.value.trim(); if (n && n !== c.name) actions.change("Renamed a collection", (b) => { const x = b.collections.find((y) => y.id === c.id); if (x) x.name = n; }); setRenaming(null); }}
                    onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setRenaming(null); }} />
                ) : (
                  <button type="button" onClick={() => ui.open(c.id)} onDoubleClick={() => setRenaming(c.id)} aria-current={active ? "page" : undefined}
                    className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left">
                    <Icon className={cx("size-4 shrink-0", active ? "text-ink-brand" : "text-ink-subtle")} />
                    <span className={cx("min-w-0 flex-1 truncate text-body-sm", active ? "font-semibold text-ink" : "text-ink")}>{c.name}</span>
                    <span className="text-caption text-ink-subtle tabular-nums">{c.records.length}</span>
                  </button>
                )}
                <Menu align="end" trigger={<button type="button" aria-label={`${c.name} options`} className="inline-flex size-7 shrink-0 items-center justify-center rounded-xs text-ink-subtle opacity-60 group-hover:opacity-100 hover:text-ink"><Ellipsis className="size-4" /></button>}
                  items={[
                    { label: "Rename", icon: <Pencil />, onSelect: () => setRenaming(c.id) },
                    { label: "Add a field", icon: <Plus />, onSelect: () => { ui.open(c.id); ui.setAddFieldOpen(true); } },
                    "separator",
                    { label: "Delete collection", icon: <Trash2 />, danger: true, disabled: ui.base.collections.length < 2, onSelect: () => setDeleting(c.id) },
                  ]} />
              </div>
              {open && (
                <ul className="ml-3.5 grid gap-0.5 border-l border-line py-0.5 pl-2">
                  {c.views.map((v) => {
                    const VIcon = viewIcons[v.type];
                    const on = active && v.id === ui.view.id;
                    return (
                      <li key={v.id}>
                        <button type="button" onClick={() => ui.open(c.id, v.id)} aria-current={on ? "page" : undefined}
                          className={cx("flex min-h-8 w-full items-center gap-2 rounded-md px-2 text-left text-body-sm", on ? "bg-surface-hover text-ink" : "text-ink-muted hover:bg-surface-hover hover:text-ink")}>
                          <VIcon className={cx("size-3.5 shrink-0", on ? "text-ink-brand" : "text-ink-subtle")} />
                          <span className="truncate">{v.name}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
      <div className="mt-auto border-t border-line p-3">
        <Button size="sm" variant="secondary" fullWidth iconStart={<Plus />} onClick={() => setAdding(true)}>New collection</Button>
      </div>
      <NewCollectionDialog open={adding} onClose={() => setAdding(false)} />
      <ConfirmDialog open={!!toBeDeleted} onCancel={() => setDeleting(null)} tone="danger" confirmLabel="Delete collection"
        title={`Delete ${toBeDeleted?.name}?`} description={`Its ${toBeDeleted?.records.length ?? 0} records and views go with it. You can undo this.`}
        onConfirm={() => {
          const id = deleting;
          actions.change("Deleted a collection", (b) => { b.collections = b.collections.filter((x) => x.id !== id); });
          setDeleting(null);
          const next = ui.base.collections.find((x) => x.id !== id);
          if (next) ui.open(next.id);
        }} />
    </>
  );
}

/** Every image used in the base, and where. */
function Assets() {
  const ui = useUi();
  const images = React.useMemo(() => baseImages(ui.base), [ui.base]);
  const usedIn = (src: string) => ui.base.collections.filter((c) => c.fields.some((f) => f.type === "image" && c.records.some((r) => r.values[f.id] === src))).map((c) => c.name);
  return (
    <>
      <Head title={`Assets · ${images.length}`} />
      <p className="px-4 pt-3 text-body-sm text-ink-muted">Pictures used across your collections. Add new ones from any image field.</p>
      <ul className="grid grid-cols-2 gap-2 overflow-y-auto p-3">
        {images.map((src) => (
          <li key={src} className="grid gap-1">
            <Thumb src={src} className="aspect-square w-full rounded-md" />
            <span className="truncate text-caption text-ink-subtle" title={src}>{usedIn(src).join(", ")}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

function SettingsPanel() {
  const ui = useUi();
  const { actions } = useStudio();
  const toast = useToast();
  const [confirm, setConfirm] = React.useState(false);
  const file = React.useRef<HTMLInputElement>(null);
  const exportBase = () => {
    const blob = new Blob([JSON.stringify(ui.base, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${ui.base.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-studio.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const importBase = async (f: File) => {
    try {
      const b = JSON.parse(await f.text()) as Base;
      if (b.version !== 1 || !Array.isArray(b.collections) || !b.collections.length) throw new Error("shape");
      actions.replace(b);
      ui.open(b.collections[0].id);
      toast({ message: `Imported ${b.name}`, tone: "success" });
    } catch { toast({ message: "That file isn't a Studio export.", tone: "danger" }); }
  };
  return (
    <>
      <Head title="Settings" />
      <div className="grid gap-5 overflow-y-auto p-4">
        <label className="grid gap-1.5"><span className="text-label-sm text-ink-muted">Workspace name</span>
          <Input key={ui.base.name} defaultValue={ui.base.name} onBlur={(e) => { const n = e.target.value.trim(); if (n && n !== ui.base.name) actions.change("Renamed the workspace", (b) => { b.name = n; }); }} />
        </label>
        <div className="grid gap-2">
          <span className="text-label-sm text-ink-muted">Your data</span>
          <p className="text-body-sm text-ink-muted">This prototype saves in this browser only. Export a copy to keep it or move it to another browser.</p>
          <Button size="sm" variant="secondary" iconStart={<Download />} onClick={exportBase}>Export as JSON</Button>
          <Button size="sm" variant="secondary" iconStart={<Upload />} onClick={() => file.current?.click()}>Import a JSON export</Button>
          <input ref={file} type="file" accept="application/json,.json" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importBase(f); e.target.value = ""; }} />
        </div>
        <div className="grid gap-2 border-t border-line pt-4">
          <span className="text-label-sm text-ink-muted">Sample data</span>
          <Button size="sm" variant="ghost" iconStart={<RotateCcw />} className="justify-start" onClick={() => setConfirm(true)}>Restore the Between Gigs sample</Button>
        </div>
      </div>
      <ConfirmDialog open={confirm} onCancel={() => setConfirm(false)} confirmLabel="Restore sample" title="Restore the sample data?"
        description="Every collection goes back to the Between Gigs sample. You can undo this." onConfirm={() => { actions.reset(); setConfirm(false); ui.open("gigsters"); }} />
    </>
  );
}
