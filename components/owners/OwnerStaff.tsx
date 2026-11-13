"use client";
import * as React from "react";
import { Button, cx } from "@ds/components";
import { Check, Copy, Link as LinkIcon, Plus, RefreshCw, Search, ShieldCheck, Users, X } from "lucide-react";
import { data } from "@/lib/data";
import { staff } from "@/lib/staff/selected";
import type { StaffAction, StaffGateway, StaffPermission, StaffScope, StaffSnapshot, StaffUser } from "@/lib/staff/sample";
import { OwnerGate } from "./OwnerGate";
import { OwnerShell } from "./OwnerShell";
import { OwnerPage, Panel } from "./kit";
import { markArea } from "@/lib/split-area";

markArea("bg-split:dashboard");

const actions: StaffAction[] = ["read", "create", "update", "delete"];
const scopes: { value: StaffScope; label: string }[] = [{ value: "none", label: "No access" }, { value: "own", label: "Own records" }, { value: "all", label: "All records" }];
const control = "min-h-11 w-full rounded-md border border-line-strong bg-bg px-3 py-2 text-body-md text-ink outline-none focus-visible:ring-2 focus-visible:ring-ink-brand";
const small = "text-label-sm font-bold text-ink-muted";
const sentence = (error: unknown) => error instanceof Error ? error.message : "This change could not be saved. Refresh and try again.";
const nameOf = (key: string) => key.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());
const gateway = staff as unknown as StaffGateway;

export function OwnerStaff() {
  return <OwnerGate>{() => <Staff />}</OwnerGate>;
}

