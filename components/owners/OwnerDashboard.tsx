"use client";
import { useLook } from "@/components/site/LookSync";
import { Button, SegmentedControl, Skeleton, cx } from "@ds/components";
import { ArrowRight, Mail, Plus } from "lucide-react";
import { Icon3D } from "@/components/ui/Icon3D";
import * as React from "react";
import { data, type DashboardSummary, type PersonStatus, type PersonSummary, type Session, type WaitlistRow } from "@/lib/data";
import { waitlistCategoryLabel } from "@/lib/data/taxonomy";
import { PersonStatusBadge } from "@/components/people/PersonStatusBadge";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ActivityList, ago } from "./activity";
import { shortDate } from "./format";
import { FunnelCompact } from "./Funnel";
import { EmptyNote, forestButton, Meter, OwnerAvatar, OwnerPage, Panel, PanelLink, Row, RowHead, rowListRule, RowSkeletons, StatTab, useFitList } from "./kit";
import { OwnerGate } from "./OwnerGate";
import { ModernDashboard, sortReviewers, type ModernSort } from "./ModernDashboard";
import { OwnerShell } from "./OwnerShell";
import { isHeld } from "./hold";
import { PersonDrawer } from "./PersonDrawer";
import { markArea } from "@/lib/split-area";

markArea("bg-split:dashboard");

const greeting = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"; };
/** "Wednesday · 4 November": the small line over the greeting. */
const today = () => { const d = new Date(); return `${d.toLocaleDateString("en-US", { weekday: "long" })} · ${d.getDate()} ${d.toLocaleDateString("en-US", { month: "long" })}`; };
const daysSince = (iso?: string) => (iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)) : 0);
/** "Patti" from "Patti Smith"; the sample owner ("Owner (sample)") gets no name rather than "Owner". */
const firstName = (s: Session) => { const n = s.name.replace(/\s*\(.*\)$/, "").trim().split(" ")[0]; return n && n !== "Owner" ? n : ""; };

/** What the main list shows. The first four are the headline tabs; the funnel can also pick "invited" and "building". */
export type DashboardView = "submitted" | "changes_requested" | "approved" | "not_invited" | "invited" | "building";
type View = DashboardView;
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

/** A funnel selection narrows the same current-status list to its invited cohort. */
function rowsFor(view: View, summary: DashboardSummary, all: PersonSummary[], invitedOnly = false) {
  const statuses = views[view].statuses;
  const rows = view === "submitted" ? summary.reviewQueue.filter((r) => !isHeld(r.person.id)) : statuses ? all.filter((r) => statuses.includes(r.person.status)) : [];
  const invited = new Set(summary.invitedPersonIds);
  return invitedOnly ? rows.filter((r) => invited.has(r.person.id)) : rows;
}


/**
 * /owners: the owners' home, on one screen. Four headline numbers double as tabs for the list beneath them;
 * the funnel and activity sit beside it. Opening anyone slides a panel over the page (with Approve and Suggest
 * edits for submitted profiles), so the layout never changes underneath: nothing navigates, nothing jumps.
 */
export function OwnerDashboard() {
  return <OwnerGate>{(s) => <Dashboard session={s} />}</OwnerGate>;
}

