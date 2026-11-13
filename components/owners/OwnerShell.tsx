"use client";
import { useLook } from "@/components/site/LookSync";
import { Drawer, IconButton, Input, Logo, Menu, ThemeToggle, cx } from "@ds/components";
import { initials } from "@ds/components/Avatar";
import { Ellipsis, Inbox, LayoutDashboard, ListChecks, LogOut, Mail, Menu as MenuIcon, PanelLeftClose, PanelLeftOpen, Search, Users, X, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { data, type DashboardSummary } from "@/lib/data";
import { useAuthActions } from "@/lib/auth/context";
import { useSession } from "@/lib/session";
import { LookSwitcher } from "@/components/site/LookSwitcher";
import { ExperienceSwitcher } from "@/components/site/ExperienceSwitcher";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Icon3D } from "@/components/ui/Icon3D";
import type { Icon3DName } from "@/lib/icons3d";
import { markArea } from "@/lib/split-area";
import { SAMPLE_OWNER } from "@/lib/data/fields";
import { ownerEmailPreview } from "@/lib/owner-email-preview";
import { PersonPhoto } from "@/components/people/PersonPhoto";

markArea("bg-split:dashboard");

/** The collapsed rail is remembered here; app/layout.tsx restores it onto <html data-owner-nav> before first paint. */
export const COLLAPSED_KEY = "bg2-owner-nav-collapsed";

type CountKey = "review" | "people" | "waitlist";
interface Item { href: string; label: string; icon: LucideIcon; art: Icon3DName; fullPage?: boolean; exact?: boolean; count?: CountKey; hint?: string; short?: string }

/** The owners' sections, grouped by the job: see the day, look after Gigsters, talk to people. */
const sections: { title: string; items: Item[] }[] = [
  { title: "Overview", items: [{ href: "/owners/", label: "Dashboard", icon: LayoutDashboard, art: "house", exact: true }] },
  {
    title: "Gigsters",
    items: [
      { href: "/owners/review/", label: "Review queue", short: "Review", icon: Inbox, art: "eyes", count: "review", hint: "waiting for review" },
      { href: "/owners/people/", label: "People", icon: Users, art: "handshake", count: "people", hint: "invited so far" },
      { href: "/owners/waitlist/", label: "Waitlist", icon: ListChecks, art: "hourglass_done", count: "waitlist", hint: "not invited yet" },
    ],
  },
  { title: "Team", items: [{ href: "/owners/staff/", label: "Staff", icon: Users, art: "handshake" }] },
  { title: "Previews", items: [{ ...ownerEmailPreview(data.kind), icon: Mail, art: "envelope" }] },
];

function countsFrom(d: DashboardSummary): Record<CountKey, number> {
  return { review: d.counts.submitted, people: Object.values(d.counts).reduce((a, b) => a + b, 0), waitlist: d.waitlist.not_invited };
}
/** Last known counts, so a remounted sidebar shows numbers straight away instead of blank pills. */
let lastCounts: Record<CountKey, number> | null = null;

const FrameContext = React.createContext<{ setSection: (s?: string) => void; setFit: (fit: boolean) => void } | null>(null);

/** True inside the owner frame, whose own scroller starts under the header; false on a public page. */
export const useInOwnerFrame = () => React.useContext(FrameContext) !== null;

/**
 * Owner pages call this. Inside the persistent owner frame (app/owners/layout.tsx) it only passes the page
 * through, so moving between owner pages never re-mounts the sidebar or header: nothing blinks or jumps.
 * Outside it (the emails pages, a profile resolved by the 404 page) it draws the frame itself.
 * `section` highlights a sidebar entry other than the one the path is in (a profile opened from the queue).
 * `fit` makes the page exactly the height of the screen from the lg breakpoint (the dashboard): the page itself
 * doesn't scroll, its panels do.
 */
export function OwnerShell({ children, section, fit = false }: { children: React.ReactNode; section?: "/owners/review/"; fit?: boolean }) {
  const frame = React.useContext(FrameContext);
  React.useEffect(() => {
    if (!frame) return;
    frame.setSection(section);
    frame.setFit(fit);
    return () => { frame.setSection(undefined); frame.setFit(false); };
  }, [frame, section, fit]);
  if (frame) return <>{children}</>;
  return <OwnerFrame section={section} fit={fit}>{children}</OwnerFrame>;
}

