"use client";
import { Button, CommandPalette, Drawer, IconButton, Kbd, Logo, Menu, Modal, Popover, ThemeToggle, cx, useCommandShortcut, type Command, type MenuEntry } from "@ds/components";
import { Bell, Building2, CalendarClock, Check, ChevronsUpDown, CircleHelp, FileText, FolderOpen, FolderPlus, History, LayoutGrid, LayoutTemplate, MessageSquare, Moon, PanelLeft, PanelRight, Rocket, RotateCcw, Search, Star, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { data } from "@/lib/data";
import { asset } from "@/lib/site";
import { shortDate, useClients } from "@/lib/workspace/clients";
import { ago, allFolders, mergedProjects, notifications, projectHref, teamStore, useLocal, type WsEvent } from "@/lib/workspace/local";
import { type Project } from "@/lib/workspace/projects";

export const teams = [
  { id: "studio", name: "Our studio", sub: "Every client and project" },
  { id: "between-gigs", name: "Between Gigs team", sub: "Only the Between Gigs client" },
] as const;

/*
 * The workspace shell: one frame around everything we're building. Top bar with the project switcher and ⌘K search,
 * a left bar for where you are, the work in the middle, a right bar for details, and a status bar along the bottom.
 * [ and ] toggle the side bars; on phones and tablets they open as drawers.
 */

const SIDEBAR_KEY = "bg-ws-sidebar";
const INSPECTOR_KEY = "bg-ws-inspector";
const read = (k: string, d: boolean) => { try { const v = localStorage.getItem(k); return v === null ? d : v === "1"; } catch { return d; } };
const write = (k: string, v: boolean) => { try { localStorage.setItem(k, v ? "1" : "0"); } catch { /* ignore */ } };

interface ShellProps {
  /** The open project, if any. Drives the switcher and breadcrumb. */
  project?: Project;
  /** Breadcrumb after the project: the open page. */
  crumb?: string;
  sidebar: React.ReactNode;
  sidebarTitle: string;
  inspector?: React.ReactNode;
  inspectorTitle?: string;
  /** Left side of the status bar. */
  status?: React.ReactNode;
  /** Extra commands for ⌘K, on top of every project and page. */
  commands?: Command[];
  /** Full-bleed work area (a page preview) instead of a padded, scrolling one. */
  bleed?: boolean;
  children: React.ReactNode;
}

export function WorkspaceShell({ project, crumb, sidebar, sidebarTitle, inspector, inspectorTitle = "Details", status, commands = [], bleed = false, children }: ShellProps) {
  const router = useRouter();
  const [left, setLeft] = React.useState(true);
  const [right, setRight] = React.useState(true);
  const [leftDrawer, setLeftDrawer] = React.useState(false);
  const [rightDrawer, setRightDrawer] = React.useState(false);
  const [palette, setPalette] = React.useState(false);
  const [help, setHelp] = React.useState(false);
  const { s } = useLocal();
  const projects = mergedProjects(s).filter((p) => !p.archived && !p.trashed);
  const folders = allFolders(s);
  const team = teams.find((t) => t.id === s.team) ?? teams[0];
  React.useEffect(() => { setLeft(read(SIDEBAR_KEY, true)); setRight(read(INSPECTOR_KEY, true)); }, []); // eslint-disable-line react-hooks/set-state-in-effect
  useCommandShortcut(React.useCallback(() => setPalette(true), []));
  // The palette's field is a search box; say so, so it isn't read as a placeholder-only text field
  // (requested upstream in docs/design-system-requests.md).
  // React clears the attribute on every keystroke, so keep it set.
  React.useEffect(() => {
    const el = document.querySelector("dialog input[aria-label='Search commands']");
    if (!el) return;
    const fix = () => { if (el.getAttribute("type") !== "search") el.setAttribute("type", "search"); };
    fix();
    const mo = new MutationObserver(fix);
    mo.observe(el, { attributes: true, attributeFilter: ["type"] });
    return () => mo.disconnect();
  }, []);

  const wide = () => typeof window !== "undefined" && window.matchMedia("(min-width: 64rem)").matches;
  const xl = () => typeof window !== "undefined" && window.matchMedia("(min-width: 80rem)").matches;
  const toggleLeft = React.useCallback(() => { if (wide()) setLeft((v) => { write(SIDEBAR_KEY, !v); return !v; }); else setLeftDrawer((v) => !v); }, []);
  const toggleRight = React.useCallback(() => { if (xl()) setRight((v) => { write(INSPECTOR_KEY, !v); return !v; }); else setRightDrawer((v) => !v); }, []);

  // [ and ] toggle the side bars, unless someone is typing.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || t.closest("input, textarea, select, [contenteditable=true]")) return;
      if (e.key === "[") { e.preventDefault(); toggleLeft(); }
      if (e.key === "]" && inspector) { e.preventDefault(); toggleRight(); }
      if (e.key === "?") { e.preventDefault(); setHelp(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleLeft, toggleRight, inspector]);

  const all: Command[] = [
    ...commands,
    { id: "home", label: "All projects", group: "Go to", icon: <LayoutGrid />, onRun: () => router.push("/workspace/") },
    { id: "clients", label: "Clients", group: "Go to", icon: <Users />, keywords: "client management crm board tasks milestones", onRun: () => router.push("/workspace/clients/") },
    { id: "templates", label: "Templates", group: "Go to", icon: <LayoutTemplate />, keywords: "start gallery new", onRun: () => router.push("/workspace/templates/") },
    { id: "new-project", label: "New project from the template", group: "Actions", icon: <FolderPlus />, keywords: "create start client template", onRun: () => router.push("/workspace/clients/?new=1") },
    { id: "shortcuts", label: "Keyboard shortcuts", group: "Help", icon: <CircleHelp />, shortcut: ["?"], onRun: () => setHelp(true) },
    ...teams.map((t) => ({ id: `team-${t.id}`, label: `Switch to ${t.name}`, group: "Team", icon: <Building2 />, onRun: () => teamStore.set(t.id) })),
    ...folders.map((f) => ({ id: `folder-${f.id}`, label: f.name, group: "Folders", icon: <FolderOpen />, keywords: f.sub, onRun: () => router.push(`/workspace/?folder=${f.id}`) })),
    ...projects.map((p) => ({ id: `project-${p.id}`, label: p.name, group: "Projects", keywords: [p.summary, folders.find((f) => f.id === p.folder)?.name, ...p.pages.map((pg) => `${pg.title} ${pg.path}`)].join(" "), icon: <Cover project={p} size="sm" />, onRun: () => router.push(projectHref(p)) })),
    ...projects.flatMap((p) => p.pages.length > 1 ? p.pages.map((pg) => ({ id: `page-${p.id}-${pg.id}`, label: `${pg.title} · ${p.name}`, group: "Pages", icon: <FileText />, keywords: `${pg.path} ${pg.group ?? ""}`, onRun: () => router.push(projectHref(p, pg.id)) })) : []),
    { id: "sidebar", label: "Show or hide the left bar", group: "View", icon: <PanelLeft />, shortcut: ["["], onRun: toggleLeft },
    ...(inspector ? [{ id: "inspector", label: "Show or hide details", group: "View", icon: <PanelRight />, shortcut: ["]"], onRun: toggleRight }] : []),
    { id: "theme", label: "Switch day or night", group: "View", icon: <Moon />, onRun: () => document.querySelector<HTMLElement>("[data-ws-theme] button")?.click() },
    ...(data.demo ? [{ id: "reset", label: "Reset the sample data", group: "Actions", icon: <RotateCcw />, onRun: () => { void data.demo?.reset().then(() => window.location.reload()); } }] : []),
  ];

  const switcher: MenuEntry[] = [
    { label: "All projects", icon: <LayoutGrid />, onSelect: () => router.push("/workspace/"), checked: !project },
    ...folders.flatMap((f) => {
      const ps = projects.filter((p) => p.folder === f.id);
      return ps.length ? ["separator" as const, { heading: f.name }, ...ps.map((p) => ({ label: p.name, icon: <Cover project={p} size="sm" />, checked: project?.id === p.id, onSelect: () => router.push(projectHref(p)) }))] : [];
    }),
  ];

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-bg text-ink">
      <header className="flex h-14 shrink-0 items-center gap-1.5 border-b border-line bg-surface px-2 sm:gap-2 sm:px-3">
        <IconButton label="Open the left bar" variant="ghost" icon={<PanelLeft />} className="lg:hidden" onClick={() => setLeftDrawer(true)} />
        <Link href="/workspace/" aria-label="Workspace home" className="inline-flex min-h-11 shrink-0 items-center rounded-md px-1"><Logo layout="mark" height={24} /></Link>
        <Menu align="start" header={<span className="text-caption text-ink-subtle">Team</span>} items={teams.map((t) => ({ label: t.name, description: t.sub, icon: <Building2 />, checked: team.id === t.id, onSelect: () => teamStore.set(t.id) }))} trigger={
          <button type="button" aria-label={`Switch team. Now: ${team.name}`} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-md px-2 text-label-md text-ink hover:bg-surface-hover max-md:px-1">
            <span className="max-md:sr-only">{team.name}</span><ChevronsUpDown className="size-4 text-ink-subtle" aria-hidden="true" />
          </button>
        } />
        <span aria-hidden="true" className="h-6 w-px shrink-0 bg-line max-sm:hidden" />
        <Menu align="start" items={switcher} trigger={
          <button type="button" className="inline-flex h-10 min-w-0 items-center gap-2 rounded-md px-2 text-label-md text-ink hover:bg-surface-hover" aria-label={`Switch project. Now: ${project?.name ?? "All projects"}`}>
            {project ? <Cover project={project} size="sm" /> : <LayoutGrid className="size-4 text-ink-subtle" aria-hidden="true" />}
            <span className="max-w-40 truncate sm:max-w-56">{project?.name ?? "All projects"}</span>
            <ChevronsUpDown className="size-4 shrink-0 text-ink-subtle" aria-hidden="true" />
          </button>
        } />
        {crumb && <span className="min-w-0 truncate text-label-md text-ink-muted max-md:hidden"><span aria-hidden="true" className="mr-2 text-ink-subtle">/</span>{crumb}</span>}
        <button type="button" onClick={() => setPalette(true)} aria-label="Search projects and pages" aria-keyshortcuts="Meta+K Control+K"
          className="ml-auto inline-flex h-10 min-w-10 items-center justify-center gap-2 rounded-md border border-line bg-surface-sunken px-2.5 text-body-sm text-ink-subtle transition-colors hover:border-line-strong hover:text-ink md:w-72 md:justify-start lg:w-80">
          <Search className="size-4 shrink-0" aria-hidden="true" /><span className="flex-1 text-left max-md:hidden">Search or jump to…</span><Kbd keys={["⌘", "K"]} className="max-md:hidden" />
        </button>
        <Notifications />
        <IconButton label="Keyboard shortcuts (?)" variant="ghost" icon={<CircleHelp />} className="max-sm:hidden" onClick={() => setHelp(true)} />
        <IconButton label={left ? "Hide the left bar ([)" : "Show the left bar ([)"} variant="ghost" icon={<PanelLeft />} pressed={left} className="max-lg:hidden" onClick={toggleLeft} />
        {inspector && <IconButton label={right ? "Hide details (])" : "Show details (])"} variant="ghost" icon={<PanelRight />} pressed={right} className="max-xl:hidden" onClick={toggleRight} />}
        {inspector && <IconButton label="Show details" variant="ghost" icon={<PanelRight />} className="xl:hidden" onClick={() => setRightDrawer(true)} />}
        <span data-ws-theme="" className="inline-flex max-sm:hidden"><ThemeToggle size="sm" showLabel={false} /></span>
      </header>

      <div className="flex min-h-0 flex-1">
        {left && (
          <aside aria-label={sidebarTitle} className="hidden w-64 shrink-0 flex-col overflow-y-auto border-r border-line bg-surface lg:flex">
            <nav aria-label={sidebarTitle} className="grid content-start gap-5 p-3">{sidebar}</nav>
          </aside>
        )}
        <main id="main" tabIndex={-1} className={cx("relative min-w-0 flex-1 outline-none", bleed ? "flex flex-col overflow-hidden" : "overflow-y-auto")}>
          {bleed ? children : <div className="mx-auto w-full max-w-7xl px-4 pt-6 pb-16 sm:px-6 lg:px-8">{children}</div>}
        </main>
        {inspector && right && (
          <aside aria-label={inspectorTitle} className="hidden w-80 shrink-0 flex-col overflow-y-auto border-l border-line bg-surface xl:flex">{inspector}</aside>
        )}
      </div>

      <footer className="flex h-9 shrink-0 items-center gap-3 border-t border-line bg-surface px-3 text-caption text-ink-subtle">
        <div className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden whitespace-nowrap">{status}</div>
        <BuildStamp />
        <span className="flex shrink-0 items-center gap-3 max-md:hidden">
          <span className="flex items-center gap-1.5"><Kbd keys={["⌘", "K"]} />Search</span>
          <span className="flex items-center gap-1.5"><Kbd keys={["["]} />Left</span>
          {inspector && <span className="flex items-center gap-1.5"><Kbd keys={["]"]} />Details</span>}
          <button type="button" onClick={() => setHelp(true)} className="flex min-h-6 items-center gap-1.5 hover:text-ink"><Kbd keys={["?"]} />Shortcuts</button>
        </span>
      </footer>

      <Drawer side="left" open={leftDrawer} onClose={() => setLeftDrawer(false)} title={sidebarTitle}>
        <nav aria-label={sidebarTitle} className="grid gap-5" onClick={(e) => { if ((e.target as HTMLElement).closest("a")) setLeftDrawer(false); }}>{sidebar}</nav>
      </Drawer>
      {inspector && <Drawer side="right" size="md" open={rightDrawer} onClose={() => setRightDrawer(false)} title={inspectorTitle}><div className="-mx-5">{inspector}</div></Drawer>}
      <Modal open={help} onClose={() => setHelp(false)} title="Keyboard shortcuts" description="They work anywhere in the workspace, except while you're typing.">
        <dl className="grid gap-5 sm:grid-cols-2">
          {shortcuts.map((g) => (
            <div key={g.group} className="grid content-start gap-1">
              <dt className="pb-1 text-eyebrow text-ink-subtle uppercase">{g.group}</dt>
              {g.items.map(([keys, what]) => <dd key={what} className="flex min-h-8 items-center justify-between gap-3 text-body-sm text-ink"><span>{what}</span><Kbd keys={keys} /></dd>)}
            </div>
          ))}
        </dl>
      </Modal>
      <CommandPalette open={palette} onClose={() => setPalette(false)} commands={all} placeholder="Search projects, pages and actions…" />
    </div>
  );
}

