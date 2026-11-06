"use client";
import { Skeleton, cx } from "@ds/components";
import { ArrowRight, ChevronDown } from "lucide-react";
import { initials } from "@ds/components/Avatar";
import Link from "next/link";
import * as React from "react";
import { useInOwnerFrame } from "./OwnerShell";
import { markArea } from "@/lib/split-area";
import { PersonPhoto } from "@/components/people/PersonPhoto";

markArea("bg-split:dashboard");

/*
 * The owner pages' kit. Every owner page is built from these few pieces so they all look and behave the same:
 * one page header, one section (Panel), one list row, one number, one set of filter chips.
 * Direction G (Swiss grid): no cards. Sections open on a thick 4px rule with a small number and a heading;
 * rows are split by hairlines; numbers are huge and set under a rule; photos are square. Mint is used once per
 * screen, as a solid block (the number that needs doing today). Line icons only.
 * Nothing animates in: content swaps in place, and skeletons have the final shape so nothing shifts.
 */

/** Kept for callers that still name a tone: in this direction every tone is the same quiet grey. */
export type Tint = "mint" | "peach" | "butter" | "sky" | "sage" | "sand";
export const tintBg: Record<Tint, string> = { mint: "bg-surface-sunken", peach: "bg-surface-sunken", butter: "bg-surface-sunken", sky: "bg-surface-sunken", sage: "bg-surface-sunken", sand: "bg-surface-sunken" };

/** The one forest button (mint in the dark): the main action of a view. Use with Button/ButtonLink variant="strong". */
export const forestButton = "dark:bg-action dark:text-on-action dark:hover:bg-action-hover";
/** Small uppercase tracked label: section eyebrows, column heads, the date above the greeting. */
export const eyebrow = "text-label-sm font-bold tracking-widest text-ink-muted uppercase";

/**
 * The page header: a small eyebrow, the page's name (huge, flush left) with its count beside it in grey, a
 * friendly line under it, and the actions stacked on the right.
 */
function PageBar({ title, description, meta, kicker, hero = false, actions, sticky = false }: { title: React.ReactNode; description?: React.ReactNode; meta?: React.ReactNode; kicker?: React.ReactNode; hero?: boolean; actions?: React.ReactNode; sticky?: boolean }) {
  // Pinned on scrolling pages: once the page moves, it gains a solid surface and a rule, keeping its
  // actions in reach. Its height never changes, so nothing below it jumps.
  const [mark, past] = useScrolledPast<HTMLSpanElement>();
  // In the owner frame the page scrolls under the header; on a public page (emails for visitors) the window
  // scrolls, so the bar pins below the 64px site header.
  const framed = useInOwnerFrame();
  return (
    <>
    {sticky && <span ref={mark} aria-hidden="true" className="block h-0" />}
    <header className={cx("grid shrink-0 grid-cols-12 items-end gap-x-6 gap-y-4",
      sticky && (framed ? "top-0" : "top-16"),
      sticky && "sticky z-sticky -mx-4 border-b border-transparent px-4 py-2 transition-colors duration-fast sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10",
      sticky && past && "border-line-strong bg-bg")}>
      <div className={cx("col-span-12 grid min-w-0 gap-2", !!actions && (hero ? "lg:col-span-9" : "lg:col-span-8"))}>
        {kicker && <p className={eyebrow}>{kicker}</p>}
        <div className="flex min-w-0 items-baseline gap-4">
          <h1 className={cx("min-w-0 font-display text-ink", hero ? "text-display-sm text-balance sm:text-display-md xl:text-display-lg" : "truncate text-display-sm lg:text-display-md")}>{title}</h1>
          {meta !== undefined && <span className="shrink-0 font-display text-heading-lg text-ink-muted tabular-nums">{meta}</span>}
        </div>
        {description && <p className="max-w-2xl text-body-md text-ink-muted">{description}</p>}
      </div>
      {actions && <div className={cx("col-span-12 flex flex-wrap gap-2 lg:flex-col lg:items-stretch lg:[&>*]:h-12 lg:[&>*]:justify-between", hero ? "lg:col-span-3" : "lg:col-span-4")}>{actions}</div>}
    </header>
    </>
  );
}