/**
 * The owners' workspace: the site header across the top, the sidebar on the left, the page on the right.
 * The rail's collapsed state lives on <html data-owner-nav> and is styled with the `nav-collapsed:` variant,
 * so it's right from the first paint; `[` toggles it.
 */
export function OwnerFrame({ children, section: fixed, fit: fixedFit = false }: { children: React.ReactNode; section?: string; fit?: boolean }) {
  const look = useLook();
  const brand = look !== "swiss";
  const modern = look === "modern";
  const [drawer, setDrawer] = React.useState(false);
  const pathname = usePathname();
  const [section, setSection] = React.useState<string | undefined>(fixed);
  const [fit, setFit] = React.useState(fixedFit);
  const [counts, setCounts] = React.useState(lastCounts);
  const main = React.useRef<HTMLElement>(null);
  const search = React.useRef<HTMLInputElement>(null);
  const ctx = React.useMemo(() => ({ setSection, setFit }), []);

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

  const Navigation = brand ? CardNavigation : OwnerNav;
  const openSearch = () => { toggle(false); requestAnimationFrame(() => search.current?.focus()); };

  return (
    <FrameContext.Provider value={ctx}>
      <div data-modern-owner={modern ? "" : undefined} className="flex h-dvh flex-col bg-bg text-ink">
        {modern ? <ModernOwnerToolbar onOpenNav={() => setDrawer(true)} /> : <SiteHeader app onOpenNav={brand ? () => setDrawer(true) : undefined} />}
        <div className="flex min-h-0 flex-1">
          <nav aria-label="Owner workspace" className={cx("hidden embedded:hidden! shrink-0 flex-col border-r border-line lg:flex nav-collapsed:w-18", brand ? "w-66 bg-tint-sand" : "w-60 bg-bg")}>
            <Navigation counts={counts} section={section} searchRef={search} onOpenSearch={openSearch}
              toggle={
                <>
                  <span className="nav-collapsed:hidden"><IconButton variant="ghost" size="sm" onClick={() => toggle(true)} label="Collapse sidebar ([)" icon={<PanelLeftClose />} /></span>
                  <span className="hidden nav-collapsed:inline"><IconButton variant="ghost" size="sm" onClick={() => toggle(false)} label="Expand sidebar ([)" icon={<PanelLeftOpen />} /></span>
                </>
              } />
          </nav>
          {brand && <Drawer side="left" open={drawer} onClose={() => setDrawer(false)} title="Owner workspace">
            <CardNavigation drawer counts={counts} section={section} onNavigate={() => setDrawer(false)} />
          </Drawer>}
          <main ref={main} id="main" tabIndex={-1} className={cx("flex min-w-0 flex-1 flex-col overflow-y-auto outline-none", fit && "lg:overflow-hidden")}>
            {/* Big screens (3xl): the page widens to 96rem rather than floating as a 1280px island in the middle. */}
            <div className={cx("mx-auto w-full max-w-7xl flex-1 3xl:max-w-(--breakpoint-2xl) px-4 pt-4 sm:px-6 lg:px-10", brand && "pt-6", fit ? "pb-8 lg:flex lg:min-h-0 lg:flex-col lg:pb-4" : "pb-16")}>
              {!brand && <TopLine section={section} />}
              {children}
            </div>
            {data.kind === "sample" && <p className={cx("mx-auto w-full max-w-7xl shrink-0 3xl:max-w-(--breakpoint-2xl) px-4 text-caption text-ink-muted sm:px-6 lg:px-10", fit ? "pb-6 lg:pb-3" : "pb-6")}>Sample data: everyone shown here is fictional.</p>}
          </main>
        </div>
        {!brand && <TabBar counts={counts} section={section} />}
      </div>
    </FrameContext.Provider>
  );
}

