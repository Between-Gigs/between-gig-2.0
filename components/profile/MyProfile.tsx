"use client";
import { Banner, Button, Skeleton, Switch, useToast } from "@ds/components";
import { ArrowRight, Copy, Eye, ListChecks, PartyPopper, PencilLine, Share2 } from "lucide-react";
import * as React from "react";
import { data, type Person, type PersonSummary, type Profile, type ProfileFields } from "@/lib/data";
import { blankFields } from "@/lib/data/seed";
import { useRequireRole } from "@/lib/guard";
import { absoluteUrl } from "@/lib/site";
import { STEPS, sectionLabel } from "@/lib/profile/validate";
import { PersonStatusBadge } from "@/components/people/PersonStatusBadge";
import { Page } from "@/components/site/Page";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ProfilePreviewCard } from "./ProfilePreviewCard";
import { ProfileView } from "./ProfileView";

const when = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric" }) : "");

const stepHints: Record<(typeof STEPS)[number], string> = {
  "About you": "Your photo, role, years in the business and a few credits.",
  Skills: "Your on-set skills and the services you'd offer between gigs.",
  "Where & when": "Where you work, when you're free this month and a starting rate.",
  "Your story": "A few lines about the help you offer and how you work.",
  Review: "Check it top to bottom, then send it to the Between Gigs team.",
};

/** /profile: the Gigster's own profile, with a banner that says where it stands and what to do next. */
export function MyProfile() {
  const session = useRequireRole("gigster");
  const [s, setS] = React.useState<PersonSummary | null>(null);
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    if (!session?.personId) return;
    const id = session.personId;
    void Promise.all([data.people.get(id), data.profiles.getProfile(id)]).then(([summary, p]) => { setS(summary); setProfile(p); setLoaded(true); });
  }, [session?.personId]);

  if (!session || !loaded || !s) {
    return <Page><div aria-busy="true" aria-label="Loading your profile" className="grid gap-4"><Skeleton className="h-10 w-1/3" /><Skeleton shape="block" className="h-24" /><Skeleton shape="block" className="h-96" /></div></Page>;
  }

  const { person } = s;
  const first = person.name.split(" ")[0] || "there";
  // Show what's submitted when there is something submitted; before that, the working draft.
  const fields = profile?.fields ?? s.fields;
  const started = !!fields && s.completeness > 0;
  const editLabel = person.status === "changes_requested" ? "Make the changes" : person.status === "draft" ? "Continue your profile" : "Edit profile";

  const banner = {
    invited: null,
    registered: null,
    draft: fields && <Banner tone="warning" title="Draft · not submitted yet">
      Only you can see this. Finish the questionnaire and submit it for review when you're ready.
      <div className="mt-3"><ButtonLink href="/profile/canvas/" size="sm" variant="primary" iconEnd={<ArrowRight />}>{editLabel}</ButtonLink></div>
    </Banner>,
    submitted: <Banner tone="info" title="Submitted for review">
      Thanks, {first}. Our team is reviewing your profile{person.submittedAt && ` (sent ${when(person.submittedAt)})`}. We'll email you when it's approved or if we suggest a change.
      <div className="mt-3"><ButtonLink href="/profile/canvas/" size="sm" iconStart={<PencilLine />}>Edit</ButtonLink></div>
    </Banner>,
    changes_requested: <Banner tone="warning" title="Changes requested">
      <p>The Between Gigs team looked at your profile and asked for a few changes. Update them, then submit again.</p>
      <ul className="mt-3 grid gap-2">
        {(person.reviewNotes ?? []).map((n) => (
          <li key={n.note} className="rounded-md border border-line bg-surface p-3 text-body-sm text-ink"><b className="block text-label-sm text-ink-muted">{sectionLabel[n.section]}</b>{n.note}</li>
        ))}
      </ul>
      <div className="mt-3"><ButtonLink href="/profile/canvas/" size="sm" variant="primary" iconEnd={<ArrowRight />}>{editLabel}</ButtonLink></div>
    </Banner>,
    approved: null,
  }[person.status];

  return (
    <Page>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-2">
          <p className="text-eyebrow text-ink-brand uppercase">My profile</p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-display-sm text-ink">Hi, {first}</h1>
            <PersonStatusBadge status={person.status} audience="gigster" />
          </div>
        </div>
        {started && person.status === "approved" && <ButtonLink href="/profile/canvas/" iconStart={<PencilLine />}>{editLabel}</ButtonLink>}
      </div>

      {banner && <div className="mt-6">{banner}</div>}
      {person.status === "approved" && fields && <Live person={person} fields={fields} />}

      {!started || !fields ? (
        <NotStarted person={person} />
      ) : (
        <div className="mt-10">
          {person.status !== "approved" && <p className="mb-6 text-body-sm text-ink-muted">Preview: this is how clients will see your profile once it's approved.</p>}
          <ProfileView person={person} fields={fields} extras={profile?.extras} mode="own" />
        </div>
      )}
    </Page>
  );
}

