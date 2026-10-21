"use client";
import { Banner, EmptyState, Progress, Skeleton } from "@ds/components";
import { ArrowRight, Eye, PencilLine, Sparkles } from "lucide-react";
import * as React from "react";
import { data, type PersonSummary, type Profile } from "@/lib/data";
import { useRequireRole } from "@/lib/guard";
import { sectionLabel } from "@/lib/profile/validate";
import { PersonStatusBadge } from "@/components/people/PersonStatusBadge";
import { Page } from "@/components/site/Page";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ProfileView } from "./ProfileView";

const when = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric" }) : "");

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
    draft: <Banner tone="warning" title="Draft · not submitted yet">
      Only you can see this. Finish the questionnaire and submit it for review when you're ready.
      <Progress className="mt-3 max-w-sm" value={Math.round(s.completeness * 100)} label="Profile complete" />
      <div className="mt-3"><ButtonLink href="/profile/edit/" size="sm" variant="primary" iconEnd={<ArrowRight />}>{editLabel}</ButtonLink></div>
    </Banner>,
    submitted: <Banner tone="info" title="Submitted for review">
      Thanks, {first}. Our team is reviewing your profile{person.submittedAt && ` (sent ${when(person.submittedAt)})`}. We'll email you when it's approved or if we suggest a change.
      <div className="mt-3"><ButtonLink href="/profile/edit/?step=review" size="sm" iconStart={<PencilLine />}>Edit</ButtonLink></div>
    </Banner>,
    changes_requested: <Banner tone="warning" title="Changes requested">
      <p>The Between Gigs team looked at your profile and asked for a few changes. Update them, then submit again.</p>
      <ul className="mt-3 grid gap-2">
        {(person.reviewNotes ?? []).map((n) => (
          <li key={n.note} className="rounded-md border border-line bg-surface p-3 text-body-sm text-ink"><b className="block text-label-sm text-ink-muted">{sectionLabel[n.section]}</b>{n.note}</li>
        ))}
      </ul>
      <div className="mt-3"><ButtonLink href="/profile/edit/?step=review" size="sm" variant="primary" iconEnd={<ArrowRight />}>{editLabel}</ButtonLink></div>
    </Banner>,
    approved: <Banner tone="success" title="Approved · your profile is live">
      Clients can find you{person.approvedAt && ` since ${when(person.approvedAt)}`}. Keep your availability fresh each month.
      <div className="mt-3"><ButtonLink href={`/p/${person.slug}/`} size="sm" iconStart={<Eye />}>View public page</ButtonLink></div>
    </Banner>,
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
        {started && person.status === "approved" && <ButtonLink href="/profile/edit/" iconStart={<PencilLine />}>{editLabel}</ButtonLink>}
      </div>

      {banner && <div className="mt-6">{banner}</div>}

      {!started || !fields ? (
        <EmptyState className="mt-8 rounded-2xl border border-dashed border-line-dashed py-16" icon={<Sparkles />} title="Let's build your profile" headingLevel={2}
          action={<ButtonLink href="/profile/edit/" variant="primary" size="lg" iconEnd={<ArrowRight />}>Start your profile</ButtonLink>}>
          Five short steps: about you, your skills, where and when, your story, then a quick review. It saves as you go.
        </EmptyState>
      ) : (
        <div className="mt-10">
          {person.status !== "approved" && <p className="mb-6 text-body-sm text-ink-muted">Preview: this is how clients will see your profile once it's approved.</p>}
          <ProfileView person={person} fields={fields} extras={profile?.extras} mode="own" />
        </div>
      )}
    </Page>
  );
}
