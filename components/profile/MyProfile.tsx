"use client";
import { Button, Skeleton, useToast } from "@ds/components";
import { ArrowRight, Copy, Eye, FilePen, Hourglass, MessageSquareWarning, PencilLine, Share2, Sparkles } from "lucide-react";
import * as React from "react";
import { data, type Person, type PersonSummary, type Profile } from "@/lib/data";
import { blankFields } from "@/lib/data/fields";
import { useRequireRole } from "@/lib/guard";
import { absoluteUrl } from "@/lib/site";
import { sectionLabel } from "@/lib/profile/validate";
import { PersonStatusBadge } from "@/components/people/PersonStatusBadge";
import { Page } from "@/components/site/Page";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ProfilePreviewCard } from "./ProfilePreviewCard";
import { markArea } from "@/lib/split-area";

markArea("bg-split:dashboard");

const when = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric" }) : "");


/**
 * /profile: where the Gigster stands (direction G · Swiss grid). A huge greeting, then two numbered sections under thick
 * rules: 01 the one next step (the screen's single mint block; once approved, the forest "You're live" island) and 02 the
 * card clients see in search. The full profile lives on its own page (public once approved) and in Edit.
 */
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
  const state = !started || !fields ? "new" : person.status;

  return (
    <Page>
      <div className="grid gap-x-6 sm:pt-4 lg:grid-cols-12">
        <div className="lg:col-span-9">
          <p className="flex flex-wrap items-center gap-x-5 gap-y-2 text-eyebrow text-ink uppercase">
            <span>My profile</span>
            {state !== "new" && <PersonStatusBadge status={person.status} audience="gigster" />}
          </p>
          <h1 className="mt-4 font-display text-display-md text-ink sm:text-display-lg xl:text-display-xl">Hi, {first}</h1>
          <p className="mt-5 max-w-xl font-display text-heading-md font-medium leading-snug text-ink">Here&apos;s where your profile stands.</p>
        </div>
      </div>

      <div className="mt-12 grid items-start gap-x-6 gap-y-14 lg:mt-16 lg:grid-cols-12">
        <section aria-labelledby="stand-h" className="border-t-4 border-line-strong pt-4 lg:col-span-8">
          <SectionLabel n="01" id="stand-h">{state === "approved" ? "Your page" : "Next step"}</SectionLabel>
          <div className="mt-6">
            {state === "approved" && fields ? <Live person={person} /> : <Status person={person} state={state} completeness={s.completeness} first={first} />}
          </div>
        </section>
        <section aria-labelledby="card-h" className="border-t-4 border-line-strong pt-4 lg:col-span-4">
          <SectionLabel n="02" id="card-h">Your card in search</SectionLabel>
          <p className="mt-2 text-body-md text-ink-muted">What clients see when they browse.</p>
          <div className="mt-6">
            <ProfilePreviewCard fields={fields ?? blankFields(person.name)} personId={person.id} badge={state === "approved" ? null : state === "new" ? "Fills in as you go" : "Preview"} />
          </div>
        </section>
      </div>
    </Page>
  );
}

/** A numbered section label: a small number over a heading, Swiss style. */
function SectionLabel({ n, id, children }: { n: string; id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="grid gap-2 font-display text-heading-lg text-ink">
      <span className="text-label-sm tabular-nums">{n}</span>{children}
    </h2>
  );
}

const onMint = "justify-between! bg-forest-950! text-white! hover:bg-forest-800!";

