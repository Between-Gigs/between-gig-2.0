"use client";
import { Badge, PageHeader, Skeleton } from "@ds/components";
import { ArrowRight, CircleCheck, MessageSquareWarning, PartyPopper, Users } from "lucide-react";
import Link from "next/link";
import { Reveal } from "@ds/motion";
import * as React from "react";
import { data, type ActivityEvent, type PersonSummary, type ProfileFields } from "@/lib/data";
import { fieldLabel, validateAll } from "@/lib/profile/validate";
import { PersonPhoto } from "@/components/people/PersonPhoto";
import { OwnerShell } from "./OwnerShell";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ago } from "./activity";
import { OwnerGate } from "./OwnerGate";
import { reviewHref } from "./ReviewPanel";

const missing = (f: ProfileFields) => Object.values(validateAll(f)).flatMap((e) => Object.keys(e)).map((k) => fieldLabel[k as keyof ProfileFields] ?? k);
const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();

/** /owners/review: every submitted profile, oldest first, so nobody waits longest. */
export function ReviewQueue() {
  return <OwnerGate>{() => <Queue />}</OwnerGate>;
}

function Queue() {
  const [rows, setRows] = React.useState<PersonSummary[] | null>(null);
  const [today, setToday] = React.useState<ActivityEvent[]>([]);
  React.useEffect(() => {
    void Promise.all([data.owners.reviewQueue(), data.owners.activity(200)]).then(([q, a]) => {
      setRows(q);
      setToday(a.filter((e) => (e.kind === "approved" || e.kind === "changes_requested") && isToday(e.at)));
    });
  }, []);
  return (
    <OwnerShell>
      <PageHeader eyebrow="Owners" title="Review queue" meta={rows ? String(rows.length) : undefined}
        description="Submitted profiles, oldest first. Open one to approve it or suggest edits, then move straight to the next."
        actions={rows?.length ? <ButtonLink href={reviewHref(rows[0].person.id)} variant="strong" iconEnd={<ArrowRight />}>Start with the oldest</ButtonLink> : undefined} />
      <div className="mt-6">
        {!rows ? <div aria-busy="true" aria-label="Loading queue" className="grid gap-3"><Skeleton shape="block" className="h-20" /><Skeleton shape="block" className="h-20" /></div>
          : rows.length === 0 ? <Wrap today={today} />
          : (
            <ol className="grid grid-cols-1 overflow-hidden rounded-2xl border border-line bg-surface">
              {rows.map(({ person: p, fields }, i) => {
                const gaps = fields ? missing(fields) : [];
                return (
                  <li key={p.id} className="group relative flex min-w-0 items-center gap-3 border-t border-line p-3 transition-colors duration-fast first:border-0 hover:bg-surface-hover sm:gap-4 sm:p-4">
                    <span aria-hidden="true" className="hidden w-6 shrink-0 text-label-md text-ink-subtle tabular-nums sm:block">{i + 1}</span>
                    <PersonPhoto id={p.id} name={p.name} src={fields?.photo || undefined} alt="" className="size-11 shrink-0 rounded-lg sm:size-12" textClass="text-label-md" />
                    <div className="grid min-w-0 flex-1 gap-0.5">
                      <h2 className="truncate text-label-md text-ink"><Link href={reviewHref(p.id)} className="after:absolute after:inset-0 group-hover:text-ink-brand">{p.name}</Link></h2>
                      <p className="truncate text-body-sm text-ink-muted">
                        <span className="tabular-nums">{p.submittedAt ? ago(p.submittedAt) : ""}</span>
                        <span className="max-sm:hidden">{[fields?.position, fields?.services.join(", ")].filter(Boolean).map((x) => ` · ${x}`).join("")}</span>
                      </p>
                    </div>
                    {gaps.length > 0
                      ? <Badge tone="warning" size="sm" className="shrink-0">Missing: {gaps.length === 1 ? gaps[0] : `${gaps.length} answers`}</Badge>
                      : <Badge tone="success" size="sm" className="shrink-0">Complete</Badge>}
                    <ArrowRight className="size-4 shrink-0 text-ink-brand" aria-hidden="true" />
                  </li>
                );
              })}
            </ol>
          )}
      </div>
    </OwnerShell>
  );
}

/** The end of the queue: a small celebration with what got done today, instead of a plain empty state. */
function Wrap({ today }: { today: ActivityEvent[] }) {
  const approved = today.filter((e) => e.kind === "approved").length;
  const edits = today.length - approved;
  return (
    <section aria-labelledby="wrap-h" data-theme="dark" className="relative isolate overflow-hidden rounded-2xl bg-surface-brand phosphor-dots px-6 py-12 text-center sm:py-16">
      <span aria-hidden="true" className="glow-horizon opacity-60" />
      <div className="relative z-raised mx-auto grid max-w-xl justify-items-center gap-3">
        <Reveal effect="pop"><span className="grid size-14 place-items-center rounded-full bg-surface-selected text-ink-brand"><PartyPopper className="size-7" aria-hidden="true" /></span></Reveal>
        <p className="text-eyebrow text-ink-brand uppercase">Queue clear</p>
        <h2 id="wrap-h" className="font-display text-display-sm text-ink">That&apos;s a wrap.</h2>
        <p className="text-body-md text-ink-muted">{today.length ? "Nobody is waiting on you. Here's today:" : "Nobody is waiting on you. New submissions appear here as soon as a Gigster sends their profile."}</p>
        {today.length > 0 && (
          <dl className="mt-2 grid grid-cols-2 gap-3">
            <div className="grid justify-items-center gap-1 rounded-xl border border-line bg-surface/40 px-6 py-4">
              <dt className="inline-flex items-center gap-1.5 text-label-sm text-ink-muted"><CircleCheck className="size-4 text-success" aria-hidden="true" />Approved</dt>
              <dd className="font-display text-display-sm text-ink tabular-nums">{approved}</dd>
            </div>
            <div className="grid justify-items-center gap-1 rounded-xl border border-line bg-surface/40 px-6 py-4">
              <dt className="inline-flex items-center gap-1.5 text-label-sm text-ink-muted"><MessageSquareWarning className="size-4 text-warning" aria-hidden="true" />Edits suggested</dt>
              <dd className="font-display text-display-sm text-ink tabular-nums">{edits}</dd>
            </div>
          </dl>
        )}
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <ButtonLink href="/owners/" variant="primary" iconEnd={<ArrowRight />}>Back to the dashboard</ButtonLink>
          <ButtonLink href="/owners/people/" iconStart={<Users />}>See everyone</ButtonLink>
        </div>
      </div>
    </section>
  );
}
