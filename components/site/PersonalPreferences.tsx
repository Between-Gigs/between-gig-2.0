"use client";
import * as React from "react";
import { ThemeToggle } from "@ds/components";
import { usePathname } from "next/navigation";
import { data } from "@/lib/data";
import { useSession } from "@/lib/session";
import { basePath } from "@/lib/site";
import { defaultLook, isLook, lookKey, unstyledKey } from "@/lib/look";
import { navigationMode, parseNavigationPreferences, preferenceKey, readPreferenceRecord, writePreferenceRecord, type NavigationPreferences } from "@/lib/navigation-preferences";
import { selectDocumentLook, selectDocumentUnstyled } from "./LookSync";
const event = "bg2-personal-preferences";
const memory = new Map<string, string>();
const subscribe = (callback: () => void) => { window.addEventListener(event, callback); window.addEventListener("storage", callback); return () => { window.removeEventListener(event, callback); window.removeEventListener("storage", callback); }; };
const storage = () => { try { return localStorage; } catch { return undefined; } };
const read = (key: string) => readPreferenceRecord(key, storage(), memory);
export function usePersonalPreferences() {
  const { session } = useSession();
  const key = preferenceKey(data.kind, session?.email);
  const raw = React.useSyncExternalStore(subscribe, () => read(key), () => "");
  const preferences = React.useMemo(() => parseNavigationPreferences(raw), [raw]);
  const update = (change: Partial<NavigationPreferences>) => {
    const next = JSON.stringify({ ...parseNavigationPreferences(read(key)), ...change });
    writePreferenceRecord(key, next, storage(), memory);
    window.dispatchEvent(new Event(event));
  };
  return { key, preferences, update };
}
export function usePersonalLook() {
  const { update } = usePersonalPreferences();
  return (look: import("@/lib/look").Look) => { selectDocumentLook(look, true); update({ look }); };
}
export function usePersonalUnstyled() {
  const { update } = usePersonalPreferences();
  return (on: boolean) => { selectDocumentUnstyled(on, true); update({ unstyled: on }); };
}
export function useNavigationMode() {
  const path = usePathname(); const { preferences } = usePersonalPreferences();
  return navigationMode(path, basePath, preferences.mode);
}
function applyTheme(theme: "light" | "dark") {
  document.documentElement.dataset.theme = theme;
  window.dispatchEvent(new Event(event));
}
/** Legacy global appearance remains the fallback; personal choices never rewrite another identity's record. */
export function PersonalAppearanceSync() {
  const { key, preferences } = usePersonalPreferences();
  React.useEffect(() => {
    let baseline: { look?: string; theme?: string; unstyled?: boolean } = {};
    try {
      const baselineKey = "bg2-navigation-baseline-v1";
      let raw = localStorage.getItem(baselineKey);
      if (!raw) { raw = JSON.stringify({ unstyled: localStorage.getItem(unstyledKey) === "1", look: localStorage.getItem(lookKey) ?? document.documentElement.dataset.look ?? defaultLook, theme: localStorage.getItem("bg-theme") ?? document.documentElement.dataset.theme ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") }); localStorage.setItem(baselineKey, raw); }
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) baseline = parsed;
    } catch { /* current appearance remains the fallback */ }
    const baselineLook = baseline.look ?? null;
    const look = preferences.look ?? (isLook(baselineLook) ? baselineLook : defaultLook);
    const theme = preferences.theme ?? (baseline.theme === "light" || baseline.theme === "dark" ? baseline.theme : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    if (look) selectDocumentLook(look);
    if (theme) applyTheme(theme);
    selectDocumentUnstyled(preferences.unstyled ?? baseline.unstyled === true);
  }, [key, preferences.look, preferences.theme, preferences.unstyled]);
  return null;
}
export function PersonalThemeToggle() {
  const { update } = usePersonalPreferences();
  const theme = React.useSyncExternalStore<"light" | "dark">(subscribe, () => document.documentElement.dataset.theme === "dark" ? "dark" : "light", () => "light");
  return <ThemeToggle theme={theme} size="sm" showLabel={false} onChange={next => { applyTheme(next); update({ theme: next }); }} />;
}
