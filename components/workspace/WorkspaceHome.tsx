"use client";
import { Badge, Button, ConfirmDialog, Field, IconButton, Input, Menu, Modal, SegmentedControl, Select, cx, useToast, type MenuEntry } from "@ds/components";
import { Archive, ArchiveRestore, ArrowUpRight, Clock, Copy, Folder, FolderInput, FolderOpen, FolderPlus, Layers, LayoutGrid, List, MoreHorizontal, Pencil, RotateCcw, Search, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { statusLabel, updatedLabel, type ProjectStatus } from "@/lib/workspace/projects";
import { allFolders, mergedProjects, projectHref, projectsStore, useLocal, type WsProject } from "@/lib/workspace/local";
import { Cover, FavoriteButton, SideLink, SideSection, WorkspaceShell, useWorkspaceLists } from "./WorkspaceShell";

const statusTone: Record<ProjectStatus, "success" | "info" | "neutral"> = { live: "success", experiment: "info", reference: "neutral" };
type Sort = "updated" | "name" | "status";
const VIEW_KEY = "bg-ws-view";
const DRAG = "application/x-bg-project";

/** /workspace/: every project in one place, by folder, like a design tool's projects page. Rename, duplicate, move, archive and trash them; drag a card onto a folder. */
export function WorkspaceHome() {
  const params = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const { s } = useLocal();
  const folder = params.get("folder");
  const { favorites, recent, toggleFavorite } = useWorkspaceLists();
  const [q, setQ] = React.useState("");
  const [sort, setSort] = React.useState<Sort>("updated");
  const [view, setView] = React.useState<"grid" | "list">("grid");
  const [selected, setSelected] = React.useState<string | null>(null);
  const [renaming, setRenaming] = React.useState<WsProject | null>(null);
  const [destroying, setDestroying] = React.useState<WsProject | null>(null);
  const [newFolder, setNewFolder] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  React.useEffect(() => { try { const v = localStorage.getItem(VIEW_KEY); if (v === "grid" || v === "list") setView(v); } catch { /* ignore */ } }, []); // eslint-disable-line react-hooks/set-state-in-effect

  const all = mergedProjects(s);
  const folderList = allFolders(s);
  const folderName = (id: string) => folderList.find((f) => f.id === id)?.name ?? "No folder";
  const active = all.filter((p) => !p.archived && !p.trashed);
  const scope = folder === "trash" ? all.filter((p) => p.trashed) : folder === "archive" ? all.filter((p) => p.archived && !p.trashed)
    : folder === "favorites" ? active.filter((p) => favorites.includes(p.id)) : folder ? active.filter((p) => p.folder === folder) : active;
  const needle = q.trim().toLowerCase();
  const shown = scope
    .filter((p) => !needle || `${p.name} ${p.summary} ${p.pages.map((pg) => pg.title).join(" ")}`.toLowerCase().includes(needle))
    .sort((a, b) => sort === "name" ? a.name.localeCompare(b.name) : sort === "status" ? a.status.localeCompare(b.status) || b.updated.localeCompare(a.updated) : b.updated.localeCompare(a.updated));
  const current = folderList.find((f) => f.id === folder);
  const title = folder === "favorites" ? "Favourites" : folder === "archive" ? "Archive" : folder === "trash" ? "Trash" : current?.name ?? "All projects";
  const sub = folder === "archive" ? "Projects put away. They keep everything; restore one to bring it back."
    : folder === "trash" ? "Projects in the trash. Restore them, or delete them for good."
    : current?.sub ?? (current ? "A folder of your own. Drag projects here from any view." : "Everything we're building, in one place until it's ready to move. Open a project to work inside it; ⌘K jumps anywhere.");
  const sel = all.find((p) => p.id === selected) ?? shown[0];
  const pick = (e: React.MouseEvent, id: string) => { if (!(e.target as HTMLElement).closest("a, button")) setSelected(id); };

  const moveTo = (p: WsProject, f: string) => { projectsStore.move(p.id, f); toast({ message: `Moved ${p.name} to ${folderName(f)}`, tone: "success" }); };
  const duplicate = (p: WsProject) => { const id = projectsStore.duplicate(p, `${p.name} copy`); setSelected(id); toast({ message: `Duplicated as ${p.name} copy`, tone: "success" }); };
  const archive = (p: WsProject, on: boolean) => { projectsStore.archive(p.id, on); toast({ message: on ? `Archived ${p.name}` : `Restored ${p.name}`, tone: "success", ...(on ? { action: { label: "Undo", onClick: () => projectsStore.archive(p.id, false) } } : {}) }); };
  const trash = (p: WsProject) => { projectsStore.trash(p.id); toast({ message: `Moved ${p.name} to the trash`, tone: "neutral", action: { label: "Undo", onClick: () => projectsStore.restore(p.id) } }); };

  const menuFor = (p: WsProject): MenuEntry[] => p.trashed ? [
    { label: "Restore", icon: <RotateCcw />, onSelect: () => { projectsStore.restore(p.id); toast({ message: `Restored ${p.name}`, tone: "success" }); } },
    "separator",
    { label: "Delete forever…", icon: <Trash2 />, danger: true, onSelect: () => setDestroying(p) },
  ] : [
    { label: "Open", icon: <ArrowUpRight />, onSelect: () => router.push(projectHref(p)) },
    { label: "Rename…", icon: <Pencil />, onSelect: () => setRenaming(p) },
    { label: "Duplicate", icon: <Copy />, onSelect: () => duplicate(p) },
    { heading: "Move to folder" },
    ...folderList.map((f) => ({ label: f.name, icon: <FolderInput />, checked: p.folder === f.id, onSelect: () => moveTo(p, f.id) })),
    "separator",
    p.archived ? { label: "Restore from archive", icon: <ArchiveRestore />, onSelect: () => archive(p, false) } : { label: "Archive", icon: <Archive />, onSelect: () => archive(p, true) },
    { label: "Move to trash", icon: <Trash2 />, danger: true, onSelect: () => trash(p) },
  ];
  const more = (p: WsProject, className?: string) => (
    <Menu align="end" items={menuFor(p)} trigger={<IconButton size="sm" variant="ghost" label={`More for ${p.name}`} icon={<MoreHorizontal />} className={className} />} />
  );
  const drag = (p: WsProject) => p.trashed ? {} : {
    draggable: true,
    onDragStart: (e: React.DragEvent) => { e.dataTransfer.setData(DRAG, p.id); e.dataTransfer.effectAllowed = "move"; setDragging(true); },
    onDragEnd: () => setDragging(false),
  };

  const sidebar = (
    <>
      <SideSection title="Workspace">
        <SideLink href="/workspace/" label="All projects" icon={<LayoutGrid />} count={active.length} active={!folder} />
        <SideLink href="/workspace/?folder=favorites" label="Favourites" icon={<Star />} count={favorites.length} active={folder === "favorites"} />
      </SideSection>
      <SideSection title="Folders" action={<IconButton size="sm" variant="ghost" label="New folder" icon={<FolderPlus />} onClick={() => setNewFolder(true)} />}>
        {folderList.map((f) => (
          <DropTarget key={f.id} dragging={dragging} label={f.name} onDrop={(id) => { const p = all.find((x) => x.id === id); if (p && p.folder !== f.id) moveTo(p, f.id); setDragging(false); }}>
            <SideLink href={`/workspace/?folder=${f.id}`} label={f.name} icon={f.custom ? <Folder /> : <FolderOpen />} count={active.filter((p) => p.folder === f.id).length} active={folder === f.id} />
          </DropTarget>
        ))}
        {dragging && <p className="px-3 pt-1 text-caption text-ink-subtle">Drop on a folder to move it there.</p>}
      </SideSection>
      <SideSection title="Put away">
        <DropTarget dragging={dragging} label="Archive" onDrop={(id) => { const p = all.find((x) => x.id === id); if (p) archive(p, true); setDragging(false); }}>
          <SideLink href="/workspace/?folder=archive" label="Archive" icon={<Archive />} count={all.filter((p) => p.archived && !p.trashed).length} active={folder === "archive"} />
        </DropTarget>
        <DropTarget dragging={dragging} label="Trash" onDrop={(id) => { const p = all.find((x) => x.id === id); if (p) trash(p); setDragging(false); }}>
          <SideLink href="/workspace/?folder=trash" label="Trash" icon={<Trash2 />} count={all.filter((p) => p.trashed).length} active={folder === "trash"} />
        </DropTarget>
      </SideSection>
      {recent.length > 0 && (
        <SideSection title="Recent">
          {recent.map((id) => active.find((p) => p.id === id)).filter((p): p is WsProject => !!p).map((p) => <SideLink key={p.id} href={projectHref(p)} label={p.name} icon={<Cover project={p} size="sm" />} />)}
        </SideSection>
      )}
    </>
  );

  const empty = folder === "trash" ? ["The trash is empty", "Projects you move to the trash wait here until you delete them."]
    : folder === "archive" ? ["Nothing archived", "Archive a project to put it away without losing it."]
    : folder === "favorites" && !needle ? ["No favourites yet", "Star a project to keep it here."]
    : current && !needle ? ["This folder is empty", "Drag a project onto the folder in the left bar, or use Move to folder in its menu."]
    : ["Nothing matches", "Try another word, or clear the filter."];

  return (
    <WorkspaceShell sidebar={sidebar} sidebarTitle="Projects" inspectorTitle="Project details" inspector={sel ? <ProjectDetails project={sel} folderName={folderName(sel.folder)} menu={more(sel)} /> : undefined}
      commands={[{ id: "new-folder", label: "New folder", group: "Actions", icon: <FolderPlus />, onRun: () => setNewFolder(true) }]}
      status={<><span>{active.length} projects · {active.reduce((n, p) => n + p.pages.length, 0)} pages</span><span className="max-sm:hidden">Changes kept in this browser</span></>}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-1">
          <p className="text-eyebrow text-ink-brand uppercase">Workspace</p>
          <h1 className="font-display text-display-sm text-ink">{title}</h1>
          <p className="max-w-2xl text-body-md text-ink-muted">{sub}</p>
        </div>
        {folder !== "trash" && folder !== "archive" && (
          <Button variant="primary" iconStart={<FolderPlus />} onClick={() => setNewFolder(true)}>New folder</Button>
        )}
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Input type="search" aria-label="Filter projects" placeholder="Filter projects and pages" value={q} onChange={(e) => setQ(e.target.value)} start={<Search />} className="min-w-0 flex-1 sm:max-w-80" />
        <Select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="w-44"
          options={[{ value: "updated", label: "Recently updated" }, { value: "name", label: "Name" }, { value: "status", label: "Status" }]} />
        <SegmentedControl label="View" size="sm" value={view} onChange={(v) => { setView(v as "grid" | "list"); try { localStorage.setItem(VIEW_KEY, v); } catch { /* ignore */ } }}
          options={[{ value: "grid", label: "Grid", icon: <LayoutGrid /> }, { value: "list", label: "List", icon: <List /> }]} />
      </div>

      {shown.length === 0 ? (
        <div className="mt-10 grid justify-items-center gap-2 rounded-2xl border border-dashed border-line-strong p-10 text-center">
          {folder === "trash" ? <Trash2 className="size-6 text-ink-subtle" aria-hidden="true" /> : folder === "archive" ? <Archive className="size-6 text-ink-subtle" aria-hidden="true" /> : <Star className="size-6 text-ink-subtle" aria-hidden="true" />}
          <p className="text-heading-md text-ink">{empty[0]}</p>
          <p className="max-w-sm text-body-sm text-ink-muted">{empty[1]}</p>
        </div>
      ) : view === "grid" ? (
        <ul className="mt-6 grid gap-5 sm:grid-cols-2 2xl:grid-cols-3">
          {shown.map((p) => (
            <li key={p.id}>
              {/* A click picks the project for the details bar; its name, or a double click, opens it. Drag it onto a folder. */}
              <article {...drag(p)} onFocusCapture={() => setSelected(p.id)} onClick={(e) => pick(e, p.id)} onDoubleClick={() => !p.trashed && router.push(projectHref(p))} aria-current={sel?.id === p.id ? "true" : undefined}
                className={cx("group relative cursor-pointer overflow-hidden rounded-2xl border bg-surface transition duration-base hover:-translate-y-0.5 hover:shadow-lg motion-reduce:hover:translate-y-0",
                  sel?.id === p.id ? "border-ink-brand ring-2 ring-ink-brand/25" : "border-line", (p.trashed || p.archived) && "opacity-80")}>
                <div className="relative overflow-hidden border-b border-line">
                  <Cover project={p} className={cx("transition-transform duration-slow group-hover:scale-102 motion-reduce:group-hover:scale-100", p.trashed && "grayscale")} />
                </div>
                <div className="grid gap-1 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-display text-heading-md text-ink">
                      {p.trashed ? <span className="inline-flex min-h-11 items-center">{p.name}</span>
                        : <Link href={projectHref(p)} className="inline-flex min-h-11 items-center rounded-xs underline-offset-4 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-focus">{p.name}</Link>}
                    </h2>
                    <span className="-mt-1 -mr-2 flex shrink-0 items-center">
                      {!p.trashed && <FavoriteButton on={favorites.includes(p.id)} name={p.name} onToggle={() => toggleFavorite(p.id)} />}
                      {more(p)}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-body-sm text-ink-muted">{p.summary}</p>
                  <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-ink-subtle">
                    {p.trashed ? <Badge tone="danger" size="sm">In the trash</Badge> : p.archived ? <Badge tone="neutral" size="sm">Archived</Badge> : <Badge tone={statusTone[p.status]} size="sm">{statusLabel[p.status]}</Badge>}
                    {p.made && <Badge tone="info" size="sm">Copy</Badge>}
                    <span className="inline-flex items-center gap-1"><FolderOpen className="size-3.5" aria-hidden="true" />{folderName(p.folder)}</span>
                    <span className="inline-flex items-center gap-1"><Layers className="size-3.5" aria-hidden="true" />{p.pages.length} {p.pages.length === 1 ? "page" : "pages"}</span>
                    <span className="inline-flex items-center gap-1"><Clock className="size-3.5" aria-hidden="true" />{updatedLabel(p.updated)}</span>
                  </p>
                </div>
              </article>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="mt-6 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {shown.map((p) => (
            <li key={p.id} {...drag(p)} onFocusCapture={() => setSelected(p.id)} onClick={(e) => pick(e, p.id)} onDoubleClick={() => !p.trashed && router.push(projectHref(p))} aria-current={sel?.id === p.id ? "true" : undefined}
              className={cx("row-lift relative flex cursor-pointer items-center gap-4 p-3", sel?.id === p.id && "bg-surface-selected")}>
              <span className="w-24 shrink-0 overflow-hidden rounded-md border border-line"><Cover project={p} className={p.trashed ? "grayscale" : undefined} /></span>
              <div className="min-w-0 flex-1">
                <h2 className="text-label-md text-ink">{p.trashed ? <span className="inline-flex min-h-11 items-center">{p.name}</span> : <Link href={projectHref(p)} className="inline-flex min-h-11 items-center rounded-xs underline-offset-4 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-focus">{p.name}</Link>}</h2>
                <p className="truncate text-body-sm text-ink-muted">{p.summary}</p>
              </div>
              <Badge tone={p.trashed ? "danger" : p.archived ? "neutral" : statusTone[p.status]} size="sm" className="max-sm:hidden">{p.trashed ? "In the trash" : p.archived ? "Archived" : statusLabel[p.status]}</Badge>
              <span className="w-28 shrink-0 truncate text-caption text-ink-subtle max-md:hidden">{folderName(p.folder)}</span>
              <span className="w-16 shrink-0 text-caption text-ink-subtle tabular-nums max-md:hidden">{updatedLabel(p.updated)}</span>
              {!p.trashed && <FavoriteButton on={favorites.includes(p.id)} name={p.name} onToggle={() => toggleFavorite(p.id)} />}
              {more(p)}
            </li>
          ))}
        </ul>
      )}

      <NameDialog open={!!renaming} title="Rename project" label="Project name" initial={renaming?.name ?? ""} submit="Rename"
        onClose={() => setRenaming(null)} onSubmit={(name) => { if (renaming) { projectsStore.rename(renaming.id, name); toast({ message: `Renamed to ${name}`, tone: "success" }); } setRenaming(null); }} />
      <NameDialog open={newFolder} title="New folder" label="Folder name" initial="" submit="Create folder"
        onClose={() => setNewFolder(false)} onSubmit={(name) => { const id = projectsStore.addFolder(name); setNewFolder(false); router.push(`/workspace/?folder=${id}`); toast({ message: `Created ${name}. Drag projects onto it.`, tone: "success" }); }} />
      <ConfirmDialog open={!!destroying} onCancel={() => setDestroying(null)} tone="danger" title={`Delete ${destroying?.name ?? ""} forever?`}
        description={destroying?.made ? "This copy and its changes are removed from this browser. This can't be undone." : "It's hidden from this workspace in this browser. The pages themselves stay in the code."}
        confirmLabel="Delete forever" onConfirm={() => { if (destroying) projectsStore.destroy(destroying.id); setDestroying(null); }} />
    </WorkspaceShell>
  );
}

/** A sidebar row that accepts a dragged project. */
function DropTarget({ dragging, label, onDrop, children }: { dragging: boolean; label: string; onDrop: (id: string) => void; children: React.ReactNode }) {
  const [over, setOver] = React.useState(false);
  return (
    <div data-drop={label} className={cx("rounded-md transition-shadow duration-fast", dragging && "ring-1 ring-line-strong ring-dashed", over && "bg-surface-selected ring-2 ring-ink-brand")}
      onDragOver={(e) => { if (e.dataTransfer.types.includes(DRAG)) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setOver(true); } }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); const id = e.dataTransfer.getData(DRAG); if (id) onDrop(id); }}>
      {children}
    </div>
  );
}

