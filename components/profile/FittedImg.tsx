"use client";
import { cx } from "@ds/components/cx";
import * as React from "react";
import { asset } from "@/lib/site";
import { parseSample, rectFor, rectStyle } from "@/lib/profile/work-fit";

/**
 * A work sample filling its frame (the parent must be positioned): centred like object-cover, or, when the Gigster
 * aligned it, showing the part they chose. The frame's shape is measured, so the same alignment works in the editor's
 * 16:9 thumbnail and in each tile of the profile. The photo itself is never cropped (lib/profile/work-fit.ts).
 */
export function FittedImg({ sample, alt = "", imgClassName, loading }: { sample: string; alt?: string; imgClassName?: string; loading?: "lazy" | "eager" }) {
  const { src, fit } = parseSample(sample);
  const box = React.useRef<HTMLSpanElement>(null);
  const [frame, setFrame] = React.useState<number | null>(null);
  React.useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const read = () => { const { width, height } = el.getBoundingClientRect(); if (width && height) setFrame(width / height); };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const style = fit && frame ? rectStyle(rectFor(fit, frame)) : undefined;
  return (
    <span ref={box} className="absolute inset-0 block overflow-hidden">
      <img src={asset(src)} alt={alt} loading={loading} draggable={false}
        className={cx("absolute", style ? "" : "inset-0 size-full object-cover", imgClassName)} style={style} />
    </span>
  );
}
