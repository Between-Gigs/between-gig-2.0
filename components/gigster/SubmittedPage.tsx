"use client";
/*
 * /profile/submitted/: where the Gigster lands after Submit for review (Flow p5). The still-life photo behind a check,
 * "IN REVIEW", the serif "Profile submitted.", the thanks line, their name and title, "View my profile" and "Edit
 * profile", and "Your profile stays private during review." Opened at another time, it says where the profile stands.
 */
import { Skeleton } from "@ds/components";
import { Check } from "lucide-react";
import * as React from "react";
import { data, type Person, type ProfileFields } from "@/lib/data";
import { useRequireRole } from "@/lib/guard";
import { asset } from "@/lib/site";
import { Heading, Text, TextLink } from "@/components/ds/atoms";
import { Page } from "@/components/site/Page";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { markArea } from "@/lib/split-area";

markArea("bg-split:dashboard");

/** The still life behind the message: portrait art on phones, the wide one from tablets up, both centred. */
function Stage({ children }: { children: React.ReactNode }) {
  return (
    <section className="relative isolate flex flex-1 items-center overflow-hidden bg-bg">
      <picture>
        <source media="(min-width: 48rem)" srcSet={asset("/art/stage/still-life-desktop.jpg")} />
        <img src={asset("/art/stage/still-life-portrait.jpg")} alt="" aria-hidden="true" className="absolute inset-0 -z-10 size-full object-cover object-center dark:opacity-20" />
      </picture>
      {children}
    </section>
  );
}

export function SubmittedPage() {
  const session = useRequireRole("gigster");
  const [state, setState] = React.useState<{ person: Person; fields: ProfileFields | null } | null>(null);
  React.useEffect(() => {
    if (!session?.personId) return;
    let current = true;
    void Promise.all([data.people.get(session.personId), data.profiles.getDraft(session.personId)]).then(([s, draft]) => {
      if (current && s) setState({ person: s.person, fields: draft?.fields ?? s.fields });
    });
    return () => { current = false; };
  }, [session?.personId]);

  if (!state) return <Page><div aria-busy="true" aria-label="Loading" className="mx-auto grid max-w-xl gap-4 py-16"><Skeleton className="mx-auto size-16 rounded-full" /><Skeleton className="h-12" /><Skeleton /></div></Page>;

  const { person, fields } = state;
  const name = fields?.name.trim() || person.name;
  const first = name.split(/\s+/)[0] || "there";
  const title = fields?.title?.trim() || fields?.position || fields?.services[0] || "";
  const inReview = person.status === "submitted";
  const live = person.status === "approved";

  return (
    <Page bare className="flex flex-col">
      <Stage>
        <div className="mx-auto grid w-full max-w-3xl justify-items-start sm:justify-items-center gap-6 px-4 py-16 text-left sm:text-center sm:px-6 lg:py-24 max-lg:my-8 max-lg:w-auto max-lg:rounded-xl max-lg:bg-bg/92 max-lg:mx-4 max-lg:px-5 max-lg:py-10 max-lg:shadow-md max-lg:backdrop-blur-sm">
          <span aria-hidden="true" className="grid size-16 place-items-center rounded-full bg-action text-on-action shadow-md">
            <Check className="size-8" strokeWidth={2.5} />
          </span>
          <p className="text-eyebrow tracking-widest text-ink uppercase">{inReview ? "In review" : live ? "Live" : "Not sent yet"}</p>
          <Heading level="display-xl" as="h1" className="max-sm:text-display-md">{inReview ? "Profile submitted." : live ? "Your profile is live." : "Your profile isn't sent yet."}</Heading>
          <Text size="lg" className="max-w-xl text-pretty">
            {inReview
              ? <>Thanks, {first}. Our team has your profile. We&apos;ll email you if we have suggestions or when there&apos;s an update.</>
              : live ? <>Clients can find you now, {first}. Keep your availability current from Edit profile.</>
              : <>Finish your profile and submit it for review when it&apos;s ready, {first}.</>}
          </Text>
          <div className="grid w-full max-w-2xl grid-cols-1 items-center gap-1 border-y border-line-strong py-5 sm:grid-cols-2 sm:gap-0">
            <p className="text-heading-md break-words text-ink sm:border-r sm:border-line-strong sm:px-6">{name}</p>
            {title && <p className="text-heading-md break-words text-ink sm:px-6">{title}</p>}
          </div>
          <div className="flex w-full flex-col items-start gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-8">
            <ButtonLink href={live && person.slug ? `/p/${person.slug}/` : "/profile/"} variant="primary" size="lg" fullWidth className="min-w-64 sm:w-auto">View my profile</ButtonLink>
            <TextLink href="/profile/canvas/">{inReview || live ? "Edit profile" : "Continue your profile"}</TextLink>
          </div>
          <Text size="sm" muted>{live ? "Changes other than availability go back to the team for review." : "Your profile stays private during review."}</Text>
        </div>
      </Stage>
    </Page>
  );
}
