"use client";
import { Banner, Breadcrumbs, EmptyState, Progress, Skeleton, cx } from "@ds/components";
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
import { ReviewDone, ReviewPanel } from "./ReviewPanel";

const date = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null);

/** /owners/people/[id]: one person as the owners see them: where they are, what they've filled in, their profile. */
export function OwnerPerson({ id }: { id: string }) {
  return <OwnerGate>{() => <Person key={id} id={id} />}</OwnerGate>;
}

function Person({ id }: { id: string }) {
  const [s, setS] = React.useState<PersonSummary | null | undefined>(undefined);
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [decided, setDecided] = React.useState<{ next?: { id: string; name: string } } | null>(null);
  const load = React.useCallback(() => Promise.all([data.people.get(id), data.profiles.getProfile(id)]).then(([summary, p]) => { setS(summary); setProfile(p); }), [id]);
  React.useEffect(() => { void load(); }, [load]);
  const afterDecision = async () => {
    await load();
    const queue = await data.owners.reviewQueue();
    const next = queue.find((q) => q.person.id !== id);
    setDecided({ next: next && { id: next.person.id, name: next.person.name } });
    window.scrollTo({ top: 0 });
  };
  useSettleWhen(s !== undefined);

  const crumbs = (label: string) => <Breadcrumbs items={[{ label: "Dashboard", href: `${basePath}/owners/` }, { label: "People", href: `${basePath}/owners/people/` }, { label }]} />;

  if (s === undefined) return <OwnerShell><div aria-busy="true" aria-label="Loading" className="grid gap-4"><Skeleton className="h-4 w-40" /><Skeleton shape="block" className="h-40" /></div></OwnerShell>;
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
    ["Invited", date(p.invitedAt)], ["Registered", date(p.registeredAt)], ["Submitted", date(p.submittedAt)], ["Approved", date(p.approvedAt)],
  ];

  return (
    <OwnerShell>
      {crumbs(name)}
      {decided && <div className="mt-4"><ReviewDone person={p} next={decided.next} /></div>}
      <div className="mt-4 grid gap-6 lg:grid-cols-12 lg:items-start">
      <header className={cx("grid gap-6 rounded-2xl border border-line bg-surface p-5 shadow-sm md:grid-cols-12 md:items-center", p.status === "submitted" && fields ? "lg:col-span-8" : "lg:col-span-12")}>
        <div className="flex min-w-0 items-center gap-4 md:col-span-6">
          {!fields && <PersonPhoto id={p.id} morph name={p.name || "?"} alt="" className="size-16 shrink-0 rounded-xl" textClass="text-heading-lg" />}
          {fields && <PersonPhoto id={p.id} morph={false} name={p.name} src={fields.photo || undefined} alt="" className="size-16 shrink-0 rounded-xl" textClass="text-heading-lg" />}
          <div className="grid min-w-0 gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="min-w-0 truncate font-display text-display-sm text-ink">{name}</h1>
              <PersonStatusBadge status={p.status} />
            </div>
            <p className="flex flex-wrap gap-x-3 text-body-sm text-ink-muted">
              <a className="inline-flex min-h-6 items-center gap-1 text-link underline underline-offset-2" href={`mailto:${p.email}`}><Mail className="size-3.5" aria-hidden="true" />{p.email}</a>
              <span className="inline-flex min-h-6 items-center">Waitlist · ZIP {p.waitlistZip}{p.waitlistCategory && ` · ${waitlistCategoryLabel(p.waitlistCategory)}`}</span>
            </p>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:col-span-6">
          {timeline.map(([k, v]) => (
            <div key={k} className="grid gap-0.5"><dt className="text-label-sm text-ink-subtle">{k}</dt><dd className="font-mono text-data-sm text-ink">{v ?? "—"}</dd></div>
          ))}
        </dl>
        {fields && <Progress className="md:col-span-12" value={Math.round(completeness * 100)} label={fromDraft ? "Questionnaire (draft)" : "Questionnaire"} />}
      </header>
      {p.status === "submitted" && fields && <div className="lg:sticky lg:top-24 lg:col-span-4"><ReviewPanel person={p} fields={fields} onDone={afterDecision} /></div>}
      </div>

      {p.status === "changes_requested" && !decided && (
        <Banner tone="warning" className="mt-4" title="Changes requested">
          <ul className="grid gap-1">{(p.reviewNotes ?? []).map((n) => <li key={n.note}><b>{sectionLabel[n.section]}:</b> {n.note}</li>)}</ul>
        </Banner>
      )}
      {p.status === "approved" && !decided && (
        <Banner tone="success" className="mt-4" title="Live" action={<ButtonLink href={`/p/${p.slug}/`} size="sm" iconStart={<Eye />}>Public page</ButtonLink>}>Clients can find this profile.</Banner>
      )}

      {fields ? (
        <div className="mt-10">
          {fromDraft && <p className="mb-6 text-body-sm text-ink-muted">Unsubmitted draft, shown as it stands. It may change before they submit.</p>}
          <ProfileView person={p} fields={fields} extras={profile?.extras} mode="owner" />
        </div>
      ) : (
        <EmptyState className="mt-8 rounded-2xl border border-dashed border-line-dashed py-16" icon={<Sparkles />} title={p.status === "invited" ? "Hasn't joined yet" : "Hasn't started their profile"} headingLevel={2}>
          {p.status === "invited" ? "They've been invited but haven't created an account yet." : "They've created an account. Their answers appear here as they fill in the questionnaire."}
        </EmptyState>
      )}
    </OwnerShell>
  );
}
