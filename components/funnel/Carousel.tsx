"use client";
import { IconButton, cx } from "@ds/components";
import { ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";
import "./funnel.css";

/**
 * A horizontal, scroll-snapping row of cards: a real list in a labelled, keyboard-scrollable region, with soft
 * edges and previous/next buttons (from sm up) as the affordance; the scrollbar itself is hidden. `gridFrom` turns it
 * back into a plain grid from that breakpoint (two columns from md, four from lg).
 */
export function Carousel({ label, children, itemClassName, gridFrom, className }: {
  label: string; children: React.ReactNode; itemClassName?: string; gridFrom?: "md" | "lg"; className?: string;
}) {
  const scroller = React.useRef<HTMLDivElement>(null);
  const id = React.useId();
  const [more, setMore] = React.useState({ start: false, end: true });

  const measure = React.useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const start = el.scrollLeft > 4;
    const end = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
    setMore((m) => (m.start === start && m.end === end ? m : { start, end }));
  }, []);
  React.useEffect(() => {
    measure();
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  const go = (dir: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: reduced ? "auto" : "smooth" });
  };

  const items = React.Children.toArray(children);
  return (
    <div className={cx("grid gap-3", className)}>
      <div className={cx("hidden justify-end gap-2 sm:flex", gridFrom === "md" && "md:hidden", gridFrom === "lg" && "lg:hidden")}>
        <IconButton label={`Previous: ${label}`} variant="secondary" icon={<ChevronLeft />} disabled={!more.start} onClick={() => go(-1)} aria-controls={id} className="rounded-full" />
        <IconButton label={`Next: ${label}`} variant="secondary" icon={<ChevronRight />} disabled={!more.end} onClick={() => go(1)} aria-controls={id} className="rounded-full" />
      </div>
      <div ref={scroller} id={id} role="region" aria-label={label} tabIndex={0} onScroll={measure}
        data-more-start={more.start || undefined} data-more-end={more.end || undefined} data-grid={gridFrom}
        className="bg-carousel -mx-4 snap-x snap-mandatory scroll-px-4 overflow-x-auto px-4 pb-3 sm:mx-0 sm:scroll-px-0 sm:px-0">
        <ul className={cx("flex gap-4", gridFrom === "md" && "md:grid md:grid-cols-2 md:gap-6", gridFrom === "lg" && "lg:grid lg:grid-cols-4")}>
          {items.map((child, i) => (
            <li key={React.isValidElement(child) && child.key != null ? child.key : i}
              className={cx("flex shrink-0 snap-start", itemClassName, gridFrom === "md" && "md:w-auto", gridFrom === "lg" && "lg:w-auto")}>
              {child}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
