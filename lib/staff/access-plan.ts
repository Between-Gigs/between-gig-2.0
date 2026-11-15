/** Planning model only. Never a source of authorization, role grants or API requests. */
export type Preset = "simple" | "medium" | "advanced";
export type Access = { view: boolean; edit: boolean };
export type Plan = { rows: Record<string, Access>; sensitive: Record<string, boolean>; scope: "assigned" | "tenant" };
type Row = { id: string; group: string; title: string; edit: string; requires: string[]; soon?: boolean };
const row = (id: string, group: string, title: string, edit = "", requires: string[] = [], soon = false): Row => ({ id, group, title, edit, requires, soon });
export const accessRows: Row[] = [
  row("dashboard", "Overview", "Dashboard"), row("hub", "Overview", "Hub"),
  row("review", "Gigsters", "Review queue", "Draft feedback; publishing is separate", ["people"]),
  row("people", "Gigsters", "People", "Approved profile fields; private contacts are separate"),
  row("waitlist", "Gigsters", "Waitlist", "Internal notes; invitations and imports are separate"),
  row("staff", "Team", "Staff"),
  row("team_communications", "Team", "Team Communications", "", [], true),
  row("meetings", "Team", "Meetings", "", [], true), row("accounts", "Team", "Accounts", "", [], true), row("finance", "Team", "Finance", "", [], true),
  row("page_previews", "Previews", "Page Previews"), row("email_previews", "Previews", "Email Previews"),
  row("forms", "Previews", "Forms"), row("funnels", "Previews", "Funnels"), row("social_previews", "Previews", "Social Previews"),
  row("product", "Studio", "Product Development", "Plans, tasks and source notes; source visibility needs approval"),
  row("design_system", "Studio", "Design System"), row("wallpapers", "Studio", "Wallpapers", "Draft assets; publishing is separate"),
  row("media", "Studio", "Media Library", "", [], true), row("social_ads_pr", "Studio", "Social, Ads, PR", "", [], true),
  row("copywriting", "Studio", "Copywriting", "", [], true), row("skills", "Studio", "Skills", "", [], true),
  row("characters", "Studio", "Characters", "", [], true), row("tools", "Studio", "Tools", "", [], true),
];
export const sensitiveActions = [
  { id: "contacts", title: "View private contact details", requires: ["people"], note: "Email addresses and other nonpublic fields." },
  { id: "publish", title: "Approve or publish profiles", requires: ["review"], note: "Separate from editing draft feedback." },
  { id: "send", title: "Send email or invitations", requires: ["email_previews"], note: "Previewing an email never authorizes delivery." },
  { id: "import_export", title: "Import or export records", requires: ["people"], note: "Bulk access and consent must be approved separately." },
  { id: "delete", title: "Delete records or assets", requires: ["people"], note: "Never implied by Edit. Entity scope must be specified." },
  { id: "manage_access", title: "Manage team access", requires: ["staff"], note: "No self-elevation, self-lockout or removal of the last administrator." },
];
export const presets: { key: Preset; name: string; description: string }[] = [
  { key: "simple", name: "Simple", description: "Proposed focused review: dashboard, people and review queue. View only; private contact details excluded." },
  { key: "medium", name: "Medium", description: "Proposed editorial work: Simple plus previews and draft profile/feedback editing. Sending and approval remain separate." },
  { key: "advanced", name: "Advanced", description: "Proposed working tools across the dashboard. This is not a superadmin grant and does not replace existing owner access." },
];
export function makePlan(preset: Preset): Plan {
  let plan: Plan = { rows: Object.fromEntries(accessRows.map(r => [r.id, { view: false, edit: false }])), sensitive: Object.fromEntries(sensitiveActions.map(a => [a.id, false])), scope: "assigned" };
  const views = preset === "advanced" ? accessRows.filter(r => !r.soon).map(r => r.id) : ["dashboard", "people", "review", ...(preset === "medium" ? ["hub", "page_previews", "email_previews", "forms", "funnels", "social_previews"] : [])];
  for (const id of views) plan = changeAccess(plan, id, "view", true);
  const edits = preset === "advanced" ? ["review", "people", "waitlist", "product", "wallpapers"] : preset === "medium" ? ["review", "people"] : [];
  for (const id of edits) plan = changeAccess(plan, id, "edit", true);
  return plan;
}
export function changeAccess(plan: Plan, id: string, action: keyof Access, enabled: boolean): Plan {
  const def = accessRows.find(r => r.id === id);
  if (!def || def.soon || (action === "edit" && !def.edit)) return plan;
  const next = structuredClone(plan);
  const enableView = (key: string) => {
    next.rows[key].view = true;
    accessRows.find(r => r.id === key)?.requires.forEach(enableView);
  };
  if (enabled) {
    enableView(id);
    if (action === "edit") next.rows[id].edit = true;
  } else if (action === "edit") next.rows[id].edit = false;
  else {
    next.rows[id] = { view: false, edit: false };
    let changed = true;
    while (changed) {
      changed = false;
      for (const r of accessRows) if (next.rows[r.id].view && r.requires.some(dep => !next.rows[dep].view)) {
        next.rows[r.id] = { view: false, edit: false }; changed = true;
      }
    }
    for (const a of sensitiveActions) if (a.requires.some(dep => !next.rows[dep].view)) next.sensitive[a.id] = false;
  }
  return next;
}
export function changeSensitive(plan: Plan, id: string, enabled: boolean): Plan {
  const def = sensitiveActions.find(a => a.id === id);
  if (!def) return plan;
  let next = structuredClone(plan);
  if (enabled) for (const dep of def.requires) next = changeAccess(next, dep, "view", true);
  next.sensitive[id] = enabled;
  return next;
}
