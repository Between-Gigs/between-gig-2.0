"use client";
import { Skeleton } from "@ds/components";
import { ArrowRight, Send } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { data, type DashboardSummary } from "@/lib/data";
import { PersonPhoto } from "@/components/people/PersonPhoto";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ActivityList, ago } from "@/components/owners/activity";
import { ProposalNote } from "./ProposalNote";

/** Proposal: home for Patti and Peter. One question answered first: is anyone waiting on us? */
export function OwnerHome() {
  const [d, setD] = React.useState<DashboardSummary | null>(null);
  React.useEffect(() => { void data.owners.dashboard().then(setD); }, []);
  if (!d) return <div aria-busy="true" aria-label="Loading" className="grid gap-4"><Skeleton shape="block" className="h-40" /><Skeleton shape="block" className="h-64" /></div>;
  const queue = d.reviewQueue;
  const live = d.counts.approved;

  return (
    <div className="grid gap-10">
      <section aria-labelledby="o-today" data-theme="dark" className="relative isolate overflow-hidden rounded-2xl bg-surface-brand p-6 sm:p-10">
        <span aria-hidden="true" className="glow-horizon opacity-60" />
        <div className="relative z-raised grid gap-6 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <p className="text-eyebrow text-ink-brand uppercase">Today on the call sheet</p>
            <h2 id="o-today" className="mt-2 font-display text-display-md text-balance text-ink">
              {queue.length ? <>{queue.length} {queue.length === 1 ? "Gigster is" : "Gigsters are"} <span className="glow-text text-ink-brand">waiting on you.</span></> : <>Nobody is waiting. <span className="glow-text text-ink-brand">Enjoy your day.</span></>}
            </h2>
          </div>
          <div className="flex flex-wrap gap-3 lg:col-span-4 lg:justify-end">
            {queue.length > 0 && <ButtonLink href={`/owners/people/${queue[0].person.id}/`} variant="primary" size="lg" className="glow-hover" iconEnd={<ArrowRight />}>Review {queue[0].person.name.split(" ")[0]}</ButtonLink>}
          </div>
        </div>
      </section>
      <ProposalNote n={1} title="Lead with the one decision only owners can make" >
        <p>Patti and Peter asked for something "nice and clean and simple". The only thing that stalls the platform is a profile waiting for review, so it's the headline, with the oldest one a single click away.</p>
      </ProposalNote>

      <section aria-label="At a glance" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[["Live profiles", live], ["Waiting for review", queue.length], ["Building a profile", d.counts.registered + d.counts.draft + d.counts.changes_requested], ["Not invited yet", d.waitlist.not_invited]].map(([k, v]) => (
          <div key={k as string} className="grid gap-1 rounded-xl border border-line bg-surface p-4">
            <span className="text-label-sm text-ink-muted">{k}</span>
            <span className="font-display text-stat text-ink tabular-nums">{v}</span>
          </div>
        ))}
      </section>
      <ProposalNote n={2} title="Four numbers, in words" >
        <p>The full status breakdown lives on the dashboard. Home keeps four plain-language numbers that answer "how are we doing?" without a chart.</p>
      </ProposalNote>

      <div className="grid gap-6 lg:grid-cols-12">
        <section aria-labelledby="o-queue" className="rounded-2xl border border-line bg-surface p-5 lg:col-span-7">
          <h2 id="o-queue" className="font-display text-heading-lg text-ink">Up next</h2>
          <ul className="mt-3 grid">
            {queue.slice(0, 4).map(({ person: p, fields }) => (
              <li key={p.id} className="group relative flex items-center gap-3 border-t border-line py-3 first:border-0">
                <PersonPhoto id={p.id} name={p.name} src={fields?.photo || undefined} alt="" className="size-10 shrink-0 rounded-lg" textClass="text-label-md" />
                <Link href={`/owners/people/${p.id}/`} className="min-w-0 flex-1 truncate text-label-md text-ink after:absolute after:inset-0 group-hover:text-ink-brand">{p.name}</Link>
                <span className="text-body-sm text-ink-subtle">{p.submittedAt ? ago(p.submittedAt) : ""}</span>
              </li>
            ))}
            {queue.length === 0 && <li className="py-3 text-body-sm text-ink-muted">All caught up.</li>}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <ButtonLink href="/owners/" size="sm" iconEnd={<ArrowRight />}>Open the dashboard</ButtonLink>
            <ButtonLink href="/owners/waitlist/?status=not_invited" size="sm" variant="ghost" iconStart={<Send />}>Invite more</ButtonLink>
          </div>
        </section>
        <section aria-labelledby="o-activity" className="rounded-2xl border border-line bg-surface p-5 lg:col-span-5">
          <h2 id="o-activity" className="mb-3 font-display text-heading-lg text-ink">Lately</h2>
          <ActivityList events={d.activity.slice(0, 5)} />
        </section>
      </div>
      <ProposalNote n={3} title="Home, not a second dashboard" >
        <p>Owners sign in to the same front door as everyone else. Their home is a short summary that hands off to /owners for the real work, so there's one admin place to learn, not two.</p>
      </ProposalNote>
    </div>
  );
}