function Staff() {
  const [snapshot, setSnapshot] = React.useState<StaffSnapshot | null>(null);
  const [tab, setTab] = React.useState<"people" | "rules">("people");
  const [query, setQuery] = React.useState("");
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [name, setName] = React.useState("");
  const [inviteRoles, setInviteRoles] = React.useState<string[]>([]);
  const [inviteUrl, setInviteUrl] = React.useState("");
  const [editing, setEditing] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => { setSnapshot(await gateway.snapshot()); }, []);
  React.useEffect(() => {
    let current = true;
    void gateway.snapshot().then((value) => { if (current) setSnapshot(value); }).catch((e: unknown) => { if (current) setError(sentence(e)); });
    return () => { current = false; };
  }, []);

  const mutate = async (run: () => Promise<unknown>, success: string) => {
    setBusy(true); setError(""); setNotice("");
    try { await run(); await refresh(); setNotice(success); return true; }
    catch (e) { setError(sentence(e)); await refresh().catch(() => undefined); return false; }
    finally { setBusy(false); }
  };

  const invite = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setError(""); setNotice(""); setInviteUrl("");
    try {
      const result = await gateway.invite({ email: email.trim(), name: name.trim(), roleKeys: inviteRoles });
      await refresh();
      if (result.url) {
        setInviteUrl(result.url);
        setNotice("Invitation link created. Copy it and share it with this staff member. No email was sent.");
      } else {
        setNotice(data.kind === "sample" ? "Sample staff record saved in this browser. No invitation or email was sent." : "Roles updated for this account. No email was sent.");
      }
    } catch (e) { setError(sentence(e)); await refresh().catch(() => undefined); }
    finally { setBusy(false); }
  };

  const visible = (snapshot?.users ?? []).filter((u) => [u.name, u.email, ...u.memberships.map((m) => m.roleName)].join(" ").toLowerCase().includes(query.toLowerCase()));
  const admins = snapshot?.users.filter((u) => u.memberships.some((m) => m.roleKey === "super_admin")).length ?? 0;
  const multiple = snapshot?.users.filter((u) => u.memberships.length > 1).length ?? 0;
  const stats = [
    { value: snapshot?.users.length ?? "—", label: "Team accounts", icon: Users },
    { value: snapshot ? admins : "—", label: "Super admins", icon: ShieldCheck },
    { value: snapshot ? multiple : "—", label: "With multiple roles", icon: Check },
  ];

  return <OwnerShell><OwnerPage title="Staff" description="Manage the team, their roles, and what they can access." actions={<Button variant="strong" iconStart={<Plus />} onClick={() => { setInviteOpen(true); setInviteUrl(""); setNotice(""); setError(""); }}>Invite staff</Button>}>
    {data.kind === "sample" && <p className="rounded-lg border border-line bg-surface-selected px-4 py-3 text-body-sm text-ink"><strong>Fictional sample.</strong> Changes stay in this browser. Invitations and emails are not sent.</p>}
    <div className="grid gap-3 sm:grid-cols-3">{stats.map(({ value, label, icon: Icon }) => <div key={label} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-4"><span className="grid size-11 shrink-0 place-items-center rounded-lg bg-surface-selected text-ink-brand"><Icon className="size-5" aria-hidden="true" /></span><div><p className="font-display text-heading-lg tabular-nums text-ink">{value}</p><p className="text-body-sm text-ink-muted">{label}</p></div></div>)}</div>
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-2">
      <div className="flex gap-1" aria-label="Staff views">
        <Button variant={tab === "people" ? "strong" : "ghost"} aria-pressed={tab === "people"} onClick={() => setTab("people")} iconStart={<Users />}>Team members</Button>
        <Button variant={tab === "rules" ? "strong" : "ghost"} aria-pressed={tab === "rules"} onClick={() => setTab("rules")} iconStart={<ShieldCheck />}>Role access</Button>
      </div>
      <Button variant="ghost" size="sm" iconStart={<RefreshCw />} disabled={busy} onClick={() => void mutate(refresh, "Staff list refreshed.")}>Refresh</Button>
    </div>
    {error && <div role="alert" className="rounded-lg border border-action-danger px-4 py-3 text-body-sm text-ink"><strong>Could not complete this change.</strong> {error}</div>}
    {notice && <p role="status" className="rounded-lg border border-line bg-surface-selected px-4 py-3 text-body-sm text-ink">{notice}</p>}

    {inviteOpen && <Panel title="Invite a staff member" aside={<Button variant="ghost" size="sm" iconStart={<X />} onClick={() => setInviteOpen(false)}>Close</Button>}>
      <form onSubmit={(event) => void invite(event)} className="grid gap-5">
        <p className="max-w-2xl text-body-md text-ink-muted">Create a secure invitation link to share with this staff member. Choose every role they need; a Gigster can also help manage Between Gigs.</p>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2"><span className={small}>Name</span><input className={control} autoComplete="name" maxLength={200} value={name} onChange={(e) => setName(e.target.value)} placeholder="Their name" /></label>
          <label className="grid gap-2"><span className={small}>Email address</span><input className={control} type="email" autoComplete="email" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" /></label>
        </div>
        <fieldset className="grid gap-3"><legend className="mb-3 text-label-md font-bold text-ink">Roles for this person</legend><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {(snapshot?.roles ?? []).map((role) => <label key={role.key} className={cx("flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border p-3", inviteRoles.includes(role.key) ? "border-ink-brand bg-surface-selected" : "border-line bg-bg")}><input className="size-4 shrink-0 accent-(--color-action)" type="checkbox" checked={inviteRoles.includes(role.key)} onChange={(e) => setInviteRoles((keys) => e.target.checked ? [...keys, role.key] : keys.filter((k) => k !== role.key))} /><span className="text-label-md text-ink">{role.name}</span></label>)}
        </div></fieldset>
        <div className="flex flex-wrap items-center gap-3"><Button type="submit" variant="strong" loading={busy} disabled={!snapshot || !inviteRoles.length} iconStart={<LinkIcon />}>Create invitation link</Button><span className="text-body-sm text-ink-muted">Existing roles are kept.</span></div>
        {inviteUrl && <div className="grid gap-2 rounded-lg border border-line bg-bg p-4"><label htmlFor="staff-invitation-link" className={small}>Invitation link for {email}</label><div className="flex flex-wrap gap-2"><input id="staff-invitation-link" className={cx(control, "min-w-0 flex-1")} readOnly value={inviteUrl} onFocus={(e) => e.target.select()} /><Button iconStart={<Copy />} onClick={() => void navigator.clipboard.writeText(inviteUrl).then(() => setNotice("Invitation link copied. Share it with the staff member.")).catch(() => setError("Select the invitation link and copy it manually."))}>Copy link</Button></div><p className="text-body-sm text-ink-muted">Treat this link as private. No email was sent.</p></div>}
      </form>
    </Panel>}

    {tab === "people" ? <Panel title="Team members" count={visible.length}>
      <div className="mb-5 grid gap-2"><label htmlFor="staff-search" className={small}>Find a team member</label><div className="relative"><Search className="pointer-events-none absolute top-3.5 left-3 size-4 text-ink-muted" aria-hidden="true" /><input id="staff-search" className={cx(control, "pl-10")} type="search" placeholder="Search name, email, or role" value={query} onChange={(e) => setQuery(e.target.value)} /></div></div>
      {!snapshot ? <p aria-busy="true" className="py-10 text-body-md text-ink-muted">{error ? "Staff could not be loaded. Use Refresh to try again." : "Loading staff…"}</p> : !visible.length ? <p className="py-10 text-body-md text-ink-muted">No team members match this search.</p> : <ul className="grid gap-3">{visible.map((user) => <li key={user.userId} className="rounded-xl border border-line bg-bg p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-full bg-surface-selected font-display text-label-md text-ink-brand" aria-hidden="true">{(user.name || user.email).slice(0,1).toUpperCase()}</span><div className="min-w-0"><h3 className="break-words text-label-md font-bold text-ink">{user.name || user.email}{user.userId === snapshot.currentUserId && <span className="ml-2 text-body-sm font-normal text-ink-muted">(you)</span>}</h3><p className="break-all text-body-sm text-ink-muted">{user.email}</p><p className="mt-1 text-caption text-ink-muted">{user.signedUp ? "Account active" : data.kind === "sample" ? "Awaiting sign-in (sample)" : "Has not signed in"}</p></div></div>
          <Button size="sm" variant={editing === user.userId ? "strong" : "secondary"} aria-expanded={editing === user.userId} aria-controls={"staff-roles-" + user.userId} onClick={() => setEditing((id) => id === user.userId ? null : user.userId)}>Manage roles</Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">{user.memberships.length ? user.memberships.map((m) => <span key={m.membershipId} className="rounded-full border border-line bg-surface px-3 py-1 text-label-sm text-ink">{m.roleName || nameOf(m.roleKey)}</span>) : <span className="text-body-sm text-ink-muted">No roles assigned</span>}</div>
        {editing === user.userId && <RoleAssignments snapshot={snapshot} user={user} busy={busy} change={(roleKey, checked) => {
          const membership = user.memberships.find((m) => m.roleKey === roleKey);
          void mutate(() => checked ? gateway.addRole({ email: user.email, roleKey }) : gateway.removeRole({ membershipId: membership!.membershipId }), "Role assignments saved.");
        }} />}
      </li>)}</ul>}
    </Panel> : snapshot && <RoleAccess key={snapshot.roles.map((r) => r.key).join(",")} snapshot={snapshot} busy={busy} save={(roleKey, permissions) => mutate(() => gateway.savePermissions({ roleKey, permissions }), "Role access saved.")} />}
  </OwnerPage></OwnerShell>;
}

function RoleAssignments({ snapshot, user, busy, change }: { snapshot: StaffSnapshot; user: StaffUser; busy: boolean; change: (roleKey: string, checked: boolean) => void }) {
  const adminCount = snapshot.users.filter((u) => u.memberships.some((m) => m.roleKey === "super_admin")).length;
  return <fieldset id={"staff-roles-" + user.userId} className="mt-5 border-t border-line pt-4"><legend className="sr-only">Roles for {user.name || user.email}</legend>
    <p className="mb-3 text-body-sm text-ink-muted">Changes save immediately. A person can hold several roles at once.</p>
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{snapshot.roles.map((role) => {
      const checked = user.memberships.some((m) => m.roleKey === role.key);
      const protectedAdmin = checked && role.key === "super_admin" && (adminCount <= 1 || user.userId === snapshot.currentUserId);
      return <label key={role.key} className={cx("flex min-h-12 items-center gap-3 rounded-lg border border-line p-3", protectedAdmin && "text-ink-muted")}><input type="checkbox" className="size-4 shrink-0" checked={checked} disabled={busy || protectedAdmin} onChange={(e) => change(role.key, e.target.checked)} /><span className="text-label-md">{role.name}{protectedAdmin && <span className="block text-caption font-normal text-ink-muted">Kept to protect admin access</span>}</span></label>;
    })}</div>
  </fieldset>;
}

function RoleAccess({ snapshot, busy, save }: { snapshot: StaffSnapshot; busy: boolean; save: (roleKey: string, permissions: StaffPermission[]) => Promise<boolean> }) {
  const [roleKey, setRoleKey] = React.useState(snapshot.roles.find((r) => !r.isSystem)?.key ?? snapshot.roles[0]?.key ?? "");
  const role = snapshot.roles.find((r) => r.key === roleKey);
  const [draft, setDraft] = React.useState<StaffPermission[]>([]);
  const [dirty, setDirty] = React.useState(false);
  const [policies, setPolicies] = React.useState<unknown>(null);
  const [policyError, setPolicyError] = React.useState("");
  const entities = [...new Set(snapshot.roles.flatMap((r) => r.permissions.map((p) => p.entity)))].sort();
  const current = dirty ? draft : role?.permissions ?? [];
  React.useEffect(() => {
    let active = true;
    if (!roleKey || !gateway.getPolicies) return;
    void gateway.getPolicies(roleKey).then((value) => { if (active) { setPolicies(value); setPolicyError(""); } }).catch((e: unknown) => { if (active) { setPolicies(null); setPolicyError(sentence(e)); } });
    return () => { active = false; };
  }, [roleKey]);
  const setPermission = (entity: string, action: StaffAction, scope: StaffScope) => {
    setDraft([...current.filter((p) => !(p.entity === entity && p.action === action)), { entity, action, scope }]);
    setDirty(true);
  };
  return <Panel title="Role access" aside={<span className="text-body-sm text-ink-muted">Applies to everyone with this role</span>}>
    <div className="grid gap-5">
      <label className="grid max-w-md gap-2"><span className={small}>Choose a role</span><select className={control} disabled={busy || dirty} value={roleKey} onChange={(e) => { setRoleKey(e.target.value); setDirty(false); setPolicies(null); }}>{snapshot.roles.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}</select></label>
      <p className="max-w-3xl text-body-md text-ink-muted">Roles combine their access. Removing a grant from one role does not remove access supplied by another role. Existing row rules can narrow which records each person can use.</p>
      {role?.isSystem ? <p className="rounded-lg border border-line bg-surface-selected p-4 text-body-sm text-ink">Super admin has full platform access. This system role cannot be narrowed here.</p> : <p className="text-body-sm text-ink-muted">“Own records” follows Company OS ownership and row rules. Module-managed grants can be restored on deployment; use row rules for lasting restrictions.</p>}
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-xl text-left text-body-sm"><caption className="sr-only">Data access for {role?.name ?? "the selected role"}</caption><thead className="bg-surface"><tr><th scope="col" className="p-3 text-label-sm text-ink-muted">Record type</th>{actions.map((action) => <th key={action} scope="col" className="p-3 text-label-sm text-ink-muted">{nameOf(action)}</th>)}</tr></thead><tbody>{entities.map((entity) => <tr key={entity} className="border-t border-line"><th scope="row" className="p-3 font-normal text-ink">{nameOf(entity)}</th>{actions.map((action) => <td key={action} className="p-2"><select className={cx(control, "min-w-30 px-2 text-body-sm")} aria-label={nameOf(action) + " " + nameOf(entity)} disabled={busy || role?.isSystem} value={current.find((p) => p.entity === entity && p.action === action)?.scope ?? "none"} onChange={(e) => setPermission(entity, action, e.target.value as StaffScope)}>{scopes.map((scope) => <option key={scope.value} value={scope.value}>{scope.label}</option>)}</select></td>)}</tr>)}</tbody></table>
      </div>
      {!role?.isSystem && <div className="flex flex-wrap items-center gap-3"><Button variant="strong" loading={busy} disabled={!dirty || !roleKey} onClick={() => void save(roleKey, current).then((saved) => { if (saved) setDirty(false); })}>Save role access</Button><Button variant="ghost" disabled={!dirty || busy} onClick={() => setDirty(false)}>Discard changes</Button>{dirty && <span className="text-body-sm text-ink-muted">Unsaved changes</span>}</div>}
      <details className="rounded-lg border border-line p-4"><summary className="min-h-8 cursor-pointer text-label-md font-bold text-ink">Screen access and row rules</summary><div className="mt-3 grid gap-3 text-body-sm text-ink-muted"><p>Screen capabilities help show the right tools. They do not grant access to records.</p><div className="flex flex-wrap gap-2">{role?.capabilities?.length ? role.capabilities.map((cap) => <span key={cap} className="rounded-full border border-line px-3 py-1 text-caption">{cap}</span>) : <span>No extra screen capabilities.</span>}</div>{policyError ? <p role="status">Row rules could not be loaded: {policyError}</p> : policies === null ? <p>Loading row rules…</p> : <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-md bg-bg p-3 text-caption">{JSON.stringify(policies, null, 2)}</pre>}</div></details>
    </div>
  </Panel>;
}
