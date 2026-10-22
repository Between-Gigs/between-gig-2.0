"use client";
import { Button, EmptyState, Skeleton, cx } from "@ds/components";
import { CircleCheck, ClipboardCheck, Inbox, ListPlus, MessageSquareWarning, Play, Send } from "lucide-react";
import * as React from "react";
import { data, type DashboardSummary, type PersonStatus, type PersonSummary, type Session, type WaitlistRow } from "@/lib/data";
import { waitlistCategoryLabel } from "@/lib/data/taxonomy";
import { PersonPhoto } from "@/components/people/PersonPhoto";
import { PersonStatusBadge } from "@/components/people/PersonStatusBadge";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ActivityList, ago } from "./activity";
import { shortDate } from "./format";
import { FunnelCompact } from "./Funnel";
import { Meter, OwnerPage, Panel, PanelLink, Row, RowSkeletons, StatTab } from "./kit";
import { OwnerGate } from "./OwnerGate";
import { OwnerShell } from "./OwnerShell";
import { PersonDrawer } from "./PersonDrawer";

const greeting = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"; };
const today = () => new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
/** "Patti" from "Patti Smith"; the sample owner ("Owner (sample)") gets no name rather than "Owner". */
const firstName = (s: Session) => { const n = s.name.replace(/\s*\(.*\)$/, "").trim().split(" ")[0]; return n && n !== "Owner" ? n : ""; };

/** What the main list shows. The first four are the headline tabs; the funnel can also pick "invited" and "building". */
type View = "submitted" | "changes_requested" | "approved" | "not_invited" | "invited" | "building";
const views: Record<View, { title: string; empty: string; more: { href: string; label: string }; statuses?: PersonStatus[] }> = {
  submitted: { title: "Waiting for review", empty: "Nobody is waiting. New submissions appear here, oldest first.", more: { href: "/owners/review/", label: "Open the review queue" }, statuses: ["submitted"] },
  changes_requested: { title: "Making edits", empty: "Nobody is making edits right now.", more: { href: "/owners/people/?status=changes_requested", label: "See them in People" }, statuses: ["changes_requested"] },
  approved: { title: "Live profiles", empty: "No profiles are live yet.", more: { href: "/owners/people/?status=approved", label: "See them in People" }, statuses: ["approved"] },
  not_invited: { title: "Ready to invite", empty: "Everyone on the waitlist has been invited.", more: { href: "/owners/waitlist/?status=not_invited", label: "Choose who to invite" } },
  invited: { title: "Invited, not joined yet", empty: "Everyone invited has joined.", more: { href: "/owners/people/?status=invited", label: "See them in People" }, statuses: ["invited"] },
  building: { title: "Building their profile", empty: "Nobody is mid-profile right now.", more: { href: "/owners/people/?status=draft", label: "See them in People" }, statuses: ["registered", "draft"] },
};
/** On phones the list shows this many, then "Show all": the page stays short. On desktop the panel scrolls. */
const PHONE_ROWS = 5;

/**
 * /owners: the owners' home, on one screen. Four headline numbers double as tabs for the list beneath them;
 * the funnel and activity sit beside it. Opening anyone slides a panel over the page (with Approve and Suggest
 * edits for submitted profiles), so the layout never changes underneath: nothing navigates, nothing jumps.
 */
export function OwnerDashboard() {
  return <OwnerGate>{(s) => <Dashboard session={s} />}</OwnerGate>;
}

