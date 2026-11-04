"use client";
import { usePathname } from "next/navigation";
import * as React from "react";
import { isFriendly } from "@/lib/look";

/** Keeps <html data-look> in step with client-side navigation (the first-paint script sets it on load). */
export function LookSync() {
  const pathname = usePathname();
  React.useEffect(() => {
    const d = document.documentElement;
    if (isFriendly(pathname)) d.setAttribute("data-look", "friendly");
    else d.removeAttribute("data-look");
  }, [pathname]);
  return null;
}
