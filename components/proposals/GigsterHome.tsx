"use client";
import { Badge, Banner, EmptyState, Progress, SegmentedControl, Skeleton, cx } from "@ds/components";
import { ArrowRight, CalendarCheck, CircleCheck, Eye, Inbox, Link2, PencilLine } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { data, type MonthStatus, type PersonSummary } from "@/lib/data";
import { monthStatusLabel } from "@/lib/data/taxonomy";
import { partsDone } from "@/lib/profile/validate";
import { PersonPhoto } from "@/components/people/PersonPhoto";
import { PersonStatusBadge } from "@/components/people/PersonStatusBadge";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { BrandBlock, Section, eyebrow, mintBlock, onMint } from "./kit";
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

  if (!s) return <div aria-busy="true" aria-label="Loading" className="grid gap-6"><Skeleton shape="block" className="h-40" /><Skeleton shape="block" className="h-64" /></div>;
  const { person: p, fields: f } = s;
  // Counted in parts, the same way the editor counts them ("2 of 10 parts done").
  const parts = partsDone(f, p.name);
  const first = p.name.split(" ")[0] || "there";

  const next = {
    invited: { title: "Create your account", body: "Use the link in your invite email.", href: "/login/", cta: "Sign in" },
    registered: { title: "Start your profile", body: "Fill it in right where clients will see it. It saves as you go.", href: "/profile/canvas/", cta: "Start your profile" },
    draft: { title: "Finish your profile", body: `${parts.done} of ${parts.total} parts done. Submit it when it feels like you.`, href: "/profile/canvas/", cta: "Continue your profile" },
    submitted: { title: "We're reviewing your profile", body: "Nothing to do right now. We'll email you when it's approved or if we suggest a change.", href: "/profile/", cta: "See my profile" },
    changes_requested: { title: "Make the suggested edits", body: `${p.reviewNotes?.length ?? 0} short ${p.reviewNotes?.length === 1 ? "note" : "notes"} from the Between Gigs team.`, href: "/profile/canvas/", cta: "Make the changes" },
    approved: { title: "Keep your availability fresh", body: `Confirm you're free in ${f?.month ?? "this month"} so clients know when to ask.`, href: "/profile/canvas/", cta: "Update availability" },
  }[p.status];

  return (
    <div className="grid gap-14 lg:gap-16">
      <div>
        <section aria-labelledby="g-hello" className="grid grid-cols-12 gap-x-6 gap-y-6">
          <div className="col-span-4 sm:col-span-3 lg:row-span-3">
            <PersonPhoto id={p.id} name={p.name} src={f?.photo || undefined} alt="" className="aspect-square w-full lg:aspect-auto lg:h-full" textClass="text-display-sm" />
          </div>
          <div className="col-span-8 flex min-w-0 flex-col justify-end gap-3 sm:col-span-9 lg:col-start-4 lg:flex-row lg:items-center lg:justify-start">
            <p className={eyebrow}>Your call sheet</p>
            <PersonStatusBadge status={p.status} audience="gigster" className="w-fit" />
          </div>
          <h2 id="g-hello" className="col-span-12 lg:col-span-9 lg:col-start-4 font-display text-display-sm break-words text-ink sm:text-display-md md:text-display-lg xl:text-display-xl">Welcome back, {first}.</h2>
          {/* The screen's one mint block: the next step. */}
          <div className={cx(mintBlock, "col-span-12 grid gap-4 p-5 sm:grid-cols-12 sm:items-end sm:gap-x-6 sm:p-6 lg:col-span-9 lg:col-start-4")}>
            <div className="grid gap-1.5 sm:col-span-7">
              <p className="text-label-sm font-bold tracking-widest uppercase">Next step</p>
              <h3 className="font-display text-heading-lg">{next.title}</h3>
              <p className="text-body-md">{next.body}</p>
            </div>
            <div className="sm:col-span-5"><ButtonLink href={next.href} variant="primary" size="lg" fullWidth className={onMint} iconEnd={<ArrowRight />}>{next.cta}</ButtonLink></div>
          </div>
        </section>
        <ProposalNote n={1} />
      </div>

      <div>
        <Section id="g-availability" n="01" title={<span className="inline-flex items-center gap-2"><CalendarCheck className="size-6 shrink-0" strokeWidth={1.75} aria-hidden="true" />This month</span>}>
          <BrandBlock>
            <div className="grid gap-4 p-5 pb-24 sm:p-6 sm:pb-24 lg:grid-cols-9 lg:items-center lg:gap-x-6 lg:pb-6">
              <p className="text-body-lg text-ink lg:col-span-4">Production comes first. When the call comes, pause here in one tap.</p>
              <div className="grid gap-2 lg:col-span-5 lg:justify-items-end">
                <SegmentedControl label="Availability this month" value={availability} onChange={(v) => setAvailability(v as MonthStatus)}
                  options={(Object.keys(monthStatusLabel) as MonthStatus[]).map((k) => ({ value: k, label: { available: "Available", limited: "Limited", away: "Away" }[k] }))} />
                <p aria-live="polite" className="text-body-sm text-ink-muted">{monthStatusLabel[availability]} · preview only, not saved</p>
              </div>
            </div>
          </BrandBlock>
        </Section>
        <ProposalNote n={2} />
      </div>

      <div>
        <div className="grid grid-cols-12 gap-x-6 gap-y-14">
          <section aria-labelledby="g-requests" className="col-span-12 border-t-4 border-line-strong pt-3 lg:col-span-7">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h2 id="g-requests" className="font-display text-heading-lg text-ink"><span aria-hidden="true" className="mb-1 block font-sans text-label-sm font-extrabold tracking-normal tabular-nums">02</span>Requests</h2>
              <Badge tone="info" size="sm">Coming with booking</Badge>
            </div>
            <EmptyState className="mt-4 py-10" icon={<Inbox />} title="No requests yet" headingLevel={3}>
              Client requests arrive here once booking opens.
            </EmptyState>
          </section>
          <section aria-labelledby="g-profile" className="col-span-12 grid content-start gap-4 border-t-4 border-line-strong pt-3 lg:col-span-5">
            <h2 id="g-profile" className="font-display text-heading-lg text-ink"><span aria-hidden="true" className="mb-1 block font-sans text-label-sm font-extrabold tracking-normal tabular-nums">03</span>Your profile</h2>
            <div className="flex items-end gap-4">
              <span className="font-display text-stat text-ink tabular-nums">{parts.done}<span className="text-heading-lg text-ink-muted">/{parts.total}</span></span>
              <Progress value={parts.done} max={parts.total} label={`${parts.done} of ${parts.total} parts done`} valueText="" size="md" className="mb-3 flex-1" />
            </div>
            <ul className="grid border-t border-line text-body-md">
              <li className="border-b border-line"><Link href="/profile/" className={rowLink}><Eye className="size-5 shrink-0" strokeWidth={1.75} aria-hidden="true" />See it as clients will<ArrowRight className="ml-auto size-4" aria-hidden="true" /></Link></li>
              <li className="border-b border-line"><Link href="/profile/canvas/" className={rowLink}><PencilLine className="size-5 shrink-0" strokeWidth={1.75} aria-hidden="true" />Edit your profile<ArrowRight className="ml-auto size-4" aria-hidden="true" /></Link></li>
              {p.status === "approved" && <li className="border-b border-line"><Link href={`/p/${p.slug}/`} className={rowLink}><Link2 className="size-5 shrink-0" strokeWidth={1.75} aria-hidden="true" />Your public page to share<ArrowRight className="ml-auto size-4" aria-hidden="true" /></Link></li>}
            </ul>
            {p.status === "approved" && <Banner tone="success" title="You're live">Clients across Los Angeles can find you.</Banner>}
          </section>
        </div>
        <ProposalNote n={3} />
      </div>

      <p className="flex items-center gap-2 text-caption text-ink-subtle"><CircleCheck className="size-3.5" aria-hidden="true" />Showing {p.name}{p.sample ? " (fictional sample)" : ""}.</p>
    </div>
  );
}

const rowLink = "group flex min-h-12 items-center gap-3 font-bold text-ink transition-colors duration-fast hover:text-ink-brand";