export function OwnerPage({ title, description, meta, kicker, hero, actions, breadcrumbs, fit = false, children }: {
  title: React.ReactNode; description?: React.ReactNode; meta?: React.ReactNode;
  /** The small uppercase line above the title (the date on the dashboard). */ kicker?: React.ReactNode;
  /** The dashboard's greeting: the title as a huge display line. */ hero?: boolean;
  /** Kept for older callers; this direction uses no icon beside the title. */ icon?: string; actions?: React.ReactNode;
  breadcrumbs?: React.ReactNode; /** Fill the screen height (with OwnerShell fit): children share what's left. */ fit?: boolean; children: React.ReactNode;
}) {
  if (fit) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <PageBar title={title} description={description} meta={meta} kicker={kicker} hero={hero} actions={actions} />
        <div className="mt-6 flex min-h-0 min-w-0 flex-1 flex-col gap-10">{children}</div>
      </div>
    );
  }
  return (
    <>
      {breadcrumbs && <div className="mb-3">{breadcrumbs}</div>}
      <PageBar sticky title={title} description={description} meta={meta} kicker={kicker} hero={hero} actions={actions} />
      <div className="mt-8 grid min-w-0 grid-cols-1 gap-12">{children}</div>
    </>
  );
}

/** A count beside a section's heading: plain grey figures. */
export function CountPill({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cx("shrink-0 font-display text-heading-md text-ink-muted tabular-nums", className)}>{children}</span>;
}

/**
 * The one section: a thick rule, then a small number and the heading ("01 Waiting for review"), a count in
 * grey, and a note or link on the right. A body, and an optional footer under a hairline.
 */
export function Panel({ title, id, number, count, aside, footer, flush = false, landmark = true, collapsible, className, bodyClassName, children }: {
  title?: React.ReactNode; id?: string; /** The section's number in the page ("01"). */ number?: string;
  /** A count shown beside the title. */ count?: React.ReactNode; aside?: React.ReactNode; footer?: React.ReactNode; flush?: boolean;
  /** false when the panel holds content with its own landmarks (a profile's aside), which can't nest in a region. */
  landmark?: boolean;
  /**
   * On pages with more than one table: a key, and the panel gets a minimise / expand button in its header.
   * The choice is remembered per browser, so a table you folded away stays folded.
   */
  collapsible?: string;
  className?: string; bodyClassName?: string; children: React.ReactNode;
}) {
  const auto = React.useId();
  const hid = id ?? `panel-${auto}`;
  const body = `${hid}-body`;
  const Tag = landmark ? "section" : "div";
  const [open, setOpen] = React.useState(true);
  React.useEffect(() => {
    if (!collapsible) return;
    try { if (localStorage.getItem(`bg2-panel-${collapsible}`) === "closed") setOpen(false); } catch { /* ignore */ } // eslint-disable-line react-hooks/set-state-in-effect
  }, [collapsible]);
  const toggle = () => {
    setOpen((o) => {
      try { localStorage.setItem(`bg2-panel-${collapsible}`, o ? "closed" : "open"); } catch { /* ignore */ }
      return !o;
    });
  };
  const num = number && <span aria-hidden="true" className="mr-3 align-middle text-label-md font-extrabold tracking-normal tabular-nums">{number}</span>;
  return (
    <Tag aria-labelledby={title && landmark ? hid : undefined} className={cx("flex min-w-0 flex-col", !!title && "border-t-4 border-line-strong", className)}>
      {title && (
        <header className="flex min-h-16 flex-wrap items-center justify-between gap-x-4 gap-y-1 pt-3 pb-2">
          <div className="flex min-w-0 items-baseline gap-3">
            {collapsible ? (
              <h2 id={hid} className="font-display text-heading-lg text-ink">
                <button type="button" onClick={toggle} aria-expanded={open} aria-controls={body}
                  className="group -ml-1 inline-flex min-h-11 items-center gap-1 px-1 text-left hover:bg-surface-hover">
                  {num}{title}
                  <ChevronDown aria-hidden="true" className={cx("size-6 shrink-0 text-ink-muted transition-transform duration-fast", !open && "-rotate-90")} />
                </button>
              </h2>
            ) : <h2 id={hid} className="font-display text-heading-lg text-ink">{num}{title}</h2>}
            {count !== undefined && <CountPill>{count}</CountPill>}
          </div>
          {aside && open && <div className="flex min-w-0 flex-wrap items-center gap-3 text-body-sm text-ink-muted">{aside}</div>}
        </header>
      )}
      <div id={body} hidden={!open} className={cx("min-w-0 flex-1", !flush && "pt-2 pb-2", bodyClassName)}>{children}</div>
      {footer && open && <footer className="border-t border-line py-3">{footer}</footer>}
    </Tag>
  );
}

