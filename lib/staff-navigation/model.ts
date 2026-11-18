import { NAVIGATION_ITEMS, NAVIGATION_MODES, type NavigationItemId, type StaffNavigationMode } from "./registry";
export interface MenuConfiguration { modes: StaffNavigationMode[]; items: NavigationItemId[] }
export interface NavigationRecord { id: string; userId: string; active: boolean; revision: number; menu: MenuConfiguration; updatedAt: string }
export interface NavigationSnapshot {
  source: "database" | "sample"; store: "missing" | "ready"; currentUserId: string;
  target: { userId: string; email: string; name?: string | null; eligible: boolean };
  configuration: MenuConfiguration | null; record: NavigationRecord | null; conflicts: NavigationRecord[]; conflict: boolean;
}
export interface NavigationGateway {
  snapshot(userId?: string): Promise<NavigationSnapshot>;
  setup(): Promise<NavigationSnapshot>;
  save(input: { userId: string; expected: { id: string; revision: number } | null; menu: MenuConfiguration; requestId: string }): Promise<NavigationSnapshot>;
  repair(input: { userId: string; keepId: string; expected: { id: string; revision: number }[]; requestId: string }): Promise<NavigationSnapshot>;
}
export const DEFAULT_MENU: MenuConfiguration = { modes: [...NAVIGATION_MODES], items: [...NAVIGATION_ITEMS] };
export const MINIMAL_MENU: MenuConfiguration = { modes: ["gigster"], items: ["my_profile", "edit_profile"] };
export class MenuValidationError extends Error {}
export const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
function values<T extends string>(value: unknown, allowed: readonly T[]): T[] {
  if (!Array.isArray(value) || value.some(item => typeof item !== "string" || !allowed.includes(item as T)) || new Set(value).size !== value.length) throw new MenuValidationError("Choose only supported menu options, without duplicates.");
  return allowed.filter(item => value.includes(item));
}
export function cleanMenu(value: unknown): MenuConfiguration {
  if (!object(value) || Object.keys(value).some(key => !["modes", "items"].includes(key))) throw new MenuValidationError("Choose valid menu options.");
  const modes = values(value.modes, NAVIGATION_MODES), items = values(value.items, NAVIGATION_ITEMS);
  if (!modes.length) throw new MenuValidationError("Keep at least one menu mode. Navigation management remains available from your account menu.");
  return { modes, items };
}
export function effectiveMenu(menu: MenuConfiguration, owner: boolean): MenuConfiguration {
  return owner ? cleanMenu(menu) : { ...MINIMAL_MENU, modes: [...MINIMAL_MENU.modes], items: [...MINIMAL_MENU.items] };
}
export function parseRecord(value: unknown): NavigationRecord {
  if (!object(value) || typeof value.id !== "string" || !value.id || !object(value.data)) throw new MenuValidationError("Saved menu settings need review.");
  const d = value.data;
  if (Object.keys(d).some(key => !["user", "active", "schema_version", "revision", "visible_modes", "visible_items"].includes(key)) || typeof d.user !== "string" || !d.user || typeof d.active !== "boolean" || d.schema_version !== 1 || !Number.isSafeInteger(d.revision) || Number(d.revision) < 0 || Number(d.revision) >= Number.MAX_SAFE_INTEGER) throw new MenuValidationError("Saved menu settings need review.");
  return { id: value.id, userId: d.user, active: d.active, revision: Number(d.revision), menu: cleanMenu({ modes: d.visible_modes, items: d.visible_items }), updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : "" };
}
export function selectConfiguration(rows: unknown[], userId: string) {
  const active = rows.filter(row => object(row) && object(row.data) && row.data.user === userId).map(parseRecord).filter(row => row.active);
  if (active.length > 1) return { configuration: MINIMAL_MENU, record: null, conflicts: active, conflict: true };
  return { configuration: active[0]?.menu ?? null, record: active[0] ?? null, conflicts: [] as NavigationRecord[], conflict: false };
}
