"use client";
import { EmptyState, Skeleton } from "@ds/components";
import { ArrowRight, CircleCheck, ClipboardCheck, Inbox, ListPlus, MessageSquareWarning, Send } from "lucide-react";
import * as React from "react";
import { data, type DashboardSummary, type Session } from "@/lib/data";
import { validateAll } from "@/lib/profile/validate";
import { PersonPhoto } from "@/components/people/PersonPhoto";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ActivityList, ago } from "./activity";
import { Funnel } from "./Funnel";
import { HeaderSkeleton, Meter, OwnerPage, Panel, PanelLink, Row, RowSkeletons, StatCard } from "./kit";
import { OwnerGate } from "./OwnerGate";
import { OwnerShell } from "./OwnerShell";
import { reviewHref } from "./ReviewPanel";

const greeting = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"; };
const today = () => new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
/** "Patti" from "Patti Smith"; the sample owner ("Owner (sample)") gets no name rather than "Owner". */
const firstName = (s: Session) => { const n = s.name.replace(/\s*\(.*\)$/, "").trim().split(" ")[0]; return n && n !== "Owner" ? n : ""; };

/** /owners: the owners' home. What needs doing today, who's waiting, what just happened, how the invites are going. */
export function OwnerDashboard() {
  return <OwnerGate>{(s) => <Dashboard session={s} />}</OwnerGate>;
}

function Dashboard({ session }: { session: Session }) {
  const [d, setD] = React.useState<DashboardSummary | null>(null);
  React.useEffect(() => { void data.owners.dashboard().then(setD); }, []);
  const name = firstName(session);
  const queue = d?.reviewQueue ?? [];

  return (
    <OwnerShell>
      {!d ? <DashboardSkeleton /> : (
        <OwnerPage title={`${greeting()}${name ? `, ${name}` : ""}`}
          description={<>{today()} · {queue.length ? <>{queue.length} {queue.length === 1 ? "profile is" : "profiles are"} waiting for your review.</> : "Nothing is waiting for review."}</>}
          actions={
            <>
              <ButtonLink href="/owners/waitlist/?status=not_invited" variant="secondary" iconStart={<Send />}>Invite people</ButtonLink>
              {queue.length > 0 && <ButtonLink href={reviewHref(queue[0].person.id)} variant="primary" iconEnd={<ArrowRight />}>Review the oldest</ButtonLink>}
            </>
          }>
          <ul aria-label="At a glance" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <li><StatCard href="/owners/review/" label="Waiting for review" value={d.counts.submitted} hint="Oldest first in the queue" icon={<ClipboardCheck />} attention={d.counts.submitted > 0} /></li>
            <li><StatCard href="/owners/people/?status=changes_requested" label="Making edits" value={d.counts.changes_requested} hint="Sent back with your notes" icon={<MessageSquareWarning />} /></li>
            <li><StatCard href="/owners/people/?status=approved" label="Live profiles" value={d.counts.approved} hint="Clients can find them" icon={<CircleCheck />} /></li>
            <li><StatCard href="/owners/waitlist/?status=not_invited" label="Ready to invite" value={d.waitlist.not_invited} hint={`Of ${d.waitlist.total} on the waitlist`} icon={<ListPlus />} /></li>
          </ul>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <Panel className="lg:col-span-7" title="Ready for review" flush
              aside={queue.length > 0 && <span className="tabular-nums">{queue.length} waiting</span>}
              footer={<PanelLink href="/owners/review/">Open the review queue</PanelLink>}>
              {queue.length === 0 ? (
                <EmptyState className="py-10" icon={<Inbox />} title="All caught up" headingLevel={3}>New submissions appear here, oldest first.</EmptyState>
              ) : (
                <ul>
                  {queue.slice(0, 5).map(({ person: p, fields, completeness }) => {
                    const gaps = fields ? Object.values(validateAll(fields)).reduce((n, e) => n + Object.keys(e).length, 0) : 0;
                    return (
                      <Row key={p.id} href={reviewHref(p.id)} title={p.name}
                        leading={<PersonPhoto id={p.id} name={p.name} src={fields?.photo || undefined} alt="" className="size-10 rounded-md" textClass="text-label-md" />}
                        subtitle={[fields?.position, gaps ? `${gaps} ${gaps === 1 ? "answer" : "answers"} missing` : null].filter(Boolean).join(" · ")}
                        meta={<><Meter value={completeness * 100} label="Profile complete" /><span className="w-24 text-right">{p.submittedAt ? ago(p.submittedAt) : ""}</span></>} />
                    );
                  })}
                </ul>
              )}
            </Panel>

            <Panel className="lg:col-span-5" title="Recent activity" flush>
              <ActivityList events={d.activity.slice(0, 5)} />
            </Panel>
          </div>

          <Funnel d={d} />
        </OwnerPage>
      )}
    </OwnerShell>
  );
}

/** The dashboard's shape while it loads: same header, cards and panels, so nothing moves when data arrives. */
function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading dashboard">
      <HeaderSkeleton />
      <div aria-hidden="true" className="mt-8 grid gap-6">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="grid h-36 content-between rounded-lg border border-line bg-surface p-5"><Skeleton className="h-4 w-32" /><Skeleton className="h-8 w-16" /></div>)}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="overflow-hidden rounded-lg border border-line bg-surface lg:col-span-7"><div className="h-14 border-b border-line" /><RowSkeletons count={4} /></div>
          <div className="overflow-hidden rounded-lg border border-line bg-surface lg:col-span-5"><div className="h-14 border-b border-line" /><RowSkeletons count={4} /></div>
        </div>
      </div>
    </div>
  );
}
