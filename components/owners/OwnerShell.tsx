"use client";
import { Count, Drawer, IconButton, Input, cx } from "@ds/components";
import { ClipboardCheck, Compass, Globe, LayoutDashboard, ListPlus, Mail, PanelLeftClose, PanelLeftOpen, Search, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { data, type DashboardSummary } from "@/lib/data";
import { SiteHeader } from "@/components/site/SiteHeader";

/** The collapsed rail is remembered here; app/layout.tsx restores it onto <html data-owner-nav> before first paint. */
export const COLLAPSED_KEY = "bg2-owner-nav-collapsed";

type CountKey = "review" | "people" | "waitlist";
interface Item { href: string; label: string; icon: React.ReactNode; exact?: boolean; count?: CountKey; hint?: string }

/** The owners' sections, grouped by the job: see the day, look after Gigsters, talk to people. */
const sections: { title: string; items: Item[] }[] = [
  { title: "Overview", items: [{ href: "/owners/", label: "Dashboard", icon: <LayoutDashboard />, exact: true }] },
  {
    title: "Gigsters",
    items: [
      { href: "/owners/review/", label: "Review queue", icon: <ClipboardCheck />, count: "review", hint: "waiting for review" },
      { href: "/owners/people/", label: "People", icon: <Users />, count: "people", hint: "invited so far" },
      { href: "/owners/waitlist/", label: "Waitlist", icon: <ListPlus />, count: "waitlist", hint: "not invited yet" },
    ],
  },
  { title: "Messages", items: [{ href: "/emails/", label: "Emails", icon: <Mail /> }] },
];

function countsFrom(d: DashboardSummary): Record<CountKey, number> {
  return { review: d.counts.submitted, people: Object.values(d.counts).reduce((a, b) => a + b, 0), waitlist: d.waitlist.not_invited };
}
/** Last known counts, so a remounted sidebar shows numbers straight away instead of blank pills. */
let lastCounts: Record<CountKey, number> | null = null;

const FrameContext = React.createContext<{ setSection: (s?: string) => void } | null>(null);

/**
 * Owner pages call this. Inside the persistent owner frame (app/owners/layout.tsx) it only passes the page
 * through, so moving between owner pages never re-mounts the sidebar or header: nothing blinks or jumps.
 * Outside it (the emails pages, a profile resolved by the 404 page) it draws the frame itself.
 * `section` highlights a sidebar entry other than the one the path is in (a profile opened from the queue).
 */
export function OwnerShell({ children, section }: { children: React.ReactNode; section?: "/owners/review/" }) {
  const frame = React.useContext(FrameContext);
  React.useEffect(() => {
    if (!frame) return;
    frame.setSection(section);
    return () => frame.setSection(undefined);
  }, [frame, section]);
  if (frame) return <>{children}</>;
  return <OwnerFrame section={section}>{children}</OwnerFrame>;
}

/**
 * The owners' workspace: the site header across the top, the sidebar on the left, the page on the right.
 * The rail's collapsed state lives on <html data-owner-nav> and is styled with the `nav-collapsed:` variant,
 * so it's right from the first paint; `[` toggles it.
 */
export function OwnerFrame({ children, section: fixed }: { children: React.ReactNode; section?: string }) {
  const pathname = usePathname();
  const [drawer, setDrawer] = React.useState(false);
  const [section, setSection] = React.useState<string | undefined>(fixed);
  const [counts, setCounts] = React.useState(lastCounts);
  const main = React.useRef<HTMLElement>(null);
  const search = React.useRef<HTMLInputElement>(null);
  const ctx = React.useMemo(() => ({ setSection }), []);

  // Counts follow the page (approving, inviting and reviewing change them); each page starts at the top.
  React.useEffect(() => {
    let live = true;
    void data.owners.dashboard().then((d) => { lastCounts = countsFrom(d); if (live) setCounts(lastCounts); });
    main.current?.scrollTo({ top: 0 });
    return () => { live = false; };
  }, [pathname]);

  const toggle = React.useCallback((collapse?: boolean) => {
    const root = document.documentElement;
    const v = collapse ?? root.dataset.ownerNav !== "collapsed";
    if (v) root.dataset.ownerNav = "collapsed"; else delete root.dataset.ownerNav;
    try { localStorage.setItem(COLLAPSED_KEY, v ? "1" : "0"); } catch { /* private mode */ }
  }, []);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "[" || e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.target as HTMLElement | null)?.closest("input, textarea, select, [contenteditable], [role=dialog]")) return;
      e.preventDefault();
      toggle();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [toggle]);

  const openSearch = () => { toggle(false); requestAnimationFrame(() => search.current?.focus()); };

  return (
    <FrameContext.Provider value={ctx}>
      <div className="flex h-dvh flex-col bg-bg text-ink">
        <SiteHeader app onOpenNav={() => setDrawer(true)} />
        <div className="flex min-h-0 flex-1">
          <nav aria-label="Owner workspace" className="hidden w-62 shrink-0 flex-col border-r border-line bg-surface lg:flex nav-collapsed:w-16">
            <OwnerNav counts={counts} section={section} searchRef={search} onOpenSearch={openSearch}
              toggle={
                <>
                  <span className="nav-collapsed:hidden"><IconButton variant="ghost" size="sm" onClick={() => toggle(true)} label="Collapse sidebar ([)" icon={<PanelLeftClose />} /></span>
                  <span className="hidden nav-collapsed:inline"><IconButton variant="ghost" size="sm" onClick={() => toggle(false)} label="Expand sidebar ([)" icon={<PanelLeftOpen />} /></span>
                </>
              } />
          </nav>
          <Drawer side="left" open={drawer} onClose={() => setDrawer(false)} title="Owner workspace">
            <OwnerNav counts={counts} section={section} drawer onNavigate={() => setDrawer(false)} />
          </Drawer>
          <main ref={main} id="main" tabIndex={-1} className="flex min-w-0 flex-1 flex-col overflow-y-auto outline-none">
            <div className="mx-auto w-full max-w-7xl flex-1 px-4 pt-8 pb-16 sm:px-6 lg:px-10">{children}</div>
            <p className="mx-auto w-full max-w-7xl px-4 pb-6 text-caption text-ink-subtle sm:px-6 lg:px-10">Sample data: everyone shown here is fictional.</p>
          </main>
        </div>
      </div>
    </FrameContext.Provider>
  );
}