/** A "see more" link for section headers and footers: bold and underlined, with an arrow. */
export function PanelLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="group inline-flex min-h-11 items-center gap-1.5 text-label-md font-bold text-ink underline decoration-2 underline-offset-4 transition-colors duration-fast hover:text-ink-brand">
      {children}<ArrowRight className="size-4 transition-transform duration-fast group-hover:translate-x-0.5" aria-hidden="true" />
    </Link>
  );
}

/** "15 days ago" and the like: plain figures, no pill. */
export function AgoPill({ children, className }: { children: React.ReactNode; /** Ignored: kept for callers. */ tone?: Tint; className?: string }) {
  return <span className={cx("inline-flex items-center text-label-md whitespace-nowrap text-ink tabular-nums", className)}>{children}</span>;
}

/** A person's photo, square, or their initials on a grey square. */
export function OwnerAvatar({ id, name, src, className, textClass = "text-label-md" }: { id: string; name: string; src?: string; className?: string; textClass?: string }) {
  if (src || !name) return <PersonPhoto id={id} name={name || "?"} src={src} alt="" className={className} textClass={textClass} />;
  return (
    <span aria-hidden="true" className={cx("grid place-items-center bg-surface-sunken font-display font-extrabold text-ink select-none", textClass, className)}>
      {initials(name)}
    </span>
  );
}

/** A headline number. The whole block is a link; `attention` makes it the screen's one mint block. */
export function StatCard({ href, label, value, hint, icon, attention = false }: {
  href: string; label: string; value: number | null; hint: string; icon?: React.ReactNode; attention?: boolean; tone?: Tint;
}) {
  return (
    <Link href={href}
      className={cx("group relative flex h-full min-w-0 flex-col gap-3 transition-colors duration-fast",
        attention ? "bg-tint-mint p-5 text-forest-950" : "border-t-4 border-line-strong pt-3 text-ink hover:text-ink-brand")}>
      <span className="flex items-start justify-between gap-2">
        <span className="font-display text-stat tabular-nums">{value ?? "—"}</span>
        {icon && <span aria-hidden="true" className="shrink-0 [&_svg]:size-5">{icon}</span>}
      </span>
      <span className="grid gap-1">
        <span className="truncate text-label-md font-bold">{label}</span>
        <span className={cx("truncate text-body-sm max-sm:hidden", attention ? "text-forest-900" : "text-ink-muted")}>{hint}</span>
      </span>
    </Link>
  );
}

/**
 * The list row every owner list uses: a square photo, name and subtitle, right-hand meta, and an action box
 * ("Review →", or just the arrow). Rows are split by hairlines; the whole row is the link (or button).
 */
