import { sampleStaff } from "@/lib/staff/sample";
import { data } from "@/lib/data";
import { cleanMenu, parseRecord, selectConfiguration, type NavigationGateway, type NavigationSnapshot } from "./model";
import { menuChangedEvent } from "./client";
import { markArea } from "@/lib/split-area";
markArea("bg-split:sample");
const KEY = "bg2-staff-navigation-sample-v1";
interface State { ready: boolean; rows: { id: string; data: Record<string, unknown>; updatedAt: string }[] }
let memory: State | undefined;
function state(): State { if (memory) return structuredClone(memory); try { const raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw) as State; } catch { /* fictional storage is optional */ } return { ready: false, rows: [] }; }
function persist(next: State) { try { localStorage.setItem(KEY, JSON.stringify(next)); memory = undefined; } catch { memory = structuredClone(next); } window.dispatchEvent(new Event(menuChangedEvent)); }
async function snapshot(userId?: string): Promise<NavigationSnapshot> {
  if ((await data.auth.session())?.role !== "owner") throw new Error("Only the fictional owner can change these sample menus.");
  const staff = await sampleStaff.snapshot(), target = staff.users.find(u => u.userId === (userId ?? staff.currentUserId));
  if (!target) throw new Error("This fictional staff account is no longer present.");
  const saved = state();
  return { source: "sample", store: saved.ready ? "ready" : "missing", currentUserId: staff.currentUserId, target: { userId: target.userId, email: target.email, name: target.name, eligible: target.memberships.some(m => m.roleKey === "super_admin") }, ...selectConfiguration(saved.rows, target.userId) };
}
export const sampleNavigation: NavigationGateway = {
  snapshot,
  async setup() { await snapshot(); const next = state(); next.ready = true; persist(next); return snapshot(); },
  async save(input) {
    const before = await snapshot(input.userId), menu = cleanMenu(input.menu);
    if (!before.target.eligible) throw new Error("This fictional account has Gigster menus. Menu configuration does not add roles.");
    if (before.store !== "ready" || before.conflict) throw new Error("Set up or repair sample menu storage first.");
    if (input.expected === null ? !!before.record : before.record?.id !== input.expected.id || before.record.revision !== input.expected.revision) throw new Error("These sample menus changed. Refresh before saving.");
    const next = state(), current = before.record;
    const values = { user: input.userId, active: true, schema_version: 1, revision: current ? current.revision + 1 : 0, visible_modes: menu.modes, visible_items: menu.items };
    if (current) Object.assign(next.rows.find(r => r.id === current.id)!, { data: values, updatedAt: new Date().toISOString() });
    else next.rows.push({ id: crypto.randomUUID(), data: values, updatedAt: new Date().toISOString() });
    persist(next); return snapshot(input.userId);
  },
  async repair(input) {
    const before = await snapshot(input.userId);
    if (!before.conflict || !before.conflicts.some(r => r.id === input.keepId) || input.expected.length !== before.conflicts.length || before.conflicts.some(r => !input.expected.some(e => e.id === r.id && e.revision === r.revision))) throw new Error("The sample conflict changed. Refresh first.");
    const next = state();
    for (const row of next.rows) { const existing = before.conflicts.find(r => r.id === row.id); if (existing) { row.data = { ...row.data, active: row.id === input.keepId, revision: parseRecord(row).revision + 1 }; } }
    persist(next); return snapshot(input.userId);
  },
};
