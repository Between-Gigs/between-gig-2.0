"use client";
import { Badge, Banner, EmptyState, Progress, SegmentedControl, Skeleton, cx } from "@ds/components";
import { ArrowRight, CalendarCheck, CircleCheck, Eye, Inbox, Link2, PencilLine } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { data, type MonthStatus, type PersonSummary } from "@/lib/data";
import { monthStatusLabel } from "@/lib/data/taxonomy";
import { PersonPhoto } from "@/components/people/PersonPhoto";
import { PersonStatusBadge } from "@/components/people/PersonStatusBadge";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Horizon } from "@/components/funnel/parts";
import { ProposalNote, type Note } from "./ProposalNote";

/** The reasoning beside each section, shown with "Show design notes". */
export const gigsterNotes: Note[] = [
  { title: "One next step, always", body: <>
        <p>Every status has exactly one thing to do (or "nothing, we're on it"). It's the same decision the status banner on /profile makes, promoted to the top of home so a Gigster never has to work out what's expected.</p>
  </> },
  { title: "Availability in one tap, without a review", body: <>
        <p>The promise on /professionals is "Pause your availability when the call comes." Today that means reopening the questionnaire. Proposal: a one-tap switch here that doesn't send the profile back to review (Milestone 2 open question 3).</p>
  </> },
  { title: "Requests get the biggest panel, even before they exist", body: <>
        <p>Booking is the reason Gigsters join. Reserving the space now (with an honest empty state) sets the expectation without inventing activity. When booking ships, this becomes an inbox.</p>
  </> },
];