function OwnerNav({ counts, section, toggle, searchRef, onOpenSearch, onNavigate, drawer = false }: {
  counts: Record<CountKey, number> | null; section?: string; toggle?: React.ReactNode;
  searchRef?: React.Ref<HTMLInputElement>; onOpenSearch?: () => void; onNavigate?: () => void; drawer?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const path = pathname.endsWith("/") ? pathname : `${pathname}/`;
  const active = (i: Item) => (section ? i.href === section : i.exact ? path === i.href : path.startsWith(i.href));
  // In the drawer the rail never collapses: these classes only apply to the sidebar.
  const rail = (cls: string) => (drawer ? "" : cls);

  const find = (e: React.FormEvent) => {
    e.preventDefault();
    onNavigate?.();
    router.push(q.trim() ? `/owners/people/?q=${encodeURIComponent(q.trim())}` : "/owners/people/");
    setQ("");
  };

  return (
    <div className={cx("flex min-h-0 flex-1 flex-col gap-4", !drawer && "py-3")}>
      {!drawer && (
        <div className="flex h-9 items-center justify-between gap-2 pr-2 pl-5 nav-collapsed:justify-center nav-collapsed:px-0">
          <span className="truncate text-eyebrow text-ink-subtle uppercase nav-collapsed:hidden">Owner workspace</span>
          {toggle}
        </div>
      )}

      <form role="search" onSubmit={find} className={cx(!drawer && "px-3", rail("nav-collapsed:hidden"))}>
        <Input ref={searchRef} type="search" size="sm" aria-label="Find a person" placeholder="Find a person…" start={<Search />}
          value={q} onChange={(e) => setQ(e.target.value)} />
      </form>
      {!drawer && <div className="hidden justify-center nav-collapsed:flex"><IconButton variant="ghost" label="Find a person" icon={<Search />} onClick={onOpenSearch} /></div>}

      <div className={cx("grid min-h-0 flex-1 content-start gap-5 overflow-y-auto", !drawer && "px-3", rail("nav-collapsed:justify-items-center nav-collapsed:gap-3"))}>
        {sections.map((s) => (
          <div key={s.title} className={cx("grid gap-0.5", rail("nav-collapsed:border-t nav-collapsed:border-line nav-collapsed:pt-3 nav-collapsed:first:border-0 nav-collapsed:first:pt-0"))}>
            <span className={cx("px-3 pb-1 text-eyebrow text-ink-subtle uppercase", rail("nav-collapsed:hidden"))}>{s.title}</span>
            {s.items.map((i) => {
              const n = i.count && counts ? counts[i.count] : undefined;
              return (
                <NavLink key={i.href} item={i} count={n} active={active(i)} onNavigate={onNavigate} rail={rail}
                  attention={i.count === "review" && !!n} />
              );
            })}
          </div>
        ))}
      </div>

      <div className={cx("grid gap-0.5 border-t border-line pt-3", !drawer && "px-3", rail("nav-collapsed:justify-items-center"))}>
        <NavLink item={{ href: "/", label: "Public site", icon: <Globe /> }} active={false} onNavigate={onNavigate} rail={rail} attention={false} />
        {data.demo && <NavLink item={{ href: "/preview/", label: "Preview guide", icon: <Compass /> }} active={false} onNavigate={onNavigate} rail={rail} attention={false} />}
      </div>
    </div>
  );
}

/**
 * One sidebar row: icon, label, what the number counts, and the count (the review count in the accent tone).
 * Collapsed, it's an icon with the count in its name and a dot when reviews are waiting.
 */
function NavLink({ item: i, count, active, attention, onNavigate, rail }: {
  item: Item; count?: number; active: boolean; attention: boolean; onNavigate?: () => void; rail: (cls: string) => string;
}) {
  const name = count !== undefined && i.hint ? `${i.label}, ${count} ${i.hint}` : i.label;
  return (
    <Link href={i.href} onClick={onNavigate} aria-current={active ? "page" : undefined} aria-label={name} title={name}
      className={cx(
        "group flex min-h-11 items-center gap-3 rounded-md px-3 py-1.5 text-label-md transition-colors duration-fast [&_svg]:size-5 [&_svg]:shrink-0",
        rail("nav-collapsed:size-10 nav-collapsed:min-h-10 nav-collapsed:justify-center nav-collapsed:p-0"),
        active ? "bg-surface-selected text-ink" : "text-ink-muted hover:bg-surface-hover hover:text-ink",
      )}>
      <span className={cx("relative inline-flex", active ? "text-ink-brand" : "text-ink-subtle group-hover:text-ink-muted")}>
        {i.icon}
        {attention && <span aria-hidden="true" className={cx("absolute -top-1 -right-1 hidden size-2.5 rounded-full border-2 border-surface bg-action", rail("nav-collapsed:block"))} />}
      </span>
      <span aria-hidden="true" className={cx("grid min-w-0 flex-1", rail("nav-collapsed:hidden"))}>
        <span className="truncate">{i.label}</span>
        {/* Says what the number counts, so 476 on the Waitlist isn't read as everyone on it. */}
        {i.hint && <span className="truncate text-caption text-ink-subtle">{i.hint}</span>}
      </span>
      {i.count && (
        <span aria-hidden="true" className={cx("inline-flex min-w-8 justify-end", rail("nav-collapsed:hidden"))}>
          {count !== undefined && <Count value={count} max={999} tone={attention ? "accent" : "quiet"} />}
        </span>
      )}
    </Link>
  );
}
