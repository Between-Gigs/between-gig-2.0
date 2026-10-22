"use client";
import { EmptyState, PageHeader, Skeleton } from "@ds/components";
import { ArrowRight, Inbox, Send } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { data, type DashboardSummary } from "@/lib/data";
import { PersonPhoto } from "@/components/people/PersonPhoto";
import { Funnel } from "./Funnel";
import { OwnerShell } from "./OwnerShell";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ActivityList, ago } from "./activity";
import { OwnerGate } from "./OwnerGate";

const greeting = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"; };

/** /owners: the owners' home. Where everyone is, who's waiting for review, what just happened. Calm and short. */
export function OwnerDashboard() {
  return <OwnerGate>{() => <Dashboard />}</OwnerGate>;
}

function Dashboard() {
  const [d, setD] = React.useState<DashboardSummary | null>(null);
  React.useEffect(() => { void data.owners.dashboard().then(setD); }, []);

  if (!d) return <OwnerShell><div aria-busy="true" aria-label="Loading dashboard" className="grid gap-4"><Skeleton className="h-10 w-1/3" /><Skeleton shape="block" className="h-24" /><Skeleton shape="block" className="h-80" /></div></OwnerShell>;

  const queue = d.reviewQueue;

  return (
    <OwnerShell>
      <PageHeader eyebrow="Owners" title={greeting()}
        description={queue.length ? `${queue.length} ${queue.length === 1 ? "profile is" : "profiles are"} waiting for your review.` : "Nothing is waiting for review. Nice work."}
        actions={
          <div className="flex flex-wrap gap-2">
            {queue.length > 0 && <ButtonLink href={`/owners/people/${queue[0].person.id}/?from=review`} variant="strong" iconEnd={<ArrowRight />}>Review the oldest</ButtonLink>}
            <ButtonLink href="/owners/waitlist/?status=not_invited" iconStart={<Send />}>Invite from the waitlist</ButtonLink>
          </div>
        } />

      <Funnel d={d} className="mt-6" />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section aria-labelledby="queue-h" className="min-w-0 rounded-2xl border border-line bg-surface p-5 lg:col-span-7">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="queue-h" className="font-display text-heading-lg text-ink">Ready for review</h2>
            <Link href="/owners/review/" className="inline-flex min-h-6 items-center gap-1 text-label-md text-link underline underline-offset-2">See the queue<ArrowRight className="size-4" aria-hidden="true" /></Link>
          </div>
          {queue.length === 0 ? (
            <EmptyState className="py-10" icon={<Inbox />} title="All caught up" headingLevel={3}>New submissions appear here, oldest first.</EmptyState>
          ) : (
            <ul className="mt-3 grid grid-cols-1">
              {queue.slice(0, 5).map(({ person: p, fields }) => (
                <li key={p.id} className="group relative flex min-w-0 items-center gap-3 border-t border-line py-3 first:border-0">
                  <PersonPhoto id={p.id} name={p.name} src={fields?.photo || undefined} alt="" className="size-11 shrink-0 rounded-lg" textClass="text-label-md" />
                  <div className="min-w-0 flex-1">
                    <Link href={`/owners/people/${p.id}/?from=review`} className="block truncate text-label-md text-ink after:absolute after:inset-0 group-hover:text-ink-brand">{p.name}</Link>
                    <p className="truncate text-body-sm text-ink-muted">{fields?.services.join(", ") || fields?.position}</p>
                  </div>
                  <span className="shrink-0 text-body-sm whitespace-nowrap text-ink-subtle tabular-nums">{p.submittedAt ? ago(p.submittedAt) : ""}</span>
                  <ArrowRight className="size-4 shrink-0 text-ink-brand" aria-hidden="true" />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="activity-h" className="min-w-0 rounded-2xl border border-line bg-surface p-5 lg:col-span-5">
          <h2 id="activity-h" className="mb-3 font-display text-heading-lg text-ink">Recent activity</h2>
          <ActivityList events={d.activity.slice(0, 8)} />
        </section>
      </div>
      <p className="mt-6 text-caption text-ink-subtle">Names shown are illustrative samples for this draft.</p>
    </OwnerShell>
  );
}
