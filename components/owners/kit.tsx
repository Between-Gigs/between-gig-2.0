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

/** The page header: title (with an optional count), one line of description, actions on the right. */
export function OwnerPage({ title, description, meta, actions, breadcrumbs, children }: {
  title: React.ReactNode; description?: React.ReactNode; meta?: React.ReactNode; actions?: React.ReactNode;
  breadcrumbs?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <>
      {breadcrumbs && <div className="mb-4">{breadcrumbs}</div>}
      <header className="flex min-h-20 flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="grid min-w-0 gap-1.5">
          <h1 className="flex flex-wrap items-center gap-3 font-display text-display-sm text-balance text-ink">
            {title}
            {meta !== undefined && <span className="inline-flex h-7 min-w-9 items-center justify-center rounded-full bg-surface-sunken px-2.5 text-label-md text-ink-muted tabular-nums">{meta}</span>}
          </h1>
          {description && <p className="max-w-2xl text-body-md text-ink-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </header>
      <div className="mt-8 grid min-w-0 grid-cols-1 gap-6">{children}</div>
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
    <Link href={href}
      className={cx("group flex h-full min-w-0 flex-col gap-3 rounded-lg border bg-surface p-4 transition-colors duration-fast hover:bg-surface-hover sm:gap-4 sm:p-5",
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
export function Row({ href, leading, title, subtitle, meta, badge }: {
  href: string; leading: React.ReactNode; title: React.ReactNode; subtitle?: React.ReactNode; meta?: React.ReactNode; badge?: React.ReactNode;
}) {
  return (
    <li className="group relative flex min-h-16 min-w-0 items-center gap-4 border-t border-line px-5 py-3 transition-colors duration-fast first:border-t-0 hover:bg-surface-hover">
      <span className="shrink-0">{leading}</span>
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="flex min-w-0 items-center gap-2">
          <Link href={href} className="min-w-0 truncate text-label-md text-ink after:absolute after:inset-0">{title}</Link>
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
    <div aria-hidden="true" className="flex min-h-20 items-end">
      <div className="grid gap-2"><Skeleton className="h-9 w-72" /><Skeleton className="h-4 w-96 max-w-full" /></div>
    </div>
  );
}
