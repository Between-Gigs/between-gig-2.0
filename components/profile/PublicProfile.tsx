"use client";
import { EmptyState, Skeleton } from "@ds/components";
import { ArrowLeft, ArrowRight, Clock, SearchX } from "lucide-react";
import * as React from "react";
import { data, type Person, type Profile } from "@/lib/data";
import { useSettleWhen } from "@/lib/motion";
import { useSession } from "@/lib/session";
import { Page } from "@/components/site/Page";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ProfileView } from "./ProfileView";

/** /p/[slug]: what clients see. Only approved profiles are public; anyone else gets a friendly "not yet". */
export function PublicProfile({ slug }: { slug: string }) {
  const { session } = useSession();
  const [state, setState] = React.useState<{ person: Person | null; profile: Profile | null } | null>(null);
  const [similar, setSimilar] = React.useState<{ person: Person; profile: Profile }[]>([]);

  React.useEffect(() => {
    let live = true;
    void data.people.getPublic(slug).then(async (r) => {
      if (!live) return;
      setState(r);
      if (r.person && r.profile) setSimilar(await data.people.similar(r.person.id));
    });
    return () => { live = false; };
  }, [slug]);
  useSettleWhen(!!state);

  React.useEffect(() => {
    if (state?.profile) document.title = `${state.profile.fields.name} · Between Gigs`;
  }, [state]);

  if (!state) {
    return <Page><div aria-busy="true" aria-label="Loading profile" className="grid gap-6 sm:grid-cols-12"><Skeleton shape="block" className="aspect-square sm:col-span-4" /><div className="grid content-end gap-3 sm:col-span-6"><Skeleton className="h-4 w-32" /><Skeleton className="h-12 w-2/3" /><Skeleton /></div></div></Page>;
  }

  if (!state.person || !state.profile) {
    const own = session?.personId && session.personId === state.person?.id;
    return (
      <Page>
        <h1 className="sr-only">{state.person ? "This profile isn't public yet" : "Profile not found"}</h1>
        <EmptyState className="mx-auto max-w-xl py-20" headingLevel={2}
          icon={state.person ? <Clock /> : <SearchX />}
          title={state.person ? "This profile isn't public yet" : "We can't find that profile"}
          action={own
            ? <ButtonLink href="/profile/" variant="primary" iconEnd={<ArrowRight />}>Go to my profile</ButtonLink>
            : <ButtonLink href="/" iconStart={<ArrowLeft />}>Back to Between Gigs</ButtonLink>}>
          {state.person
            ? own ? "Your profile goes public once the Between Gigs team approves it. You can see how it will look on your profile page." : "This Gigster is still getting their profile ready. Check back soon."
            : "The link may be mistyped, or the profile may have moved."}
        </EmptyState>
      </Page>
    );
  }

  return (
    <Page>
      <ProfileView person={state.person} fields={state.profile.fields} extras={state.profile.extras} mode="public" similar={similar} />
    </Page>
  );
}
