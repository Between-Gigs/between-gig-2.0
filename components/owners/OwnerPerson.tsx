"use client";
import { Breadcrumbs, cx } from "@ds/components";
import { Eye, Mail } from "lucide-react";
import * as React from "react";
import { data, type PersonSummary, type Profile } from "@/lib/data";
import { waitlistCategoryLabel } from "@/lib/data/taxonomy";
import { useSettleWhen } from "@/lib/motion";
import { readNotes, sectionLabel } from "@/lib/profile/validate";
import { basePath } from "@/lib/site";
import { PersonPhoto } from "@/components/people/PersonPhoto";
import { PersonStatusBadge } from "@/components/people/PersonStatusBadge";
import { ProfileView } from "@/components/profile/ProfileView";
import { OwnerShell } from "./OwnerShell";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { OwnerGate } from "./OwnerGate";
import { EmptyNote, HeaderSkeleton, OwnerAvatar, Panel, useScrolledPast } from "./kit";
import { ReviewWorkspace, UnsentDraftFlag, type QueueItem } from "./ReviewPanel";
import { reviewHistory } from "./history";
import { shortDate } from "./format";
import { isHeld } from "./hold";
import { markArea } from "@/lib/split-area";

markArea("bg-split:dashboard");

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
      setQueue(q.filter((r) => !isHeld(r.person.id)).map((r) => ({ id: r.person.id, name: r.person.name })));
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
        <EmptyNote rule className="mt-6" title="We can't find that person" action={<ButtonLink href="/owners/people/" variant="secondary" size="lg" className="border-2">Back to people</ButtonLink>}>They may have been removed, or the link is incomplete.</EmptyNote>
      </OwnerShell>
    );
  }

  const { person: p, fields, completeness, fromDraft } = s;
  const history = reviewHistory(s);
  const name = p.name || p.email;
  const timeline: [string, string | null][] = [
    ["Invited", shortDate(p.invitedAt)], ["Registered", shortDate(p.registeredAt)], ["Submitted", shortDate(p.submittedAt)], ["Approved", shortDate(p.approvedAt)],
  ];

  // A slim header: who, where they are, and the four steps so far as a timeline.
  const header = (
    <header className="mt-6 grid gap-x-6 gap-y-5 border-b border-line pb-6 lg:grid-cols-12 lg:items-end">
      <div className="flex min-w-0 items-center gap-4 lg:col-span-6">
        <OwnerAvatar id={p.id} name={p.name} src={fields?.photo || undefined} className="size-20 shrink-0 sm:size-24" textClass="text-heading-lg" />
        <div className="grid min-w-0 gap-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h1 className="min-w-0 truncate font-display text-heading-lg text-ink sm:text-display-sm">{name}</h1>
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
              <span className={cx("size-3.5 shrink-0", v ? "bg-ink" : "border-2 border-line-strong")} />
              {i < timeline.length - 1 && <span className={cx("flex-1", timeline[i + 1][1] ? "h-1 bg-ink" : "border-t-2 border-dashed border-line-strong")} />}
            </span>
            <span className="truncate text-caption font-bold tracking-wide text-ink-muted uppercase sm:tracking-widest">{k}</span>
            <span className="text-body-sm whitespace-nowrap text-ink tabular-nums">{v ?? <span className="text-ink-muted">Not yet</span>}</span>
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
        className={cx("absolute inset-x-0 -mx-4 flex h-14 items-center gap-3 border-b-4 border-line-strong bg-bg px-4 transition duration-base ease-standard sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10",
          pastHero ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0")}>
        <PersonPhoto id={p.id} name={p.name || "?"} src={fields?.photo || undefined} alt="" className="size-9 shrink-0" textClass="text-label-sm" />
        <span className="min-w-0 truncate font-display text-label-md font-extrabold text-ink">{name}</span>
        <PersonStatusBadge status={p.status} size="sm" className="max-sm:hidden" />
        <ol aria-label="Timeline" className="ml-auto hidden items-center md:flex">
          {timeline.map(([k, v], i) => (
            <li key={k} className="flex items-center" title={`${k}${v ? ` ${v}` : ": not yet"}`}>
              {i > 0 && <span aria-hidden="true" className={cx("h-0.5 w-6", v ? "bg-ink" : "bg-line")} />}
              <span aria-hidden="true" className={cx("size-2.5", v ? "bg-ink" : "border-2 border-line-strong", i === stepAt && "outline-2 outline-offset-2 outline-ink")} />
              <span className="sr-only">{k}: {v ?? "not yet"}</span>
            </li>
          ))}
        </ol>
        {stepAt >= 0 && <span className="hidden text-body-sm whitespace-nowrap text-ink-muted tabular-nums md:inline">{timeline[stepAt][0]} {timeline[stepAt][1]}</span>}
        {!reviewBar && p.status === "approved" && <ButtonLink href={`/p/${p.slug}/`} size="sm" variant="secondary" iconStart={<Eye />} className="ml-auto md:ml-2">Public page</ButtonLink>}
      </div>
    </div>
  );

  // The profile as clients would see it, framed (hairline sides and foot under the section's rule) so its own
  // sections don't read as part of this page. `number` is this section's place on the page.
  const preview = (number: string) => fields ? (
    <Panel className="mt-10" landmark={false} number={number} collapsible="person-preview" title="What clients see" aside={fromDraft ? "Unsubmitted draft, shown as it stands" : p.status === "approved" ? "Live on the site" : "Not public yet"}
      bodyClassName="border-x border-b border-line p-4 sm:p-6">
      <ProfileView person={p} fields={fields} extras={profile?.extras} mode="owner" />
    </Panel>
  ) : (
    <EmptyNote rule className="mt-10" title={p.status === "invited" ? "Hasn't joined yet" : "Hasn't started their profile"}>
      {p.status === "invited" ? "They've been invited but haven't created an account yet." : "They've created an account. Their answers appear here as they fill in the questionnaire."}
    </EmptyNote>
  );

  if (p.status === "submitted" && fields) {
    return (
      <OwnerShell section={section}>
        {crumbs(name)}
        <ReviewWorkspace person={p} fields={fields} queue={queue} history={history} scrolled={pastHero} header={<>{header}{heroMark}</>}>{preview("02")}</ReviewWorkspace>
      </OwnerShell>
    );
  }

  return (
    <OwnerShell section={section}>
      {crumbs(name)}
      {condensed(false)}
      {header}
      {heroMark}
      {history.unsentDraft && <UnsentDraftFlag className="mt-4" />}
      {/* Where they stand, as the page's first section: the notes they're working on, or that they're live. */}
      {p.status === "changes_requested" && (
        <Panel className="mt-8" number="01" title="Changes requested" aside="Waiting on their edits" flush>
          <ul className="border-t-2 border-line-strong">
            {readNotes(p.reviewNotes ?? []).map((n) => (
              <li key={`${n.section}-${n.note}`} className="grid gap-x-6 gap-y-1 border-b border-line py-3 sm:grid-cols-12 sm:items-baseline">
                <b className="text-label-md font-bold text-ink sm:col-span-3">{sectionLabel[n.section]}</b>
                <span className="max-w-2xl text-body-md text-pretty text-ink sm:col-span-9">{n.note}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
      {p.status === "approved" && (
        <Panel className="mt-8" number="01" title="Live" flush>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-line-strong py-3">
            <p className="text-body-md text-ink">Clients can find this profile.</p>
            <ButtonLink href={`/p/${p.slug}/`} variant="secondary" className="border-2" iconStart={<Eye />}>Public page</ButtonLink>
          </div>
        </Panel>
      )}
      {preview(p.status === "changes_requested" || p.status === "approved" ? "02" : "01")}
    </OwnerShell>
  );
}