const shortcuts: { group: string; items: [string[], string][] }[] = [
  { group: "Anywhere", items: [[["⌘", "K"], "Search or jump to…"], [["["], "Show or hide the left bar"], [["]"], "Show or hide details"], [["?"], "These shortcuts"]] },
  { group: "On a page", items: [[["C"], "Comment mode on or off"], [["Esc"], "Leave comment mode"], [["⌘", "↵"], "Post a comment or reply"]] },
  { group: "Projects", items: [[["↵"], "Open the focused project"], [["Drag"], "Move a project into a folder"]] },
  { group: "Studio", items: [[["⌘", "Z"], "Undo"], [["⌘", "⇧", "Z"], "Redo"], [["Del"], "Delete the selection"]] },
];

const eventIcon: Record<WsEvent["kind"], React.ReactNode> = {
  comment: <MessageSquare />, reply: <MessageSquare />, resolve: <Check />, publish: <Rocket />, restore: <History />, project: <FolderPlus />,
};

/** The bell: what changed in the workspace (this browser) and client tasks due within three days. */
function Notifications() {
  const router = useRouter();
  const { s } = useLocal();
  const { clients } = useClients();
  const [open, setOpen] = React.useState(false);
  const [soon] = React.useState(() => new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10));
  const due = clients.flatMap((c) => c.tasks.filter((t) => !t.done && t.due && t.due <= soon).map((t) => ({ c, t }))).sort((a, b) => (a.t.due ?? "").localeCompare(b.t.due ?? "")).slice(0, 6);
  const unread = s.events.filter((e) => e.at > s.readAt).length;
  const go = (href: string) => { setOpen(false); router.push(href); };
  const row = "flex min-h-11 w-full items-start gap-3 rounded-md px-2 py-2 text-left hover:bg-surface-hover [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-ink-subtle";
  return (
    <Popover align="end" width="md" label="Notifications" open={open} onOpenChange={setOpen}
      trigger={
        <button type="button" aria-label={unread ? `Notifications, ${unread} new` : "Notifications"} className="relative inline-flex size-10 items-center justify-center rounded-md text-ink-muted hover:bg-surface-hover hover:text-ink">
          <Bell className="size-5" aria-hidden="true" />
          {unread > 0 && <span aria-hidden="true" className="absolute top-1.5 right-1.5 grid min-w-4 place-items-center rounded-full bg-ink-brand px-1 text-caption leading-4 text-bg tabular-nums">{unread > 9 ? "9+" : unread}</span>}
        </button>
      }>
      <div className="grid max-h-96 gap-3 overflow-y-auto">
        <div className="flex items-center justify-between gap-2">
          <p className="text-label-md text-ink">Notifications</p>
          {unread > 0 && <Button size="sm" variant="ghost" iconStart={<Check />} onClick={() => notifications.markRead()}>Mark all read</Button>}
        </div>
        {due.length > 0 && (
          <section className="grid gap-0.5">
            <h3 className="px-2 text-eyebrow text-ink-subtle uppercase">Due soon</h3>
            {due.map(({ c, t }) => (
              <button key={t.id} type="button" className={row} onClick={() => go(`/workspace/clients/?c=${c.id}&tab=tasks`)}>
                <CalendarClock /><span className="grid min-w-0"><span className="text-body-sm text-ink">{t.title}</span><span className="text-caption text-ink-subtle">{c.name} · due {shortDate(t.due!)}{t.owner ? ` · ${t.owner}` : ""}</span></span>
              </button>
            ))}
          </section>
        )}
        <section className="grid gap-0.5">
          <h3 className="px-2 text-eyebrow text-ink-subtle uppercase">Activity</h3>
          {s.events.length === 0 ? <p className="px-2 text-body-sm text-ink-muted">Comments, publishes and project changes show up here.</p>
            : s.events.slice(0, 12).map((e) => (
              <button key={e.id} type="button" className={cx(row, e.at > s.readAt && "bg-surface-selected")} onClick={() => go(e.href)}>
                {eventIcon[e.kind]}<span className="grid min-w-0"><span className="text-body-sm text-ink">{e.text}</span><span className="text-caption text-ink-subtle">{ago(e.at)}</span></span>
              </button>
            ))}
        </section>
        <p className="px-2 text-body-sm text-ink-subtle">Kept in this browser. Team-wide notifications come with the backend.</p>
      </div>
    </Popover>
  );
}

