"use client";
import { Skeleton, cx } from "@ds/components";
import { ArrowRight, Send } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { data, type DashboardSummary } from "@/lib/data";
import { PersonPhoto } from "@/components/people/PersonPhoto";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ActivityList, ago } from "@/components/owners/activity";
import { BrandBlock, mintBlock } from "./kit";
import { ProposalNote, type Note } from "./ProposalNote";

/** The reasoning beside each section, shown with "Show design notes". */
export const ownerNotes: Note[] = [
  { title: "Lead with the one decision only owners can make", body: <>
        <p>Patti and Peter asked for something "nice and clean and simple". The only thing that stalls the platform is a profile waiting for review, so it's the headline, with the oldest one a single click away.</p>
  </> },
  { title: "Four numbers, in words", body: <>
        <p>The full status breakdown lives on the dashboard. Home keeps four plain-language numbers that answer "how are we doing?" without a chart.</p>
  </> },
  { title: "Home, not a second dashboard", body: <>
        <p>Owners sign in to the same front door as everyone else. Their home is a short summary that hands off to /owners for the real work, so there's one admin place to learn, not two.</p>
  </> },
];

/** Proposal: home for Patti and Peter. One question answered first: is anyone waiting on us? */
export function OwnerHome() {
  const [d, setD] = React.useState<DashboardSummary | null>(null);
  React.useEffect(() => { void data.owners.dashboard().then(setD); }, []);
  if (!d) return <div aria-busy="true" aria-label="Loading" className="grid gap-4"><Skeleton shape="block" className="h-40" /><Skeleton shape="block" className="h-64" /></div>;
  const queue = d.reviewQueue;
  const live = d.counts.approved;

  const stats: [string, number][] = [
    ["Waiting for review", queue.length],
    ["Live profiles", live],
    ["Building a profile", d.counts.registered + d.counts.draft + d.counts.changes_requested],
    ["Not invited yet", d.waitlist.not_invited],
  ];

  return (
    <div className="grid gap-14 lg:gap-16">
      <div>
        <section aria-labelledby="o-today" className="grid grid-cols-12 gap-x-6 gap-y-6">
          <div className="col-span-12 min-w-0 self-end lg:col-span-8">
            <p className="text-label-md text-ink-muted">Today on the call sheet</p>
            <h2 id="o-today" className="mt-4 font-display text-display-sm text-balance text-ink sm:text-display-md md:text-display-lg">
              {queue.length ? <>{queue.length} {queue.length === 1 ? "Gigster is" : "Gigsters are"} <span className="text-ink-brand">waiting on you.</span></> : <>Nobody is waiting. <span className="text-ink-brand">Enjoy your day.</span></>}
            </h2>
          </div>
          {/* The forest brand block holds the one action: the oldest review. */}
          <BrandBlock className="col-span-12 min-h-40 lg:col-span-4">
            <div className="grid h-full content-end p-5 sm:p-6">
              {queue.length > 0 && <ButtonLink href={`/owners/people/${queue[0].person.id}/`} variant="primary" size="lg" fullWidth className="justify-between" iconEnd={<ArrowRight />}>Review {queue[0].person.name.split(" ")[0]}</ButtonLink>}
            </div>
          </BrandBlock>
        </section>
        <ProposalNote n={1} />
      </div>

      <div>
        {/* Four plain numbers under thick rules; the first (what needs doing today) is the screen's one mint block. */}
        <section aria-label="At a glance" className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-6 md:grid-cols-4">
          {stats.map(([k, v], i) => (
            // Every stat opens on the same 4px rule and padding, so numbers share a top line and labels a bottom line; the mint
            // one only adds side padding.
            <div key={k} className={cx("grid min-w-0 content-between gap-3 border-t-4 pt-3 pb-4", i === 0 && queue.length > 0 ? cx(mintBlock, "border-forest-950 px-4 sm:px-5") : "border-line-strong")}>
              <span className="font-display text-display-md tabular-nums sm:text-stat">{v}</span>
              <span className="text-label-md font-bold">{k}</span>
            </div>
          ))}
        </section>
        <ProposalNote n={2} />
      </div>

      <div>
        <div className="grid grid-cols-12 gap-x-6 gap-y-14">
          <section aria-labelledby="o-queue" className="col-span-12 border-t-4 border-line-strong pt-3 lg:col-span-7">
            <h2 id="o-queue" className="font-display text-heading-lg text-ink"><span aria-hidden="true" className="mb-1 block font-sans text-label-sm font-extrabold tracking-normal tabular-nums">01</span>Up next</h2>
            <ul className="mt-3 grid border-t-2 border-line-strong">
              {queue.slice(0, 4).map(({ person: p, fields }) => (
                <li key={p.id} className="group relative flex min-h-18 items-center gap-4 border-b border-line py-3">
                  <PersonPhoto id={p.id} name={p.name} src={fields?.photo || undefined} alt="" className="size-12 shrink-0 sm:size-16" textClass="text-heading-sm" />
                  <span className="grid min-w-0 flex-1">
                    <Link href={`/owners/people/${p.id}/`} className="truncate font-display text-heading-sm text-ink after:absolute after:inset-0 group-hover:underline group-hover:decoration-2 group-hover:underline-offset-4">{p.name}</Link>
                    {fields?.position && <span className="truncate text-body-sm text-ink-muted">{fields.position}</span>}
                  </span>
                  <span className="shrink-0 text-label-md font-bold text-ink tabular-nums">{p.submittedAt ? ago(p.submittedAt) : ""}</span>
                  <ArrowRight aria-hidden="true" className="size-5 shrink-0 text-ink" />
                </li>
              ))}
              {queue.length === 0 && <li className="border-b border-line py-4 text-body-md text-ink-muted">All caught up.</li>}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <ButtonLink href="/owners/" size="lg" className="border-2" iconEnd={<ArrowRight />}>Open the dashboard</ButtonLink>
              <ButtonLink href="/owners/waitlist/?status=not_invited" size="lg" variant="ghost" iconStart={<Send />}>Invite more</ButtonLink>
            </div>
          </section>
          <section aria-labelledby="o-activity" className="col-span-12 border-t-4 border-line-strong pt-3 lg:col-span-5">
            <h2 id="o-activity" className="mb-3 font-display text-heading-lg text-ink"><span aria-hidden="true" className="mb-1 block font-sans text-label-sm font-extrabold tracking-normal tabular-nums">02</span>Lately</h2>
            <ActivityList events={d.activity.slice(0, 5)} />
          </section>
        </div>
        <ProposalNote n={3} />
      </div>
    </div>
  );
}