function NameDialog({ open, title, label, initial, submit, onClose, onSubmit }: { open: boolean; title: string; label: string; initial: string; submit: string; onClose: () => void; onSubmit: (name: string) => void }) {
  const [name, setName] = React.useState(initial);
  React.useEffect(() => { if (open) setName(initial); }, [open, initial]); // eslint-disable-line react-hooks/set-state-in-effect
  const go = () => { if (name.trim()) onSubmit(name.trim()); };
  return (
    <Modal open={open} onClose={onClose} size="sm" title={title}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!name.trim()} onClick={go}>{submit}</Button></>}>
      <form onSubmit={(e) => { e.preventDefault(); go(); }}>
        <Field label={label}><Input autoFocus value={name} onChange={(e) => setName(e.target.value)} /></Field>
      </form>
    </Modal>
  );
}

function ProjectDetails({ project: p, folderName, menu }: { project: WsProject; folderName: string; menu: React.ReactNode }) {
  const groups = Array.from(new Set(p.pages.map((pg) => pg.group ?? "")));
  return (
    <div className="grid">
      <div className="border-b border-line"><Cover project={p} /></div>
      <section className="grid gap-2 p-5">
        <div className="flex flex-wrap items-center gap-2"><Badge tone={statusTone[p.status]} size="sm">{statusLabel[p.status]}</Badge><span className="text-caption text-ink-subtle">{folderName} · updated {updatedLabel(p.updated)}</span></div>
        <div className="flex items-start justify-between gap-2"><h2 className="font-display text-heading-lg text-ink">{p.name}</h2>{menu}</div>
        <p className="text-body-md text-ink-muted">{p.summary}</p>
        {!p.trashed && <Link href={projectHref(p)} className="mt-2 inline-flex h-10 items-center justify-center gap-2 rounded-md border border-line-strong px-4 text-label-md text-ink transition-colors hover:bg-surface-hover">Open project<ArrowUpRight className="size-4" aria-hidden="true" /></Link>}
      </section>
      <section className="grid gap-2 border-t border-line p-5">
        <h3 className="text-label-sm text-ink-muted">{p.pages.length} {p.pages.length === 1 ? "page" : "pages"}</h3>
        {groups.map((g) => (
          <div key={g} className="grid gap-0.5">
            {g && <span className="pt-1 text-caption text-ink-subtle">{g}</span>}
            {p.pages.filter((pg) => (pg.group ?? "") === g).map((pg) => (
              <Link key={pg.id} href={projectHref(p, pg.id)} className="flex min-h-9 items-center justify-between gap-2 rounded-md px-2 text-body-sm text-ink hover:bg-surface-hover">
                <span className="min-w-0 truncate">{pg.title}</span><span className="shrink-0 font-mono text-data-sm text-ink-subtle">{pg.path.split("?")[0]}</span>
              </Link>
            ))}
          </div>
        ))}
      </section>
    </div>
  );
}
