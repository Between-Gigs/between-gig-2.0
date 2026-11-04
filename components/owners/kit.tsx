"use client";
import { Skeleton, cx } from "@ds/components";
import { ArrowRight, ChevronRight } from "lucide-react";
import { initials } from "@ds/components/Avatar";
import Link from "next/link";
import * as React from "react";
import { useInOwnerFrame } from "./OwnerShell";
import { markArea } from "@/lib/split-area";
import { Icon3D } from "@/components/ui/Icon3D";
import { PersonPhoto } from "@/components/people/PersonPhoto";
import type { Icon3DName } from "@/lib/icons3d";

markArea("bg-split:dashboard");

/*
 * The owner pages' kit. Every owner page is built from these few pieces so they all look and behave the same:
 * one page header, one card (Panel), one list row, one number card, one set of filter chips.
 * Direction B (warm & friendly): white cards with a soft shadow on the cream page (rounded-xl), pastel number
 * tiles with a 3D icon, pill buttons and pills for counts and "days ago", dashed dividers between rows.
 * Nothing animates in: content swaps in place, and skeletons have the final shape so nothing shifts.
 */

/** The pastel tints, in the order avatars and tiles take them. */
const tints = ["bg-tint-sky", "bg-tint-butter", "bg-tint-peach", "bg-tint-mint", "bg-tint-sage", "bg-tint-sand"] as const;
export type Tint = "mint" | "peach" | "butter" | "sky" | "sage" | "sand";
export const tintBg: Record<Tint, string> = { mint: "bg-tint-mint", peach: "bg-tint-peach", butter: "bg-tint-butter", sky: "bg-tint-sky", sage: "bg-tint-sage", sand: "bg-tint-sand" };
/** A stable tint per person, so someone keeps their colour from list to list. */
const tintFor = (id: string) => tints[[...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % tints.length];

/**
 * The page header: the page's name (a 3D icon and its count beside it), a friendly line under it, actions on
 * the right.
 */
function PageBar({ title, description, meta, icon, actions, sticky = false }: { title: React.ReactNode; description?: React.ReactNode; meta?: React.ReactNode; icon?: Icon3DName; actions?: React.ReactNode; sticky?: boolean }) {
  // Pinned on scrolling pages: once the page moves, it gains a solid surface and a shadow, keeping its
  // actions in reach. Its height never changes, so nothing below it jumps.
  const [mark, past] = useScrolledPast<HTMLSpanElement>();
  // In the owner frame the page scrolls under the header; on a public page (emails for visitors) the window
  // scrolls, so the bar pins below the 64px site header.
  const framed = useInOwnerFrame();
  return (
    <>
    {sticky && <span ref={mark} aria-hidden="true" className="block h-0" />}
    <header className={cx("flex min-h-11 shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-3",
      sticky && (framed ? "top-0" : "top-16"),
      sticky && "sticky z-sticky -mx-4 px-4 py-2 transition-[background-color,box-shadow] duration-fast sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10",
      sticky && past && "bg-bg shadow-sm")}>
      <div className="grid min-w-0 gap-1">
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="truncate font-display text-display-sm text-ink">{title}</h1>
          {icon && <Icon3D name={icon} className="size-9 max-sm:size-8" />}
          {meta !== undefined && <span className="inline-flex h-7 min-w-8 shrink-0 items-center justify-center rounded-full bg-tint-peach px-2.5 text-label-md text-tint-ink tabular-nums">{meta}</span>}
        </div>
        {description && <p className="text-body-md text-ink-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
    </>
  );
}

export function OwnerPage({ title, description, meta, icon, actions, breadcrumbs, fit = false, children }: {
  title: React.ReactNode; description?: React.ReactNode; meta?: React.ReactNode; /** A 3D icon beside the title. */ icon?: Icon3DName; actions?: React.ReactNode;
  breadcrumbs?: React.ReactNode; /** Fill the screen height (with OwnerShell fit): children share what's left. */ fit?: boolean; children: React.ReactNode;
}) {
  if (fit) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <PageBar title={title} description={description} meta={meta} icon={icon} actions={actions} />
        <div className="mt-6 flex min-h-0 min-w-0 flex-1 flex-col gap-6">{children}</div>
      </div>
    );
  }
  return (
    <>
      {breadcrumbs && <div className="mb-3">{breadcrumbs}</div>}
      <PageBar sticky title={title} description={description} meta={meta} icon={icon} actions={actions} />
      <div className="mt-6 grid min-w-0 grid-cols-1 gap-6">{children}</div>
    </>
  );
}