function Dashboard({ session }: { session: Session }) {
  const look = useLook();
  const brand = look !== "swiss";
  const modern = look === "modern";
  const [sort, setSort] = React.useState<ModernSort>("oldest");
  const [d, setD] = React.useState<DashboardSummary | null>(null);
  const [people, setPeople] = React.useState<PersonSummary[]>([]);
  const [waitlist, setWaitlist] = React.useState<WaitlistRow[]>([]);
  const [view, setView] = React.useState<View>("submitted");
  const [cohort, setCohort] = React.useState<"all" | "invited">("all");
  /** The open person: the list they were opened from (a view, or one person from Recent activity) and where in it. */
  const [drawer, setDrawer] = React.useState<{ rows: PersonSummary[]; index: number; from: View | "one"; invitedOnly?: boolean } | null>(null);
  const [expanded, setExpanded] = React.useState(false);
  const [sideExpanded, setSideExpanded] = React.useState(false);
  const [side, setSide] = React.useState<"activity" | "funnel">("activity");

  // Everything loads once, so switching tabs is instant: no spinners, no layout shifts.
  const load = React.useCallback(async () => {
    const [summary, all, wl] = await Promise.all([data.owners.dashboard(), data.people.list(), data.owners.waitlist({ inviteStatus: "not_invited", sort: "joined-new" })]);
    setD(summary); setPeople(all); setWaitlist(wl);
    return { summary, all };
  }, []);
  React.useEffect(() => { void load(); }, [load]); // eslint-disable-line react-hooks/set-state-in-effect

  const name = firstName(session);
  const v = views[view];
  const filteredRows = d ? rowsFor(view, d, people, cohort === "invited") : [];
  const rows = modern && view === "submitted" ? sortReviewers(filteredRows, sort) : filteredRows;
  const count = view === "not_invited" ? waitlist.length : rows.length;
  const pick = (next: View, nextCohort: "all" | "invited" = "all") => { setView(next); setCohort(nextCohort); setExpanded(false); };
  // No scrollbars: each list shows the rows that fit its card and says how many more there are.
  const [listRef, listHidden] = useFitList([view, count, d, look]);
  const [sideRef] = useFitList([side, d, look]);

  // After a decision (or Undo): refresh everything, and keep the drawer on the same slot of its now shorter list.
  const refreshAfterDecision = async () => {
    const { summary, all } = await load();
    setDrawer((cur) => {
      if (!cur) return cur;
      const freshRows = cur.from === "one"
        ? cur.rows.map((r) => all.find((x) => x.person.id === r.person.id)).filter((r): r is PersonSummary => !!r)
        : rowsFor(cur.from, summary, all, cur.invitedOnly);
      const list = modern && cur.from === "submitted" ? sortReviewers(freshRows, sort) : freshRows;
      return list.length ? { ...cur, rows: list, index: Math.min(cur.index, list.length - 1) } : null;
    });
  };
  const openPerson = (id: string) => {
    const r = people.find((x) => x.person.id === id);
    if (r) setDrawer({ rows: [r], index: 0, from: "one" });
  };

  if (!d) return <OwnerShell fit><DashboardSkeleton /></OwnerShell>;

  if (modern) {
    const reviewQueue = rowsFor("submitted", d, people);
    const review = () => {
      setSort("oldest");
      pick("submitted");
      if (reviewQueue.length) setDrawer({ rows: reviewQueue, index: 0, from: "submitted" });
    };
    return (
      <OwnerShell>
        <ModernDashboard summary={d} people={people} waitlist={waitlist} reviewQueue={reviewQueue} rows={rows} greeting={`${greeting()}${name ? `, ${name}` : ""}`}
          view={view} cohort={cohort} title={v.title} empty={v.empty} more={v.more} sort={sort} onSort={setSort}
          onPick={pick} onReview={review} onActivity={openPerson}
          onRow={index => setDrawer({ rows, index, from: view, invitedOnly: cohort === "invited" })} />
        <PersonDrawer rows={drawer?.rows ?? []} index={drawer ? drawer.index : null}
          onIndex={index => setDrawer(cur => cur ? { ...cur, index } : cur)} onClose={() => setDrawer(null)} onChanged={refreshAfterDecision} />
      </OwnerShell>
    );
  }

  const oldest = daysSince(d.reviewQueue[0]?.person.submittedAt);
  const photos = new Map(people.map((r) => [r.person.id, r.fields?.photo || undefined]));

  const listMore = (
    <>
      <PanelLink href={v.more.href}>{cohort === "invited" ? "Browse everyone at this status" : v.more.label}</PanelLink>
      {listHidden > 0 && <span className="text-body-sm text-ink-muted tabular-nums">+{listHidden} more</span>}
    </>
  );
  const sideSwitch = <SegmentedControl label="Show" size="sm" value={side} onChange={(x) => setSide(x as "activity" | "funnel")}
    className={brand ? undefined : "mb-2 self-start"}
    options={[{ value: "activity", label: "Activity" }, { value: "funnel", label: "Funnel" }]} />;

  return (
    <OwnerShell fit>
      <OwnerPage fit hero icon="waving_hand" kicker={today()} title={`${greeting()}${name ? `, ${name}` : ""}${brand ? "" : "."}`}
        description={<>{brand && <span className="max-sm:hidden">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} · </span>}{d.counts.submitted ? `${d.counts.submitted} ${d.counts.submitted === 1 ? "Gigster is" : "Gigsters are"} waiting for your review.` : "Nothing is waiting for review. Enjoy the quiet."}</>}
        actions={
          <>
            {d.reviewQueue.length > 0 && <Button variant={brand ? "primary" : "strong"} size={brand ? "md" : "lg"} className={brand ? "order-2" : forestButton} iconEnd={<ArrowRight />} onClick={() => { pick("submitted"); setDrawer({ rows: d.reviewQueue, index: 0, from: "submitted" }); }}>Start reviewing</Button>}
            <ButtonLink href="/owners/waitlist/?status=not_invited" variant="secondary" size={brand ? "md" : "lg"} className={brand ? undefined : "border-2"} iconStart={brand ? <Mail /> : undefined} iconEnd={brand ? undefined : <Plus />}>Invite people</ButtonLink>
          </>
        }>
        <div role="tablist" aria-label="At a glance" className={brand ? "grid shrink-0 grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4" : "grid shrink-0 grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 xl:grid-cols-10"}>
          <div className={brand ? "contents" : "col-span-2 sm:col-span-1 xl:col-span-3"}><StatTab tone="peach" icon={<Icon3D name="eyes" className="size-9 sm:size-12" />} controls="dash-list" label="Waiting for review" value={d.counts.submitted} hint={d.counts.submitted ? `Oldest waiting ${oldest} ${oldest === 1 ? "day" : "days"}` : "oldest first"} attention={d.counts.submitted > 0} selected={cohort === "all" && view === "submitted"} onSelect={() => pick("submitted")} /></div>
          <div className={brand ? "contents" : "xl:col-span-2"}><StatTab tone="butter" icon={<Icon3D name="memo" className="size-9 sm:size-12" />} controls="dash-list" label="Making edits" value={d.counts.changes_requested} hint="sent back with notes" selected={cohort === "all" && view === "changes_requested"} onSelect={() => pick("changes_requested")} /></div>
          <div className={brand ? "contents" : "xl:col-span-2"}><StatTab tone="mint" icon={<Icon3D name="party_popper" className="size-9 sm:size-12" />} controls="dash-list" label="Live profiles" value={d.counts.approved} hint="clients can find them" selected={cohort === "all" && view === "approved"} onSelect={() => pick("approved")} /></div>
          <div className={brand ? "contents" : "col-span-2 sm:col-span-1 xl:col-span-3"}><StatTab tone="sage" icon={<Icon3D name="envelope" className="size-9 sm:size-12" />} controls="dash-list" label="Ready to invite" value={d.waitlist.not_invited} hint={`${d.waitlist.not_invited} of ${d.waitlist.total} on the waitlist`} suffix={brand ? `of ${d.waitlist.total}` : `/${d.waitlist.total}`} meter={d.waitlist.total ? d.waitlist.not_invited / d.waitlist.total : 0} selected={cohort === "all" && view === "not_invited"} onSelect={() => pick("not_invited")} /></div>
        </div>

        <div className={brand ? "grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-12" : "grid min-h-0 flex-1 grid-cols-1 gap-x-6 gap-y-8 lg:grid-cols-10"}>
          <Panel className="min-h-0 lg:col-span-7" number="01" title={cohort === "invited" ? `${v.title} · Invited people` : v.title} flush bodyClassName="flex min-h-0 flex-col"
            count={<><span aria-hidden="true">{count}</span><span className="sr-only">{count} {count === 1 ? "person" : "people"}</span></>}
            aside={brand ? undefined : listMore}
            footer={brand ? <div className="flex flex-wrap items-center justify-between gap-2">{listMore}</div> : undefined}>
            <div ref={listRef} id="dash-list" role="tabpanel" aria-label={v.title} className="@container min-h-0 flex-1 lg:overflow-hidden">
              {count === 0 ? (
                <EmptyNote size="sm" headingLevel={3} title="Nothing here">{v.empty}</EmptyNote>
              ) : view === "not_invited" ? (
                <ul className="border-t-2 border-line-strong">
                  {waitlist.map((w, i) => (
                    <li key={w.signup.id} data-fit="" className={cx("flex min-h-18 min-w-0 items-center gap-4 border-b border-line py-3", i >= PHONE_ROWS && !expanded && "max-lg:hidden")}>
                      <span className="grid size-12 shrink-0 place-items-center bg-surface-sunken text-ink"><Mail aria-hidden="true" className="size-5" strokeWidth={1.75} /></span>
                      <span className="grid min-w-0 flex-1">
                        <span className="truncate text-label-md font-bold text-ink">{w.signup.email}</span>
                        <span className="truncate text-body-sm text-ink-muted tabular-nums">ZIP {w.signup.zip}{w.signup.category ? ` · ${waitlistCategoryLabel(w.signup.category)}` : ""}</span>
                      </span>
                      <span className="hidden shrink-0 text-body-sm text-ink-muted tabular-nums sm:block">Joined {shortDate(w.signup.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <>
                  <RowHead first="Gigster" cols={[{ label: "Complete", className: "w-24" }, { label: view === "submitted" ? "Waiting" : "Updated", className: "w-28" }]} />
                  <ul className={rowListRule}>
                    {rows.map((r, i) => {
                      const p = r.person;
                      const when = ago((view === "submitted" ? p.submittedAt : p.updatedAt) ?? p.updatedAt);
                      return (
                        <Row key={p.id} onOpen={() => setDrawer({ rows, index: i, from: view, invitedOnly: cohort === "invited" })} title={p.name || p.email}
                          className={cx(i >= PHONE_ROWS && !expanded && "max-lg:hidden")}
                          leading={<OwnerAvatar id={p.id} name={p.name} src={r.fields?.photo || undefined} className="size-12 swiss:@md:size-16" textClass="text-heading-sm" />}
                          badge={view === "building" ? <PersonStatusBadge status={p.status} size="sm" /> : undefined}
                          subtitle={r.fields?.position ? [r.fields.position, r.fields.areas.join(" · ")].filter(Boolean).join(" · ") : p.email}
                          action={view === "submitted" ? "Review" : "Open"} strong={view === "submitted" && i === 0}
                          meta={<>{r.fields ? <Meter value={r.completeness * 100} label="Profile complete" /> : <span className="w-24" />}
                            <span className="grid w-28"><span className="text-label-md font-bold text-ink">{when.replace(/ ago$/, "")}</span><span className="text-caption text-ink-muted">{view === "submitted" ? "since submit" : "last update"}</span></span></>} />
                      );
                    })}
                  </ul>
                </>
              )}
              {count > PHONE_ROWS && !expanded && (
                <div className="border-b border-line py-2 lg:hidden">
                  <Button variant="ghost" size="sm" onClick={() => setExpanded(true)}>Show all {count}</Button>
                </div>
              )}
            </div>
          </Panel>

          {/* One section for the right column: what just happened, or how the invites are going. */}
          <Panel className={brand ? "min-h-0 lg:col-span-5" : "min-h-0 lg:col-span-3"} number="02" flush bodyClassName="flex min-h-0 flex-col"
            title={side === "activity" ? "Recent activity" : "From invite to live"} aside={brand ? sideSwitch : undefined}>
            {!brand && sideSwitch}
            <div ref={sideRef} className="min-h-0 flex-1 lg:overflow-hidden">
              {side === "activity"
                ? <>
                    <ActivityList events={d.activity.slice(0, 12)} onOpen={openPerson} photoFor={(id) => photos.get(id)} phoneLimit={sideExpanded ? undefined : PHONE_ROWS} />
                    {!sideExpanded && d.activity.slice(0, 12).length > PHONE_ROWS && (
                      <div className="border-b border-line py-2 lg:hidden"><Button variant="ghost" size="sm" onClick={() => setSideExpanded(true)}>Show all {d.activity.slice(0, 12).length}</Button></div>
                    )}
                  </>
                : <>
                    <p className="pt-2 pb-1 text-body-sm text-ink-muted tabular-nums">Out of {d.funnel.invited} invited. Pick a step to list it.</p>
                    <FunnelCompact bare d={d} selected={cohort === "invited" ? view : undefined} onSelect={(x) => pick(x, "invited")} />
                  </>}
            </div>
          </Panel>
        </div>
      </OwnerPage>

      <PersonDrawer rows={drawer?.rows ?? []} index={drawer ? drawer.index : null}
        onIndex={(index) => setDrawer((cur) => (cur ? { ...cur, index } : cur))} onClose={() => setDrawer(null)} onChanged={refreshAfterDecision} />
    </OwnerShell>
  );
}

/** The dashboard's shape while it loads: the same header, tabs and panels, so nothing moves when data arrives. */
function DashboardSkeleton() {
  const brand = useLook() !== "swiss";
  if (brand) return (
    <div aria-busy="true" aria-label="Loading dashboard" className="flex min-h-0 flex-1 flex-col">
      <div aria-hidden="true" className="grid min-h-11 gap-2"><Skeleton className="h-9 w-72" /><Skeleton className="h-4 w-80" /></div>
      <div aria-hidden="true" className="mt-6 flex min-h-0 flex-1 flex-col gap-6">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          {(["bg-tint-peach", "bg-tint-butter", "bg-tint-mint-soft", "bg-tint-sage"] as const).map((t) => <div key={t} className={cx("grid min-h-32 content-between rounded-lg p-5 sm:min-h-36", t)}><Skeleton className="h-4 w-32" /><Skeleton className="h-10 w-14" /></div>)}
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="overflow-hidden rounded-xl bg-surface shadow-sm ring-1 ring-line/70 lg:col-span-7"><div className="h-16" /><RowSkeletons count={5} /></div>
          <div className="overflow-hidden rounded-xl bg-surface shadow-sm ring-1 ring-line/70 lg:col-span-5"><div className="h-16" /><RowSkeletons count={5} /></div>
        </div>
      </div>
    </div>
  );
  return (
    <div aria-busy="true" aria-label="Loading dashboard" className="flex min-h-0 flex-1 flex-col">
      <div aria-hidden="true" className="grid gap-3"><Skeleton className="h-3 w-48" /><Skeleton className="h-20 w-full max-w-xl" /><Skeleton className="h-4 w-80" /></div>
      <div aria-hidden="true" className="mt-8 flex min-h-0 flex-1 flex-col gap-10">
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 xl:grid-cols-10">
          {["xl:col-span-3 bg-tint-mint dark:border-4 dark:border-action dark:bg-transparent", "xl:col-span-2 border-t-4 border-line-strong", "xl:col-span-2 border-t-4 border-line-strong", "xl:col-span-3 border-t-4 border-line-strong"].map((t, i) => <div key={i} className={cx("grid min-h-36 content-between p-4", t)}><Skeleton className="h-16 w-20" /><Skeleton className="h-4 w-32" /></div>)}
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-10">
          <div className="overflow-hidden border-t-4 border-line-strong lg:col-span-7"><div className="h-16" /><RowSkeletons count={5} /></div>
          <div className="overflow-hidden border-t-4 border-line-strong lg:col-span-3"><div className="h-16" /><RowSkeletons count={5} /></div>
        </div>
      </div>
    </div>
  );
}
