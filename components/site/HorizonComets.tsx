"use client";
import { usePathname } from "next/navigation";
import * as React from "react";

/**
 * Marks each glow-horizon the first time it scrolls into view, which plays its one shooting star
 * (app/globals.css). Once per horizon per page view; never again while you stay on the page.
 */
export function HorizonComets() {
  const pathname = usePathname();
  React.useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        (e.target as HTMLElement).dataset.comet = "";
        io.unobserve(e.target);
      }
    }, { rootMargin: "0px 0px -20% 0px" });
    const watch = () => document.querySelectorAll(".glow-horizon:not([data-comet])").forEach((el) => io.observe(el));
    watch();
    // Pages that render after loading data (dashboards, profiles) add their horizons later.
    const mo = new MutationObserver(watch);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); };
  }, [pathname]);
  return null;
}
