import { cx } from "@ds/components";
import type * as React from "react";
import { Horizon } from "@/components/funnel/parts";

/*
 * The proposals' few Swiss pieces (direction G), matching /p/maya/ and /owners/: numbered sections that open on a
 * thick rule with the label column on the left, small tracked eyebrows, one solid mint block per screen, and the
 * forest brand block (phosphor dots + glow horizon) hard-cropped square into the grid.
 */

/** Small uppercase tracked label: eyebrows and column heads. */
export const eyebrow = "text-label-sm font-bold tracking-widest text-ink-muted uppercase";

/** The forest button on the mint block, in both themes (as on the profile's booking panel). */
export const onMint = "justify-between! bg-forest-950! text-white! hover:bg-forest-800!";

/** The one mint block of a screen: the thing to do now. */
export const mintBlock = "bg-tint-mint text-forest-950";

/**
 * A numbered section: a 4px rule, the small number and the heading in the label column (3 of 12), the content
 * beside it (9 of 12). Stacked on phones.
 */
export function Section({ id, n, title, aside, children, className, contentClassName }: {
  id: string; n: string; title: React.ReactNode; aside?: React.ReactNode; children: React.ReactNode; className?: string; contentClassName?: string;
}) {
  return (
    <section aria-labelledby={id} className={cx("grid grid-cols-12 gap-x-6 gap-y-5 border-t-4 border-line-strong pt-3 lg:pt-4", className)}>
      <div className="col-span-12 flex flex-wrap items-baseline gap-x-3 gap-y-2 lg:col-span-3 lg:block">
        <span aria-hidden="true" className="text-label-sm font-extrabold text-ink tabular-nums">{n}</span>
        <h2 id={id} className="font-display text-heading-lg text-ink lg:mt-1 lg:text-display-sm">{title}</h2>
        {aside && <div className="max-lg:ml-auto lg:mt-4">{aside}</div>}
      </div>
      <div className={cx("col-span-12 min-w-0 lg:col-span-9", contentClassName)}>{children}</div>
    </section>
  );
}

/** The forest brand block: a dark-theme island with the phosphor-dots texture and the glow horizon, square. */
export function BrandBlock({ children, className, as: Tag = "div", ...rest }: {
  children?: React.ReactNode; className?: string; as?: "div" | "section";
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag data-theme="dark" className={cx("relative isolate overflow-hidden bg-surface-brand phosphor-dots text-ink", className)} {...rest}>
      <Horizon />
      <div className="relative z-raised h-full">{children}</div>
    </Tag>
  );
}
