"use client";
import { Badge, Input, SegmentedControl, Select, cx } from "@ds/components";
import { ArrowUpRight, Clock, FolderOpen, Layers, LayoutGrid, List, Search, Star, Users } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { folderOf, folders, openHref, projectById, projects, statusLabel, updatedLabel, type FolderId, type Project, type ProjectStatus } from "@/lib/workspace/projects";
import { Cover, FavoriteButton, SideLink, SideSection, WorkspaceShell, useWorkspaceLists } from "./WorkspaceShell";

const statusTone: Record<ProjectStatus, "success" | "info" | "neutral"> = { live: "success", experiment: "info", reference: "neutral" };
type Sort = "updated" | "name" | "status";
const VIEW_KEY = "bg-ws-view";

/** /workspace/: every project in one place, by folder, like a design tool's projects page. */
export function WorkspaceHome() {
  const params = useSearchParams();
  const router = useRouter();
  const folder = (params.get("folder") as FolderId | "favorites" | null) ?? null;
  const { favorites, recent, toggleFavorite } = useWorkspaceLists();
  const [q, setQ] = React.useState("");
  const [sort, setSort] = React.useState<Sort>("updated");
  const [view, setView] = React.useState<"grid" | "list">("grid");
  const [selected, setSelected] = React.useState<string>(projects[0].id);
  React.useEffect(() => { try { const v = localStorage.getItem(VIEW_KEY); if (v === "grid" || v === "list") setView(v); } catch { /* ignore */ } }, []); // eslint-disable-line react-hooks/set-state-in-effect

  const scope = folder === "favorites" ? projects.filter((p) => favorites.includes(p.id)) : folder ? projects.filter((p) => p.folder === folder) : projects;
  const needle = q.trim().toLowerCase();
  const shown = scope
    .filter((p) => !needle || `${p.name} ${p.summary} ${p.pages.map((pg) => pg.title).join(" ")}`.toLowerCase().includes(needle))
    .sort((a, b) => sort === "name" ? a.name.localeCompare(b.name) : sort === "status" ? a.status.localeCompare(b.status) || b.updated.localeCompare(a.updated) : b.updated.localeCompare(a.updated));
  const title = folder === "favorites" ? "Favourites" : folder ? folderOf(folder).name : "All projects";
  const sel = projectById(selected) ?? shown[0] ?? projects[0];
  const pick = (e: React.MouseEvent, id: string) => { if (!(e.target as HTMLElement).closest("a, button")) setSelected(id); };

  const sidebar = (
    <>
      <SideSection title="Workspace">
        <SideLink href="/workspace/" label="All projects" icon={<LayoutGrid />} count={projects.length} active={!folder} />
        <SideLink href="/workspace/?folder=favorites" label="Favourites" icon={<Star />} count={favorites.length} active={folder === "favorites"} />
        <SideLink href="/workspace/clients/" label="Clients" icon={<Users />} />
      </SideSection>
      <SideSection title="Folders">
        {folders.map((f) => <SideLink key={f.id} href={`/workspace/?folder=${f.id}`} label={f.name} icon={<FolderOpen />} count={projects.filter((p) => p.folder === f.id).length} active={folder === f.id} />)}
      </SideSection>
      {recent.length > 0 && (
        <SideSection title="Recent">
          {recent.map((id) => projectById(id)).filter((p): p is Project => !!p).map((p) => <SideLink key={p.id} href={openHref(p.id)} label={p.name} icon={<Cover project={p} size="sm" />} />)}
        </SideSection>
      )}
    </>
  );

  return (
    <WorkspaceShell sidebar={sidebar} sidebarTitle="Projects" inspectorTitle="Project details" inspector={<ProjectDetails project={sel} />}
      status={<><span>{projects.length} projects · {projects.reduce((n, p) => n + p.pages.length, 0)} pages</span><span className="max-sm:hidden">Sample data, kept in this browser</span></>}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-1">
          <p className="text-eyebrow text-ink-brand uppercase">Workspace</p>
          <h1 className="font-display text-display-sm text-ink">{title}</h1>
          <p className="max-w-2xl text-body-md text-ink-muted">{folder && folder !== "favorites" ? folderOf(folder).sub : "Everything we're building, in one place until it's ready to move. Open a project to work inside it; ⌘K jumps anywhere."}</p>
        </div>
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
          <Star className="size-6 text-ink-subtle" aria-hidden="true" />
          <p className="text-heading-md text-ink">{folder === "favorites" && !needle ? "No favourites yet" : "Nothing matches"}</p>
          <p className="max-w-sm text-body-sm text-ink-muted">{folder === "favorites" && !needle ? "Star a project to keep it here." : "Try another word, or clear the filter."}</p>
        </div>
      ) : view === "grid" ? (
        <ul className="mt-6 grid gap-5 sm:grid-cols-2 2xl:grid-cols-3">
          {shown.map((p) => (
            <li key={p.id}>
              {/* A click picks the project for the details bar; its name, or a double click, opens it. */}
              <article onFocusCapture={() => setSelected(p.id)} onClick={(e) => pick(e, p.id)} onDoubleClick={() => router.push(openHref(p.id))} aria-current={sel.id === p.id ? "true" : undefined}
                className={cx("group relative cursor-pointer overflow-hidden rounded-2xl border bg-surface transition duration-base hover:-translate-y-0.5 hover:shadow-lg motion-reduce:hover:translate-y-0",
                  sel.id === p.id ? "border-ink-brand ring-2 ring-ink-brand/25" : "border-line")}>
                <div className="relative overflow-hidden border-b border-line">
                  <Cover project={p} className="transition-transform duration-slow group-hover:scale-102 motion-reduce:group-hover:scale-100" />
                </div>
                <div className="grid gap-1 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-display text-heading-md text-ink">
                      <Link href={openHref(p.id)} className="inline-flex min-h-11 items-center rounded-xs underline-offset-4 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-focus">{p.name}</Link>
                    </h2>
                    <FavoriteButton on={favorites.includes(p.id)} name={p.name} onToggle={() => toggleFavorite(p.id)} className="-mt-1 -mr-2" />
                  </div>
                  <p className="line-clamp-2 text-body-sm text-ink-muted">{p.summary}</p>
                  <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-ink-subtle">
                    <Badge tone={statusTone[p.status]} size="sm">{statusLabel[p.status]}</Badge>
                    <span className="inline-flex items-center gap-1"><FolderOpen className="size-3.5" aria-hidden="true" />{folderOf(p.folder).name}</span>
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
            <li key={p.id} onFocusCapture={() => setSelected(p.id)} onClick={(e) => pick(e, p.id)} onDoubleClick={() => router.push(openHref(p.id))} aria-current={sel.id === p.id ? "true" : undefined}
              className={cx("row-lift relative flex cursor-pointer items-center gap-4 p-3", sel.id === p.id && "bg-surface-selected")}>
              <span className="w-24 shrink-0 overflow-hidden rounded-md border border-line"><Cover project={p} /></span>
              <div className="min-w-0 flex-1">
                <h2 className="text-label-md text-ink"><Link href={openHref(p.id)} className="inline-flex min-h-11 items-center rounded-xs underline-offset-4 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-focus">{p.name}</Link></h2>
                <p className="truncate text-body-sm text-ink-muted">{p.summary}</p>
              </div>
              <Badge tone={statusTone[p.status]} size="sm" className="max-sm:hidden">{statusLabel[p.status]}</Badge>
              <span className="w-28 shrink-0 text-caption text-ink-subtle max-md:hidden">{folderOf(p.folder).name}</span>
              <span className="w-16 shrink-0 text-caption text-ink-subtle tabular-nums max-md:hidden">{updatedLabel(p.updated)}</span>
              <FavoriteButton on={favorites.includes(p.id)} name={p.name} onToggle={() => toggleFavorite(p.id)} />
            </li>
          ))}
        </ul>
      )}
    </WorkspaceShell>
  );
}

