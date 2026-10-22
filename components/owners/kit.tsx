"use client";
import { Skeleton, cx } from "@ds/components";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import * as React from "react";

/*
 * The owner pages' kit. Every owner page is built from these few pieces so they all look and behave the same:
 * one page header, one card (Panel), one list row, one number card, one set of filter chips. One radius for
 * cards (rounded-lg), one for things inside them (rounded-md). Surfaces are separated by a hairline and a
 * shade, never by colour. Mint is kept for actions, the one number that needs attention, and data.
 * Nothing animates in: content swaps in place, and skeletons have the final shape so nothing shifts.
 */

/**
 * The page header: one slim line. The page's name (and its count) on the left, actions on the right. The
 * sidebar already says where you are and every card has its own title, so there's no explainer paragraph on
 * screen; `description` is kept for screen readers.
 */
function PageBar({ title, description, meta, actions, sticky = false }: { title: React.ReactNode; description?: React.ReactNode; meta?: React.ReactNode; actions?: React.ReactNode; sticky?: boolean }) {
  // Pinned on scrolling pages: once the page moves, it gains a frosted surface and a hairline, keeping its
  // actions in reach. Its height never changes, so nothing below it jumps.
  const [mark, past] = useScrolledPast<HTMLSpanElement>();
  return (
    <>
    {sticky && <span ref={mark} aria-hidden="true" className="block h-0" />}
    <header className={cx("flex min-h-11 shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2",
      sticky && "sticky top-0 z-sticky -mx-4 px-4 py-2 transition-[background-color,box-shadow] duration-fast sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10",
      sticky && past && "bg-bg/85 shadow-sm backdrop-blur-md")}>
      <div className="flex min-w-0 items-center gap-3">
        <h1 className="truncate font-display text-heading-lg text-ink">{title}</h1>
        {meta !== undefined && <span className="inline-flex h-6 min-w-8 items-center justify-center rounded-full bg-surface-sunken px-2 text-label-sm text-ink-muted tabular-nums">{meta}</span>}
        {description && <p className="sr-only">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
    </>
  );
}

export function OwnerPage({ title, description, meta, actions, breadcrumbs, fit = false, children }: {
  title: React.ReactNode; description?: React.ReactNode; meta?: React.ReactNode; actions?: React.ReactNode;
  breadcrumbs?: React.ReactNode; /** Fill the screen height (with OwnerShell fit): children share what's left. */ fit?: boolean; children: React.ReactNode;
}) {
  if (fit) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <PageBar title={title} description={description} meta={meta} actions={actions} />
        <div className="mt-5 flex min-h-0 min-w-0 flex-1 flex-col gap-5">{children}</div>
      </div>
    );
  }
  return (
    <>
      {breadcrumbs && <div className="mb-3">{breadcrumbs}</div>}
      <PageBar sticky title={title} description={description} meta={meta} actions={actions} />
      <div className="mt-5 grid min-w-0 grid-cols-1 gap-5">{children}</div>
    </>
  );
}

/** The one card. A header bar (title, optional note or link on the right), a body, an optional footer. */
export function Panel({ title, id, aside, footer, flush = false, landmark = true, className, bodyClassName, children }: {
  title?: React.ReactNode; id?: string; aside?: React.ReactNode; footer?: React.ReactNode; flush?: boolean;
  /** false when the panel holds content with its own landmarks (a profile's aside), which can't nest in a region. */
  landmark?: boolean; className?: string; bodyClassName?: string; children: React.ReactNode;
}) {
  const auto = React.useId();
  const hid = id ?? `panel-${auto}`;
  const Tag = landmark ? "section" : "div";
  return (
    <Tag aria-labelledby={title && landmark ? hid : undefined} className={cx("flex min-w-0 flex-col overflow-hidden rounded-lg border border-line bg-surface", className)}>
      {title && (
        <header className="flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-line px-5 py-3">
          <h2 id={hid} className="font-display text-heading-sm text-ink">{title}</h2>
          {aside && <div className="flex items-center gap-3 text-body-sm text-ink-muted">{aside}</div>}
        </header>
      )}
      <div className={cx("min-w-0 flex-1", !flush && "p-5", bodyClassName)}>{children}</div>
      {footer && <footer className="border-t border-line px-5 py-3">{footer}</footer>}
    </Tag>
  );
}

/** A quiet "see more" link for panel headers and footers. */
export function PanelLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="group inline-flex min-h-8 items-center gap-1 rounded-sm text-label-md text-ink-muted transition-colors duration-fast hover:text-ink">
      {children}<ChevronRight className="size-4 text-ink-subtle transition-transform duration-fast group-hover:translate-x-0.5" aria-hidden="true" />
    </Link>
  );
}

/** A headline number. The whole card is a link; `attention` marks the one number that needs doing today. */
export function StatCard({ href, label, value, hint, icon, attention = false }: {
  href: string; label: string; value: number | null; hint: string; icon: React.ReactNode; attention?: boolean;
}) {
  return (
    <Link href={href} data-tilt=""
      className={cx("lift group flex h-full min-w-0 flex-col gap-3 rounded-lg border bg-surface p-4 hover:bg-surface-hover sm:gap-4 sm:p-5",
        attention ? "border-ink-brand" : "border-line hover:border-line-strong")}>
      <span className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2.5 text-label-md text-ink-muted">
          <span className={cx("grid size-8 shrink-0 place-items-center rounded-md [&_svg]:size-4", attention ? "bg-action text-on-action" : "bg-surface-sunken text-ink-muted")}>{icon}</span>
          <span className="truncate">{label}</span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-ink-subtle transition-transform duration-fast group-hover:translate-x-0.5 max-sm:hidden" aria-hidden="true" />
      </span>
      <span className="grid gap-1">
        <span className="font-display text-display-sm text-ink tabular-nums">{value ?? "—"}</span>
        <span className="truncate text-body-sm text-ink-subtle max-sm:hidden">{hint}</span>
      </span>
    </Link>
  );
}

