"use client";
import * as React from "react";
import { data } from "@/lib/data";

/** Sample mode only: exposes the sample data controls as window.bgSample for the QA scripts (scripts/qa). No UI. */
export function SampleHook() {
  React.useEffect(() => {
    if (data.demo) (window as unknown as { bgSample: typeof data.demo }).bgSample = data.demo;
  }, []);
  return null;
}
