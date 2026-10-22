"use client";
import { Count, Drawer, IconButton, Input, Kbd, NavItem, NavSection, cx } from "@ds/components";
import { ClipboardCheck, Compass, Globe, LayoutDashboard, ListPlus, Mail, PanelLeftClose, PanelLeftOpen, Search, Users } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { data, type DashboardSummary } from "@/lib/data";
import { SiteHeader } from "@/components/site/SiteHeader";

const COLLAPSED_KEY = "bg2-owner-nav-collapsed";

type CountKey = "review" | "people" | "waitlist";
interface Item { href: string; label: string; icon: React.ReactNode; exact?: boolean; count?: CountKey; hint?: string }

/** The owners' sections, grouped by the job: see the day, look after Gigsters, talk to people. */
const sections: { title: string; items: Item[] }[] = [
  { title: "Overview", items: [{ href: "/owners/", label: "Dashboard", icon: <LayoutDashboard />, exact: true }] },
  {
    title: "Gigsters",
    items: [
      { href: "/owners/review/", label: "Review queue", icon: <ClipboardCheck />, count: "review", hint: "waiting for review" },
      { href: "/owners/people/", label: "People", icon: <Users />, count: "people", hint: "people" },
      { href: "/owners/waitlist/", label: "Waitlist", icon: <ListPlus />, count: "waitlist", hint: "not invited yet" },
    ],
  },
  { title: "Messages", items: [{ href: "/emails/", label: "Emails", icon: <Mail /> }] },
];

function countsFrom(d: DashboardSummary): Record<CountKey, number> {
  return {
    review: d.counts.submitted,
    people: Object.values(d.counts).reduce((a, b) => a + b, 0),
    waitlist: d.waitlist.not_invited,
  };
}

/**
 * The owners' workspace: the site header across the top, a left sidebar for every owner tool, the page
 * on the right. Like the client's earlier Hub exploration, but with fewer, clearer choices: grouped
 * sections, live counts that flag what needs attention, a quick person search, a collapsible rail
 * (remembered, "[" to toggle) and a drawer on phones and tablets.
 */