/** Where you are ("Owners · People") on the left, who is signed in (square photo, name) on the right, over a thick rule. */
function TopLine({ section }: { section?: string }) {
  const pathname = usePathname();
  const { session } = useSession();
  const path = pathname.endsWith("/") ? pathname : `${pathname}/`;
  const all = sections.flatMap((s) => s.items);
  const here = section ? all.find((i) => i.href === section) : all.filter((i) => (i.exact ? path === i.href : path.startsWith(i.href))).sort((x, y) => y.href.length - x.href.length)[0];
  const name = session ? (session.name || session.email).replace(/\s*\(.*\)$/, "") : "";
  return (
    <div className="mb-6 flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b-4 border-line-strong pb-2">
      <p className="min-w-0 flex-1 truncate text-label-sm font-bold tracking-widest text-ink-muted uppercase">Owners{here ? ` · ${here.label}` : ""}</p>
      <PhoneSearch />
      {session && (
        <span className="flex min-w-0 items-center gap-3">
          {/* Phones: just the photo, so "Owners · Review queue" reads in full. */}
          <span className="grid min-w-0 text-right max-sm:hidden">
            <span className="truncate font-display text-label-md font-extrabold text-ink">{name}</span>
            <span className="truncate text-caption text-ink-muted">{session.email === SAMPLE_OWNER.email ? "Sample owner" : "Owner"}</span>
          </span>
          <OwnerFace name={name} email={session.email} className="size-11" />
        </span>
      )}
    </div>
  );
}

/** The signed-in owner's square photo: only the fictional sample owner has one (Patti); anyone else gets their initials. */
function OwnerFace({ name, email, className }: { name: string; email: string; className?: string }) {
  if (email === SAMPLE_OWNER.email) return <PersonPhoto id="patti" name={name} src="img/people/patti.jpg" alt="" className={cx("shrink-0", className)} />;
  return <span aria-hidden="true" className={cx("grid shrink-0 place-items-center bg-surface-sunken font-display text-label-md font-extrabold text-ink", className)}>{initials(name)}</span>;
}

/** "Find a person": opens People filtered by the name or email typed. */
function useFind(onDone?: () => void) {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const find = (e: React.FormEvent) => {
    e.preventDefault();
    onDone?.();
    router.push(q.trim() ? `/owners/people/?q=${encodeURIComponent(q.trim())}` : "/owners/people/");
    setQ("");
  };
  return { q, setQ, find };
}

