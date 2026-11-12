"use client";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useSyncExternalStore } from "react";
import { defaultLook, hasSiteLook, isBrandPage, isLook, lookKey, unstyledKey, type Look } from "@/lib/look";

const changeEvent = "bg2-look-change";
let unsaved: Look | undefined;

function readLook(): Look {
  if (unsaved) return unsaved;
  try {
    const saved = localStorage.getItem(lookKey);
    if (isLook(saved)) return saved;
  } catch { /* Storage is optional. */ }
  const entry = document.documentElement.dataset.entryLook ?? null;
  return isLook(entry) ? entry : defaultLook;
}

function subscribe(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === lookKey || event.key === unstyledKey || event.key === null) {
      unsaved = undefined;
      unsavedPlain = undefined;
      onChange();
    }
  };
  window.addEventListener(changeEvent, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(changeEvent, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function useLook() {
  return useSyncExternalStore(subscribe, readLook, () => defaultLook);
}

export function selectLook(look: Look) {
  // A shared theme link is an entry point. A later manual choice must still survive refresh.
  const url = new URL(window.location.href);
  if (url.searchParams.has("look")) {
    url.searchParams.delete("look");
    window.history.replaceState(window.history.state, "", url);
  }
  delete document.documentElement.dataset.entryLook;
  try {
    localStorage.setItem(lookKey, look);
    unsaved = undefined;
  } catch { unsaved = look; }
  window.dispatchEvent(new Event(changeEvent));
}

let unsavedPlain: boolean | undefined;
function readUnstyled() {
  if (unsavedPlain !== undefined) return unsavedPlain;
  try { return localStorage.getItem(unstyledKey) === "1"; } catch { return false; }
}

/** Styled or Unstyled (wireframe) mode. Works with every look and the Day/Night switch. */
export function useUnstyled() {
  return useSyncExternalStore(subscribe, readUnstyled, () => false);
}

export function setUnstyled(on: boolean) {
  const url = new URL(window.location.href);
  if (url.searchParams.has("unstyled")) {
    url.searchParams.delete("unstyled");
    window.history.replaceState(window.history.state, "", url);
  }
  try {
    localStorage.setItem(unstyledKey, on ? "1" : "0");
    unsavedPlain = undefined;
  } catch { unsavedPlain = on; }
  window.dispatchEvent(new Event(changeEvent));
}

export function LookSync() {
  const pathname = usePathname();
  const look = useLook();
  const plain = useUnstyled();
  useLayoutEffect(() => {
    // During hydration the server snapshot is the default. Keep the pre-paint choice until React catches up.
    document.documentElement.toggleAttribute("data-brand-page", isBrandPage(pathname));
    const active = readLook();
    if (hasSiteLook(pathname, active)) document.documentElement.dataset.look = active;
    else delete document.documentElement.dataset.look;
    // Before hydration finishes the server snapshot is false; keep what the pre-paint script set.
    const bare = readUnstyled() && hasSiteLook(pathname, active);
    document.documentElement.toggleAttribute("data-unstyled", bare);
  }, [pathname, look, plain]);
  return null;
}
