"use client";
import { Banner, Breadcrumbs, EmptyState, Progress, Skeleton } from "@ds/components";
import { Eye, Mail, SearchX, Sparkles } from "lucide-react";
import * as React from "react";
import { data, type PersonSummary, type Profile } from "@/lib/data";
import { waitlistCategoryLabel } from "@/lib/data/taxonomy";
import { useSettleWhen } from "@/lib/motion";
import { sectionLabel } from "@/lib/profile/validate";
import { basePath } from "@/lib/site";
import { PersonPhoto } from "@/components/people/PersonPhoto";
import { PersonStatusBadge } from "@/components/people/PersonStatusBadge";
import { ProfileView } from "@/components/profile/ProfileView";
import { OwnerShell } from "./OwnerShell";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { OwnerGate } from "./OwnerGate";
import { ReviewWorkspace, type QueueItem } from "./ReviewPanel";
import { shortDate } from "./format";

/** /owners/people/[id]: one person as the owners see them: where they are, what they've filled in, their profile. */
export function OwnerPerson({ id }: { id: string }) {
  return <OwnerGate>{() => <Person key={id} id={id} />}</OwnerGate>;
}

function Person({ id }: { id: string }) {
  const [s, setS] = React.useState<PersonSummary | null | undefined>(undefined);
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [queue, setQueue] = React.useState<QueueItem[]>([]);
  const [fromReview, setFromReview] = React.useState(false);
  React.useEffect(() => {
    // Read here rather than with useSearchParams, so the prerendered page needs no Suspense boundary.
    setFromReview(new URLSearchParams(window.location.search).get("from") === "review"); // eslint-disable-line react-hooks/set-state-in-effect
    void Promise.all([data.people.get(id), data.profiles.getProfile(id), data.owners.reviewQueue()]).then(([summary, p, q]) => {
      setS(summary);
      setProfile(p);
      setQueue(q.map((r) => ({ id: r.person.id, name: r.person.name })));
    });
  }, [id]);
  useSettleWhen(s !== undefined);

  const reviewing = fromReview || s?.person.status === "submitted";
  const section = reviewing ? "/owners/review/" as const : undefined;
  const crumbs = (label: string) => (
    <Breadcrumbs items={[{ label: "Dashboard", href: `${basePath}/owners/` },
      reviewing ? { label: "Review queue", href: `${basePath}/owners/review/` } : { label: "People", href: `${basePath}/owners/people/` }, { label }]} />
  );

  if (s === undefined) return <OwnerShell section={section}><div aria-busy="true" aria-label="Loading" className="grid gap-4"><Skeleton className="h-4 w-40" /><Skeleton shape="block" className="h-40" /></div></OwnerShell>;
  if (s === null) {
    return (
      <OwnerShell>
        {crumbs("Not found")}
        <h1 className="sr-only">Person not found</h1>
        <EmptyState className="py-20" icon={<SearchX />} title="We can't find that person" headingLevel={2} action={<ButtonLink href="/owners/people/">Back to people</ButtonLink>}>They may have been removed, or the link is incomplete.</EmptyState>
      </OwnerShell>
    );
  }

  const { person: p, fields, completeness, fromDraft } = s;
  const name = p.name || p.email;
  const timeline: [string, string | null][] = [
    ["Invited", shortDate(p.invitedAt)], ["Registered", shortDate(p.registeredAt)], ["Submitted", shortDate(p.submittedAt)], ["Approved", shortDate(p.approvedAt)],
  ];

  const header = (
    <header className="mt-4 grid gap-5 rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-5 md:grid-cols-12 md:items-center">
      <div className="flex min-w-0 items-center gap-4 md:col-span-7">
        {!fields && <PersonPhoto id={p.id} morph name={p.name || "?"} alt="" className="size-16 shrink-0 rounded-xl" textClass="text-heading-lg" />}
        {fields && <PersonPhoto id={p.id} morph={false} name={p.name} src={fields.photo || undefined} alt="" className="size-16 shrink-0 rounded-xl" textClass="text-heading-lg" />}
        <div className="grid min-w-0 gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="min-w-0 truncate font-display text-display-sm text-ink">{name}</h1>
            <PersonStatusBadge status={p.status} />
          </div>
          <p className="flex flex-wrap gap-x-3 text-body-sm text-ink-muted">
            <a className="inline-flex min-h-6 min-w-0 items-center gap-1 text-link underline underline-offset-2" href={`mailto:${p.email}`}><Mail className="size-3.5 shrink-0" aria-hidden="true" /><span className="truncate">{p.email}</span></a>
            <span className="inline-flex min-h-6 items-center">Waitlist · ZIP {p.waitlistZip}{p.waitlistCategory && ` · ${waitlistCategoryLabel(p.waitlistCategory)}`}</span>
          </p>
        </div>
      </div>
      <dl className="grid grid-cols-4 gap-3 md:col-span-5">
        {timeline.map(([k, v]) => (
          <div key={k} className="grid min-w-0 gap-0.5"><dt className="text-label-sm text-ink-subtle">{k}</dt><dd className="text-body-sm whitespace-nowrap text-ink tabular-nums">{v ?? "—"}</dd></div>
        ))}
      </dl>
      {fields && <Progress className="md:col-span-12" value={Math.round(completeness * 100)} label={fromDraft ? "Questionnaire (draft)" : "Questionnaire"} />}
    </header>
  );

  const preview = fields ? (
    <div className="mt-6">
      {fromDraft && <p className="mb-6 text-body-sm text-ink-muted">Unsubmitted draft, shown as it stands. It may change before they submit.</p>}
      <ProfileView person={p} fields={fields} extras={profile?.extras} mode="owner" />
    </div>
  ) : (
    <EmptyState className="mt-8 rounded-2xl border border-dashed border-line-dashed py-16" icon={<Sparkles />} title={p.status === "invited" ? "Hasn't joined yet" : "Hasn't started their profile"} headingLevel={2}>
      {p.status === "invited" ? "They've been invited but haven't created an account yet." : "They've created an account. Their answers appear here as they fill in the questionnaire."}
    </EmptyState>
  );

  if (p.status === "submitted" && fields) {
    return (
      <OwnerShell section={section}>
        {crumbs(name)}
        <ReviewWorkspace person={p} fields={fields} queue={queue} header={header}>{preview}</ReviewWorkspace>
      </OwnerShell>
    );
  }

  return (
    <OwnerShell section={section}>
      {crumbs(name)}
      {header}
      {p.status === "changes_requested" && (
        <Banner tone="warning" className="mt-4" title="Changes requested">
          <ul className="grid gap-1">{(p.reviewNotes ?? []).map((n) => <li key={n.note}><b>{sectionLabel[n.section]}:</b> {n.note}</li>)}</ul>
        </Banner>
      )}
      {p.status === "approved" && (
        <Banner tone="success" className="mt-4" title="Live" action={<ButtonLink href={`/p/${p.slug}/`} size="sm" iconStart={<Eye />}>Public page</ButtonLink>}>Clients can find this profile.</Banner>
      )}
      {preview}
    </OwnerShell>
  );
}
