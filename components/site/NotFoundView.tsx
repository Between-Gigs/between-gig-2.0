"use client";
import { EmptyState } from "@ds/components";
import { ArrowLeft, Compass } from "lucide-react";
import * as React from "react";
import { basePath } from "@/lib/site";
import { OwnerPerson } from "@/components/owners/OwnerPerson";
import { PublicProfile } from "@/components/profile/PublicProfile";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Page } from "./Page";

type Resolved = { kind: "profile"; slug: string } | { kind: "owner-person"; id: string } | { kind: "missing" } | null;

/**
 * 404 for the static export. Dynamic pages whose ids didn't exist at build time (a Gigster who joined in
 * the demo) land here on GitHub Pages; we read the URL and render the right view.
 */
export function NotFoundView() {
  const [resolved, setResolved] = React.useState<Resolved>(null);
  React.useEffect(() => {
    const path = window.location.pathname.slice(basePath.length);
    const profile = path.match(/^\/p\/([^/]+)\/?$/);
    const person = path.match(/^\/owners\/people\/([^/]+)\/?$/);
    setResolved(profile ? { kind: "profile", slug: decodeURIComponent(profile[1]) } : person ? { kind: "owner-person", id: decodeURIComponent(person[1]) } : { kind: "missing" }); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  if (resolved?.kind === "profile") return <PublicProfile slug={resolved.slug} />;
  if (resolved?.kind === "owner-person") return <OwnerPerson id={resolved.id} />;
  return (
    <Page>
      {resolved && (
        <>
          <h1 className="sr-only">Page not found</h1>
          <EmptyState className="mx-auto max-w-xl py-20" icon={<Compass />} title="This page isn't on the call sheet" headingLevel={2}
            action={<ButtonLink href="/" iconStart={<ArrowLeft />}>Back to Between Gigs</ButtonLink>}>
            The link may be mistyped, or the page may have moved.
          </EmptyState>
        </>
      )}
    </Page>
  );
}
