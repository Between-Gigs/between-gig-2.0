"use client";
import { Badge, Banner, EmptyState, Progress, SegmentedControl, Skeleton, cx } from "@ds/components";
import { ArrowRight, CalendarCheck, CircleCheck, Eye, Inbox, Link2, PencilLine } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { data, type MonthStatus, type PersonSummary } from "@/lib/data";
import { articles } from "@/lib/journal";
import { monthStatusLabel } from "@/lib/data/taxonomy";
import { asset } from "@/lib/site";
import { PersonPhoto } from "@/components/people/PersonPhoto";
import { PersonStatusBadge } from "@/components/people/PersonStatusBadge";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ProposalNote } from "./ProposalNote";

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
    registered: { title: "Start your profile", body: "Five short steps. It saves as you go.", href: "/profile/edit/", cta: "Start your profile" },
    draft: { title: "Finish your profile", body: `You're ${Math.round(completeness * 100)}% of the way there. Submit it when it feels like you.`, href: "/profile/edit/", cta: "Continue your profile" },
    submitted: { title: "We're reviewing your profile", body: "Nothing to do right now. We'll email you when it's approved or if we suggest a change.", href: "/profile/", cta: "See my profile" },
    changes_requested: { title: "Make the suggested edits", body: `${p.reviewNotes?.length ?? 0} short ${p.reviewNotes?.length === 1 ? "note" : "notes"} from the Between Gigs team.`, href: "/profile/edit/?step=review", cta: "Make the changes" },
    approved: { title: "Keep your availability fresh", body: `Confirm you're free in ${f?.month ?? "this month"} so clients know when to ask.`, href: "/profile/edit/", cta: "Update availability" },
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
        <div data-theme="dark" className="relative isolate overflow-hidden rounded-2xl bg-surface-brand p-5 lg:col-span-5">
          <span aria-hidden="true" className="glow-horizon opacity-60" />
          <div className="relative z-raised grid gap-2">
            <p className="text-label-sm text-ink-brand">Next step</p>
            <h3 className="font-display text-heading-lg text-ink">{next.title}</h3>
            <p className="text-body-sm text-ink-muted">{next.body}</p>
            <div className="mt-1"><ButtonLink href={next.href} variant="primary" size="sm" iconEnd={<ArrowRight />}>{next.cta}</ButtonLink></div>
          </div>
        </div>
      </section>
      <ProposalNote n={1} title="One next step, always" >
        <p>Every status has exactly one thing to do (or "nothing, we're on it"). It's the same decision the status banner on /profile makes, promoted to the top of home so a Gigster never has to work out what's expected.</p>
      </ProposalNote>

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
      <ProposalNote n={2} title="Availability in one tap, without a review" >
        <p>The promise on /professionals is "Pause your availability when the call comes." Today that means reopening the questionnaire. Proposal: a one-tap switch here that doesn't send the profile back to review (Milestone 2 open question 3).</p>
      </ProposalNote>

      <div className="grid gap-6 lg:grid-cols-12">
        <section aria-labelledby="g-requests" className="rounded-2xl border border-line bg-surface p-5 lg:col-span-7">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="g-requests" className="font-display text-heading-lg text-ink">Requests</h2>
            <Badge tone="info" size="sm">Coming with booking</Badge>
          </div>
          <EmptyState className="py-8" icon={<Inbox />} title="No requests yet" headingLevel={3}>
            When clients can book, their requests arrive here: what, where, when and a budget. You reply to agree scope and the final rate, or decline.
          </EmptyState>
        </section>
        <section aria-labelledby="g-profile" className="grid content-start gap-4 rounded-2xl border border-line bg-surface p-5 lg:col-span-5">
          <h2 id="g-profile" className="font-display text-heading-lg text-ink">Your profile</h2>
          <Progress value={Math.round(completeness * 100)} label="Complete" size="md" />
          <ul className="grid gap-2 text-body-sm">
            <li><Link href="/profile/" className="inline-flex min-h-6 items-center gap-2 text-ink hover:text-ink-brand"><Eye className="size-4 text-ink-brand" aria-hidden="true" />See it as clients will</Link></li>
            <li><Link href="/profile/edit/" className="inline-flex min-h-6 items-center gap-2 text-ink hover:text-ink-brand"><PencilLine className="size-4 text-ink-brand" aria-hidden="true" />Edit your answers</Link></li>
            {p.status === "approved" && <li><Link href={`/p/${p.slug}/`} className="inline-flex min-h-6 items-center gap-2 text-ink hover:text-ink-brand"><Link2 className="size-4 text-ink-brand" aria-hidden="true" />Your public page to share</Link></li>}
          </ul>
          {p.status === "approved" && <Banner tone="success" title="You're live">Clients across Los Angeles can find you.</Banner>}
        </section>
      </div>
      <ProposalNote n={3} title="Requests get the biggest panel, even before they exist" >
        <p>Booking is the reason Gigsters join. Reserving the space now (with an honest empty state) sets the expectation without inventing activity. When booking ships, this becomes an inbox.</p>
      </ProposalNote>

      <section aria-labelledby="g-journal">
        <h2 id="g-journal" className="font-display text-heading-lg text-ink">For your next chapter</h2>
        <ul className="mt-4 grid gap-4 md:grid-cols-2">
          {articles.filter((a) => a.id === "from-screen-credit-to-clear-service" || a.id === "the-downtime-economy").map((a) => (
            <li key={a.id} className="group relative flex gap-4 overflow-hidden rounded-2xl border border-line bg-surface p-3">
              <img src={asset(a.cover)} alt="" loading="lazy" className="aspect-square w-24 shrink-0 rounded-xl object-cover" />
              <div className="grid content-center gap-1"><p className="text-label-sm text-ink-brand">{a.category}</p><h3 className="text-label-md text-ink"><Link href={`/journal/${a.id}/`} className="after:absolute after:inset-0 group-hover:text-ink-brand">{a.title}</Link></h3></div>
            </li>
          ))}
        </ul>
      </section>
      <ProposalNote n={4} title="Help them translate their craft" >
        <p>The Journal's "From screen credit to clear service" is exactly the coaching a new Gigster needs. Surfacing it next to their profile turns the Journal into onboarding.</p>
      </ProposalNote>

      <p className={cx("flex items-center gap-2 text-caption text-ink-subtle")}><CircleCheck className="size-3.5" aria-hidden="true" />Showing {p.name}{p.sample ? " (fictional sample)" : ""}.</p>
    </div>
  );
}
