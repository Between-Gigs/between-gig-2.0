"use client";
import { Button, Skeleton, useToast } from "@ds/components";
import { ArrowRight, Copy, Eye, PencilLine, Share2 } from "lucide-react";
import * as React from "react";
import { data, type Person, type PersonSummary, type Profile } from "@/lib/data";
import { blankFields } from "@/lib/data/fields";
import { useRequireRole } from "@/lib/guard";
import { absoluteUrl } from "@/lib/site";
import { sectionLabel } from "@/lib/profile/validate";
import { Icon3D } from "@/components/ui/Icon3D";
import { type Icon3DName } from "@/lib/icons3d";
import { PersonStatusBadge } from "@/components/people/PersonStatusBadge";
import { Page } from "@/components/site/Page";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ProfilePreviewCard } from "./ProfilePreviewCard";
import { markArea } from "@/lib/split-area";

markArea("bg-split:dashboard");

const when = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric" }) : "");


/**
 * /profile: where the Gigster stands, in one light status card, beside the card clients see in search. One next step
 * per state; the full profile lives on its own page (public once approved) and in Edit, so it isn't repeated here.
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
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-display-sm text-ink">Hi, {first}</h1>
        {state !== "new" && <PersonStatusBadge status={person.status} audience="gigster" />}
      </div>

      <div className="mt-8 grid items-start gap-10 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-7">
          {state === "approved" && fields ? <Live person={person} /> : <Status person={person} state={state} completeness={s.completeness} first={first} />}
        </div>
        <aside aria-label="Your card in search" className="grid gap-3 lg:col-span-5">
          <p className="text-label-md text-ink-muted">Your card in search</p>
          <ProfilePreviewCard fields={fields ?? blankFields(person.name)} personId={person.id} badge={state === "approved" ? null : state === "new" ? "Fills in as you go" : "Preview"} />
        </aside>
      </div>
    </Page>
  );
}

/** One card, one next step: not started, draft, with the team, or changes requested. */
function Status({ person, state, completeness, first }: { person: Person; state: string; completeness: number; first: string }) {
  const notes = person.reviewNotes ?? [];
  const c = {
    new: { icon: "waving_hand", title: "Let's build your profile", body: "Fill it in right on the page clients will see. It takes about 10 minutes and saves as you go.", cta: "Start your profile" },
    registered: { icon: "waving_hand", title: "Let's build your profile", body: "Fill it in right on the page clients will see. It takes about 10 minutes and saves as you go.", cta: "Start your profile" },
    invited: { icon: "waving_hand", title: "Let's build your profile", body: "Fill it in right on the page clients will see. It takes about 10 minutes and saves as you go.", cta: "Start your profile" },
    draft: { icon: "memo", title: "Draft · not submitted yet", body: `Only you can see it. You're ${Math.round(completeness * 100)}% of the way there; send it to the Between Gigs team when it's ready.`, cta: "Continue your profile" },
    submitted: { icon: "hourglass_done", title: "Submitted for review", body: `Thanks, ${first}. Our team is reviewing your profile${person.submittedAt ? ` (sent ${when(person.submittedAt)})` : ""}. We'll email you when it's approved or if we suggest a change.`, cta: null },
    changes_requested: { icon: "memo", title: "Changes requested", body: "The Between Gigs team asked for a few changes. Update them, then send it again.", cta: "Make the changes" },
  }[state] ?? { icon: "memo", title: "Your profile", body: "", cta: "Edit profile" };
  return (
    <section aria-labelledby="status-h" className="grid gap-6 rounded-lg border border-line bg-surface p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <Icon3D name={c.icon as Icon3DName} className="size-12 shrink-0" />
        <div className="grid gap-1.5">
          <h2 id="status-h" className="font-display text-heading-lg text-ink">{c.title}</h2>
          <p className="max-w-prose text-body-md text-ink-muted">{c.body}</p>
        </div>
      </div>
      {state === "changes_requested" && notes.length > 0 && (
        <ul className="grid gap-2">
          {notes.map((n) => (
            <li key={n.note} className="rounded-md bg-surface-sunken p-4 text-body-md text-ink"><b className="block text-label-sm text-ink-muted">{sectionLabel[n.section]}</b>{n.note}</li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-3 border-t border-line pt-6">
        {c.cta
          ? <ButtonLink href="/profile/canvas/" variant="primary" size="lg" iconEnd={<ArrowRight />}>{c.cta}</ButtonLink>
          : <ButtonLink href="/profile/canvas/" size="lg" iconStart={<PencilLine />}>Edit profile</ButtonLink>}
      </div>
    </section>
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
    <section aria-labelledby="live-h" className="grid gap-6 rounded-lg border border-line bg-surface p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <Icon3D name="party_popper" className="size-12 shrink-0" />
        <div className="grid gap-1.5">
          <h2 id="live-h" className="font-display text-heading-lg text-ink">You&apos;re live, {first}</h2>
          <p className="max-w-prose text-body-md text-ink-muted">The Between Gigs team approved your profile{person.approvedAt && ` on ${when(person.approvedAt)}`}, and clients can find it now. Keep this month's availability current from Edit profile.</p>
        </div>
      </div>
      <div className="grid gap-2">
        <label htmlFor="live-url" className="text-label-md text-ink">Your public link</label>
        <div className="flex flex-wrap gap-2">
          <input id="live-url" readOnly value={url} onFocus={(e) => e.currentTarget.select()}
            className="h-11 min-w-0 flex-1 basis-56 rounded-md border border-line-strong bg-surface px-3 text-body-md text-ink outline-none focus-visible:ring-2 focus-visible:ring-focus" />
          <Button size="lg" iconStart={<Copy />} onClick={copy}>Copy</Button>
          {canShare && <Button size="lg" iconStart={<Share2 />} onClick={share}>Share</Button>}
        </div>
      </div>
      <div className="flex flex-wrap gap-3 border-t border-line pt-6">
        <ButtonLink href={`/p/${person.slug}/`} variant="primary" size="lg" iconStart={<Eye />}>View your public page</ButtonLink>
        <ButtonLink href="/profile/canvas/" size="lg" iconStart={<PencilLine />}>Edit profile</ButtonLink>
      </div>
    </section>
  );
}