/** A soft pill for a count beside a card's title. */
export function CountPill({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cx("inline-flex h-7 min-w-8 shrink-0 items-center justify-center rounded-full bg-tint-peach px-2.5 text-label-md text-tint-ink tabular-nums", className)}>{children}</span>;
}

/** The one card: white, rounded, a soft shadow. A header (title, optional count pill, note or link on the right), a body, an optional footer. */
export function Panel({ title, id, count, aside, footer, flush = false, landmark = true, collapsible, className, bodyClassName, children }: {
  title?: React.ReactNode; id?: string; /** A count shown as a pill beside the title. */ count?: React.ReactNode; aside?: React.ReactNode; footer?: React.ReactNode; flush?: boolean;
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
  return (
    <Tag aria-labelledby={title && landmark ? hid : undefined} className={cx("flex min-w-0 flex-col overflow-hidden rounded-xl bg-surface shadow-sm ring-1 ring-line/70", className)}>
      {title && (
        <header className={cx("flex min-h-16 flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 pt-4 sm:px-6", open ? "pb-2" : "pb-4")}>
          <div className="flex min-w-0 items-center gap-3">
            {collapsible ? (
              <h2 id={hid} className="font-display text-heading-lg text-ink">
                <button type="button" onClick={toggle} aria-expanded={open} aria-controls={body}
                  className="group -ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 hover:bg-surface-hover">
                  <ChevronRight aria-hidden="true" className={cx("size-5 text-ink-subtle transition-transform duration-fast", open && "rotate-90")} />
                  {title}
                </button>
              </h2>
            ) : <h2 id={hid} className="font-display text-heading-lg text-ink">{title}</h2>}
            {count !== undefined && <CountPill>{count}</CountPill>}
          </div>
          {aside && open && <div className="flex min-w-0 flex-wrap items-center gap-3 text-body-sm text-ink-muted">{aside}</div>}
        </header>
      )}
      <div id={body} hidden={!open} className={cx("min-w-0 flex-1", !flush && "px-5 pt-2 pb-5 sm:px-6 sm:pb-6", bodyClassName)}>{children}</div>
      {footer && open && <footer className="mx-5 border-t-2 border-dashed border-line py-3 sm:mx-6">{footer}</footer>}
    </Tag>
  );
}

/** A "see more" link for panel headers and footers: bold and underlined, with an arrow. */
export function PanelLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="group inline-flex min-h-11 items-center gap-1.5 rounded-sm text-label-md text-ink underline decoration-2 underline-offset-4 transition-colors duration-fast hover:text-ink-brand">
      {children}<ArrowRight className="size-4 transition-transform duration-fast group-hover:translate-x-0.5" aria-hidden="true" />
    </Link>
  );
}

/** "15 days ago" and the like: a soft peach pill. */
export function AgoPill({ children, tone = "peach", className }: { children: React.ReactNode; tone?: Tint; className?: string }) {
  return <span className={cx("inline-flex h-8 items-center justify-center rounded-full px-3", tintBg[tone], "text-label-md whitespace-nowrap text-tint-ink tabular-nums", className)}>{children}</span>;
}