/** Proposal: home for a signed-in Gigster. Status, the one next step, availability in one tap, requests. */
export function GigsterHome({ personId }: { personId: string }) {
  const [s, setS] = React.useState<PersonSummary | null>(null);
  const [availability, setAvailability] = React.useState<MonthStatus>("available");
  React.useEffect(() => {
    void data.people.get(personId).then((x) => { setS(x); if (x?.fields) setAvailability(x.fields.monthStatus); });
  }, [personId]);

  if (!s) return <div aria-busy="true" aria-label="Loading" className="grid gap-4"><Skeleton shape="block" className="h-40" /><Skeleton shape="block" className="h-64" /></div>;
  const { person: p, fields: f, completeness } = s;
  const first = p.name.split(" ")[0] || "there";

  const next = {
    invited: { title: "Create your account", body: "Use the link in your invite email.", href: "/login/", cta: "Sign in" },
    registered: { title: "Start your profile", body: "Fill it in right where clients will see it. It saves as you go.", href: "/profile/canvas/", cta: "Start your profile" },
    draft: { title: "Finish your profile", body: `You're ${Math.round(completeness * 100)}% of the way there. Submit it when it feels like you.`, href: "/profile/canvas/", cta: "Continue your profile" },
    submitted: { title: "We're reviewing your profile", body: "Nothing to do right now. We'll email you when it's approved or if we suggest a change.", href: "/profile/", cta: "See my profile" },
    changes_requested: { title: "Make the suggested edits", body: `${p.reviewNotes?.length ?? 0} short ${p.reviewNotes?.length === 1 ? "note" : "notes"} from the Between Gigs team.`, href: "/profile/canvas/", cta: "Make the changes" },
    approved: { title: "Keep your availability fresh", body: `Confirm you're free in ${f?.month ?? "this month"} so clients know when to ask.`, href: "/profile/canvas/", cta: "Update availability" },
  }[p.status];

  return (
    <div className="grid gap-10">
      <section aria-labelledby="g-hello" className="grid gap-6 lg:grid-cols-12">
        <div className="flex items-center gap-4 lg:col-span-7">
          <PersonPhoto id={p.id} name={p.name} src={f?.photo || undefined} alt="" className="size-16 shrink-0 rounded-2xl" textClass="text-heading-lg" />
          <div className="grid gap-1">
            <p className="text-eyebrow text-ink-brand uppercase">Your call sheet</p>
            <h2 id="g-hello" className="font-display text-display-sm text-ink">Welcome back, {first}.</h2>
            <PersonStatusBadge status={p.status} audience="gigster" className="w-fit" />
          </div>
        </div>
        <div data-theme="dark" className="relative isolate overflow-hidden rounded-2xl bg-surface-brand phosphor-dots p-5 pb-24 lg:col-span-5 lg:pb-5">
          <Horizon />
          <div className="relative z-raised grid gap-2">
            <p className="text-label-sm text-ink-brand">Next step</p>
            <h3 className="font-display text-heading-lg text-ink">{next.title}</h3>
            <p className="text-body-sm text-ink-muted">{next.body}</p>
            <div className="mt-1"><ButtonLink href={next.href} variant="primary" size="sm" iconEnd={<ArrowRight />}>{next.cta}</ButtonLink></div>
          </div>
        </div>
      </section>
      <ProposalNote n={1} />

      <section aria-labelledby="g-availability" className="grid gap-4 rounded-2xl border border-line bg-surface p-5 lg:grid-cols-12 lg:items-center">
        <div className="lg:col-span-5">
          <h2 id="g-availability" className="flex items-center gap-2 font-display text-heading-lg text-ink"><CalendarCheck className="size-5 text-ink-brand" aria-hidden="true" />This month</h2>
          <p className="mt-1 text-body-sm text-ink-muted">Production comes first. When the call comes, pause here in one tap.</p>
        </div>
        <div className="grid gap-2 lg:col-span-7 lg:justify-items-end">
          <SegmentedControl label="Availability this month" value={availability} onChange={(v) => setAvailability(v as MonthStatus)}
            options={(Object.keys(monthStatusLabel) as MonthStatus[]).map((k) => ({ value: k, label: { available: "Available", limited: "Limited", away: "Away" }[k] }))} />
          <p aria-live="polite" className="text-body-sm text-ink-muted">{monthStatusLabel[availability]} · preview only, not saved</p>
        </div>
      </section>
      <ProposalNote n={2} />

      <div className="grid gap-6 lg:grid-cols-12">
        <section aria-labelledby="g-requests" className="rounded-2xl border border-line bg-surface p-5 lg:col-span-7">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="g-requests" className="font-display text-heading-lg text-ink">Requests</h2>
            <Badge tone="info" size="sm">Coming with booking</Badge>
          </div>
          <EmptyState className="py-8" icon={<Inbox />} title="No requests yet" headingLevel={3}>
            Client requests arrive here once booking opens.
          </EmptyState>
        </section>
        <section aria-labelledby="g-profile" className="grid content-start gap-4 rounded-2xl border border-line bg-surface p-5 lg:col-span-5">
          <h2 id="g-profile" className="font-display text-heading-lg text-ink">Your profile</h2>
          <Progress value={Math.round(completeness * 100)} label="Complete" size="md" />
          <ul className="grid gap-2 text-body-sm">
            <li><Link href="/profile/" className="inline-flex min-h-11 items-center gap-2 text-ink hover:text-ink-brand sm:min-h-8"><Eye className="size-4 text-ink-brand" aria-hidden="true" />See it as clients will</Link></li>
            <li><Link href="/profile/canvas/" className="inline-flex min-h-11 items-center gap-2 text-ink hover:text-ink-brand sm:min-h-8"><PencilLine className="size-4 text-ink-brand" aria-hidden="true" />Edit your profile</Link></li>
            {p.status === "approved" && <li><Link href={`/p/${p.slug}/`} className="inline-flex min-h-11 items-center gap-2 text-ink hover:text-ink-brand sm:min-h-8"><Link2 className="size-4 text-ink-brand" aria-hidden="true" />Your public page to share</Link></li>}
          </ul>
          {p.status === "approved" && <Banner tone="success" title="You're live">Clients across Los Angeles can find you.</Banner>}
        </section>
      </div>
      <ProposalNote n={3} />

      <p className={cx("flex items-center gap-2 text-caption text-ink-subtle")}><CircleCheck className="size-3.5" aria-hidden="true" />Showing {p.name}{p.sample ? " (fictional sample)" : ""}.</p>
    </div>
  );
}
