"use client";
import { Badge, Button, Checkbox, ConfirmDialog, Input, PageHeader, Pager, Select, Table, type BadgeTone, type Column, useToast } from "@ds/components";
import { Search, Send, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import * as React from "react";
import { data, inviteStatuses, type InviteStatus, type WaitlistQuery, type WaitlistRow } from "@/lib/data";
import { waitlistCategories, waitlistCategoryLabel } from "@/lib/data/taxonomy";
import { Page } from "@/components/site/Page";
import { OwnerGate } from "./OwnerGate";

const PAGE = 25;
const statusMeta: Record<InviteStatus, { label: string; tone: BadgeTone }> = {
  not_invited: { label: "Not invited", tone: "neutral" },
  invited: { label: "Invited", tone: "info" },
  opened: { label: "Opened", tone: "warning" },
  registered: { label: "Registered", tone: "success" },
};
const date = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

/** /owners/waitlist: the call-sheet sign-ups (~500) and where each one is with their invite. Select, then invite in bulk. */
export function OwnerWaitlist() {
  return <OwnerGate>{() => <Waitlist />}</OwnerGate>;
}

function Waitlist() {
  const params = useSearchParams();
  const toast = useToast();
  const initialStatus = (inviteStatuses as string[]).includes(params.get("status") ?? "") ? (params.get("status") as InviteStatus) : "all";
  const [query, setQuery] = React.useState<Required<WaitlistQuery>>({ text: "", inviteStatus: initialStatus, category: "all", sort: "joined-new" });
  const [text, setText] = React.useState("");
  const [rows, setRows] = React.useState<WaitlistRow[] | null>(null);
  const [counts, setCounts] = React.useState<Record<InviteStatus, number> | null>(null);
  const [page, setPage] = React.useState(1);
  const [selected, setSelected] = React.useState<string[]>([]);
  const [confirm, setConfirm] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const refresh = React.useCallback(async (q: WaitlistQuery) => {
    const [r, all] = await Promise.all([data.owners.waitlist(q), data.owners.waitlist()]);
    setRows(r);
    setCounts(Object.fromEntries(inviteStatuses.map((s) => [s, all.filter((x) => x.inviteStatus === s).length])) as Record<InviteStatus, number>);
  }, []);
  React.useEffect(() => { void refresh(query); }, [query, refresh]); // eslint-disable-line react-hooks/set-state-in-effect
  React.useEffect(() => {
    const t = window.setTimeout(() => setQuery((q) => (q.text === text ? q : { ...q, text })), 250);
    return () => window.clearTimeout(t);
  }, [text]);

  const set = <K extends keyof WaitlistQuery>(k: K) => (v: string) => { setQuery((q) => ({ ...q, [k]: v })); setPage(1); };
  const pageCount = Math.max(1, Math.ceil((rows?.length ?? 0) / PAGE));
  const visible = (rows ?? []).slice((page - 1) * PAGE, page * PAGE);
  const invitable = visible.filter((r) => r.inviteStatus === "not_invited").map((r) => r.signup.id);
  const allOnPage = invitable.length > 0 && invitable.every((id) => selected.includes(id));
  const toggle = (id: string, on: boolean) => setSelected((s) => (on ? [...s, id] : s.filter((x) => x !== id)));
  const allNotInvited = (rows ?? []).filter((r) => r.inviteStatus === "not_invited").map((r) => r.signup.id);

  const invite = async () => {
    setBusy(true);
    try {
      const r = await data.owners.invite(selected);
      toast({ message: `${r.invited} ${r.invited === 1 ? "invite" : "invites"} sent`, tone: "success" });
      setSelected([]);
      setConfirm(false);
      await refresh(query);
    } catch { toast({ message: "Couldn't send invites. Try again.", tone: "danger" }); }
    finally { setBusy(false); }
  };

  const columns: Column<WaitlistRow>[] = [
    {
      key: "select", width: "w-12",
      header: <Checkbox aria-label="Select everyone on this page who isn't invited" checked={allOnPage} disabled={!invitable.length}
        onChange={(e) => setSelected((s) => (e.target.checked ? Array.from(new Set([...s, ...invitable])) : s.filter((x) => !invitable.includes(x))))} />,
      cell: (r) => r.inviteStatus === "not_invited"
        ? <Checkbox aria-label={`Select ${r.signup.email}`} checked={selected.includes(r.signup.id)} onChange={(e) => toggle(r.signup.id, e.target.checked)} />
        : <span className="sr-only">Already invited</span>,
    },
    { key: "email", header: "Email", cell: (r) => r.personId ? <Link href={`/owners/people/${r.personId}/`} className="text-ink hover:text-ink-brand hover:underline">{r.signup.email}</Link> : <span className="text-ink">{r.signup.email}</span> },
    { key: "zip", header: "ZIP", cell: (r) => <span className="font-mono text-data-sm">{r.signup.zip}</span> },
    { key: "category", header: "Interested in", cell: (r) => <span className="text-ink-muted">{r.signup.category ? waitlistCategoryLabel(r.signup.category) : "—"}</span> },
    { key: "joined", header: "Joined", cell: (r) => <span className="font-mono text-data-sm text-ink-muted">{date(r.signup.createdAt)}</span> },
    { key: "status", header: "Invite", cell: (r) => <Badge tone={statusMeta[r.inviteStatus].tone} size="sm">{statusMeta[r.inviteStatus].label}</Badge> },
  ];

  return (
    <Page>
      <PageHeader eyebrow="Owners" title="Waitlist" meta={counts ? String(Object.values(counts).reduce((a, b) => a + b, 0)) : undefined}
        description="Everyone who got on the call sheet, and where they are with their invite. Pick people and send their personal “Create your profile” link." />

      <div role="group" aria-label="Filter by invite status" className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {inviteStatuses.map((s) => {
          const on = query.inviteStatus === s;
          return (
            <button key={s} type="button" aria-pressed={on} onClick={() => set("inviteStatus")(on ? "all" : s)}
              className={`grid gap-1 rounded-xl border p-3 text-left transition duration-base ${on ? "border-ink-brand bg-surface-selected shadow-sm" : "border-line bg-surface hover:border-line-strong"}`}>
              <span className="text-label-sm text-ink-muted">{statusMeta[s].label}</span>
              <span className="font-display text-heading-lg text-ink tabular-nums">{counts ? counts[s] : "–"}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-12 md:items-center">
        <div className="md:col-span-5"><Input type="search" aria-label="Search the waitlist" placeholder="Email or ZIP" value={text} onChange={(e) => setText(e.target.value)} start={<Search />} /></div>
        <Select aria-label="Invite status" className="md:col-span-2" value={query.inviteStatus} onValueChange={set("inviteStatus")}
          options={[{ value: "all", label: "Any status" }, ...inviteStatuses.map((s) => ({ value: s, label: statusMeta[s].label }))]} />
        <Select aria-label="Interested in" className="md:col-span-3" value={query.category} onValueChange={set("category")}
          options={[{ value: "all", label: "Any interest" }, ...waitlistCategories.map(([value, label]) => ({ value, label }))]} />
        <Select aria-label="Sort" className="md:col-span-2" value={query.sort} onValueChange={set("sort")}
          options={[{ value: "joined-new", label: "Newest first" }, { value: "joined-old", label: "Oldest first" }, { value: "email", label: "Email, A to Z" }, { value: "zip", label: "ZIP" }]} />
      </div>

      {/* Bulk action bar: appears with a selection. */}
      <div aria-live="polite" className="sticky top-16 z-sticky mt-4">
        {selected.length > 0 ? (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-ink-brand bg-surface-selected p-3 shadow-md">
            <p className="text-label-md text-ink"><span className="tabular-nums">{selected.length}</span> selected</p>
            <Button size="sm" variant="ghost" iconStart={<X />} onClick={() => setSelected([])}>Clear</Button>
            <Button size="sm" variant="primary" className="ml-auto" iconStart={<Send />} onClick={() => setConfirm(true)}>Invite {selected.length} {selected.length === 1 ? "person" : "people"}</Button>
          </div>
        ) : allNotInvited.length > 0 && (
          <p className="text-body-sm text-ink-muted">
            Select people below, or <button type="button" className="inline-flex min-h-6 items-center font-semibold text-link underline underline-offset-2" onClick={() => setSelected(allNotInvited)}>select all {allNotInvited.length} not invited{query.text || query.category !== "all" ? " in this view" : ""}</button>.
          </p>
        )}
      </div>

      <div data-results={rows ? "" : undefined} className="mt-4">
        <Table caption="Waitlist sign-ups" columns={columns} rows={visible} rowKey={(r) => r.signup.id} density="compact"
          empty={<p className="p-6 text-center text-body-md text-ink-muted">No one matches. Try fewer filters.</p>} />
      </div>
      {pageCount > 1 && <Pager className="mt-4" page={page} pageCount={pageCount} onChange={setPage} itemLabel="page of sign-ups" />}
      <p className="mt-6 text-caption text-ink-subtle">Sample waitlist: 500 fictional sign-ups at example.com.</p>

      <ConfirmDialog open={confirm} busy={busy} onCancel={() => setConfirm(false)} onConfirm={invite}
        title={`Invite ${selected.length} ${selected.length === 1 ? "person" : "people"}?`} confirmLabel={`Send ${selected.length} ${selected.length === 1 ? "invite" : "invites"}`}
        description={<>Each gets the invite email with their own “Create your profile” link, valid for 30 days. <Link href="/emails/invite/" className="text-link underline underline-offset-2">Preview the email</Link>.</>} />
    </Page>
  );
}
