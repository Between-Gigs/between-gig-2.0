"use client";
import { Badge, EmptyState, PageHeader, Progress, Skeleton, StageStats } from "@ds/components";
import { ArrowRight, Inbox, Send } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { data, personStatuses, type DashboardSummary } from "@/lib/data";
import { PersonPhoto } from "@/components/people/PersonPhoto";
import { personStatusMeta } from "@/components/people/PersonStatusBadge";
import { Page } from "@/components/site/Page";
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

  if (!d) return <Page><div aria-busy="true" aria-label="Loading dashboard" className="grid gap-4"><Skeleton className="h-10 w-1/3" /><Skeleton shape="block" className="h-24" /><Skeleton shape="block" className="h-80" /></div></Page>;

  const queue = d.reviewQueue;
  const invited = d.waitlist.total - d.waitlist.not_invited;

  return (
    <Page>
      <PageHeader eyebrow="Owners" title={greeting()}
        description={queue.length ? `${queue.length} ${queue.length === 1 ? "profile is" : "profiles are"} waiting for your review.` : "Nothing is waiting for review. Nice work."}
        actions={queue.length ? <ButtonLink href={`/owners/people/${queue[0].person.id}/`} variant="strong" iconEnd={<ArrowRight />}>Review the oldest</ButtonLink> : undefined} />

      <StageStats className="mt-6" title="Gigsters by status" headingLevel={2}
        stages={personStatuses.map((s) => ({ label: personStatusMeta[s].label, value: d.counts[s], attention: s === "submitted" && d.counts[s] > 0 }))} />

      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        <section aria-labelledby="queue-h" className="rounded-2xl border border-line bg-surface p-5 lg:col-span-7">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="queue-h" className="font-display text-heading-lg text-ink">Ready for review</h2>
            <Link href="/owners/review/" className="inline-flex min-h-6 items-center gap-1 text-label-md text-link underline underline-offset-2">See the queue<ArrowRight className="size-4" aria-hidden="true" /></Link>
          </div>
          {queue.length === 0 ? (
            <EmptyState className="py-10" icon={<Inbox />} title="All caught up" headingLevel={3}>New submissions appear here, oldest first.</EmptyState>
          ) : (
            <ul className="mt-3 grid">
              {queue.slice(0, 5).map(({ person: p, fields }) => (
                <li key={p.id} className="group relative flex items-center gap-3 border-t border-line py-3 first:border-0">
                  <PersonPhoto id={p.id} name={p.name} src={fields?.photo || undefined} alt="" className="size-11 shrink-0 rounded-lg" textClass="text-label-md" />
                  <div className="min-w-0 flex-1">
                    <Link href={`/owners/people/${p.id}/`} className="block truncate text-label-md text-ink after:absolute after:inset-0 group-hover:text-ink-brand">{p.name}</Link>
                    <p className="truncate text-body-sm text-ink-muted">{fields?.services.join(", ") || fields?.position}</p>
                  </div>
                  <span className="shrink-0 text-body-sm text-ink-subtle">Sent {p.submittedAt ? ago(p.submittedAt).toLowerCase() : ""}</span>
                  <ArrowRight className="size-4 shrink-0 text-ink-brand" aria-hidden="true" />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="waitlist-h" className="grid content-start gap-4 rounded-2xl border border-line bg-surface p-5 lg:col-span-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="waitlist-h" className="font-display text-heading-lg text-ink">The waitlist</h2>
            <Badge tone="neutral" size="sm">{d.waitlist.total} sign-ups</Badge>
          </div>
          <Progress value={invited} max={d.waitlist.total} label="Invited" valueText={`${invited} of ${d.waitlist.total}`} size="md" />
          <dl className="grid grid-cols-2 gap-2">
            {([["not_invited", "Not invited"], ["invited", "Invited"], ["opened", "Opened"], ["registered", "Registered"]] as const).map(([k, label]) => (
              <div key={k} className="rounded-md bg-surface-sunken px-3 py-2"><dt className="text-label-sm text-ink-muted">{label}</dt><dd className="font-display text-heading-lg text-ink tabular-nums">{d.waitlist[k]}</dd></div>
            ))}
          </dl>
          <ButtonLink href="/owners/waitlist/?status=not_invited" variant="primary" iconStart={<Send />}>Invite from the waitlist</ButtonLink>
        </section>

        <section aria-labelledby="activity-h" className="rounded-2xl border border-line bg-surface p-5 lg:col-span-12">
          <h2 id="activity-h" className="mb-3 font-display text-heading-lg text-ink">Recent activity</h2>
          {/* Two columns on wide screens, read top to bottom in each. */}
          <div className="grid gap-x-8 lg:grid-cols-2">
            <ActivityList events={d.activity.slice(0, Math.ceil(d.activity.length / 2))} />
            <ActivityList events={d.activity.slice(Math.ceil(d.activity.length / 2))} className="max-lg:border-t max-lg:border-line max-lg:pt-3" />
          </div>
        </section>
      </div>
      <p className="mt-6 text-caption text-ink-subtle">Names shown are illustrative samples for this draft.</p>
    </Page>
  );
}