function Dashboard({ session }: { session: Session }) {
  const [d, setD] = React.useState<DashboardSummary | null>(null);
  const [people, setPeople] = React.useState<PersonSummary[]>([]);
  const [waitlist, setWaitlist] = React.useState<WaitlistRow[]>([]);
  const [view, setView] = React.useState<View>("submitted");
  /** The open person: the list they were opened from (a view, or one person from Recent activity) and where in it. */
  const [drawer, setDrawer] = React.useState<{ rows: PersonSummary[]; index: number; from: View | "one" } | null>(null);
  const [expanded, setExpanded] = React.useState(false);

  // Everything loads once, so switching tabs is instant: no spinners, no layout shifts.
  const load = React.useCallback(async () => {
    const [summary, all, wl] = await Promise.all([data.owners.dashboard(), data.people.list(), data.owners.waitlist({ inviteStatus: "not_invited", sort: "joined-new" })]);
    setD(summary); setPeople(all); setWaitlist(wl);
    return { summary, all };
  }, []);
  React.useEffect(() => { void load(); }, [load]); // eslint-disable-line react-hooks/set-state-in-effect

  const name = firstName(session);
  const v = views[view];
  const rows: PersonSummary[] = d ? (view === "submitted" ? d.reviewQueue : v.statuses ? people.filter((r) => v.statuses!.includes(r.person.status)) : []) : [];
  const count = view === "not_invited" ? waitlist.length : rows.length;
  const pick = (next: View) => { setView(next); setExpanded(false); };

  /** The rows of a view, from fresh data. */
  const rowsFor = (vw: View, summary: DashboardSummary, all: PersonSummary[]) => {
    const st = views[vw].statuses;
    return vw === "submitted" ? summary.reviewQueue : st ? all.filter((r) => st.includes(r.person.status)) : [];
  };
  // After a decision (or Undo): refresh everything, and keep the drawer on the same slot of its now shorter list.
  const refreshAfterDecision = async () => {
    const { summary, all } = await load();
    setDrawer((cur) => {
      if (!cur) return cur;
      const list = cur.from === "one"
        ? cur.rows.map((r) => all.find((x) => x.person.id === r.person.id)).filter((r): r is PersonSummary => !!r)
        : rowsFor(cur.from, summary, all);
      return list.length ? { ...cur, rows: list, index: Math.min(cur.index, list.length - 1) } : null;
    });
  };
  const openPerson = (id: string) => {
    const r = people.find((x) => x.person.id === id);
    if (r) setDrawer({ rows: [r], index: 0, from: "one" });
  };

  if (!d) return <OwnerShell fit><DashboardSkeleton /></OwnerShell>;

  return (
    <OwnerShell fit>
      <OwnerPage fit title={`${greeting()}${name ? `, ${name}` : ""}`}
        description={<>{today()} · {d.counts.submitted ? <>{d.counts.submitted} {d.counts.submitted === 1 ? "profile is" : "profiles are"} waiting for your review.</> : "Nothing is waiting for review."}</>}
        actions={
          <>
            <ButtonLink href="/owners/waitlist/?status=not_invited" variant="secondary" iconStart={<Send />}>Invite people</ButtonLink>
            {d.reviewQueue.length > 0 && <Button variant="primary" iconStart={<Play />} onClick={() => { pick("submitted"); setDrawer({ rows: d.reviewQueue, index: 0, from: "submitted" }); }}>Start reviewing</Button>}
          </>
        }>
        <div role="tablist" aria-label="At a glance" className="grid shrink-0 grid-cols-2 gap-3 xl:grid-cols-4">
          <StatTab controls="dash-list" label="Waiting for review" value={d.counts.submitted} hint="oldest first" icon={<ClipboardCheck />} attention={d.counts.submitted > 0} selected={view === "submitted"} onSelect={() => pick("submitted")} />
          <StatTab controls="dash-list" label="Making edits" value={d.counts.changes_requested} hint="sent back with notes" icon={<MessageSquareWarning />} selected={view === "changes_requested"} onSelect={() => pick("changes_requested")} />
          <StatTab controls="dash-list" label="Live profiles" value={d.counts.approved} hint="clients can find them" icon={<CircleCheck />} selected={view === "approved"} onSelect={() => pick("approved")} />
          <StatTab controls="dash-list" label="Ready to invite" value={d.waitlist.not_invited} hint={`of ${d.waitlist.total}`} icon={<ListPlus />} selected={view === "not_invited"} onSelect={() => pick("not_invited")} />
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 lg:grid-cols-12">
          <Panel className="min-h-0 lg:col-span-7" title={v.title} flush bodyClassName="min-h-0 lg:overflow-y-auto"
            aside={<span className="tabular-nums">{count} {count === 1 ? "person" : "people"}</span>}
            footer={<PanelLink href={v.more.href}>{v.more.label}</PanelLink>}>
            <div id="dash-list" role="tabpanel" aria-label={v.title}>
              {count === 0 ? (
                <EmptyState className="py-10" icon={<Inbox />} title="Nothing here" headingLevel={3}>{v.empty}</EmptyState>
              ) : view === "not_invited" ? (
                <ul>
                  {waitlist.map((w, i) => (
                    <li key={w.signup.id} className={cx("flex min-h-14 min-w-0 items-center gap-4 border-t border-line px-5 py-2.5 first:border-t-0", i >= PHONE_ROWS && !expanded && "max-lg:hidden")}>
                      <span className="grid size-10 shrink-0 place-items-center rounded-md bg-surface-sunken text-ink-subtle"><Send className="size-4" aria-hidden="true" /></span>
                      <span className="grid min-w-0 flex-1">
                        <span className="truncate text-label-md text-ink">{w.signup.email}</span>
                        <span className="truncate text-body-sm text-ink-muted tabular-nums">ZIP {w.signup.zip}{w.signup.category ? ` · ${waitlistCategoryLabel(w.signup.category)}` : ""}</span>
                      </span>
                      <span className="hidden shrink-0 text-body-sm text-ink-subtle tabular-nums sm:block">Joined {shortDate(w.signup.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <ul>
                  {rows.map((r, i) => {
                    const p = r.person;
                    return (
                      <Row key={p.id} onOpen={() => setDrawer({ rows, index: i, from: view })} title={p.name || p.email}
                        className={cx(i >= PHONE_ROWS && !expanded && "max-lg:hidden")}
                        leading={<PersonPhoto id={p.id} name={p.name || "?"} src={r.fields?.photo || undefined} alt="" className="size-10 rounded-md" textClass="text-label-md" />}
                        badge={view === "building" ? <PersonStatusBadge status={p.status} size="sm" /> : undefined}
                        subtitle={r.fields?.position ? [r.fields.position, r.fields.areas.join(" · ")].filter(Boolean).join(" · ") : p.email}
                        meta={<>{r.fields && <Meter value={r.completeness * 100} label="Profile complete" />}<span className="w-24 text-right">{ago((view === "submitted" ? p.submittedAt : p.updatedAt) ?? p.updatedAt)}</span></>} />
                    );
                  })}
                </ul>
              )}
              {count > PHONE_ROWS && !expanded && (
                <div className="border-t border-line px-5 py-2 lg:hidden">
                  <Button variant="ghost" size="sm" onClick={() => setExpanded(true)}>Show all {count}</Button>
                </div>
              )}
            </div>
          </Panel>

          <div className="flex min-h-0 flex-col gap-5 lg:col-span-5">
            <FunnelCompact d={d} selected={view} onSelect={(x) => pick(x)} />
            <Panel className="min-h-0 flex-1" title="Recent activity" flush bodyClassName="min-h-0 lg:overflow-y-auto">
              <ActivityList events={d.activity.slice(0, 12)} onOpen={openPerson} />
            </Panel>
          </div>
        </div>
      </OwnerPage>

      <PersonDrawer rows={drawer?.rows ?? []} index={drawer ? drawer.index : null}
        onIndex={(index) => setDrawer((cur) => (cur ? { ...cur, index } : cur))} onClose={() => setDrawer(null)} onChanged={refreshAfterDecision} />
    </OwnerShell>
  );
}

/** The dashboard's shape while it loads: the same header, tabs and panels, so nothing moves when data arrives. */
function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading dashboard" className="flex min-h-0 flex-1 flex-col">
      <div aria-hidden="true" className="grid gap-2"><Skeleton className="h-9 w-72" /><Skeleton className="h-4 w-96 max-w-full" /></div>
      <div aria-hidden="true" className="mt-6 flex min-h-0 flex-1 flex-col gap-5">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="grid h-24 content-between rounded-lg border border-line bg-surface p-4"><Skeleton className="h-4 w-32" /><Skeleton className="h-6 w-12" /></div>)}
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="overflow-hidden rounded-lg border border-line bg-surface lg:col-span-7"><div className="h-14 border-b border-line" /><RowSkeletons count={5} /></div>
          <div className="overflow-hidden rounded-lg border border-line bg-surface lg:col-span-5"><div className="h-14 border-b border-line" /><RowSkeletons count={5} /></div>
        </div>
      </div>
    </div>
  );
}
