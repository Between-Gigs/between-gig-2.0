"use client";
import { Banner, Breadcrumbs, EmptyState, cx } from "@ds/components";
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
import { HeaderSkeleton, Panel, useScrolledPast } from "./kit";
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
  const [heroEnd, pastHero] = useScrolledPast<HTMLSpanElement>([s === undefined]);
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

  if (s === undefined) return <OwnerShell section={section}><div aria-busy="true" aria-label="Loading"><HeaderSkeleton /></div></OwnerShell>;
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

  // A slim header: who, where they are, and the four steps so far as a timeline.
  const header = (
    <header className="mt-2 grid gap-5 rounded-lg border border-line bg-surface p-5 lg:grid-cols-12 lg:items-center">
      <div className="flex min-w-0 items-center gap-4 lg:col-span-6">
        <PersonPhoto id={p.id} name={p.name || "?"} src={fields?.photo || undefined} alt="" className="size-14 shrink-0 rounded-md" textClass="text-heading-md" />
        <div className="grid min-w-0 gap-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h1 className="min-w-0 truncate font-display text-heading-lg text-ink">{name}</h1>
            <PersonStatusBadge status={p.status} size="sm" />
          </div>
          <p className="flex min-w-0 flex-wrap gap-x-3 text-body-sm text-ink-muted">
            <a className="inline-flex min-h-6 min-w-0 items-center gap-1 hover:text-ink" href={`mailto:${p.email}`}><Mail className="size-3.5 shrink-0" aria-hidden="true" /><span className="truncate">{p.email}</span></a>
            <span className="inline-flex min-h-6 items-center tabular-nums">ZIP {p.waitlistZip}{p.waitlistCategory && ` · ${waitlistCategoryLabel(p.waitlistCategory)}`}</span>
            {fields && <span className="inline-flex min-h-6 items-center tabular-nums">{Math.round(completeness * 100)}% complete{fromDraft ? " (draft)" : ""}</span>}
          </p>
        </div>
      </div>
      <ol aria-label="Timeline" className="grid grid-cols-4 lg:col-span-6">
        {timeline.map(([k, v], i) => (
          <li key={k} className="relative grid gap-1.5 pr-1 xs:pr-2">
            <span aria-hidden="true" className="flex items-center">
              <span className={cx("size-2.5 shrink-0 rounded-full", v ? "bg-action" : "border-2 border-line-strong")} />
              {i < timeline.length - 1 && <span className={cx("h-0.5 flex-1", timeline[i + 1][1] ? "bg-action" : "bg-line")} />}
            </span>
            <span className="text-caption text-ink-muted xs:text-label-sm">{k}</span>
            <span className="text-body-sm whitespace-nowrap text-ink tabular-nums">{v ?? <span className="text-ink-subtle">Not yet</span>}</span>
          </li>
        ))}
      </ol>
    </header>
  );
  const heroMark = <span ref={heroEnd} aria-hidden="true" className="block h-0" />;

  // Once the header scrolls away, a condensed bar slides down in its place: photo, name, status, the steps as
  // dots and the next thing to do. It takes no room in the layout (h-0), so nothing jumps.
  const stepAt = timeline.reduce((n, [, v], i) => (v ? i : n), -1);
  const condensed = (reviewBar: boolean) => (
    <div className={cx("sticky z-sticky h-0", reviewBar ? "top-16" : "top-0")}>
      <div inert={!pastHero} aria-hidden={!pastHero}
        className={cx("absolute inset-x-0 -mx-4 flex h-14 items-center gap-3 border-b border-line bg-bg/90 px-4 backdrop-blur-md transition duration-base ease-standard sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10",
          pastHero ? "translate-y-0 opacity-100 shadow-md" : "pointer-events-none -translate-y-2 opacity-0")}>
        <PersonPhoto id={p.id} name={p.name || "?"} src={fields?.photo || undefined} alt="" className="size-8 shrink-0 rounded-md" textClass="text-label-sm" />
        <span className="min-w-0 truncate text-label-md text-ink">{name}</span>
        <PersonStatusBadge status={p.status} size="sm" className="max-sm:hidden" />
        <ol aria-label="Timeline" className="ml-auto hidden items-center md:flex">
          {timeline.map(([k, v], i) => (
            <li key={k} className="flex items-center" title={`${k}${v ? ` ${v}` : ": not yet"}`}>
              {i > 0 && <span aria-hidden="true" className={cx("h-0.5 w-6", v ? "bg-action" : "bg-line")} />}
              <span aria-hidden="true" className={cx("size-2 rounded-full", v ? "bg-action" : "border-2 border-line-strong", i === stepAt && "ring-4 ring-action/25")} />
              <span className="sr-only">{k}: {v ?? "not yet"}</span>
            </li>
          ))}
        </ol>
        {stepAt >= 0 && <span className="hidden text-body-sm whitespace-nowrap text-ink-muted tabular-nums md:inline">{timeline[stepAt][0]} {timeline[stepAt][1]}</span>}
        {!reviewBar && p.status === "approved" && <ButtonLink href={`/p/${p.slug}/`} size="sm" variant="secondary" iconStart={<Eye />} className="ml-auto md:ml-2">Public page</ButtonLink>}
      </div>
    </div>
  );

  // The profile as clients would see it, framed so it doesn't read as part of this page.
  const preview = fields ? (
    <Panel className="mt-6" landmark={false} collapsible="person-preview" title="What clients see" aside={fromDraft ? "Unsubmitted draft, shown as it stands" : p.status === "approved" ? "Live on the site" : "Not public yet"} bodyClassName="p-4 sm:p-6">
      <ProfileView person={p} fields={fields} extras={profile?.extras} mode="owner" />
    </Panel>
  ) : (
    <Panel className="mt-6">
      <EmptyState className="py-12" icon={<Sparkles />} title={p.status === "invited" ? "Hasn't joined yet" : "Hasn't started their profile"} headingLevel={2}>
        {p.status === "invited" ? "They've been invited but haven't created an account yet." : "They've created an account. Their answers appear here as they fill in the questionnaire."}
      </EmptyState>
    </Panel>
  );

  if (p.status === "submitted" && fields) {
    return (
      <OwnerShell section={section}>
        {crumbs(name)}
        <ReviewWorkspace person={p} fields={fields} queue={queue} header={<>{header}{heroMark}</>}>{preview}</ReviewWorkspace>
      </OwnerShell>
    );
  }

  return (
    <OwnerShell section={section}>
      {crumbs(name)}
      {condensed(false)}
      {header}
      {heroMark}
      {p.status === "changes_requested" && (
        <Banner tone="warning" className="mt-6" title="Changes requested">
          <ul className="grid gap-1">{(p.reviewNotes ?? []).map((n) => <li key={n.note}><b>{sectionLabel[n.section]}:</b> {n.note}</li>)}</ul>
        </Banner>
      )}
      {p.status === "approved" && (
        <Banner tone="success" className="mt-6" title="Live" action={<ButtonLink href={`/p/${p.slug}/`} size="sm" iconStart={<Eye />}>Public page</ButtonLink>}>Clients can find this profile.</Banner>
      )}
      {preview}
    </OwnerShell>
  );
}