export function Row({ href, onOpen, leading, title, subtitle, meta, badge, action, strong = false, className }: {
  /** A link to a page, or (with onOpen) a button that opens the person in place. */
  href?: string; onOpen?: () => void; leading: React.ReactNode; title: React.ReactNode; subtitle?: React.ReactNode; meta?: React.ReactNode; badge?: React.ReactNode;
  /** A word for the action box ("Review"); without it the box is just an arrow. */ action?: string;
  /** Fill the action box (the oldest in the queue). */ strong?: boolean; className?: string;
}) {
  const target = "min-w-0 truncate text-left font-display text-heading-sm font-extrabold text-ink after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-focus";
  return (
    <li data-fit="" className={cx("group @container relative flex min-h-20 min-w-0 items-center gap-4 border-b border-line py-3 transition-colors duration-fast hover:bg-surface-hover", className)}>
      <span className="shrink-0">{leading}</span>
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="flex min-w-0 items-center gap-2">
          {onOpen ? <button type="button" onClick={onOpen} className={target}>{title}</button> : <Link href={href ?? "#"} className={target}>{title}</Link>}
          {badge}
        </span>
        {subtitle && <span className="truncate text-body-sm text-ink-muted">{subtitle}</span>}
      </span>
      {/* By the row's own width, not the screen's: in a narrow panel the name keeps the room. */}
      {meta && <span className="hidden shrink-0 items-center gap-6 text-body-sm whitespace-nowrap text-ink-muted tabular-nums @lg:flex">{meta}</span>}
      <span aria-hidden="true" className={cx("inline-flex h-11 shrink-0 items-center justify-center gap-3 border-2 text-label-md font-bold transition-colors duration-fast",
        action ? "w-11 @md:w-auto @md:min-w-30 @md:px-4" : "w-11",
        strong ? "border-surface-brand bg-surface-brand text-ink-on-brand dark:border-action dark:bg-action dark:text-on-action" : "border-line-strong text-ink group-hover:bg-ink group-hover:text-bg")}>
        {action && <span className="hidden @md:inline">{action}</span>}
        <ArrowRight className="size-4 transition-transform duration-fast group-hover:translate-x-0.5" />
      </span>
    </li>
  );
}

/** How far along a profile is: the percentage, big, over a thin bar. */
export function Meter({ value, label }: { value: number; label: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <span className="inline-grid w-24 gap-1.5" title={label}>
      <span className="font-display text-heading-md text-ink tabular-nums"><span className="sr-only">{label}: </span>{v}%</span>
      <span aria-hidden="true" className="block h-1.5 bg-line">
        <span className="block h-full bg-ink" style={{ width: `${v}%` }} />
      </span>
    </span>
  );
}

export interface ChipOption { value: string; label: string; count?: number | null }

/** Filter chips: "All" plus one per status, each with its count. Square, outlined; the chosen one is solid. Scrolls sideways on phones. */
export function FilterChips({ label, options, value, onChange }: { label: string; options: ChipOption[]; value: string; onChange: (v: string) => void }) {
  return (
    <div role="group" aria-label={label} className="-mx-4 no-scrollbar flex gap-2 overflow-x-auto px-4 pb-0.5 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button key={o.value} type="button" aria-pressed={on} onClick={() => onChange(on && o.value !== "all" ? "all" : o.value)}
            className={cx("inline-flex h-11 shrink-0 items-center gap-2 border-2 px-4 text-label-md font-bold whitespace-nowrap transition-colors duration-fast",
              on ? "border-ink bg-ink text-bg" : "border-line text-ink hover:border-line-strong")}>
            {o.label}
            {o.count !== undefined && <span className={cx("tabular-nums", on ? "text-bg" : "text-ink-muted")}>{o.count ?? "–"}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Loading rows with the final row's shape, so the list doesn't shift when it arrives. */
export function RowSkeletons({ count = 4 }: { count?: number }) {
  return (
    <ul aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="flex min-h-20 items-center gap-4 border-b border-line py-3">
          <Skeleton shape="block" className="size-16" />
          <span className="grid flex-1 gap-1.5"><Skeleton className="h-4 w-40" /><Skeleton className="h-3.5 w-56" /></span>
        </li>
      ))}
    </ul>
  );
}

/** A greyed version of a page header, the same height as the real one. */
export function HeaderSkeleton() {
  return (
    <div aria-hidden="true" className="grid min-h-16 content-end gap-2"><Skeleton className="h-3 w-32" /><Skeleton className="h-12 w-72" /></div>
  );
}

/**
 * A headline number that is also a tab: selecting it swaps the list below it in place (no new page).
 * A giant number under a 4px rule, what it counts and a line of context under it. `attention` makes it the
 * screen's one mint block (the number that needs doing today); the selected tab gets a thick bar at its foot.
 */
