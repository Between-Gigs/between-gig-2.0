"use client";
import { Skeleton } from "@ds/components";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
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
    const own = !!session?.personId && session.personId === state.person?.id;
    return (
      <Page>
        <MissingPage eyebrow={state.person ? "Profile · Not public yet" : "Profile · Not found"}
          title={state.person ? "This profile isn't public yet" : "We can't find that profile"}
          line={state.person
            ? own ? "Your profile goes public once the Between Gigs team approves it. You can see how it will look on your profile page." : "This Gigster is still getting their profile ready. Check back soon."
            : "The link may be mistyped, or the profile may have moved."}
          actions={own
            ? <ButtonLink href="/profile/" variant="primary" size="lg" iconEnd={<ArrowRight />}>Go to my profile</ButtonLink>
            : <>
              <ButtonLink href="/p/" variant="primary" size="lg" iconEnd={<ArrowRight />}>Browse Gigsters</ButtonLink>
              <OwnPageLink />
            </>} />
      </Page>
    );
  }

  return (
    <Page>
      <ProfileView person={state.person} fields={state.profile.fields} extras={state.profile.extras} mode="public" similar={similar} />
    </Page>
  );
}

/**
 * A missing or not-yet-public page in the Swiss look (also the site's 404, via NotFoundView): a 4px rule, a short
 * eyebrow, the huge flush-left heading, one plain line, then the ways on, with the way home as a text link.
 */
export function MissingPage({ eyebrow, title, line, actions, home = true }: { eyebrow: string; title: string; line: string; actions: React.ReactNode; home?: boolean }) {
  return (
    <section aria-labelledby="missing-h" className="grid gap-x-6 sm:pt-4 lg:grid-cols-12">
      <div className="border-t-4 border-line-strong pt-4 lg:col-span-12">
        <p className="text-eyebrow text-ink uppercase">{eyebrow}</p>
        <h1 id="missing-h" className="mt-6 max-w-5xl font-display text-display-sm text-balance text-ink sm:text-display-md lg:mt-8 lg:text-display-lg xl:text-display-xl">{title}</h1>
        <p className="mt-6 max-w-2xl font-display text-heading-md font-medium leading-snug text-ink">{line}</p>
        <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-line pt-6">{actions}</div>
        {home && <p className="mt-6 text-body-md text-ink-muted">
          <Link href="/" className="inline-flex min-h-11 items-center gap-2 font-bold text-ink underline underline-offset-4"><ArrowLeft aria-hidden="true" className="size-4" />Back to Between Gigs</Link>
        </p>}
      </div>
    </section>
  );
}

/** For someone looking for their own page: Log in, or straight to it when they're already signed in. */
export function OwnPageLink() {
  const { session } = useSession();
  if (session?.role === "owner") return <ButtonLink href="/owners/" size="lg" iconEnd={<ArrowRight />}>Go to the dashboard</ButtonLink>;
  if (session) return <ButtonLink href="/profile/" size="lg" iconEnd={<ArrowRight />}>Go to my profile</ButtonLink>;
  return <ButtonLink href="/login/" size="lg" iconEnd={<ArrowRight />}>Log in</ButtonLink>;
}
