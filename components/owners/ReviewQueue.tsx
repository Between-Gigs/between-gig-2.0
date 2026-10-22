"use client";
import { Badge, cx } from "@ds/components";
import { ArrowRight, CircleCheck, MessageSquareWarning, PartyPopper, Users } from "lucide-react";
import * as React from "react";
import { data, type ActivityEvent, type PersonSummary, type ProfileFields } from "@/lib/data";
import { fieldLabel, validateAll } from "@/lib/profile/validate";
import { PersonPhoto } from "@/components/people/PersonPhoto";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ago } from "./activity";
import { HeaderSkeleton, Meter, OwnerPage, Panel, Row, RowSkeletons } from "./kit";
import { OwnerGate } from "./OwnerGate";
import { OwnerShell } from "./OwnerShell";
import { reviewHref } from "./ReviewPanel";

const missing = (f: ProfileFields) => Object.values(validateAll(f)).flatMap((e) => Object.keys(e)).map((k) => fieldLabel[k as keyof ProfileFields] ?? k);
const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();

/** /owners/review: every submitted profile, oldest first, so nobody waits longest; then what was decided lately. */
export function ReviewQueue() {
  return <OwnerGate>{() => <Queue />}</OwnerGate>;
}

function Queue() {
  const [rows, setRows] = React.useState<PersonSummary[] | null>(null);
  const [decided, setDecided] = React.useState<ActivityEvent[]>([]);
  React.useEffect(() => {
    void Promise.all([data.owners.reviewQueue(), data.owners.activity(200)]).then(([q, a]) => {
      setRows(q);
      setDecided(a.filter((e) => e.kind === "approved" || e.kind === "changes_requested"));
    });
  }, []);

  if (!rows) {
    return (
      <OwnerShell>
        <div aria-busy="true" aria-label="Loading queue">
          <HeaderSkeleton />
          <div aria-hidden="true" className="mt-8 overflow-hidden rounded-lg border border-line bg-surface"><div className="h-14 border-b border-line" /><RowSkeletons count={4} /></div>
        </div>
      </OwnerShell>
    );
  }

  // One summary instead of the same warning on every row.
  const gaps = rows.map((r) => (r.fields ? missing(r.fields) : []));
  const counts = new Map<string, number>();
  gaps.flat().forEach((g) => counts.set(g, (counts.get(g) ?? 0) + 1));
  const common = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];

  return (
    <OwnerShell>
      <OwnerPage title="Review queue" meta={rows.length}
        description="Submitted profiles, oldest first. Open one to approve it or suggest edits, then move straight to the next."
        actions={rows.length > 0 && <ButtonLink href={reviewHref(rows[0].person.id)} variant="primary" iconEnd={<ArrowRight />}>Start with the oldest</ButtonLink>}>
        {rows.length === 0 ? <Wrap today={decided.filter((e) => isToday(e.at))} /> : (
          <Panel title="Waiting for review" flush
            aside={common && <span className="inline-flex items-center gap-1.5"><MessageSquareWarning className="size-4 text-warning" aria-hidden="true" /><span className="tabular-nums">{common[1]} of {rows.length}</span> missing {common[0].toLowerCase()}</span>}>
            <ol>
              {rows.map(({ person: p, fields, completeness }, i) => (
                <Row key={p.id} href={reviewHref(p.id)} title={p.name}
                  leading={<PersonPhoto id={p.id} name={p.name} src={fields?.photo || undefined} alt="" className="size-10 rounded-md" textClass="text-label-md" />}
                  badge={i === 0 ? <Badge tone="neutral" size="sm">Oldest</Badge> : undefined}
                  subtitle={[fields?.position, fields?.services.join(", ")].filter(Boolean).join(" · ")}
                  meta={<><Meter value={completeness * 100} label="Profile complete" /><span className="w-28 text-right">Sent {p.submittedAt ? ago(p.submittedAt).toLowerCase() : ""}</span></>} />
              ))}
            </ol>
          </Panel>
        )}

        <Panel title="Decided recently" flush aside={decided.length > 0 && <span>Undo is in the toast right after each decision</span>}>
          {decided.length === 0 ? <p className="px-5 py-4 text-body-sm text-ink-muted">Nothing decided yet. Approvals and suggested edits show up here.</p> : (
            <ul>
              {decided.slice(0, 5).map((e) => {
                const approved = e.kind === "approved";
                return (
                  <Row key={e.id} href={e.personId ? `/owners/people/${e.personId}/` : "/owners/people/"} title={e.who}
                    leading={<span className={cx("grid size-10 place-items-center rounded-md", approved ? "bg-success-soft text-success" : "bg-warning-soft text-warning")}>
                      {approved ? <CircleCheck className="size-5" aria-hidden="true" /> : <MessageSquareWarning className="size-5" aria-hidden="true" />}
                    </span>}
                    subtitle={approved ? "Approved · live on the site" : "Sent suggested edits"}
                    meta={<span className="w-28 text-right">{ago(e.at)}</span>} />
                );
              })}
            </ul>
          )}
        </Panel>
      </OwnerPage>
    </OwnerShell>
  );
}

/** The end of the queue: what got done today, instead of a plain empty state. */
function Wrap({ today }: { today: ActivityEvent[] }) {
  const approved = today.filter((e) => e.kind === "approved").length;
  const edits = today.length - approved;
  return (
    <Panel>
      <div className="mx-auto grid max-w-xl justify-items-center gap-3 py-8 text-center">
        <span className="grid size-12 place-items-center rounded-md bg-surface-selected text-ink-brand"><PartyPopper className="size-6" aria-hidden="true" /></span>
        <h2 className="font-display text-heading-lg text-ink">That&apos;s a wrap.</h2>
        <p className="text-body-md text-ink-muted">
          {today.length
            ? <>Nobody is waiting on you. Today you approved <b className="text-ink tabular-nums">{approved}</b> and suggested edits to <b className="text-ink tabular-nums">{edits}</b>.</>
            : "Nobody is waiting on you. New submissions appear here as soon as a Gigster sends their profile."}
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <ButtonLink href="/owners/" variant="primary" iconEnd={<ArrowRight />}>Back to the dashboard</ButtonLink>
          <ButtonLink href="/owners/people/" variant="secondary" iconStart={<Users />}>See everyone</ButtonLink>
        </div>
      </div>
    </Panel>
  );
}