/** Before the first answer: the five steps, what the finished card looks like, and one way in. */
function NotStarted({ person }: { person: Person }) {
  return (
    <section aria-labelledby="start-h" className="mt-8 grid gap-8 rounded-2xl border border-line bg-surface p-6 shadow-lg sm:p-8 lg:grid-cols-12 lg:gap-12">
      <div className="lg:col-span-7">
        <p className="text-label-md text-ink-brand">Good work. Great people. Your next chapter.</p>
        <h2 id="start-h" className="mt-3 font-display text-display-sm text-balance text-ink sm:text-display-md">Let's meet the person <span className="glow-text text-ink-brand">behind the experience.</span></h2>
        <p className="mt-3 max-w-prose text-body-lg text-ink-muted">Bring your on-set know-how to everyday life. You'll fill in your profile right where clients will see it: about 10 minutes, and it saves as you go.</p>
        <ol className="mt-6 grid gap-4">
          {STEPS.map((step, i) => (
            <li key={step} className="flex items-start gap-4">
              <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full border-2 border-ink-brand text-label-sm text-ink-brand tabular-nums">{i + 1}</span>
              <span className="grid gap-0.5"><b className="text-label-md text-ink">{step}</b><span className="text-body-sm text-ink-muted">{stepHints[step]}</span></span>
            </li>
          ))}
        </ol>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <ButtonLink href="/profile/canvas/" variant="primary" size="lg" iconEnd={<ArrowRight />}>Start your profile</ButtonLink>
          <ButtonLink href="/profile/edit/" size="lg" iconStart={<ListChecks />}>Prefer questions, step by step?</ButtonLink>
        </div>
      </div>
      <div className="lg:col-span-5">
        <p className="mb-3 text-label-md text-ink-muted">What clients will see</p>
        <ProfilePreviewCard fields={blankFields(person.name)} personId={person.id} badge="Your card" />
        <p className="mt-3 text-body-sm text-ink-subtle">It fills in as you go.</p>
      </div>
    </section>
  );
}

/** Approved: a small celebration, the live card, sharing, and this month's availability. */
function Live({ person, fields }: { person: Person; fields: ProfileFields }) {
  const toast = useToast();
  const first = person.name.split(" ")[0] || "there";
  const url = absoluteUrl(`/p/${person.slug}/`);
  // Preview only: the data layer has no availability update for a live profile yet, so this stays on this page.
  const [open, setOpen] = React.useState(fields.monthStatus !== "away");
  const shown: ProfileFields = { ...fields, monthStatus: open ? (fields.monthStatus === "away" ? "available" : fields.monthStatus) : "away" };
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); toast({ message: "Link copied", tone: "success" }); }
    catch { toast({ message: "Couldn't copy. Select the link and copy it instead.", tone: "danger" }); }
  };
  const share = async () => {
    try { await navigator.share({ title: `${person.name} on Between Gigs`, url }); } catch { /* dismissed */ }
  };

  return (
    <section aria-labelledby="live-h" className="mt-6 grid overflow-hidden rounded-2xl border border-line bg-surface shadow-lg lg:grid-cols-12">
      <div data-theme="dark" className="relative isolate overflow-hidden bg-surface-brand phosphor-dots p-6 sm:p-8 lg:col-span-7">
        <span aria-hidden="true" className="glow-horizon hidden opacity-50 lg:block" />
        <div className="relative z-raised grid gap-5">
          <span aria-hidden="true" className="grid size-12 place-items-center rounded-full bg-action text-on-action shadow-md"><PartyPopper className="size-6" /></span>
          <div>
            <p className="text-eyebrow text-ink-brand uppercase">Approved{person.approvedAt && ` · ${when(person.approvedAt)}`}</p>
            <h2 id="live-h" className="mt-2 font-display text-display-sm text-balance text-ink">You're live, {first}.</h2>
            <p className="mt-2 max-w-prose text-body-md text-ink-muted">The Between Gigs team reviewed your profile and it's now public. Share your link, and keep this month's availability current.</p>
          </div>
          <div className="grid gap-2">
            <label htmlFor="live-url" className="text-label-sm text-ink-muted">Your public link</label>
            <div className="flex flex-wrap gap-2">
              <input id="live-url" readOnly value={url} onFocus={(e) => e.currentTarget.select()}
                className="h-10 min-w-0 flex-1 basis-56 rounded-lg border border-line-strong bg-surface px-3 text-body-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-focus" />
              <Button iconStart={<Copy />} onClick={copy}>Copy link</Button>
              {canShare && <Button iconStart={<Share2 />} onClick={share}>Share</Button>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <ButtonLink href={`/p/${person.slug}/`} variant="primary" iconStart={<Eye />}>View public page</ButtonLink>
          </div>
          <div className="rounded-xl border border-line bg-surface p-4">
            <Switch checked={open} onChange={setOpen} label="Taking requests this month"
              description="Preview control: it updates the card here only and isn't saved yet. To change it for real, edit your profile's Where & when step." />
          </div>
        </div>
      </div>
      <div className="grid content-center gap-3 p-6 sm:p-8 lg:col-span-5">
        <p className="text-label-md text-ink-muted">Your card in search</p>
        <ProfilePreviewCard fields={shown} personId={person.id} badge={null} />
      </div>
    </section>
  );
}
