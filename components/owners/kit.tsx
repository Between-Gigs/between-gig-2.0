"use client";
import { useLook } from "@/components/site/LookSync";
import { Skeleton, cx } from "@ds/components";
import { ArrowRight, ChevronDown, ChevronRight } from "lucide-react";
import { Icon3D } from "@/components/ui/Icon3D";
import type { Icon3DName } from "@/lib/icons3d";
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

/** The pastel tints, in the order avatars and tiles take them. */
const tints = ["bg-tint-sky", "bg-tint-butter", "bg-tint-peach", "bg-tint-mint-soft", "bg-tint-sage", "bg-tint-sand"] as const;
export type Tint = "mint" | "peach" | "butter" | "sky" | "sage" | "sand";
export const tintBg: Record<Tint, string> = { mint: "bg-tint-mint-soft", peach: "bg-tint-peach", butter: "bg-tint-butter", sky: "bg-tint-sky", sage: "bg-tint-sage", sand: "bg-tint-sand" };
/** A stable tint per person, so someone keeps their colour from list to list. */
const tintFor = (id: string) => tints[[...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % tints.length];

/** The one forest button (mint in the dark): the main action of a view. Use with Button/ButtonLink variant="strong". */
export const forestButton = "dark:bg-action dark:text-on-action dark:hover:bg-action-hover";
/** Small uppercase tracked label: section eyebrows, column heads, the date above the greeting. */
export const eyebrow = "text-label-sm font-bold tracking-widest text-ink-muted uppercase";

/**
 * The page header: a small eyebrow, the page's name (huge, flush left) with its count beside it in grey, a
 * friendly line under it, and the actions stacked on the right.
 */
function PageBar({ title, description, meta, icon, kicker, hero = false, actions, sticky = false }: { title: React.ReactNode; description?: React.ReactNode; meta?: React.ReactNode; icon?: Icon3DName; kicker?: React.ReactNode; hero?: boolean; actions?: React.ReactNode; sticky?: boolean }) {
  // Pinned on scrolling pages: once the page moves, it gains a solid surface and a rule, keeping its
  // actions in reach. Its height never changes, so nothing below it jumps.
  const [mark, past] = useScrolledPast<HTMLSpanElement>();
  // In the owner frame the page scrolls under the header; on a public page (emails for visitors) the window
  // scrolls, so the bar pins below the 64px site header.
  const framed = useInOwnerFrame();
  const brand = useLook() !== "swiss";
  if (brand) return (
    <>
    {sticky && <span ref={mark} aria-hidden="true" className="block h-0" />}
    <header data-call-sheet-stage="owner" className={cx("flex min-h-11 shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-3",
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
          <h1 className={cx("min-w-0 font-display text-ink", hero ? "text-display-sm text-balance sm:text-display-md" : "truncate text-display-sm lg:text-display-md")}>{title}</h1>
          {meta !== undefined && <span className="shrink-0 font-display text-heading-lg text-ink-muted tabular-nums">{meta}</span>}
        </div>
        {description && <p className="max-w-2xl text-body-md text-ink-muted">{description}</p>}
      </div>
      {actions && <div className={cx("col-span-12 flex flex-wrap gap-2 lg:flex-col lg:items-stretch lg:[&>*]:h-12 lg:[&>*]:justify-between", hero ? "lg:col-span-3" : "lg:col-span-4")}>{actions}</div>}
    </header>
    </>
  );
}

export function OwnerPage({ title, description, meta, icon, kicker, hero, actions, breadcrumbs, fit = false, children }: {
  title: React.ReactNode; description?: React.ReactNode; meta?: React.ReactNode;
  /** The small uppercase line above the title (the date on the dashboard). */ kicker?: React.ReactNode;
  /** The dashboard's greeting: the title as a huge display line. */ hero?: boolean;
  /** Illustrated mark beside the title in the card layout. */ icon?: Icon3DName; actions?: React.ReactNode;
  breadcrumbs?: React.ReactNode; /** Fill the screen height (with OwnerShell fit): children share what's left. */ fit?: boolean; children: React.ReactNode;
}) {
  const brand = useLook() !== "swiss";
  if (fit) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <PageBar title={title} description={description} meta={meta} icon={icon} kicker={kicker} hero={hero} actions={actions} />
        <div className={cx("mt-6 flex min-h-0 min-w-0 flex-1 flex-col", brand ? "gap-6" : "gap-10")}>{children}</div>
      </div>
    );
  }
  return (
    <>
      {breadcrumbs && <div className="mb-3">{breadcrumbs}</div>}
      <PageBar sticky title={title} description={description} meta={meta} icon={icon} kicker={kicker} hero={hero} actions={actions} />
      <div className={brand ? "mt-6 grid min-w-0 grid-cols-1 gap-6" : "mt-8 grid min-w-0 grid-cols-1 gap-12"}>{children}</div>
    </>
  );
}

/** A count beside a section's heading: plain grey figures. */
export function CountPill({ children, className }: { children: React.ReactNode; className?: string }) {
  const brand = useLook() !== "swiss";
  if (brand) return <span className={cx("inline-flex h-7 min-w-8 shrink-0 items-center justify-center rounded-full bg-tint-peach px-2.5 text-label-md text-tint-ink tabular-nums", className)}>{children}</span>;
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
  const countEl = count !== undefined && <CountPill className="ml-3">{count}</CountPill>;
  const brand = useLook() !== "swiss";
  if (brand) return (
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
  return (
    <Tag aria-labelledby={title && landmark ? hid : undefined} className={cx("flex min-w-0 flex-col", !!title && "border-t-4 border-line-strong", className)}>
      {title && (
        <header className="flex min-h-16 flex-wrap items-center justify-between gap-x-4 gap-y-1 pt-3 pb-2">
          <div className="flex min-w-0 items-baseline gap-3">
            {collapsible ? (
              <h2 id={hid} className="font-display text-heading-lg text-ink">
                {/* The count sits with the title, the chevron last: "Waiting for review 4 ⌄". */}
                <button type="button" onClick={toggle} aria-expanded={open} aria-controls={body}
                  className="group -ml-1 min-h-11 px-1 text-left hover:bg-surface-hover">
                  {/* Inline, not flex: a heading that wraps keeps its count and chevron after its last word. */}
                  {num}{title}
                  <span className="whitespace-nowrap">{countEl}<ChevronDown aria-hidden="true" className={cx("ml-1 inline-block size-6 align-middle text-ink-muted transition-transform duration-fast", !open && "-rotate-90")} /></span>
                </button>
              </h2>
            ) : <><h2 id={hid} className="font-display text-heading-lg text-ink">{num}{title}</h2>{count !== undefined && <CountPill>{count}</CountPill>}</>}
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
export function AgoPill({ children, tone = "peach", className }: { children: React.ReactNode; tone?: Tint; className?: string }) {
  const brand = useLook() !== "swiss";
  if (brand) return <span className={cx("inline-flex h-8 items-center justify-center rounded-full px-3", tintBg[tone], "text-label-md whitespace-nowrap text-tint-ink tabular-nums", className)}>{children}</span>;
  return <span className={cx("inline-flex items-center text-label-md whitespace-nowrap text-ink tabular-nums", className)}>{children}</span>;
}

/** A person's photo, square, or their initials on a grey square. */
export function OwnerAvatar({ id, name, src, className, textClass = "text-label-md" }: { id: string; name: string; src?: string; className?: string; textClass?: string }) {
  const brand = useLook() !== "swiss";
  if (src || !name) return <PersonPhoto id={id} name={name || "?"} src={src} alt="" className={cx(brand && "rounded-md", className)} textClass={textClass} />;
  return (
    <span aria-hidden="true" className={cx("grid place-items-center font-display font-extrabold select-none", brand ? cx("rounded-md text-tint-ink", tintFor(id)) : "bg-surface-sunken text-ink", textClass, className)}>
      {initials(name)}
    </span>
  );
}

/** A headline number. The whole block is a link; `attention` makes it the screen's one mint block. */
export function StatCard({ href, label, value, hint, icon, attention = false, tone = "sand" }: {
  href: string; label: string; value: number | null; hint: string; icon?: React.ReactNode; attention?: boolean; tone?: Tint;
}) {
  const brand = useLook() !== "swiss";
  if (brand) return (
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
  // min-h-6 (the globals.css escape from the 44px phone minimum): the whole row is the target (the ::after overlay).
  const brand = useLook() !== "swiss";
  const target = cx("min-h-6 min-w-0 truncate text-left text-heading-sm text-ink after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-focus",
    brand ? "after:rounded-lg" : "font-display font-extrabold");
  if (brand) return (
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
  return (
    <li data-fit="" className={cx("group @container relative flex min-h-20 min-w-0 items-center gap-4 border-b border-line py-3 transition-colors duration-fast hover:bg-surface-hover", className)}>
      <span className="shrink-0">{leading}</span>
      <span className="grid min-w-0 flex-1 gap-0.5">
        {/* In a narrow row the badge drops under the name instead of cutting the name short. */}
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
          {onOpen ? <button type="button" onClick={onOpen} className={target}>{title}</button> : <Link href={href ?? "#"} className={target}>{title}</Link>}
          {badge}
        </span>
        {subtitle && <span className="truncate text-body-sm text-ink-muted">{subtitle}</span>}
      </span>
      {/* By the row's own width, not the screen's: in a narrow panel the name keeps the room. */}
      {meta && <span className="hidden shrink-0 items-center gap-6 text-body-sm whitespace-nowrap text-ink-muted tabular-nums @lg:flex">{meta}</span>}
      <span aria-hidden="true" className={cx("inline-flex h-11 shrink-0 items-center justify-center gap-3 border-2 text-label-md font-bold transition-colors duration-fast",
        action ? "w-11 @md:w-auto @md:min-w-30 @md:px-4" : "w-11",
        // In the dark the page's one mint fill is its main button, so the first row's box is mint-outlined.
        strong ? "border-surface-brand bg-surface-brand text-ink-on-brand dark:border-action dark:bg-transparent dark:text-ink-brand dark:group-hover:bg-action dark:group-hover:text-on-action" : "border-line-strong text-ink group-hover:bg-ink group-hover:text-bg")}>
        {action && <span className="hidden @md:inline">{action}</span>}
        <ArrowRight className="size-4 transition-transform duration-fast group-hover:translate-x-0.5" />
      </span>
    </li>
  );
}

/**
 * The column heads over a list of Rows ("Gigster · Complete · Waiting"), on a 2px rule. Shown only where the rows
 * show their meta (a wide row, by container); narrower, the list draws the 2px rule itself. Put both inside one @container.
 * `cols` are the meta columns with the same widths the rows use; `lead` matches the rows' photo.
 */
export function RowHead({ first, cols, lead = "w-12 @md:w-16", action = true }: {
  first: string; cols: { label: string; className: string }[]; lead?: string; /** Rows with an action word ("Review"). */ action?: boolean;
}) {
  const swiss = useLook() === "swiss";
  if (!swiss) return null;
  return (
    <div aria-hidden="true" className={cx("hidden items-center gap-4 border-b-2 border-line-strong pb-2 @lg:flex", eyebrow)}>
      <span className={cx("shrink-0", lead)} />
      <span className="flex-1">{first}</span>
      <span className="flex shrink-0 gap-6">{cols.map((c) => <span key={c.label} className={c.className}>{c.label}</span>)}</span>
      <span className={cx("shrink-0", action ? "w-11 @md:w-30" : "w-11")} />
    </div>
  );
}
/** The rule a list of Rows starts on when its RowHead is hidden (narrow rows). */
export const rowListRule = "swiss:@max-lg:border-t-2 swiss:@max-lg:border-line-strong";

/**
 * The empty state (no results, nothing waiting, not found). Swiss: flush left on the grid, no box, no icon tile; a
 * heading, a line saying why, and one way on. `size="sm"` for a narrow panel (the dashboard's list). `rule` opens it
 * on a section's 4px rule when it stands in for a section.
 */
export function EmptyNote({ title, children, action, icon, size = "lg", rule = false, headingLevel = 2, className }: {
  title: React.ReactNode; children?: React.ReactNode; action?: React.ReactNode; /** A mark above the heading (the end-of-queue wrap). */ icon?: React.ReactNode;
  size?: "sm" | "lg"; rule?: boolean; headingLevel?: 2 | 3; className?: string;
}) {
  const H = headingLevel === 3 ? "h3" : "h2";
  return (
    <div className={cx("grid grid-cols-12 gap-x-6", size === "lg" ? "pt-6 pb-8 sm:pt-8" : "pt-5 pb-6", rule && "border-t-4 border-line-strong", className)}>
      <div className={cx("col-span-12 grid justify-items-start", size === "lg" ? "gap-4 lg:col-span-8" : "gap-3 xl:col-span-10")}>
        {icon}
        <H className={cx("font-display text-balance text-ink", size === "lg" ? "text-display-sm" : "text-heading-lg")}>{title}</H>
        {children && <p className={cx("max-w-xl text-pretty text-ink-muted", size === "lg" ? "text-body-lg" : "text-body-md")}>{children}</p>}
        {action && <div className="mt-2 flex flex-wrap gap-2">{action}</div>}
      </div>
    </div>
  );
}

/** How far along a profile is: the percentage, big, over a thin bar. */
export function Meter({ value, label }: { value: number; label: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const brand = useLook() !== "swiss";
  if (brand) return (
    <span className="inline-flex items-center gap-2" title={label}>
      <span aria-hidden="true" className="h-2 w-18 overflow-hidden rounded-full bg-surface-sunken">
        <span className="block h-full rounded-full bg-mint-500" style={{ width: `${v}%` }} />
      </span>
      <span className="w-10 text-right text-label-md text-ink tabular-nums"><span className="sr-only">{label}: </span>{v}%</span>
    </span>
  );
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
  const brand = useLook() !== "swiss";
  if (brand) return (
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
  const brand = useLook() !== "swiss";
  if (brand) return (
    <ul aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="mx-2 flex min-h-18 items-center gap-4 px-3 py-3 sm:mx-3">
          <Skeleton shape="block" className="size-12 rounded-md" />
          <span className="grid flex-1 gap-1.5"><Skeleton className="h-4 w-40" /><Skeleton className="h-3.5 w-56" /></span>
        </li>
      ))}
    </ul>
  );
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
  const brand = useLook() !== "swiss";
  if (brand) return (
    <div aria-hidden="true" className="flex min-h-11 items-center"><Skeleton className="h-9 w-64" /></div>
  );
  return (
    <div aria-hidden="true" className="grid min-h-16 content-end gap-2"><Skeleton className="h-3 w-32" /><Skeleton className="h-12 w-72" /></div>
  );
}

/**
 * A headline number that is also a tab: selecting it swaps the list below it in place (no new page).
 * A giant number under a 4px rule, what it counts and a line of context under it. `attention` makes it the
 * screen's one mint block (the number that needs doing today); the selected tab gets a thick bar at its foot.
 */
export function StatTab({ label, value, hint, icon, selected, attention = false, onSelect, controls, tone = "sand", suffix, meter }: {
  label: string; value: number | null; hint: string; icon?: React.ReactNode; selected: boolean; attention?: boolean; onSelect: () => void; controls: string;
  tone?: Tint; /** Small text after the number ("/500"). */ suffix?: string; meter?: number;
}) {
  const brand = useLook() !== "swiss";
  if (brand) return (
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
  return (
    <button type="button" role="tab" aria-selected={selected} aria-controls={controls} onClick={onSelect}
      aria-label={`${label}: ${value ?? "none"}, ${hint}${attention ? ", needs attention" : ""}`}
      className={cx("group relative flex h-full w-full min-w-0 flex-col justify-between gap-1 text-left transition-colors duration-fast",
        "after:absolute after:inset-x-0 after:-bottom-3 after:h-1 after:bg-ink after:opacity-0 after:transition-opacity after:duration-fast aria-selected:after:opacity-100",
        // Light: the screen's one mint block. Dark: the main button is the mint fill, so this is a 4px mint frame.
        attention ? "bg-tint-mint px-4 pt-3 pb-3 text-forest-950 sm:px-5 sm:pt-3 sm:pb-4 dark:border-4 dark:border-action dark:bg-transparent dark:text-ink dark:hover:bg-surface-hover"
          : "border-t-4 border-line-strong pt-3 text-ink hover:bg-surface-hover")}>
      <span className={cx("flex items-baseline gap-1 font-display text-display-sm tabular-nums sm:text-display-md 3xl:text-display-lg", attention && "dark:text-ink-brand")}>
        {value ?? "—"}
        {suffix && <span className={cx("text-heading-lg", attention ? "text-forest-900 dark:text-ink-muted" : "text-ink-muted")}>{suffix}</span>}
      </span>
      <span className="grid gap-0.5">
        <span className="text-label-md font-bold text-balance">{label}</span>
        <span className={cx("truncate text-body-sm max-sm:hidden", attention ? "text-forest-900 dark:text-ink-muted" : "text-ink-muted")}>{hint}</span>
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
