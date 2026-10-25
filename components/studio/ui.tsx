"use client";
import { cx } from "@ds/components";
import {
  AlignLeft, BookOpen, CalendarDays, CircleDot, DollarSign, Folder, Hash, Image as ImageIcon, Inbox, Kanban, LayoutGrid, LayoutList,
  Link, Link2, ListChecks, Mail, Sparkles, SquareCheck, Star, Table2, Tag, Type, Users,
} from "lucide-react";
import * as React from "react";
import { asset } from "@/lib/site";
import type { CollectionIcon, FieldType, ViewType } from "@/lib/studio/types";

export const collectionIcons: Record<CollectionIcon, React.ComponentType<{ className?: string }>> = {
  users: Users, book: BookOpen, image: ImageIcon, sparkles: Sparkles, inbox: Inbox, tag: Tag, folder: Folder, calendar: CalendarDays, star: Star,
};

export const fieldIcons: Record<FieldType, React.ComponentType<{ className?: string }>> = {
  text: Type, longText: AlignLeft, number: Hash, currency: DollarSign, select: CircleDot, multiSelect: ListChecks, date: CalendarDays,
  checkbox: SquareCheck, image: ImageIcon, url: Link, email: Mail, rating: Star, link: Link2,
};

export const viewIcons: Record<ViewType, React.ComponentType<{ className?: string }>> = {
  grid: Table2, gallery: LayoutGrid, kanban: Kanban, list: LayoutList, calendar: CalendarDays,
};

/** Static class names per categorical colour, so Tailwind sees every one. */
const tints = ["bg-neutral-soft", "bg-cat-1/15", "bg-cat-2/15", "bg-cat-3/15", "bg-cat-4/15", "bg-cat-5/15", "bg-cat-6/15", "bg-cat-7/15", "bg-cat-8/15"];
const dots = ["bg-ink-subtle", "bg-cat-1", "bg-cat-2", "bg-cat-3", "bg-cat-4", "bg-cat-5", "bg-cat-6", "bg-cat-7", "bg-cat-8"];
const rails = ["border-line-strong", "border-cat-1", "border-cat-2", "border-cat-3", "border-cat-4", "border-cat-5", "border-cat-6", "border-cat-7", "border-cat-8"];
export const tint = (c: number) => tints[c] ?? tints[0];
export const dot = (c: number) => dots[c] ?? dots[0];
export const rail = (c: number) => rails[c] ?? rails[0];
export const colorCount = 8;

/** A choice or tag: a soft tint of its colour with a dot, readable in both themes. */
export function Chip({ label, color, className, onRemove }: { label: string; color: number; className?: string; onRemove?: () => void }) {
  return (
    <span className={cx("inline-flex h-6 max-w-full shrink-0 items-center gap-1.5 rounded-full pr-2.5 pl-2 text-label-sm whitespace-nowrap text-ink", tint(color), onRemove && "pr-1", className)}>
      <span aria-hidden="true" className={cx("size-2 shrink-0 rounded-full", dot(color))} />
      <span className="truncate">{label}</span>
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label={`Remove ${label}`} className="-my-1 inline-flex size-6 items-center justify-center rounded-full text-ink-muted hover:bg-surface-hover hover:text-ink">
          <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
      )}
    </span>
  );
}

/** An image cell or card cover, with a quiet placeholder when there's no picture or it fails to load. */
export function Thumb({ src, alt = "", className, icon = true, initials }: { src?: string | null; alt?: string; className?: string; icon?: boolean; initials?: string }) {
  const [failed, setFailed] = React.useState(false);
  if (!src || failed) {
    const letters = initials?.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
    return (
      <span className={cx("flex items-center justify-center bg-surface-sunken text-ink-disabled", letters && "bg-surface-selected font-display text-display-sm text-ink-brand", className)}>
        {letters ? <span aria-hidden="true">{letters}</span> : icon && <ImageIcon className="size-4" aria-hidden="true" />}
      </span>
    );
  }
  return <img src={asset(src)} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(true)} className={cx("block object-cover", className)} />;
}

/** A labelled group in the inspector or a popover. */
export function Section({ title, action, children, className }: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cx("grid gap-3 border-b border-line px-4 py-4 last:border-0", className)}>
      {(title || action) && (
        <div className="flex min-h-6 items-center justify-between gap-2">
          {title && <h2 className="text-label-sm text-ink-muted">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
