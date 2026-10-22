import { cx } from "@ds/components";
import * as React from "react";
import "./funnel.css";

/**
 * A credits-roll strip: one list of short lines sliding past like end credits. The second copy of the track
 * only closes the loop, so it is hidden from assistive tech. Hover or focus pauses it; with reduced motion
 * it holds still and scrolls by hand instead.
 */
export function Marquee({ label, lines, className }: { label: string; lines: React.ReactNode[]; className?: string }) {
  if (!lines.length) return null;
  const track = (hidden: boolean) => (
    <ul className="bg-marquee-track" aria-hidden={hidden || undefined} aria-label={hidden ? undefined : label}>
      {lines.map((line, i) => (
        <li key={i} className="flex shrink-0 items-center gap-6 pr-6 text-label-md whitespace-nowrap text-ink-muted tabular-nums">
          {line}<span aria-hidden="true" className="size-1 rounded-full bg-action" />
        </li>
      ))}
    </ul>
  );
  return (
    <div role="region" aria-label={label} tabIndex={0} className={cx("bg-marquee py-3", className)}>
      {track(false)}{track(true)}
    </div>
  );
}
