"use client";
import { Badge, Button, Checkbox, Input, Modal, Pager, Select, cx, type BadgeTone, useToast } from "@ds/components";
import { Eye, Mail, RotateCw, Search, Send, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import * as React from "react";
import { renderEmail } from "@/emails";
import { data, inviteStatuses, type InviteStatus, type WaitlistQuery, type WaitlistRow } from "@/lib/data";
import { waitlistCategories, waitlistCategoryLabel } from "@/lib/data/taxonomy";
import { inChunks } from "@/lib/owners/batch";
import { OwnerShell } from "./OwnerShell";
import { OwnerGate } from "./OwnerGate";
import { shortDate } from "./format";
import { OwnerPage, Panel, RowSkeletons } from "./kit";

const PAGE = 25;
/** Where each sign-up is with their invite now. "Account created" matches the dashboard funnel's wording. */
/** Live has no "opened" stage: Clerk doesn't report an opened invite (Company OS decision N-10). */
const statuses = data.kind === "live" ? inviteStatuses.filter((s) => s !== "opened") : inviteStatuses;

const statusMeta: Record<InviteStatus, { label: string; tone: BadgeTone }> = {
  not_invited: { label: "Not invited", tone: "neutral" },
  invited: { label: "Invite sent", tone: "info" },
  opened: { label: "Opened", tone: "warning" },
  registered: { label: "Account created", tone: "success" },
};

/** /owners/waitlist: the call-sheet sign-ups (~500) and where each one is with their invite. Select, then invite in bulk. */
export function OwnerWaitlist() {
  return <OwnerGate>{() => <Waitlist />}</OwnerGate>;
}

function Waitlist() {
  const params = useSearchParams();
  const toast = useToast();
  const initialStatus = (statuses as string[]).includes(params.get("status") ?? "") ? (params.get("status") as InviteStatus) : "all";
  const [query, setQuery] = React.useState<Required<WaitlistQuery>>({ text: "", inviteStatus: initialStatus, category: "all", sort: "joined-new" });
  const [text, setText] = React.useState("");
  const [rows, setRows] = React.useState<WaitlistRow[] | null>(null);
  const [counts, setCounts] = React.useState<Record<InviteStatus, number> | null>(null);
  const [page, setPage] = React.useState(1);
  const [selected, setSelected] = React.useState<string[]>([]);
  const [confirm, setConfirm] = React.useState(false);
  const [preview, setPreview] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  /** Bulk invites go 10 at a time: how many have been sent so far, of how many. */
  const [progress, setProgress] = React.useState<[number, number] | null>(null);

  const refresh = React.useCallback(async (q: WaitlistQuery) => {
    const [r, all] = await Promise.all([data.owners.waitlist(q), data.owners.waitlist()]);
    setRows(r);
    setCounts(Object.fromEntries(statuses.map((s) => [s, all.filter((x) => x.inviteStatus === s).length])) as Record<InviteStatus, number>);
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
  const someOnPage = invitable.some((id) => selected.includes(id));
  const toggle = (id: string, on: boolean) => setSelected((s) => (on ? [...s, id] : s.filter((x) => x !== id)));
  const togglePage = (on: boolean) => setSelected((s) => (on ? Array.from(new Set([...s, ...invitable])) : s.filter((x) => !invitable.includes(x))));
  const allNotInvited = (rows ?? []).filter((r) => r.inviteStatus === "not_invited").map((r) => r.signup.id);
  const total = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : 0;
  const n = selected.length;
  const people = (k: number) => `${k} ${k === 1 ? "person" : "people"}`;
  const invites = (k: number) => `${k} ${k === 1 ? "invite" : "invites"}`;

  const invite = async () => {
    setBusy(true);
    try {
      const r = await inChunks(selected, (chunk) => data.owners.invite(chunk), (done, of) => setProgress([done, of]));
      toast({ message: `${invites(r.invited)} queued${r.skipped ? ` · ${r.skipped} already invited` : ""}`, tone: "success" });
      if (r.failed) toast({ message: `${invites(r.failed)} couldn't be sent. They're still ready to invite; try again.`, tone: "danger" });
      setSelected([]);
      setConfirm(false);
      await refresh(query);
    } catch { toast({ message: "Couldn't send invites. Try again.", tone: "danger" }); }
    finally { setBusy(false); setProgress(null); }
  };

  /** Live: a new link for someone invited who hasn't signed up; Company OS revokes the older one. */
  const resend = async (personId: string, address: string) => {
    try {
      const r = await data.owners.resendInvite!([personId]);
      toast(r.invited ? { message: `New invite sent to ${address}`, tone: "success" } : r.failed ? { message: `Couldn't send the invite to ${address}. Try again.`, tone: "danger" } : { message: `${address} has already signed up` });
      await refresh(query);
    } catch { toast({ message: `Couldn't send the invite to ${address}. Try again.`, tone: "danger" }); }
  };
  const canResend = (r: WaitlistRow) => !!data.owners.resendInvite && r.inviteStatus === "invited" && !!r.personId;
  const resendButton = (r: WaitlistRow) => canResend(r) && (
    <Button size="sm" variant="ghost" iconStart={<RotateCw />} aria-label={`Resend invite to ${r.signup.email}`} onClick={() => void resend(r.personId!, r.signup.email)}>Resend</Button>
  );

  const emails = (rows ?? []).filter((r) => selected.includes(r.signup.id)).map((r) => r.signup.email);
  const email = React.useMemo(() => renderEmail("invite", emails[0] ? { email: emails[0] } : {}), [emails[0]]); // eslint-disable-line react-hooks/exhaustive-deps

  const selects = (
    <>
      <Select aria-label="Interested in" value={query.category} onValueChange={set("category")}
        options={[{ value: "all", label: "Any interest" }, ...waitlistCategories.map(([value, label]) => ({ value, label }))]} />
      <Select aria-label="Sort" value={query.sort} onValueChange={set("sort")}
        options={[{ value: "joined-new", label: "Newest first" }, { value: "joined-old", label: "Oldest first" }, { value: "email", label: "Email, A to Z" }, { value: "zip", label: "ZIP" }]} />
    </>
  );

  return (
    <OwnerShell>
      <OwnerPage title="Waitlist" meta={counts ? total : "–"}
        description="Everyone who got on the call sheet, and where they are with their invite. Pick people and send their personal “Create your profile” link.">
      {/* One line: search, invite status (with counts), interest and order. On phones they wrap. */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1 basis-60"><Input type="search" aria-label="Search the waitlist" placeholder="Email or ZIP" value={text} onChange={(e) => setText(e.target.value)} start={<Search />} /></div>
        <Select aria-label="Invite status" value={query.inviteStatus} onValueChange={set("inviteStatus")} className="w-full sm:w-56"
          options={[{ value: "all", label: `Everyone${counts ? ` · ${total}` : ""}` }, ...statuses.map((st) => ({ value: st, label: `${statusMeta[st].label}${counts ? ` · ${counts[st]}` : ""}` }))]} />
        <div className="flex w-full gap-2 sm:w-auto [&>*]:flex-1 sm:[&>*]:w-44 sm:[&>*]:flex-none">{selects}</div>
      </div>

      <Panel flush title={<><span className="tabular-nums">{rows?.length ?? 0}</span> sign-ups</>}
        aside={allNotInvited.length > 0 && n < allNotInvited.length && <button type="button" className="inline-flex min-h-8 items-center text-label-md text-ink-muted hover:text-ink" onClick={() => setSelected(allNotInvited)}>Select all {allNotInvited.length} not invited{query.text || query.category !== "all" ? " in this view" : ""}</button>}
        footer={pageCount > 1 ? <Pager page={page} pageCount={pageCount} onChange={setPage} itemLabel="page of sign-ups" /> : undefined}>
      <div data-results={rows ? "" : undefined}>
        {!rows && <RowSkeletons count={8} />}
        {/* Tablet and up: a table. Selected rows are tinted and marked, so a selection is easy to see while scrolling. */}
        <div className={cx("hidden overflow-x-auto", rows && "md:block")}>
          <table className="w-full border-collapse text-left text-body-md">
            <caption className="sr-only">Waitlist sign-ups</caption>
            <thead className="bg-surface-sunken">
              <tr className="text-label-sm text-ink-muted">
                <th scope="col" className="h-10 w-12 border-b border-line px-3">
                  <Checkbox aria-label="Select everyone on this page who isn't invited" checked={allOnPage} disabled={!invitable.length}
                    ref={(el) => { if (el) el.indeterminate = someOnPage && !allOnPage; }} onChange={(e) => togglePage(e.target.checked)} />
                </th>
                <th scope="col" className="border-b border-line px-3 font-semibold">Email</th>
                <th scope="col" className="border-b border-line px-3 font-semibold">ZIP</th>
                <th scope="col" className="border-b border-line px-3 font-semibold">Interested in</th>
                <th scope="col" className="border-b border-line px-3 font-semibold">Joined</th>
                <th scope="col" className="border-b border-line px-3 font-semibold">Invite</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-body-md text-ink-muted">No one matches. Try fewer filters.</td></tr>}
              {visible.map((r) => {
                const on = selected.includes(r.signup.id);
                return (
                  <tr key={r.signup.id}
                    className={cx("border-b border-line transition-colors duration-fast last:border-b-0", on ? "bg-surface-selected" : "hover:bg-surface-hover")}>
                    <td className={cx("h-10 border-l-4 px-3", on ? "border-l-ink-brand" : "border-l-transparent")}>
                      {r.inviteStatus === "not_invited"
                        ? <Checkbox aria-label={`Select ${r.signup.email}`} checked={on} onChange={(e) => toggle(r.signup.id, e.target.checked)} />
                        : <span className="sr-only">Already invited</span>}
                    </td>
                    <td className="px-3">{r.personId ? <Link href={`/owners/people/${r.personId}/`} className="text-ink hover:text-ink-brand hover:underline">{r.signup.email}</Link> : <span className="text-ink">{r.signup.email}</span>}</td>
                    <td className="px-3 text-ink-muted tabular-nums">{r.signup.zip}</td>
                    <td className="px-3 text-ink-muted">{r.signup.category ? waitlistCategoryLabel(r.signup.category) : "—"}</td>
                    <td className="px-3 whitespace-nowrap text-ink-muted tabular-nums">{shortDate(r.signup.createdAt)}</td>
                    <td className="px-3">{r.inviteStatus === "not_invited" ? <span className="text-body-sm text-ink-subtle">Not invited</span> : <span className="inline-flex items-center gap-1"><Badge tone={statusMeta[r.inviteStatus].tone} size="sm">{statusMeta[r.inviteStatus].label}</Badge>{resendButton(r)}</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Phones: compact rows. */}
        <ul aria-label="Waitlist sign-ups" className={cx("grid grid-cols-1 md:hidden", !rows && "hidden")}>
          {visible.length === 0 && <li className="p-6 text-center text-body-md text-ink-muted">No one matches. Try fewer filters.</li>}
          {visible.map((r) => {
            const on = selected.includes(r.signup.id);
            return (
              <li key={r.signup.id} className={cx("flex min-w-0 items-center gap-3 border-t border-l-4 border-t-line px-3 py-2.5 first:border-t-0", on ? "border-l-ink-brand bg-surface-selected" : "border-l-transparent")}>
                {/* The label makes the tap area 44px around the box. */}
                {r.inviteStatus === "not_invited"
                  ? <label className="-m-3 grid size-11 shrink-0 cursor-pointer place-items-center"><Checkbox aria-label={`Select ${r.signup.email}`} checked={on} onChange={(e) => toggle(r.signup.id, e.target.checked)} /></label>
                  : <span className="grid size-5 shrink-0 place-items-center text-ink-subtle"><Mail className="size-4" aria-hidden="true" /><span className="sr-only">Already invited</span></span>}
                <div className="grid min-w-0 flex-1">
                  {r.personId
                    ? <Link href={`/owners/people/${r.personId}/`} className="truncate text-label-md text-ink hover:text-ink-brand">{r.signup.email}</Link>
                    : <span className="truncate text-label-md text-ink">{r.signup.email}</span>}
                  <span className="truncate text-body-sm text-ink-muted tabular-nums">{r.signup.zip} · {shortDate(r.signup.createdAt)}{r.signup.category ? ` · ${waitlistCategoryLabel(r.signup.category)}` : ""}</span>
                </div>
                {r.inviteStatus !== "not_invited" && <Badge tone={statusMeta[r.inviteStatus].tone} size="sm" className="shrink-0">{statusMeta[r.inviteStatus].label}</Badge>}
                {resendButton(r)}
              </li>
            );
          })}
        </ul>
      </div>
      </Panel>

      {/* The bulk action bar: pinned to the bottom of the view while anyone is selected. */}
      <div aria-live="polite" className="sticky bottom-4 z-sticky -mt-6 empty:hidden">
        {n > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-ink-brand bg-surface-raised p-2 pl-4 shadow-lg">
            <p className="text-label-md text-ink"><span className="tabular-nums">{n}</span> selected</p>
            <Button size="sm" variant="ghost" iconStart={<X />} onClick={() => setSelected([])}>Clear</Button>
            <div className="ml-auto flex gap-2">
              <Button size="sm" variant="secondary" iconStart={<Eye />} onClick={() => setPreview(true)}>Preview email</Button>
              <Button size="sm" variant="primary" iconStart={<Send />} onClick={() => setConfirm(true)}>Invite {people(n)}</Button>
            </div>
          </div>
        )}
      </div>

      <Modal open={preview} onClose={() => setPreview(false)} size="lg" title="The invite email"
        description={`What ${n === 1 ? "they get" : `each of the ${n} gets`}, with their own “Create your profile” link. Shown for ${emails[0] ?? "the first person"}.`}
        footer={<><Button variant="ghost" onClick={() => setPreview(false)}>Close</Button><Button variant="primary" iconStart={<Send />} onClick={() => { setPreview(false); setConfirm(true); }}>Invite {people(n)}</Button></>}>
        <iframe title="Invite email preview" srcDoc={email.html} className="block h-120 w-full rounded-lg border border-line bg-surface" />
      </Modal>

      <Modal open={confirm} onClose={() => setConfirm(false)} size="sm" title={`Invite ${people(n)}?`}
        description={<>We queue {invites(n)}, one to each address, with a personal link that&apos;s valid for 30 days.</>}
        footer={<><Button variant="ghost" onClick={() => setConfirm(false)}>Cancel</Button><Button variant="primary" loading={busy} iconStart={<Send />} onClick={invite}>{progress ? `Sent ${progress[0]} of ${progress[1]}` : `Send ${invites(n)}`}</Button></>}>
        <div className="grid gap-3">
          <div className="grid gap-1 rounded-lg border border-line bg-surface-sunken p-3">
            <p className="text-label-sm text-ink-subtle">Subject</p>
            <p className="text-label-md text-ink">{email.subject}</p>
            <p className="text-body-sm text-ink-muted">To {emails.slice(0, 2).join(", ")}{emails.length > 2 ? ` and ${emails.length - 2} more` : ""}</p>
          </div>
          <button type="button" onClick={() => { setConfirm(false); setPreview(true); }} className="inline-flex min-h-6 w-fit items-center gap-1 text-label-md text-link underline underline-offset-2">
            <Eye className="size-4" aria-hidden="true" />Preview the email
          </button>
        </div>
      </Modal>
      </OwnerPage>
    </OwnerShell>
  );
}