function ModernOwnerToolbar({ onOpenNav }: { onOpenNav: () => void }) {
  const { q, setQ, find } = useFind();
  return <header className="mo-toolbar embedded:hidden!">
    <IconButton label="Open owner menu" variant="ghost" onClick={onOpenNav} icon={<MenuIcon />} className="lg:hidden" />
    <Link href="/" aria-label="Between Gigs home" className="mo-logo"><Logo height={24} /></Link>
    <form role="search" onSubmit={find}><Input type="search" size="sm" aria-label="Search people" placeholder="Search people by name or email…" start={<Search />} value={q} onChange={event => setQ(event.target.value)} /></form>
    <time>{new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</time>
    <ExperienceSwitcher /><LookSwitcher compact /><ThemeToggle size="sm" showLabel={false} />
  </header>;
}

/** Which nav entry the page is in: the one passed in, else the longest matching href. */
function useActive(section?: string) {
  const pathname = usePathname();
  const path = pathname.endsWith("/") ? pathname : `${pathname}/`;
  return (i: Item) => (section ? i.href === section : i.exact ? path === i.href : path.startsWith(i.href));
}

/** Signs out; Clerk's sign-out navigates by itself (to /login/?signedOut=1). */
function useSignOut() {
  const auth = useAuthActions();
  const router = useRouter();
  return async () => {
    await auth.signOut();
    if (auth.provider === "sample") router.push("/login/?signedOut=1");
  };
}

function CardNavigation({ counts, section, toggle, searchRef, onOpenSearch, onNavigate, drawer = false }: {
  counts: Record<CountKey, number> | null; section?: string; toggle?: React.ReactNode;
  searchRef?: React.Ref<HTMLInputElement>; onOpenSearch?: () => void; onNavigate?: () => void; drawer?: boolean;
}) {
  const modern = useLook() === "modern";
  const active = useActive(section);
  const { q, setQ, find } = useFind(onNavigate);
  const rail = (classes: string) => drawer ? "" : classes;

  return (
    <div data-modern-rail={modern ? "" : undefined} className={cx("flex min-h-0 flex-1 flex-col gap-4", !drawer && "py-3")}>
      {!drawer && (
        <div className="flex h-9 items-center justify-between gap-2 pr-2 pl-5 nav-collapsed:justify-center nav-collapsed:px-0">
          <span className="truncate text-label-md text-ink-muted nav-collapsed:hidden">{modern ? <><b className="block text-ink">Owners</b><small>Between Gigs team</small></> : "Owner workspace"}</span>
          {toggle}
        </div>
      )}

      {(!modern || drawer) && <form role="search" onSubmit={find} className={cx(!drawer && "px-3", rail("nav-collapsed:hidden"))}>
        <Input ref={searchRef} type="search" size="sm" aria-label="Find a person" placeholder="Find a person…" start={<Search />}
          value={q} onChange={(e) => setQ(e.target.value)} />
      </form>}
      {!drawer && !modern && <div className="hidden justify-center nav-collapsed:flex"><IconButton variant="ghost" label="Find a person" icon={<Search />} onClick={onOpenSearch} /></div>}

      <div className={cx("no-scrollbar grid min-h-0 flex-1 content-start gap-5 overflow-x-hidden overflow-y-auto", !drawer && "px-3", rail("nav-collapsed:justify-items-center nav-collapsed:gap-3"))}>
        {sections.map((s) => (
          <div key={s.title} className={cx("grid gap-1", rail("nav-collapsed:border-t nav-collapsed:border-line nav-collapsed:pt-3 nav-collapsed:first:border-0 nav-collapsed:first:pt-0"))}>
            <span className={cx("px-3 pb-1 text-label-sm text-ink-subtle", rail("nav-collapsed:hidden"))}>{s.title}</span>
            {s.items.map((i) => {
              const n = i.count && counts ? counts[i.count] : undefined;
              return (
                <NavLink key={i.href} item={i} count={n} active={active(i)} onNavigate={onNavigate} drawer={drawer}
                  attention={i.count === "review" && !!n} />
              );
            })}
          </div>
        ))}
      </div>

      <Account drawer={drawer} />
    </div>
  );
}

function OwnerNav({ counts, section, toggle, searchRef, onOpenSearch }: {
  counts: Record<CountKey, number> | null; section?: string; toggle?: React.ReactNode;
  searchRef?: React.Ref<HTMLInputElement>; onOpenSearch?: () => void;
}) {
  const active = useActive(section);
  const { q, setQ, find } = useFind();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 py-4">
      <div className="flex h-9 items-center justify-between gap-2 pr-2 pl-4 nav-collapsed:justify-center nav-collapsed:px-0">
        <span className="truncate text-label-sm font-bold tracking-widest text-ink-muted uppercase nav-collapsed:hidden">Owner workspace</span>
        {toggle}
      </div>

      <form role="search" onSubmit={find} className="px-4 nav-collapsed:hidden">
        <Input ref={searchRef} type="search" size="sm" aria-label="Find a person" placeholder="Find a person…" start={<Search />}
          value={q} onChange={(e) => setQ(e.target.value)} />
      </form>
      <div className="hidden justify-center nav-collapsed:flex"><IconButton variant="ghost" label="Find a person" icon={<Search />} onClick={onOpenSearch} /></div>

      <div className="no-scrollbar grid min-h-0 flex-1 content-start overflow-x-hidden overflow-y-auto px-4 nav-collapsed:justify-items-center nav-collapsed:px-0">
        <div className="grid border-t-4 border-line-strong nav-collapsed:w-12">
          {sections.flatMap((s) => s.items).map((i) => {
            const n = i.count && counts ? counts[i.count] : undefined;
            return <NavLink key={i.href} item={i} count={n} active={active(i)} attention={i.count === "review" && !!n} />;
          })}
        </div>
      </div>

      <Account />
    </div>
  );
}

/** Who is signed in, and signing out: the foot of the sidebar (collapsed, just the sign-out button). */
function Account({ drawer = false }: { drawer?: boolean } = {}) {
  const brand = useLook() !== "swiss";
  const rail = (classes: string) => drawer ? "" : classes;
  const { session } = useSession();
  const signOut = useSignOut();
  if (!session) return null;
  const name = (session.name || session.email).replace(/\s*\(.*\)$/, "");
  if (brand) return (
    <div className={cx("flex items-center gap-3 rounded-lg bg-surface p-3 shadow-xs", !drawer && "mx-3", rail("nav-collapsed:mx-auto nav-collapsed:flex-col nav-collapsed:gap-2 nav-collapsed:bg-transparent nav-collapsed:p-0 nav-collapsed:shadow-none"))}>
      <span title={`${name} · ${session.email}`} aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-full bg-tint-peach font-display text-label-md text-tint-ink">{initials(name)}</span>
      <div className={cx("grid min-w-0 flex-1", rail("nav-collapsed:hidden"))}>
        <span className="truncate text-label-md text-ink">{name}</span>
        <span className="truncate text-caption text-ink-subtle">{session.email}</span>
      </div>
      <IconButton variant="ghost" size="sm" label="Log out" icon={<LogOut />} onClick={() => void signOut()} />
    </div>
  );
  return (
    <div className="mx-4 flex items-center gap-3 border-t border-line pt-3 nav-collapsed:mx-auto nav-collapsed:border-0 nav-collapsed:pt-0">
      <div title={`${name} · ${session.email}`} className="grid min-w-0 flex-1 nav-collapsed:hidden">
        <span className="truncate text-label-md font-bold text-ink">{name}</span>
        <span className="truncate text-caption text-ink-muted">{session.email}</span>
      </div>
      <IconButton variant="ghost" size="sm" label="Log out" icon={<LogOut />} onClick={() => void signOut()} />
    </div>
  );
}