/** A person's photo, or their initials on their own pastel tile. */
export function OwnerAvatar({ id, name, src, className, textClass = "text-label-md" }: { id: string; name: string; src?: string; className?: string; textClass?: string }) {
  if (src || !name) return <PersonPhoto id={id} name={name || "?"} src={src} alt="" className={className} textClass={textClass} />;
  return (
    <span aria-hidden="true" className={cx("grid place-items-center font-display font-extrabold text-tint-ink select-none", tintFor(id), textClass, className)}>
      {initials(name)}
    </span>
  );
}

/** A headline number. The whole card is a link; `attention` marks the one number that needs doing today. */
export function StatCard({ href, label, value, hint, icon, attention = false, tone = "sand" }: {
  href: string; label: string; value: number | null; hint: string; icon: React.ReactNode; attention?: boolean; tone?: Tint;
}) {
  return (
    <Link href={href} data-tilt=""
      className={cx("lift group relative flex h-full min-w-0 flex-col gap-3 rounded-lg p-5 text-tint-ink", tintBg[tone], attention && "ring-2 ring-ink")}>
      <span className="flex items-start justify-between gap-2">
        <span className="min-w-0 truncate text-label-md">{label}</span>
        <span className="shrink-0 [&_svg]:size-5">{icon}</span>
      </span>
      <span className="mt-auto grid gap-1">
        <span className="font-display text-display-md tabular-nums">{value ?? "—"}</span>
        <span className="truncate text-body-sm text-ink-muted max-sm:hidden">{hint}</span>
      </span>
    </Link>
  );
}

/** The list row every owner list uses: leading avatar, title and subtitle, right-hand meta, a round arrow. */
export function Row({ href, onOpen, leading, title, subtitle, meta, badge, className }: {
  /** A link to a page, or (with onOpen) a button that opens the person in place. */
  href?: string; onOpen?: () => void; leading: React.ReactNode; title: React.ReactNode; subtitle?: React.ReactNode; meta?: React.ReactNode; badge?: React.ReactNode; className?: string;
}) {
  const target = "min-w-0 truncate text-left text-heading-sm text-ink after:absolute after:inset-0 after:rounded-lg";
  return (
    <li data-fit="" className={cx("group @container relative mx-2 flex min-h-18 min-w-0 items-center gap-4 rounded-lg px-3 py-3 transition-colors duration-fast hover:bg-surface-hover sm:mx-3",
      "before:absolute before:inset-x-3 before:top-0 before:border-t-2 before:border-dashed before:border-line first:before:hidden", className)}>
      <span className="shrink-0">{leading}</span>
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="flex min-w-0 items-center gap-2">
          {onOpen ? <button type="button" onClick={onOpen} className={target}>{title}</button> : <Link href={href ?? "#"} className={target}>{title}</Link>}
          {badge}
        </span>
        {subtitle && <span className="truncate text-body-sm text-ink-muted">{subtitle}</span>}
      </span>
      {/* By the row's own width, not the screen's: in a narrow panel the name keeps the room. */}
      {meta && <span className="hidden shrink-0 items-center gap-4 text-body-sm whitespace-nowrap text-ink-subtle tabular-nums @md:flex">{meta}</span>}
      <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-selected text-ink transition-colors duration-fast group-hover:bg-highlight max-xs:size-8">
        <ArrowRight className="size-4 transition-transform duration-fast group-hover:translate-x-0.5" />
      </span>
    </li>
  );
}

/** How far along a profile is: a slim mint bar and the percentage. */
export function Meter({ value, label }: { value: number; label: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <span className="inline-flex items-center gap-2" title={label}>
      <span aria-hidden="true" className="h-2 w-18 overflow-hidden rounded-full bg-surface-sunken">
        <span className="block h-full rounded-full bg-mint-500" style={{ width: `${v}%` }} />
      </span>
      <span className="w-10 text-right text-label-md text-ink tabular-nums"><span className="sr-only">{label}: </span>{v}%</span>
    </span>
  );
}