/** One card, one next step: not started, draft, with the team, or changes requested. */
function Status({ person, state, completeness, first }: { person: Person; state: string; completeness: number; first: string }) {
  const notes = person.reviewNotes ?? [];
  const c = {
    new: { title: "Let's build your profile", body: "Fill it in right on the page clients will see. It takes about 10 minutes and saves as you go.", cta: "Start your profile" },
    registered: { title: "Let's build your profile", body: "Fill it in right on the page clients will see. It takes about 10 minutes and saves as you go.", cta: "Start your profile" },
    invited: { title: "Let's build your profile", body: "Fill it in right on the page clients will see. It takes about 10 minutes and saves as you go.", cta: "Start your profile" },
    draft: { title: "Draft · not submitted yet", body: `Only you can see it. You're ${Math.round(completeness * 100)}% of the way there; send it to the Between Gigs team when it's ready.`, cta: "Continue your profile" },
    submitted: { title: "Submitted for review", body: `Thanks, ${first}. Our team is reviewing your profile${person.submittedAt ? ` (sent ${when(person.submittedAt)})` : ""}. We'll email you when it's approved or if we suggest a change.`, cta: null },
    changes_requested: { title: "Changes requested", body: "The Between Gigs team asked for a few changes. Update them, then send it again.", cta: "Make the changes" },
  }[state] ?? { title: "Your profile", body: "", cta: "Edit profile" };
  const Icon = { new: Sparkles, registered: Sparkles, invited: Sparkles, draft: FilePen, submitted: Hourglass, changes_requested: MessageSquareWarning }[state] ?? FilePen;
  return (
    <div className="grid gap-6 bg-tint-mint p-6 text-forest-950 sm:p-8">
      <div className="grid gap-3">
        <Icon aria-hidden="true" className="size-8" strokeWidth={2.25} />
        <h3 className="font-display text-heading-lg">{c.title}</h3>
        <p className="max-w-prose text-body-lg">{c.body}</p>
      </div>
      {state === "changes_requested" && notes.length > 0 && (
        <ul className="grid">
          {notes.map((n) => (
            <li key={n.note} className="grid gap-1 border-t-2 border-forest-950 py-3 text-body-md"><b className="text-eyebrow uppercase">{sectionLabel[n.section]}</b>{n.note}</li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-3">
        {c.cta
          ? <ButtonLink href="/profile/canvas/" variant="primary" size="lg" iconEnd={<ArrowRight />} className={`${onMint} min-w-64 swiss:h-14 swiss:px-6 swiss:font-display`}>{c.cta}</ButtonLink>
          : <ButtonLink href="/profile/canvas/" size="lg" iconStart={<PencilLine />} className="border-2! border-forest-950! text-forest-950! hover:bg-forest-950/10 swiss:h-14 swiss:px-6 swiss:font-display">Edit profile</ButtonLink>}
      </div>
    </div>
  );
}

/** Approved: the public link, sharing, and this month's availability, in one light card. */
function Live({ person }: { person: Person }) {
  const toast = useToast();
  const first = person.name.split(" ")[0] || "there";
  const url = absoluteUrl(`/p/${person.slug}/`);
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); toast({ message: "Link copied", tone: "success" }); }
    catch { toast({ message: "Couldn't copy. Select the link and copy it instead.", tone: "danger" }); }
  };
  const share = async () => {
    try { await navigator.share({ title: `${person.name} on Between Gigs`, url }); } catch { /* dismissed */ }
  };

  return (
    <div data-theme="dark" className="relative isolate grid gap-8 overflow-hidden rounded-none bg-surface-brand phosphor-dots p-6 text-ink sm:p-10">
      <span aria-hidden="true" className="glow-horizon -z-10 opacity-50" />
      <div className="grid gap-3">
          <p className="text-eyebrow text-ink-brand uppercase">Live on Between Gigs</p>
          <h3 className="font-display text-display-sm text-ink sm:text-display-md">You&apos;re live, {first}</h3>
          <p className="max-w-prose text-body-lg text-ink">The Between Gigs team approved your profile{person.approvedAt && ` on ${when(person.approvedAt)}`}, and clients can find it now. Keep this month's availability current from Edit profile.</p>
      </div>
      <div className="grid gap-2">
        <label htmlFor="live-url" className="text-label-md text-ink">Your public link</label>
        <div className="flex flex-wrap gap-2">
          <input id="live-url" readOnly value={url} onFocus={(e) => e.currentTarget.select()}
            className="h-12 min-w-0 flex-1 basis-56 rounded-none border-2 border-line-strong bg-surface px-4 text-body-md text-ink outline-none focus-visible:ring-2 focus-visible:ring-focus" />
          <Button size="lg" iconStart={<Copy />} onClick={copy}>Copy</Button>
          {canShare && <Button size="lg" iconStart={<Share2 />} onClick={share}>Share</Button>}
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <ButtonLink href={`/p/${person.slug}/`} variant="primary" size="lg" iconStart={<Eye />}>View your public page</ButtonLink>
        <ButtonLink href="/profile/canvas/" size="lg" iconStart={<PencilLine />}>Edit profile</ButtonLink>
      </div>
    </div>
  );
}
