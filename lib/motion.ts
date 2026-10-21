"use client";
/*
 * Route-level view transitions for the App Router. startPageTransition (from the design system) runs a
 * synchronous state update; a route change is async, so navigate() opens the transition, pushes the
 * route, and holds the "after" snapshot until the new page has mounted (RouteSettled calls settle()).
 * Shared elements with the same view-transition-name morph: the portrait from search card to profile.
 */
import { useRouter } from "next/navigation";
import * as React from "react";

type DocVT = Document & { startViewTransition?: (cb: () => Promise<void>) => { finished: Promise<void> } };

let pending: (() => void) | null = null;

/** Called once the next route has rendered. */
export function settle() {
  pending?.();
  pending = null;
}

const reduced = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function useMorphNavigate() {
  const router = useRouter();
  return React.useCallback((href: string) => {
    const doc = document as DocVT;
    if (!doc.startViewTransition || reduced()) { router.push(href); return; }
    doc.startViewTransition(() => new Promise<void>((resolve) => {
      pending = resolve;
      router.push(href);
      // Never hold the page hostage: give up on the morph if the route is slow.
      window.setTimeout(settle, 900);
    }));
  }, [router]);
}

/** Stable view-transition-name for a person's portrait, the same on every page. */
export const portraitName = (id: string) => ({ viewTransitionName: `photo-${id.replace(/[^a-z0-9-]/gi, "")}` });

/** Pages that load data call this with true once their content (and any morph target) is on screen. */
export function useSettleWhen(ready: boolean) {
  React.useLayoutEffect(() => { if (ready) settle(); }, [ready]);
}