/** Which build this is: its commit (linked) and when it was built, in UTC so every viewer reads the same. */
function BuildStamp() {
  const sha = process.env.NEXT_PUBLIC_BUILD_SHA ?? "";
  const at = process.env.NEXT_PUBLIC_BUILD_TIME;
  if (!sha && !at) return null;
  const when = at ? `${new Date(at).toLocaleString("en-US", { timeZone: "UTC", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} UTC` : "";
  const label = [sha && `Build ${sha.slice(0, 7)}`, when].filter(Boolean).join(" · ");
  return sha
    ? <a href={`https://github.com/between-gigs/between-gig-2.0/commit/${sha}`} target="_blank" rel="noreferrer" className="inline-flex min-h-6 shrink-0 items-center gap-1.5 whitespace-nowrap hover:text-ink max-sm:hidden"><span aria-hidden="true" className="size-2 rounded-full bg-success" />{label}</a>
    : <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap max-sm:hidden"><span aria-hidden="true" className="size-2 rounded-full bg-success" />{label}</span>;
}

/** A project's cover, as a small square (switcher, lists) or the card's 16:10 image. */
export function Cover({ project, size = "md", className }: { project: Project; size?: "sm" | "md"; className?: string }) {
  if (size === "sm") return <img src={asset(project.cover)} alt="" className={cx("size-5 shrink-0 rounded-xs object-cover object-top ring-1 ring-line", className)} />;
  return <img src={asset(project.cover)} alt="" loading="lazy" decoding="async" className={cx("aspect-video w-full object-cover object-top", className)} />;
}

