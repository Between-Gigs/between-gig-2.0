"use client";
import { usePathname } from "next/navigation";
import * as React from "react";
import { isSwiss } from "@/lib/look";

/** Keeps <html data-look> in step with client-side navigation (the first-paint script sets it on load). */
export function LookSync() {
  const pathname = usePathname();
  React.useEffect(() => {
    const d = document.documentElement;
    if (isSwiss(pathname)) d.setAttribute("data-look", "swiss");
    else d.removeAttribute("data-look");
  }, [pathname]);
  return null;
}
