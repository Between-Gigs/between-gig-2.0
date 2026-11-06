"use client";
import { Drawer, IconButton, Input, cx } from "@ds/components";
import { initials } from "@ds/components/Avatar";
import { Inbox, LayoutDashboard, ListChecks, LogOut, Mail, PanelLeftClose, PanelLeftOpen, Search, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { data, type DashboardSummary } from "@/lib/data";
import { useAuthActions } from "@/lib/auth/context";
import { useSession } from "@/lib/session";
import { SiteHeader } from "@/components/site/SiteHeader";
import { markArea } from "@/lib/split-area";
import { SAMPLE_OWNER } from "@/lib/data/fields";
import { PersonPhoto } from "@/components/people/PersonPhoto";

markArea("bg-split:dashboard");

/** The collapsed rail is remembered here; app/layout.tsx restores it onto <html data-owner-nav> before first paint. */
export const COLLAPSED_KEY = "bg2-owner-nav-collapsed";

type CountKey = "review" | "people" | "waitlist";
interface Item { href: string; label: string; icon: LucideIcon; exact?: boolean; count?: CountKey; hint?: string }

/** The owners' sections, grouped by the job: see the day, look after Gigsters, talk to people. */
const sections: { title: string; items: Item[] }[] = [
  { title: "Overview", items: [{ href: "/owners/", label: "Dashboard", icon: LayoutDashboard, exact: true }] },
  {
    title: "Gigsters",
    items: [
      { href: "/owners/review/", label: "Review queue", icon: Inbox, count: "review", hint: "waiting for review" },
      { href: "/owners/people/", label: "People", icon: Users, count: "people", hint: "invited so far" },
      { href: "/owners/waitlist/", label: "Waitlist", icon: ListChecks, count: "waitlist", hint: "not invited yet" },
    ],
  },
  { title: "Messages", items: [{ href: "/emails/", label: "Emails", icon: Mail }] },
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
  const pathname = usePathname();
  const [drawer, setDrawer] = React.useState(false);
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

  const openSearch = () => { toggle(false); requestAnimationFrame(() => search.current?.focus()); };

  return (
    <FrameContext.Provider value={ctx}>
      <div className="flex h-dvh flex-col bg-bg text-ink">
        <SiteHeader app onOpenNav={() => setDrawer(true)} />
        <div className="flex min-h-0 flex-1">
          <nav aria-label="Owner workspace" className="hidden embedded:hidden! w-60 shrink-0 flex-col border-r border-line bg-bg lg:flex nav-collapsed:w-18">
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
          <main ref={main} id="main" tabIndex={-1} className={cx("flex min-w-0 flex-1 flex-col overflow-y-auto outline-none", fit && "lg:overflow-hidden")}>
            <div className={cx("mx-auto w-full max-w-7xl flex-1 px-4 pt-4 sm:px-6 lg:px-10", fit ? "pb-8 lg:flex lg:min-h-0 lg:flex-col lg:pb-4" : "pb-16")}>
              <TopLine section={section} />
              {children}
            </div>
            <p className={cx("mx-auto w-full max-w-7xl shrink-0 px-4 text-caption text-ink-muted sm:px-6 lg:px-10", fit ? "pb-6 lg:pb-3" : "pb-6")}>Sample data: everyone shown here is fictional.</p>
          </main>
        </div>
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
    <div className="mb-6 flex min-h-14 items-center justify-between gap-4 border-b-4 border-line-strong pb-2">
      <p className="truncate text-label-sm font-bold tracking-widest text-ink-muted uppercase">Owners{here ? ` · ${here.label}` : ""}</p>
      {session && (
        <span className="flex min-w-0 items-center gap-3">
          <span className="grid min-w-0 text-right max-xs:hidden">
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
    <div className={cx("flex min-h-0 flex-1 flex-col gap-4", !drawer && "py-4")}>
      {!drawer && (
        <div className="flex h-9 items-center justify-between gap-2 pr-2 pl-4 nav-collapsed:justify-center nav-collapsed:px-0">
          <span className="truncate text-label-sm font-bold tracking-widest text-ink-muted uppercase nav-collapsed:hidden">Owner workspace</span>
          {toggle}
        </div>
      )}

      <form role="search" onSubmit={find} className={cx(!drawer && "px-4", rail("nav-collapsed:hidden"))}>
        <Input ref={searchRef} type="search" size="sm" aria-label="Find a person" placeholder="Find a person…" start={<Search />}
          value={q} onChange={(e) => setQ(e.target.value)} />
      </form>
      {!drawer && <div className="hidden justify-center nav-collapsed:flex"><IconButton variant="ghost" label="Find a person" icon={<Search />} onClick={onOpenSearch} /></div>}

      <div className={cx("no-scrollbar grid min-h-0 flex-1 content-start overflow-x-hidden overflow-y-auto", !drawer && "px-4", rail("nav-collapsed:justify-items-center nav-collapsed:px-0"))}>
        <div className={cx("grid border-t-4 border-line-strong", rail("nav-collapsed:w-12"))}>
          {sections.flatMap((s) => s.items).map((i) => {
            const n = i.count && counts ? counts[i.count] : undefined;
            return (
              <NavLink key={i.href} item={i} count={n} active={active(i)} onNavigate={onNavigate} rail={rail}
                attention={i.count === "review" && !!n} />
            );
          })}
        </div>
      </div>

      <Account drawer={drawer} rail={rail} />
    </div>
  );
}

/** Who is signed in, and signing out: the foot of the sidebar (collapsed, just the sign-out button). */
function Account({ drawer, rail }: { drawer: boolean; rail: (cls: string) => string }) {
  const { session } = useSession();
  const auth = useAuthActions();
  const router = useRouter();
  if (!session) return null;
  const name = (session.name || session.email).replace(/\s*\(.*\)$/, "");
  const signOut = async () => {
    await auth.signOut();
    // Clerk's sign-out navigates by itself (to /login/?signedOut=1).
    if (auth.provider === "sample") router.push("/login/?signedOut=1");
  };
  return (
    <div className={cx("flex items-center gap-3 border-t border-line pt-3", !drawer && "mx-4", rail("nav-collapsed:mx-auto nav-collapsed:border-0 nav-collapsed:pt-0"))}>
      {drawer && <OwnerFace name={name} email={session.email} className="size-11" />}
      <div title={`${name} · ${session.email}`} className={cx("grid min-w-0 flex-1", rail("nav-collapsed:hidden"))}>
        <span className="truncate text-label-md font-bold text-ink">{name}</span>
        <span className="truncate text-caption text-ink-muted">{session.email}</span>
      </div>
      <IconButton variant="ghost" size="sm" label="Log out" icon={<LogOut />} onClick={() => void signOut()} />
    </div>
  );
}

/**
 * One sidebar row: line icon, label, what the number counts, and the count right-aligned. The current page is
 * a solid black block. Collapsed, it's an icon with the count in its name and a dot when reviews are waiting.
 */
function NavLink({ item: i, count, active, attention, onNavigate, rail }: {
  item: Item; count?: number; active: boolean; attention: boolean; onNavigate?: () => void; rail: (cls: string) => string;
}) {
  const name = count !== undefined && i.hint ? `${i.label}, ${count} ${i.hint}` : i.label;
  const Icon = i.icon;
  return (
    <Link href={i.href} onClick={onNavigate} aria-current={active ? "page" : undefined} aria-label={name} title={name}
      className={cx(
        "group flex min-h-12 items-center gap-3 border-b border-line px-2.5 py-1.5 transition-colors duration-fast",
        rail("nav-collapsed:size-12 nav-collapsed:min-h-12 nav-collapsed:justify-center nav-collapsed:p-0"),
        active ? "border-ink bg-ink text-bg" : "text-ink hover:bg-surface-hover",
      )}>
      <span className="relative inline-flex">
        <Icon aria-hidden="true" className="size-5" strokeWidth={1.75} />
        {attention && <span aria-hidden="true" className={cx("absolute -top-1 -right-1.5 hidden size-2.5 rounded-full bg-ink-brand", rail("nav-collapsed:block"))} />}
      </span>
      <span aria-hidden="true" className={cx("grid min-w-0 flex-1", rail("nav-collapsed:hidden"))}>
        <span className="truncate font-display text-body-md font-bold">{i.label}</span>
        {/* Says what the number counts, so 476 on the Waitlist isn't read as everyone on it. */}
        {i.hint && <span className={cx("truncate text-caption", active ? "text-bg" : "text-ink-muted")}>{i.hint}</span>}
      </span>
      {i.count && (
        <span aria-hidden="true" className={cx("inline-flex min-w-8 justify-end font-display text-label-md font-bold tabular-nums", active ? "text-bg" : "text-ink-muted", rail("nav-collapsed:hidden"))}>
          {count !== undefined && (count > 999 ? "999+" : count)}
        </span>
      )}
    </Link>
  );
}