/** A sidebar row: NavItem's look, as a client-side link. */
export function SideLink({ href, label, icon, count, active, trailing }: { href: string; label: string; icon?: React.ReactNode; count?: number; active?: boolean; trailing?: React.ReactNode }) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined}
      className={cx("group flex min-h-10 items-center gap-3 rounded-md px-3 text-label-md transition-colors duration-fast [&_svg]:size-4.5 [&_svg]:shrink-0",
        active ? "bg-surface-selected text-ink" : "text-ink-muted hover:bg-surface-hover hover:text-ink")}>
      {icon && <span className={active ? "text-ink-brand" : "text-ink-subtle group-hover:text-ink-muted"}>{icon}</span>}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {trailing}
      {count !== undefined && <span className="text-caption text-ink-subtle tabular-nums">{count}</span>}
    </Link>
  );
}

export function SideSection({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <div className="flex min-h-7 items-center justify-between px-3 pb-1"><span className="text-eyebrow text-ink-subtle uppercase">{title}</span>{action}</div>
      {children}
    </div>
  );
}

/* Favourites and recents: per browser conveniences. */
const FAV = "bg-ws-favorites";
const RECENT = "bg-ws-recent";
const readList = (k: string): string[] => { try { return JSON.parse(localStorage.getItem(k) ?? "[]"); } catch { return []; } };
const writeList = (k: string, v: string[]) => { try { localStorage.setItem(k, JSON.stringify(v)); window.dispatchEvent(new Event("bg-ws-lists")); } catch { /* ignore */ } };

export function useWorkspaceLists() {
  const [favorites, setFavorites] = React.useState<string[]>([]);
  const [recent, setRecent] = React.useState<string[]>([]);
  React.useEffect(() => {
    const sync = () => { setFavorites(readList(FAV)); setRecent(readList(RECENT)); };
    sync();
    window.addEventListener("bg-ws-lists", sync);
    return () => window.removeEventListener("bg-ws-lists", sync);
  }, []);
  const toggleFavorite = (id: string) => writeList(FAV, favorites.includes(id) ? favorites.filter((x) => x !== id) : [...favorites, id]);
  const visit = React.useCallback((id: string) => writeList(RECENT, [id, ...readList(RECENT).filter((x) => x !== id)].slice(0, 5)), []);
  return { favorites, recent, toggleFavorite, visit };
}

export function FavoriteButton({ on, name, onToggle, className }: { on: boolean; name: string; onToggle: () => void; className?: string }) {
  return <IconButton label={on ? `Remove ${name} from favourites` : `Add ${name} to favourites`} pressed={on} variant="ghost" size="sm" className={cx(on ? "text-warning" : "text-ink-subtle", className)}
    icon={<Star className={cx(on && "fill-current")} />} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle(); }} />;
}
