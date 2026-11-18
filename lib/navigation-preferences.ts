import { isLook, type Look } from "./look";
export type NavigationMode = "gigster" | "owner" | "developer";
export interface NavigationPreferences { mode?: NavigationMode; showThemeChooser: boolean; unstyled?: boolean; look?: Look; theme?: "light" | "dark" }
export const defaultNavigationPreferences: NavigationPreferences = { showThemeChooser: false };
export function preferenceKey(source: string, email?: string) { return `bg2-navigation-preferences-v1:${source}:${encodeURIComponent(email?.trim().toLowerCase() || "visitor")}`; }
export function parseNavigationPreferences(raw: string | null): NavigationPreferences {
  try {
    const value = JSON.parse(raw || "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) return defaultNavigationPreferences;
    return { showThemeChooser: value.showThemeChooser === true,
      ...(typeof value.unstyled === "boolean" ? { unstyled: value.unstyled } : {}),
      ...(["gigster", "owner", "developer"].includes(value.mode) ? { mode: value.mode } : {}),
      ...(isLook(value.look ?? null) ? { look: value.look } : {}),
      ...(["light", "dark"].includes(value.theme) ? { theme: value.theme } : {}) };
  } catch { return defaultNavigationPreferences; }
}
/** Presentation only. Every destination keeps its own existing authorization. */
export function navigationMode(path: string, basePath: string, saved?: NavigationMode): NavigationMode {
  if (/^\/owners\/(developer|staff|emails)(\/|$)/.test(path)) return "developer";
  if (/^\/owners(\/|$)/.test(path)) return saved === "developer" ? "developer" : "owner";
  if (/^\/(hub|preview|emails)(\/|$)/.test(path) || (basePath === "/hub" && path === "/")) return "developer";
  return "gigster";
}

/** Storage may be readable yet unwritable (quota/private mode): newer visit-local changes must win. */
export function readPreferenceRecord(key: string, storage: Pick<Storage, "getItem"> | undefined, memory: Map<string, string>): string {
  const pending = memory.get(key);
  if (pending !== undefined) return pending;
  try { return storage?.getItem(key) ?? ""; } catch { return ""; }
}
export function writePreferenceRecord(key: string, value: string, storage: Pick<Storage, "setItem"> | undefined, memory: Map<string, string>) {
  try { if (!storage) throw new Error("storage unavailable"); storage.setItem(key, value); memory.delete(key); }
  catch { memory.set(key, value); }
}

/** Real owner destinations leave the Hub's fictional sample application; the destination rechecks authority. */
export function modeDestination(href: string, basePath: string) {
  return { href, fullPage: basePath === "/hub" && /^\/owners(?:\/|$)/.test(href) };
}
