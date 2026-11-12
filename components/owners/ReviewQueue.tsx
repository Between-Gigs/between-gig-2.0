"use client";
import { Badge } from "@ds/components";
import { Icon3D } from "@/components/ui/Icon3D";
import { useLook } from "@/components/site/LookSync";
import { ArrowRight, CircleCheck, MessageSquareWarning, PartyPopper, PencilLine, Users } from "lucide-react";
import * as React from "react";
import { data, type ActivityEvent, type PersonSummary, type ProfileFields } from "@/lib/data";
import { fieldLabel, validateAll } from "@/lib/profile/validate";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ago } from "./activity";
import { AgoPill, EmptyNote, forestButton, HeaderSkeleton, Meter, OwnerAvatar, OwnerPage, Panel, Row, RowHead, rowListRule, RowSkeletons } from "./kit";
import { OwnerGate } from "./OwnerGate";
import { OwnerShell } from "./OwnerShell";
import { isHeld } from "./hold";
import { reviewHref } from "./ReviewPanel";
import { markArea } from "@/lib/split-area";

markArea("bg-split:dashboard");

const missing = (f: ProfileFields) => Object.values(validateAll(f)).flatMap((e) => Object.keys(e)).map((k) => fieldLabel[k as keyof ProfileFields] ?? k);
const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();

/** /owners/review: every submitted profile, oldest first, so nobody waits longest; then what was decided lately. */
export function ReviewQueue() {
  return <OwnerGate>{() => <Queue />}</OwnerGate>;
}

function Queue() {
  const brand = useLook() !== "swiss";
  const [rows, setRows] = React.useState<PersonSummary[] | null>(null);
  const [decided, setDecided] = React.useState<ActivityEvent[]>([]);
  React.useEffect(() => {
    void Promise.all([data.owners.reviewQueue(), data.owners.activity(200)]).then(([q, a]) => {
      setRows(q.filter((r) => !isHeld(r.person.id)));
      setDecided(a.filter((e) => e.kind === "approved" || e.kind === "changes_requested"));
    });
  }, []);

  if (!rows) {
    return (
      <OwnerShell>
        <div aria-busy="true" aria-label="Loading queue">
          <HeaderSkeleton />
          <div aria-hidden="true" className="mt-8 overflow-hidden border-t-4 border-line-strong"><div className="h-16" /><RowSkeletons count={4} /></div>
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
      <OwnerPage title="Review queue" icon="eyes" kicker="Oldest first" meta={rows.length}
        description="Submitted profiles, oldest first. Open one to approve it or suggest edits, then move straight to the next."
        actions={rows.length > 0 && <ButtonLink href={reviewHref(rows[0].person.id)} variant={brand ? "primary" : "strong"} size={brand ? "md" : "lg"} className={brand ? undefined : forestButton} iconEnd={<ArrowRight />}>Start with the oldest</ButtonLink>}>
        {rows.length === 0 ? <Wrap today={decided.filter((e) => isToday(e.at))} /> : (
          <Panel number="01" title="Waiting for review" count={rows.length} flush collapsible="queue-waiting"
            aside={common && <span className="inline-flex items-center gap-1.5"><MessageSquareWarning className="size-4 text-warning" aria-hidden="true" /><span className="tabular-nums">{common[1]} of {rows.length}</span> missing {common[0].toLowerCase()}</span>}>
            <div className="@container">
            <RowHead first="Gigster" cols={[{ label: "Complete", className: "w-24" }, { label: "Sent", className: "min-w-32" }]} />
            <ol className={rowListRule}>
              {rows.map(({ person: p, fields, completeness }, i) => (
                <Row key={p.id} href={reviewHref(p.id)} title={p.name}
                  leading={<OwnerAvatar id={p.id} name={p.name} src={fields?.photo || undefined} className="size-12 swiss:@md:size-16" textClass="text-heading-sm" />}
                  action="Review" strong={i === 0}
                  badge={i === 0 && (brand ? <Badge tone="warning" size="sm">Oldest</Badge> : <span className="inline-flex h-6 shrink-0 items-center border-2 border-ink px-1.5 text-label-sm font-bold tracking-widest text-ink uppercase">Oldest</span>)}
                  subtitle={[fields?.position, fields?.services.join(", ")].filter(Boolean).join(" · ")}
                  meta={<><Meter value={completeness * 100} label="Profile complete" /><AgoPill className="min-w-32">Sent {p.submittedAt ? ago(p.submittedAt).toLowerCase() : ""}</AgoPill></>} />
              ))}
            </ol>
            </div>
          </Panel>
        )}

        <Panel number={rows.length ? "02" : "01"} title="Decided recently" flush collapsible="queue-decided" aside={decided.length > 0 && <span>Undo is in the toast right after each decision</span>}>
          {decided.length === 0 ? <p className="pb-5 text-body-md text-ink-muted">Nothing decided yet. Approvals and suggested edits show up here.</p> : (
            <ul className="@container border-t-2 border-line-strong">
              {decided.slice(0, 5).map((e) => {
                const approved = e.kind === "approved";
                return (
                  <Row key={e.id} href={e.personId ? `/owners/people/${e.personId}/` : "/owners/people/"} title={e.who}
                    leading={<span className={brand ? `grid size-12 place-items-center rounded-md ${approved ? "bg-tint-mint-soft" : "bg-tint-peach"}` : "grid size-12 place-items-center bg-surface-sunken text-ink @md:size-16"}>
                      {brand ? <Icon3D name={approved ? "check_mark_button" : "memo"} className="size-7" /> : approved ? <CircleCheck aria-hidden="true" className="size-5" strokeWidth={1.75} /> : <PencilLine aria-hidden="true" className="size-5" strokeWidth={1.75} />}
                    </span>}
                    subtitle={approved ? "Approved · live on the site" : "Sent suggested edits"}
                    meta={<AgoPill className="min-w-28">{ago(e.at)}</AgoPill>} />
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
    <section aria-labelledby="queue-wrap">
      <EmptyNote rule title={<span id="queue-wrap">That&apos;s a wrap.</span>}
        icon={<span className="grid size-16 place-items-center bg-tint-mint text-forest-950 dark:border-4 dark:border-action dark:bg-transparent dark:text-ink-brand"><PartyPopper aria-hidden="true" className="size-8" strokeWidth={1.75} /></span>}
        action={
          <>
            <ButtonLink href="/owners/" variant="strong" className={forestButton} iconEnd={<ArrowRight />}>Back to the dashboard</ButtonLink>
            <ButtonLink href="/owners/people/" variant="secondary" className="border-2" iconStart={<Users />}>See everyone</ButtonLink>
          </>
        }>
        {today.length
          ? <>Nobody is waiting on you. Today you approved <b className="text-ink tabular-nums">{approved}</b> and suggested edits to <b className="text-ink tabular-nums">{edits}</b>.</>
          : "Nobody is waiting on you. New submissions appear here as soon as a Gigster sends their profile."}
      </EmptyNote>
    </section>
  );
}