function ProjectDetails({ project: p }: { project: Project }) {
  const groups = Array.from(new Set(p.pages.map((pg) => pg.group ?? "")));
  return (
    <div className="grid">
      <div className="border-b border-line"><Cover project={p} /></div>
      <section className="grid gap-2 p-5">
        <div className="flex flex-wrap items-center gap-2"><Badge tone={statusTone[p.status]} size="sm">{statusLabel[p.status]}</Badge><span className="text-caption text-ink-subtle">{folderOf(p.folder).name} · updated {updatedLabel(p.updated)}</span></div>
        <h2 className="font-display text-heading-lg text-ink">{p.name}</h2>
        <p className="text-body-md text-ink-muted">{p.summary}</p>
        <Link href={openHref(p.id)} className="mt-2 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-action px-4 text-label-md text-on-action transition-colors hover:bg-action-hover">Open project<ArrowUpRight className="size-4" aria-hidden="true" /></Link>
      </section>
      <section className="grid gap-2 border-t border-line p-5">
        <h3 className="text-label-sm text-ink-muted">{p.pages.length} {p.pages.length === 1 ? "page" : "pages"}</h3>
        {groups.map((g) => (
          <div key={g} className="grid gap-0.5">
            {g && <span className="pt-1 text-caption text-ink-subtle">{g}</span>}
            {p.pages.filter((pg) => (pg.group ?? "") === g).map((pg) => (
              <Link key={pg.id} href={openHref(p.id, pg.id)} className="flex min-h-9 items-center justify-between gap-2 rounded-md px-2 text-body-sm text-ink hover:bg-surface-hover">
                <span className="min-w-0 truncate">{pg.title}</span><span className="shrink-0 font-mono text-data-sm text-ink-subtle">{pg.path.split("?")[0]}</span>
              </Link>
            ))}
          </div>
        ))}
      </section>
    </div>
  );
}