/**
 * Below the lg breakpoint the sidebar gives way to a tab bar along the foot of the screen: Dashboard, Review
 * (with its count), People, Waitlist, and More (Emails, Log out). It sits under the page's own scroller, so it
 * never covers the page or a sticky bar.
 */
function TabBar({ counts, section }: { counts: Record<CountKey, number> | null; section?: string }) {
  const active = useActive(section);
  const router = useRouter();
  const signOut = useSignOut();
  const { session } = useSession();
  const all = sections.flatMap((s) => s.items);
  const tabs = all.filter((i) => i.href.startsWith("/owners/")).slice(0, 4);
  const rest = all.filter((i) => !tabs.includes(i));
  const moreActive = rest.some(active);
  const cell = (on: boolean) => cx(
    "relative flex min-h-14 w-full flex-col items-center justify-center gap-1 px-1 text-caption font-bold transition-colors duration-fast",
    on ? "bg-ink text-bg" : "text-ink hover:bg-surface-hover",
  );
  return (
    <nav aria-label="Owner workspace" className="grid shrink-0 grid-cols-5 border-t-4 border-line-strong bg-bg embedded:hidden! lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      {tabs.map((i) => {
        const n = i.count && counts ? counts[i.count] : undefined;
        const name = n !== undefined && i.hint ? `${i.label}, ${n} ${i.hint}` : i.label;
        const on = active(i);
        const Icon = i.icon;
        return (
          <Link key={i.href} href={i.href} aria-current={on ? "page" : undefined} aria-label={name} className={cell(on)}>
            <span className="relative inline-flex">
              <Icon aria-hidden="true" className="size-5" strokeWidth={1.75} />
              {i.count === "review" && !!n && (
                <span aria-hidden="true" className={cx("absolute -top-2 left-4 min-w-5 px-1 text-center font-display text-caption font-extrabold tabular-nums", on ? "bg-bg text-ink" : "bg-ink text-bg")}>
                  {n > 99 ? "99+" : n}
                </span>
              )}
            </span>
            <span aria-hidden="true" className="max-w-full truncate">{i.short ?? i.label}</span>
          </Link>
        );
      })}
      <Menu align="end" className="flex"
        items={[
          ...rest.map((i) => ({ label: i.label, icon: <i.icon />, checked: active(i) || undefined, onSelect: () => { if (i.fullPage) window.location.assign(i.href); else router.push(i.href); } })),
          ...(session ? ["separator" as const, { label: "Log out", icon: <LogOut />, onSelect: () => void signOut() }] : []),
        ]}
        trigger={
          <button type="button" aria-label="More owner pages and account actions" className={cell(moreActive)}>
            <Ellipsis aria-hidden="true" className="size-5" strokeWidth={1.75} />
            <span aria-hidden="true">More</span>
          </button>
        } />
    </nav>
  );
}

/** Phones: the sidebar's "Find a person", behind a search button in the top line. */
function PhoneSearch() {
  const [open, setOpen] = React.useState(false);
  const { q, setQ, find } = useFind(() => setOpen(false));
  return (
    <>
      <span className="lg:hidden">
        <IconButton variant="ghost" label={open ? "Close search" : "Find a person"} icon={open ? <X /> : <Search />}
          aria-expanded={open} aria-controls="owner-phone-search" onClick={() => setOpen((o) => !o)} />
      </span>
      {open && (
        <form id="owner-phone-search" role="search" onSubmit={find} className="order-last basis-full lg:hidden"
          onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}>
          <Input type="search" aria-label="Find a person" placeholder="Find a person…" start={<Search />} autoFocus
            value={q} onChange={(e) => setQ(e.target.value)} />
        </form>
      )}
    </>
  );
}