export function OwnerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);
  const [drawer, setDrawer] = React.useState(false);
  const [counts, setCounts] = React.useState<Record<CountKey, number> | null>(null);
  const main = React.useRef<HTMLElement>(null);
  const search = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    try { setCollapsed(localStorage.getItem(COLLAPSED_KEY) === "1"); } catch { /* private mode */ } // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  // Counts follow the page: approving, inviting or reviewing changes them, then you navigate.
  React.useEffect(() => {
    let live = true;
    void data.owners.dashboard().then((d) => { if (live) setCounts(countsFrom(d)); });
    main.current?.scrollTo({ top: 0 });
    return () => { live = false; };
  }, [pathname]);

  const toggle = React.useCallback((next?: boolean) => {
    setCollapsed((c) => {
      const v = next ?? !c;
      try { localStorage.setItem(COLLAPSED_KEY, v ? "1" : "0"); } catch { /* private mode */ }
      return v;
    });
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
    <div className="flex h-dvh flex-col bg-bg text-ink">
      <SiteHeader app onOpenNav={() => setDrawer(true)} />
      <div className="flex min-h-0 flex-1">
        <nav aria-label="Owner workspace" className={cx("hidden shrink-0 flex-col border-r border-line bg-surface lg:flex", collapsed ? "w-16" : "w-62")}>
          <OwnerNav collapsed={collapsed} counts={counts} searchRef={search} onOpenSearch={openSearch}
            toggle={
              <IconButton variant="ghost" size="sm" onClick={() => toggle()} label={collapsed ? "Expand sidebar ([)" : "Collapse sidebar ([)"}
                icon={collapsed ? <PanelLeftOpen /> : <PanelLeftClose />} />
            } />
        </nav>
        <Drawer side="left" open={drawer} onClose={() => setDrawer(false)} title="Owner workspace">
          <OwnerNav counts={counts} onNavigate={() => setDrawer(false)} />
        </Drawer>
        <main ref={main} id="main" tabIndex={-1} className="min-w-0 flex-1 overflow-y-auto outline-none">
          <div className="mx-auto w-full max-w-7xl px-4 pt-8 pb-20 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

function OwnerNav({ collapsed = false, counts, toggle, searchRef, onOpenSearch, onNavigate }: {
  collapsed?: boolean;
  counts: Record<CountKey, number> | null;
  toggle?: React.ReactNode;
  searchRef?: React.Ref<HTMLInputElement>;
  onOpenSearch?: () => void;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const path = pathname.endsWith("/") ? pathname : `${pathname}/`;
  const active = (i: Item) => (i.exact ? path === i.href : path.startsWith(i.href));

  // Client-side navigation for plain anchors, keeping new-tab clicks working.
  const go = (href: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    onNavigate?.();
    router.push(href);
  };
  const find = (e: React.FormEvent) => {
    e.preventDefault();
    onNavigate?.();
    router.push(q.trim() ? `/owners/people/?q=${encodeURIComponent(q.trim())}` : "/owners/people/");
    setQ("");
  };

  return (
    <div className={cx("flex min-h-0 flex-1 flex-col gap-5", !onNavigate && "py-3")}>
      {!onNavigate && (
        <div className={cx("flex items-center", collapsed ? "flex-col gap-2 px-3" : "justify-between gap-2 pr-2 pl-5")}>
          {!collapsed && <span className="text-eyebrow text-ink-subtle uppercase">Owner workspace</span>}
          {toggle}
        </div>
      )}

      {collapsed ? (
        <div className="flex justify-center px-3"><IconButton variant="ghost" label="Find a person" icon={<Search />} onClick={onOpenSearch} /></div>
      ) : (
        <form role="search" onSubmit={find} className={cx(!onNavigate && "px-3")}>
          <Input ref={searchRef} type="search" size="sm" aria-label="Find a person" placeholder="Find a person…" start={<Search />}
            value={q} onChange={(e) => setQ(e.target.value)} />
        </form>
      )}

      <div className={cx("grid min-h-0 flex-1 content-start gap-5 overflow-y-auto", collapsed ? "justify-items-center px-3" : !onNavigate && "px-3")}>
        {sections.map((s) => (
          <NavSection key={s.title} title={collapsed ? undefined : s.title} className={cx(collapsed && "border-t border-line pt-3 first:border-0 first:pt-0")}>
            {s.items.map((i) => {
              const n = i.count && counts ? counts[i.count] : undefined;
              const attention = i.count === "review" && !!n;
              return (
                <NavLink key={i.href} href={i.href} onClick={go(i.href)} active={active(i)} collapsed={collapsed} label={i.label}
                  description={n !== undefined ? `${n} ${i.hint}` : undefined} icon={i.icon} count={n} attention={attention} />
              );
            })}
          </NavSection>
        ))}
      </div>

      <div className={cx("grid gap-0.5 border-t border-line pt-3", collapsed ? "justify-items-center px-3" : !onNavigate && "px-3")}>
        <NavItem href="/" onClick={go("/")} label="Public site" icon={<Globe />} collapsed={collapsed} />
        {data.demo && <NavItem href="/preview/" onClick={go("/preview/")} label="Preview guide" icon={<Compass />} collapsed={collapsed} />}
        {!collapsed && !onNavigate && <p className="px-3 pt-2 text-caption text-ink-subtle">Press <Kbd keys={["["]} /> to collapse</p>}
      </div>
    </div>
  );
}

/**
 * One sidebar row. NavItem's look, plus what the owners need: the review count in the accent tone, a dot
 * on the rail icon when something is waiting, and the count in the accessible name when it's collapsed.
 */
function NavLink({ href, onClick, label, description, icon, count, attention, active, collapsed }: {
  href: string; onClick: React.MouseEventHandler<HTMLAnchorElement>; label: string; description?: string; icon: React.ReactNode;
  count?: number; attention: boolean; active: boolean; collapsed: boolean;
}) {
  const name = collapsed && description ? `${label}, ${description}` : label;
  return (
    <a href={href} onClick={onClick} aria-current={active ? "page" : undefined} aria-label={collapsed ? name : undefined} title={collapsed ? name : undefined}
      className={cx(
        "group flex h-10 items-center gap-3 rounded-md text-label-md transition-colors duration-fast ease-standard [&_svg]:size-5 [&_svg]:shrink-0",
        collapsed ? "w-10 justify-center" : "px-3",
        active ? "bg-surface-selected text-ink" : "text-ink-muted hover:bg-surface-hover hover:text-ink",
      )}>
      <span className={cx("relative inline-flex", active ? "text-ink-brand" : "text-ink-subtle group-hover:text-ink-muted")}>
        {icon}
        {collapsed && attention && <span aria-hidden="true" className="absolute -top-1 -right-1 size-2.5 rounded-full border-2 border-surface bg-action" />}
      </span>
      {!collapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
      {!collapsed && count !== undefined && <><Count aria-hidden="true" value={count} max={999} tone={attention ? "accent" : "quiet"} /><span className="sr-only">, {description}</span></>}
    </a>
  );
}