export interface ChipOption { value: string; label: string; count?: number | null }

/** Filter chips: "All" plus one per status, each with its count. Scrolls sideways on phones. */
export function FilterChips({ label, options, value, onChange }: { label: string; options: ChipOption[]; value: string; onChange: (v: string) => void }) {
  return (
    <div role="group" aria-label={label} className="-mx-4 no-scrollbar flex gap-2 overflow-x-auto px-4 pb-0.5 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button key={o.value} type="button" aria-pressed={on} onClick={() => onChange(on && o.value !== "all" ? "all" : o.value)}
            className={cx("inline-flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-label-md whitespace-nowrap transition-colors duration-fast",
              on ? "border-ink bg-surface-selected text-ink" : "border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink")}>
            {o.label}
            {o.count !== undefined && <span className={cx("tabular-nums", on ? "text-ink" : "text-ink-subtle")}>{o.count ?? "–"}</span>}
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
        <li key={i} className="mx-2 flex min-h-18 items-center gap-4 px-3 py-3 sm:mx-3">
          <Skeleton shape="block" className="size-12 rounded-md" />
          <span className="grid flex-1 gap-1.5"><Skeleton className="h-4 w-40" /><Skeleton className="h-3.5 w-56" /></span>
        </li>
      ))}
    </ul>
  );
}

/** A greyed version of a page header, the same height as the real one. */
export function HeaderSkeleton() {
  return (
    <div aria-hidden="true" className="flex min-h-11 items-center"><Skeleton className="h-9 w-64" /></div>
  );
}

/**
 * A headline number that is also a tab: selecting it swaps the list below it in place (no new page).
 * A pastel tile: what it counts and a 3D icon on top, the big number at the foot. `attention` marks the one
 * that needs doing today; `meter` (0 to 1) adds a bar under the number.
 */
export function StatTab({ label, value, hint, icon, selected, attention = false, onSelect, controls, tone = "sand", suffix, meter }: {
  label: string; value: number | null; hint: string; icon: React.ReactNode; selected: boolean; attention?: boolean; onSelect: () => void; controls: string;
  tone?: Tint; /** Small text after the number ("of 500"). */ suffix?: string; meter?: number;
}) {
  return (
    <button type="button" role="tab" aria-selected={selected} aria-controls={controls} onClick={onSelect} data-tilt=""
      aria-label={`${label}: ${value ?? "none"}, ${hint}${attention ? ", needs attention" : ""}`}
      className={cx("lift group relative flex h-full min-h-32 min-w-0 flex-col gap-3 rounded-lg p-4 text-left text-tint-ink transition-shadow duration-fast sm:min-h-36 sm:p-5",
        tintBg[tone], selected ? "ring-2 ring-ink" : "hover:shadow-md")}>
      <span className="flex items-start justify-between gap-2">
        <span className="grid min-w-0 gap-0.5">
          <span className="flex min-w-0 items-center gap-2 text-label-md">
            <span className="min-w-0 text-balance">{label}</span>
            {attention && <span className="size-2.5 shrink-0 rounded-full bg-ink ring-4 ring-surface/70" aria-hidden="true" />}
          </span>
          {!suffix && <span className="truncate text-body-sm text-ink-muted max-sm:hidden">{hint}</span>}
        </span>
        <span className="-mt-1 -mr-1 shrink-0">{icon}</span>
      </span>
      <span className="mt-auto grid gap-2">
        <span className="flex items-baseline gap-1.5">
          <span className="font-display text-display-md tabular-nums">{value ?? "—"}</span>
          {suffix && <span className="text-heading-sm">{suffix}</span>}
        </span>
        {meter !== undefined && (
          <span aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-surface/75">
            <span className="block h-full rounded-full bg-ink" style={{ width: `${Math.max(0, Math.min(1, meter)) * 100}%` }} />
          </span>
        )}
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