/**
 * One sidebar row: line icon, label, what the number counts, and the count right-aligned. The current page is
 * a solid black block. Collapsed, it's an icon with the count in its name and a dot when reviews are waiting.
 */
function NavLink({ item: i, count, active, attention, drawer = false, onNavigate }: { item: Item; count?: number; active: boolean; attention: boolean; drawer?: boolean; onNavigate?: () => void }) {
  const look = useLook();
  const brand = look !== "swiss";
  const name = count !== undefined && i.hint ? `${i.label}, ${count} ${i.hint}` : i.label;
  const Icon = i.icon;
  const navigate = (event: React.MouseEvent<HTMLAnchorElement>) => {
    onNavigate?.();
    if (i.fullPage && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
      event.preventDefault();
      window.location.assign(i.href);
    }
  };
  if (brand) return (
    <Link href={i.href} prefetch={i.fullPage ? false : undefined} onClick={navigate} aria-current={active ? "page" : undefined} aria-label={name} title={name}
      className={cx(
        "group flex min-h-12 items-center gap-3 rounded-lg px-3 py-1.5 text-label-md transition-colors duration-fast",
        !drawer && "nav-collapsed:size-12 nav-collapsed:min-h-12 nav-collapsed:justify-center nav-collapsed:p-0",
        active ? "bg-surface-selected font-bold text-ink" : "text-ink-muted hover:bg-surface-hover hover:text-ink",
      )}>
      <span className="relative inline-flex">
        {look === "modern" ? <Icon aria-hidden="true" className="size-4" /> : <Icon3D name={i.art} className="size-7" />}
        {attention && <span aria-hidden="true" className={cx("absolute -top-1 -right-1 hidden size-2.5 rounded-full border-2 border-tint-sand bg-ink", !drawer && "nav-collapsed:block")} />}
      </span>
      <span aria-hidden="true" className={cx("grid min-w-0 flex-1", !drawer && "nav-collapsed:hidden")}>
        <span className="truncate text-body-md font-bold">{i.label}</span>
        {/* Says what the number counts, so 476 on the Waitlist isn't read as everyone on it. */}
        {i.hint && <span className="truncate text-caption text-ink-subtle">{i.hint}</span>}
      </span>
      {i.count && (
        <span aria-hidden="true" className={cx("inline-flex min-w-9 justify-end", !drawer && "nav-collapsed:hidden")}>
          {count !== undefined && (
            <span className={cx("inline-flex h-6 min-w-8 items-center justify-center rounded-full px-2.5 text-label-sm font-extrabold tabular-nums",
              attention ? "bg-tint-peach text-tint-ink" : "bg-surface text-ink ring-1 ring-line")}>{count > 999 ? "999+" : count}</span>
          )}
        </span>
      )}
    </Link>
  );
  return (
    <Link href={i.href} prefetch={i.fullPage ? false : undefined} onClick={navigate} aria-current={active ? "page" : undefined} aria-label={name} title={name}
      className={cx(
        "group flex min-h-12 items-center gap-3 border-b border-line px-2.5 py-1.5 transition-colors duration-fast",
        "nav-collapsed:size-12 nav-collapsed:min-h-12 nav-collapsed:justify-center nav-collapsed:p-0",
        active ? "border-ink bg-ink text-bg" : "text-ink hover:bg-surface-hover",
      )}>
      <span className="relative inline-flex">
        <Icon aria-hidden="true" className="size-5" strokeWidth={1.75} />
        {attention && <span aria-hidden="true" className={cx("absolute -top-1 -right-1.5 hidden size-2.5 rounded-full bg-ink-brand", "nav-collapsed:block")} />}
      </span>
      <span aria-hidden="true" className={cx("grid min-w-0 flex-1", "nav-collapsed:hidden")}>
        <span className="truncate font-display text-body-md font-bold">{i.label}</span>
        {/* Says what the number counts, so 476 on the Waitlist isn't read as everyone on it. */}
        {i.hint && <span className={cx("truncate text-caption", active ? "text-bg" : "text-ink-muted")}>{i.hint}</span>}
      </span>
      {i.count && (
        <span aria-hidden="true" className={cx("inline-flex min-w-8 justify-end font-display text-label-md font-bold tabular-nums", active ? "text-bg" : "text-ink-muted", "nav-collapsed:hidden")}>
          {count !== undefined && (count > 999 ? "999+" : count)}
        </span>
      )}
    </Link>
  );
}
