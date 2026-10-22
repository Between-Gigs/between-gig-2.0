"use client";
import { Badge, EmptyState, PageHeader, Progress, Skeleton } from "@ds/components";
import { ArrowRight, Inbox } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { data, type PersonSummary, type ProfileFields } from "@/lib/data";
import { fieldLabel, validateAll } from "@/lib/profile/validate";
import { PersonPhoto } from "@/components/people/PersonPhoto";
import { OwnerShell } from "./OwnerShell";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ago } from "./activity";
import { OwnerGate } from "./OwnerGate";

/** /owners/review: every submitted profile, oldest first, so nobody waits longest. */
export function ReviewQueue() {
  return <OwnerGate>{() => <Queue />}</OwnerGate>;
}

function Queue() {
  const [rows, setRows] = React.useState<PersonSummary[] | null>(null);
  React.useEffect(() => { void data.owners.reviewQueue().then(setRows); }, []);
  return (
    <OwnerShell>
      <PageHeader eyebrow="Owners" title="Review queue" meta={rows ? String(rows.length) : undefined}
        description="Submitted profiles, oldest first. Open one to approve it or suggest edits."
        actions={rows?.length ? <ButtonLink href={`/owners/people/${rows[0].person.id}/`} variant="strong" iconEnd={<ArrowRight />}>Start with the oldest</ButtonLink> : undefined} />
      <div className="mt-6">
        {!rows ? <div aria-busy="true" aria-label="Loading queue" className="grid gap-3"><Skeleton shape="block" className="h-20" /><Skeleton shape="block" className="h-20" /></div>
          : rows.length === 0 ? (
            <EmptyState icon={<Inbox />} title="All caught up" headingLevel={2} action={<ButtonLink href="/owners/people/">See everyone</ButtonLink>}>New submissions appear here as soon as a Gigster sends their profile.</EmptyState>
          ) : (
            <ol className="grid gap-3">
              {rows.map(({ person: p, fields, completeness }, i) => (
                <li key={p.id} className="group relative flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 transition duration-base hover:-translate-y-0.5 hover:border-line-strong hover:shadow-md sm:flex-row sm:items-center">
                  <span className="hidden w-8 shrink-0 font-mono text-data-md text-ink-subtle sm:block">{String(i + 1).padStart(2, "0")}</span>
                  <PersonPhoto id={p.id} name={p.name} src={fields?.photo || undefined} alt="" className="size-16 shrink-0 rounded-xl" textClass="text-heading-lg" />
                  <div className="grid min-w-0 flex-1 gap-1">
                    <h2 className="font-display text-heading-md text-ink"><Link href={`/owners/people/${p.id}/`} className="after:absolute after:inset-0 after:rounded-2xl group-hover:text-ink-brand">{p.name}</Link></h2>
                    <p className="truncate text-body-sm text-ink-muted">{[fields?.position, fields?.services.join(", ")].filter(Boolean).join(" · ")}</p>
                    <p className="text-body-sm text-ink-subtle">Submitted {p.submittedAt ? ago(p.submittedAt).toLowerCase() : ""}{fields?.areas.length ? ` · ${fields.areas.join(", ")}` : ""}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
                    {completeness < 1 && fields ? <Badge tone="warning" size="sm">Missing: {Object.values(validateAll(fields)).flatMap((e) => Object.keys(e)).map((k) => fieldLabel[k as keyof ProfileFields] ?? k).join(", ")}</Badge> : <Progress className="w-32" value={100} label="Complete" />}
                    <ArrowRight className="size-5 text-ink-brand" aria-hidden="true" />
                  </div>
                </li>
              ))}
            </ol>
          )}
      </div>
    </OwnerShell>
  );
}