export function StatTab({ label, value, hint, selected, attention = false, onSelect, controls, suffix }: {
  label: string; value: number | null; hint: string; /** Kept for callers; numbers carry no icon here. */ icon?: React.ReactNode; selected: boolean; attention?: boolean; onSelect: () => void; controls: string;
  tone?: Tint; /** Small text after the number ("/500"). */ suffix?: string; /** Kept for callers. */ meter?: number;
}) {
  return (
    <button type="button" role="tab" aria-selected={selected} aria-controls={controls} onClick={onSelect}
      aria-label={`${label}: ${value ?? "none"}, ${hint}${attention ? ", needs attention" : ""}`}
      className={cx("group relative flex h-full w-full min-w-0 flex-col justify-between gap-3 text-left transition-colors duration-fast",
        "after:absolute after:inset-x-0 after:-bottom-3 after:h-1 after:bg-ink after:opacity-0 after:transition-opacity after:duration-fast aria-selected:after:opacity-100",
        attention ? "bg-tint-mint px-4 pt-3 pb-4 text-forest-950 sm:px-5 sm:pt-4 sm:pb-5" : "border-t-4 border-line-strong pt-3 text-ink hover:bg-surface-hover")}>
      <span className="flex items-baseline gap-1 font-display text-display-sm tabular-nums sm:text-display-md xl:text-stat">
        {value ?? "—"}
        {suffix && <span className={cx("text-heading-lg", attention ? "text-forest-900" : "text-ink-muted")}>{suffix}</span>}
      </span>
      <span className="grid gap-0.5">
        <span className="text-label-md font-bold text-balance">{label}</span>
        <span className={cx("truncate text-body-sm max-sm:hidden", attention ? "text-forest-900" : "text-ink-muted")}>{hint}</span>
      </span>
    </button>
  );
}

/**
 * Fits a list to its box instead of scrolling it: items ([data-fit]) that don't fully fit are hidden
 * (data-fit-cut), and the hook returns how many are hidden so the panel can say "+3 more". Re-measures when
 * the box resizes. Only applies while the box clips (overflow hidden, the desktop dashboard); otherwise
 * nothing is hidden.
 */
export function useFitList(deps: unknown[]) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [hidden, setHidden] = React.useState(0);
  React.useEffect(() => {
    const box = ref.current;
    if (!box) return;
    const measure = () => {
      const items = [...box.querySelectorAll<HTMLElement>("[data-fit]")];
      const groups = [...box.querySelectorAll<HTMLElement>("[data-fit-group]")];
      [...items, ...groups].forEach((el) => el.removeAttribute("data-fit-cut"));
      if (getComputedStyle(box).overflowY !== "hidden") { setHidden(0); return; }
      const limit = box.getBoundingClientRect().bottom;
      let cut = 0;
      for (const el of items) {
        if (cut || el.getBoundingClientRect().bottom > limit + 0.5) { el.setAttribute("data-fit-cut", ""); cut++; }
      }
      // A group (a day heading with its events) goes when none of its items are left.
      for (const g of groups) if (![...g.querySelectorAll("[data-fit]")].some((el) => !el.hasAttribute("data-fit-cut"))) g.setAttribute("data-fit-cut", "");
      setHidden(cut);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    return () => ro.disconnect();
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  return [ref, hidden] as const;
}

/**
 * True once `ref` (a marker at the top of the page) has scrolled out of the owner frame's main area: the cue
 * for sticky headers to show their condensed form. Uses the nearest scrolling ancestor as the viewport.
 */
export function useScrolledPast<T extends HTMLElement>(deps: unknown[] = []) {
  const ref = React.useRef<T>(null);
  const [past, setPast] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let root: HTMLElement | null = el.parentElement;
    while (root && !/(auto|scroll)/.test(getComputedStyle(root).overflowY)) root = root.parentElement;
    const io = new IntersectionObserver(([e]) => setPast(!e.isIntersecting && e.boundingClientRect.top < (e.rootBounds?.top ?? 0)), { root, threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  return [ref, past] as const;
}
