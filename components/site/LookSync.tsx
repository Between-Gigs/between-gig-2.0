"use client";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useSyncExternalStore } from "react";
import { defaultLook, hasSiteLook, isLook, lookKey, type Look } from "@/lib/look";

const changeEvent = "bg2-look-change";
let unsaved: Look | undefined;

function readLook(): Look {
  if (unsaved) return unsaved;
  try {
    const saved = localStorage.getItem(lookKey);
    if (isLook(saved)) return saved;
  } catch { /* Storage is optional. */ }
  return defaultLook;
}

function subscribe(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === lookKey || event.key === null) {
      unsaved = undefined;
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
  try {
    localStorage.setItem(lookKey, look);
    unsaved = undefined;
  } catch { unsaved = look; }
  window.dispatchEvent(new Event(changeEvent));
}

export function LookSync() {
  const pathname = usePathname();
  const look = useLook();
  useLayoutEffect(() => {
    // During hydration the server snapshot is the default. Keep the pre-paint choice until React catches up.
    if (hasSiteLook(pathname)) document.documentElement.dataset.look = readLook();
    else delete document.documentElement.dataset.look;
  }, [pathname, look]);
  return null;
}
