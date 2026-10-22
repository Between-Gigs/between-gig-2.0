"use client";
import * as React from "react";

const MAX = 3; // degrees: enough to feel physical, not enough to be a gimmick

/**
 * One pointer listener for every [data-tilt] card on the page: the card leans toward the pointer and its
 * light (the `lift` utility's ::after) follows it. Mouse and pen only; off with reduced motion.
 */
export function TiltCards() {
  React.useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let current: HTMLElement | null = null;
    const reset = (el: HTMLElement) => { el.style.removeProperty("--tilt-x"); el.style.removeProperty("--tilt-y"); };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const el = (e.target as Element | null)?.closest<HTMLElement>("[data-tilt]") ?? null;
      if (current && current !== el) reset(current);
      current = el;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      el.style.setProperty("--tilt-x", `${((0.5 - y) * MAX * 2).toFixed(2)}deg`);
      el.style.setProperty("--tilt-y", `${((x - 0.5) * MAX * 2).toFixed(2)}deg`);
      el.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
      el.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
    };
    const onLeave = () => { if (current) reset(current); current = null; };
    addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    return () => { removeEventListener("pointermove", onMove); document.removeEventListener("pointerleave", onLeave); };
  }, []);
  return null;
}
