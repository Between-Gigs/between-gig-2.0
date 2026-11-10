"use client";
import { ArrowRight } from "lucide-react";
import dynamic from "next/dynamic";
import * as React from "react";
import { basePath } from "@/lib/site";
import { MissingPage, OwnPageLink, PublicProfile } from "@/components/profile/PublicProfile";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Page } from "./Page";

// Loaded only when a Pages visitor opens an owner's person page this export didn't prerender: every page loads this
// not-found boundary, and owner code has no place in a public page's download (scripts/check-split.mjs).
const OwnerPerson = dynamic(() => import("@/components/owners/OwnerPerson").then((m) => m.OwnerPerson));

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
        <MissingPage eyebrow="404 · Page not found" title="This page isn't on the call sheet" home={false}
          line="The link may be mistyped, or the page may have moved."
          actions={<>
            <ButtonLink href="/" variant="primary" size="lg" iconEnd={<ArrowRight />}>Back to Between Gigs</ButtonLink>
            <ButtonLink href="/p/" size="lg" iconEnd={<ArrowRight />}>Browse Gigsters</ButtonLink>
            <OwnPageLink />
          </>} />
      )}
    </Page>
  );
}
