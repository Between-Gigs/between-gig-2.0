"use client";

import * as React from "react";
import { Textarea } from "@ds/components";
import { fitLegacyServiceAnswer, usesLegacyServiceAnswerSizing } from "@/lib/profile/service-answer-sizing";

/** Scope the JS fallback to service answers; other editor textareas stay unchanged. */
export function ServiceAnswerTextarea({ value, ...props }: Omit<React.ComponentPropsWithoutRef<typeof Textarea>, "className" | "rows">) {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  React.useLayoutEffect(() => {
    if (ref.current && usesLegacyServiceAnswerSizing(globalThis.CSS)) fitLegacyServiceAnswer(ref.current);
  }, [value]);
  React.useEffect(() => {
    const field = ref.current;
    if (!field || !usesLegacyServiceAnswerSizing(globalThis.CSS)) return;
    let width = field.offsetWidth;
    const refitIfWidthChanges = () => {
      if (width === field.offsetWidth) return;
      width = field.offsetWidth;
      fitLegacyServiceAnswer(field);
    };
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(refitIfWidthChanges);
    if (observer) observer.observe(field);
    else window.addEventListener("resize", refitIfWidthChanges);
    let mounted = true;
    void document.fonts?.ready.then(() => { if (mounted) fitLegacyServiceAnswer(field); });
    return () => {
      mounted = false;
      observer?.disconnect();
      if (!observer) window.removeEventListener("resize", refitIfWidthChanges);
    };
  }, []);
  return <Textarea ref={ref} rows={2} className="min-h-20 [field-sizing:content]" value={value} {...props} />;
}
