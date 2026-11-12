"use client";
import * as React from "react";
import { data } from "@/lib/data";
import { guideReadyEvent, isGuideThumbnail } from "@/lib/guide-thumbnail";

/** Sample mode only: exposes the sample data controls as window.bgSample for the QA scripts (scripts/qa). No UI. */
export function SampleHook() {
  React.useEffect(() => {
    if (!data.demo) return;
    (window as unknown as { bgSample: typeof data.demo }).bgSample = data.demo;
    if (!isGuideThumbnail()) return;

    // A transformed iframe can paint before its font finishes downloading. Wait for this page's actual
    // body and heading faces, independently of secondary images and scripts in the document.
    const root = document.documentElement;
    let mounted = true;
    const nextPaint = requestAnimationFrame(() => {
      const styles = getComputedStyle(root);
      const loads = ["--font-sans", "--font-display"].map((token, index) =>
        document.fonts.load(`${index ? 700 : 400} 16px ${styles.getPropertyValue(token)}`)
      );
      void Promise.allSettled(loads).then(() => {
        if (!mounted) return;
        root.dataset.guideReady = "";
        window.frameElement?.dispatchEvent(new Event(guideReadyEvent));
      });
    });
    return () => { mounted = false; cancelAnimationFrame(nextPaint); };
  }, []);
  return null;
}