/** The list row every owner list uses: leading avatar, title and subtitle, right-hand meta, a chevron. */
export function Row({ href, onOpen, leading, title, subtitle, meta, badge, className }: {
  /** A link to a page, or (with onOpen) a button that opens the person in place. */
  href?: string; onOpen?: () => void; leading: React.ReactNode; title: React.ReactNode; subtitle?: React.ReactNode; meta?: React.ReactNode; badge?: React.ReactNode; className?: string;
}) {
  const target = "min-w-0 truncate text-left text-label-md text-ink after:absolute after:inset-0";
  return (
    <li data-fit="" className={cx("row-lift group relative flex min-h-16 min-w-0 items-center gap-4 border-t border-line px-5 py-3 first:border-t-0 hover:bg-surface-hover", className)}>
      <span className="shrink-0">{leading}</span>
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="flex min-w-0 items-center gap-2">
          {onOpen ? <button type="button" onClick={onOpen} className={target}>{title}</button> : <Link href={href ?? "#"} className={target}>{title}</Link>}
          {badge}
        </span>
        {subtitle && <span className="truncate text-body-sm text-ink-muted">{subtitle}</span>}
      </span>
      {meta && <span className="hidden shrink-0 items-center gap-4 text-body-sm whitespace-nowrap text-ink-subtle tabular-nums sm:flex">{meta}</span>}
      <ChevronRight className="size-4 shrink-0 text-ink-subtle transition-transform duration-fast group-hover:translate-x-0.5 group-hover:text-ink" aria-hidden="true" />
    </li>
  );
}

/** How far along a profile is: a slim bar and the percentage. */
export function Meter({ value, label }: { value: number; label: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <span className="inline-flex items-center gap-2" title={label}>
      <span aria-hidden="true" className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-sunken">
        <span className="block h-full rounded-full bg-action" style={{ width: `${v}%` }} />
      </span>
      <span className="w-9 text-right text-body-sm text-ink-muted tabular-nums"><span className="sr-only">{label}: </span>{v}%</span>
    </span>
  );
}

export interface ChipOption { value: string; label: string; count?: number | null }

/** Filter chips: "All" plus one per status, each with its count. Scrolls sideways on phones. */
export function FilterChips({ label, options, value, onChange }: { label: string; options: ChipOption[]; value: string; onChange: (v: string) => void }) {
  return (
    <div role="group" aria-label={label} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button key={o.value} type="button" aria-pressed={on} onClick={() => onChange(on && o.value !== "all" ? "all" : o.value)}
            className={cx("inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-label-md whitespace-nowrap transition-colors duration-fast",
              on ? "border-ink-brand bg-surface-selected text-ink" : "border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink")}>
            {o.label}
            {o.count !== undefined && <span className={cx("tabular-nums", on ? "text-ink-brand" : "text-ink-subtle")}>{o.count ?? "–"}</span>}
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
        <li key={i} className="flex min-h-16 items-center gap-4 border-t border-line px-5 py-3 first:border-t-0">
          <Skeleton shape="block" className="size-10 rounded-md" />
          <span className="grid flex-1 gap-1.5"><Skeleton className="h-3.5 w-40" /><Skeleton className="h-3 w-56" /></span>
        </li>
      ))}
    </ul>
  );
}

/** A greyed version of a page header, the same height as the real one. */
export function HeaderSkeleton() {
  return (
    <div aria-hidden="true" className="flex min-h-11 items-center"><Skeleton className="h-7 w-56" /></div>
  );
}

/**
 * A headline number that is also a tab: selecting it swaps the list below it in place (no new page).
 * `attention` marks the one that needs doing today.
 */
export function StatTab({ label, value, hint, icon, selected, attention = false, onSelect, controls }: {
  label: string; value: number | null; hint: string; icon: React.ReactNode; selected: boolean; attention?: boolean; onSelect: () => void; controls: string;
}) {
  return (
    <button type="button" role="tab" aria-selected={selected} aria-controls={controls} onClick={onSelect} data-tilt=""
      className={cx("lift group grid h-full min-w-0 gap-2 rounded-lg border p-4 text-left",
        selected ? "border-ink-brand bg-surface-selected" : "border-line bg-surface hover:border-line-strong hover:bg-surface-hover")}>
      <span className="flex min-w-0 items-center gap-2.5 text-label-md text-ink-muted">
        <span className={cx("grid size-7 shrink-0 place-items-center rounded-md [&_svg]:size-4", attention ? "bg-action text-on-action" : selected ? "bg-surface text-ink-brand" : "bg-surface-sunken text-ink-muted")}>{icon}</span>
        <span className="truncate">{label}</span>
      </span>
      <span className="flex items-baseline gap-2">
        <span className="font-display text-heading-lg text-ink tabular-nums">{value ?? "—"}</span>
        <span className="truncate text-body-sm text-ink-subtle max-sm:hidden">{hint}</span>
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
