"use client";
import { Badge, Button, Skeleton, cx, useToast } from "@ds/components";
import { ArrowRight, Copy, Eye, FilePen, Hourglass, MessageSquareWarning, PencilLine, Share2, Sparkles } from "lucide-react";
import * as React from "react";
import { useLook } from "@/components/site/LookSync";
import { useProfileTemplate } from "@/lib/profile/use-profile-template";
import { Icon3D } from "@/components/ui/Icon3D";
import type { Icon3DName } from "@/lib/icons3d";
import { data, type Person, type PersonSummary, type Profile } from "@/lib/data";
import { blankFields } from "@/lib/data/fields";
import { useRequireRole } from "@/lib/guard";
import { absoluteUrl } from "@/lib/site";
import { partsDone, sectionLabel } from "@/lib/profile/validate";
import { PersonStatusBadge, personStatusMeta } from "@/components/people/PersonStatusBadge";
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
  const warm = useLook() !== "swiss";
  const template = useProfileTemplate();
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

  const nextStep = state === "approved" && fields
    ? <Live person={person} warm={warm} />
    : <Status person={person} state={state} parts={partsDone(fields, person.name, template)} first={first} warm={warm} />;
  const card = <ProfilePreviewCard fields={fields ?? blankFields(person.name)} personId={person.id} badge={state === "approved" ? null : state === "new" ? "Fills in as you go" : "Preview"} />;

  if (warm) return (
    <Page>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="flex items-center gap-3 font-display text-display-sm wrap-anywhere text-ink"><Icon3D name="waving_hand" className="size-10" />Hi, {first}</h1>
        {state !== "new" && <PersonStatusBadge status={person.status} audience="gigster" />}
      </div>
      <p className="mt-2 text-body-lg text-ink-muted">Here&apos;s where your profile stands.</p>

      <div className="mt-8 grid items-start gap-10 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-7">
          {nextStep}
        </div>
        <aside aria-label="Your card in search" className="grid gap-4 rounded-2xl bg-tint-sand p-5 text-tint-ink sm:p-6 lg:col-span-5">
          <p className="flex items-center gap-2 text-label-md text-tint-ink"><Icon3D name="eyes" className="size-7" />Your card in search</p>
          {card}
        </aside>
      </div>
    </Page>
  );

  return (
    <Page>
      <div className="grid gap-x-6 sm:pt-4 md:grid-cols-12">
        <div className="min-w-0 md:col-span-12 lg:col-span-9">
          <p className="flex flex-wrap items-center gap-x-5 gap-y-2 text-eyebrow text-ink uppercase">
            <span>My profile</span>
            {/* Changes requested: a neutral tag, not yellow; the notes in the mint block below are the one highlight. */}
            {/* Draft too: the palette has no yellow. */}
            {state === "changes_requested" || state === "draft"
              ? <Badge tone="neutral" icon={state === "draft" ? <FilePen aria-hidden="true" /> : <MessageSquareWarning aria-hidden="true" />}>{personStatusMeta[state].gigsterLabel}</Badge>
              : state !== "new" && <PersonStatusBadge status={person.status} audience="gigster" />}
          </p>
          {/* A long name breaks inside the word (overflow-wrap: anywhere) instead of running off the screen. */}
          <h1 className="mt-4 font-display text-display-md wrap-anywhere text-ink sm:text-display-lg xl:text-display-xl">Hi, {first}</h1>
          <p className="mt-5 max-w-xl font-display text-heading-md font-medium leading-snug text-pretty text-ink">Here&apos;s where your profile stands.</p>
        </div>
      </div>

      <div className="mt-12 grid items-start gap-x-6 gap-y-14 md:grid-cols-12 lg:mt-16">
        <section aria-labelledby="stand-h" className="min-w-0 border-t-4 border-line-strong pt-4 md:col-span-7 lg:col-span-8">
          <SectionLabel n="01" id="stand-h">{state === "approved" ? "Your page" : "Next step"}</SectionLabel>
          <div className="mt-6">
            {nextStep}
          </div>
        </section>
        <section aria-labelledby="card-h" className="min-w-0 border-t-4 border-line-strong pt-4 md:col-span-5 lg:col-span-4">
          <SectionLabel n="02" id="card-h">Your card in search</SectionLabel>
          <p className="mt-2 text-body-md text-ink-muted">What clients see when they browse.</p>
          <div className="mt-6">
            {card}
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
function Status({ person, state, parts, first, warm }: { warm: boolean; person: Person; state: string; parts: { done: number; total: number }; first: string }) {
  const notes = person.reviewNotes ?? [];
  const c = {
    new: { title: "Let's build your profile", body: "Fill it in right on the page clients will see. It takes about 10 minutes and saves as you go.", cta: "Start your profile" },
    registered: { title: "Let's build your profile", body: "Fill it in right on the page clients will see. It takes about 10 minutes and saves as you go.", cta: "Start your profile" },
    invited: { title: "Let's build your profile", body: "Fill it in right on the page clients will see. It takes about 10 minutes and saves as you go.", cta: "Start your profile" },
    draft: { title: "Draft · not submitted yet", body: `Only you can see it. ${parts.total ? `${parts.done} of ${parts.total} parts done` : "No required parts"}; send it to the Between Gigs team when it's ready.`, cta: "Continue your profile" },
    submitted: { title: "Submitted for review", body: `Thanks, ${first}. Our team is reviewing your profile${person.submittedAt ? ` (sent ${when(person.submittedAt)})` : ""}. We'll email you when it's approved or if we suggest a change.`, cta: null },
    changes_requested: { title: "Changes requested", body: "The Between Gigs team asked for a few changes. Update them, then send it again.", cta: "Make the changes" },
  }[state] ?? { title: "Your profile", body: "", cta: "Edit profile" };
  const Icon = { new: Sparkles, registered: Sparkles, invited: Sparkles, draft: FilePen, submitted: Hourglass, changes_requested: MessageSquareWarning }[state] ?? FilePen;
  const art: Record<string, Icon3DName> = { new: "sparkles", registered: "sparkles", invited: "sparkles", draft: "memo", submitted: "hourglass_done", changes_requested: "memo" };
  const tint = { draft: "bg-tint-butter", submitted: "bg-tint-sky", changes_requested: "bg-tint-peach" }[state] ?? "bg-tint-mint-soft";
  const Heading = warm ? "h2" : "h3";
  return (
    <section aria-labelledby="status-h" className={cx("grid gap-6 p-6 sm:p-8", warm ? cx("rounded-2xl text-tint-ink", tint) : "bg-tint-mint text-forest-950")}>
      <div className={warm ? "flex flex-col items-start gap-5 sm:flex-row" : "grid gap-3"}>
        {warm ? <span aria-hidden="true" className="grid size-20 shrink-0 place-items-center rounded-full bg-surface shadow-sm"><Icon3D name={art[state] ?? "memo"} className="size-12" /></span> : <Icon aria-hidden="true" className="size-8" strokeWidth={2.25} />}
        <div className="grid gap-1.5">
        <Heading id="status-h" className="font-display text-heading-lg text-balance">{c.title}</Heading>
        <p className={cx("max-w-prose wrap-anywhere", warm ? "text-body-md" : "text-body-lg")}>{c.body}</p>
        </div>
      </div>
      {state === "changes_requested" && notes.length > 0 && (
        <ul className={warm ? "grid gap-2" : "grid"}>
          {notes.map((n) => (
            <li key={n.note} className={cx("grid gap-1 text-body-md", warm ? "rounded-lg bg-surface p-4 text-ink shadow-xs" : "border-t-2 border-forest-950 py-3")}><b className="text-eyebrow uppercase">{sectionLabel[n.section]}</b>{n.note}</li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-3">
        {c.cta
          ? <ButtonLink href="/profile/canvas/" variant="primary" size="lg" iconEnd={<ArrowRight />} className={warm ? undefined : `${onMint} min-w-64 swiss:h-14 swiss:px-6 swiss:font-display`}>{c.cta}</ButtonLink>
          : <ButtonLink href="/profile/canvas/" size="lg" iconStart={<PencilLine />} className={warm ? undefined : "border-2! border-forest-950! text-forest-950! hover:bg-forest-950/10 swiss:h-14 swiss:px-6 swiss:font-display"}>Edit profile</ButtonLink>}
      </div>
    </section>
  );
}

/** Approved: the public link, sharing, and this month's availability, in one light card. */
function Live({ person, warm }: { person: Person; warm: boolean }) {
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

  const Heading = warm ? "h2" : "h3";
  return (
    <section data-theme="dark" aria-labelledby="live-h" className={cx("relative isolate grid overflow-hidden bg-surface-brand phosphor-dots p-6 text-ink", warm ? "gap-6 rounded-2xl sm:p-8" : "gap-8 sm:p-10")}>
      <span aria-hidden="true" className="glow-horizon -z-10 opacity-50" />
      <div className={warm ? "flex flex-col items-start gap-5 sm:flex-row" : "grid gap-3"}>
        {warm && <span aria-hidden="true" className="grid size-20 shrink-0 place-items-center rounded-full bg-surface shadow-sm"><Icon3D name="party_popper" className="size-12" /></span>}
        <div className="grid gap-1.5">
          {!warm && <p className="text-eyebrow text-ink-brand uppercase">Live on Between Gigs</p>}
          <Heading id="live-h" className={cx("font-display wrap-anywhere text-ink", warm ? "text-heading-lg" : "text-display-sm sm:text-display-md")}>You&apos;re live, {first}</Heading>
          <p className={cx("max-w-prose text-ink", warm ? "text-body-md" : "text-body-lg")}>The Between Gigs team approved your profile{person.approvedAt && ` on ${when(person.approvedAt)}`}, and clients can find it now. Keep this month's availability current from Edit profile.</p>
        </div>
      </div>
      <div className="grid gap-2">
        <label htmlFor="live-url" className="text-label-md text-ink">Your public link</label>
        <div className="flex flex-wrap gap-2">
          <input id="live-url" readOnly value={url} onFocus={(e) => e.currentTarget.select()}
            className={cx("h-12 min-w-0 flex-1 basis-56 border-line-strong bg-surface text-body-md text-ink outline-none focus-visible:ring-2 focus-visible:ring-focus", warm ? "rounded-full border px-5" : "border-2 px-4")} />
          <Button size="lg" iconStart={<Copy />} onClick={copy}>Copy</Button>
          {canShare && <Button size="lg" iconStart={<Share2 />} onClick={share}>Share</Button>}
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <ButtonLink href={`/p/${person.slug}/`} variant="primary" size="lg" iconStart={<Eye />}>View your public page</ButtonLink>
        <ButtonLink href="/profile/canvas/" size="lg" iconStart={<PencilLine />}>Edit profile</ButtonLink>
      </div>
    </section>
  );
}
