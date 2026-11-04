"use client";
import { EmptyState } from "@ds/components";
import { Compass, LockKeyhole, Telescope } from "lucide-react";
import * as React from "react";
import { data } from "@/lib/data";
import { apiSource } from "@/lib/data/api";
import { requestPreview } from "@/lib/preview-access";
import { useSession } from "@/lib/session";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Page } from "./Page";

/** Where the preview should open: a path under /preview/ only, else the guide. */
export function previewTarget(raw: string | null): string {
  if (!raw || !raw.startsWith("/preview/") || raw.includes("//") || raw.includes("\\") || /[\u0000-\u001f]/.test(raw)) return "/preview/preview/";
  return raw;
}

type State = "checking" | "signed-out" | "refused" | "unavailable";

/**
 * /preview-access/: the door to /preview/ on the live sites. A super admin (the owner role) gets the preview cookie
 * from the server (POST /api/preview/grant/, checked with Company OS) and goes on to the page they asked for; anyone
 * else sees "not found". On the sample build (GitHub Pages) the preview is open, so this only links to it.
 */
export function PreviewAccess() {
  const { session, loading } = useSession();
  const [state, setState] = React.useState<State>("checking");

  React.useEffect(() => {
    if (data.kind !== "live" || loading) return;
    // Signed in: the server decides (Company OS super admin), not this page's idea of the role.
    if (!session) { setState("signed-out"); return; } // eslint-disable-line react-hooks/set-state-in-effect
    const target = previewTarget(new URLSearchParams(window.location.search).get("next"));
    let cancelled = false;
    // The session token goes in the request, as on every other API call (lib/preview-access.ts).
    void requestPreview(() => apiSource.token()).then((result) => {
      if (cancelled) return;
      if (result === "granted") window.location.assign(target);
      else setState(result);
    });
    return () => { cancelled = true; };
    // Signed in or not, not the session object: a refresh makes a new one, and each would send another grant.
  }, [!!session, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  if (data.kind === "sample") {
    return (
      <Page>
        <h1 className="sr-only">Preview</h1>
        <EmptyState className="mx-auto max-w-xl py-20" icon={<Telescope />} title="The preview is open here" headingLevel={2}
          action={<ButtonLink href="/preview/">Open the preview guide</ButtonLink>}>
          This build runs on the sample data, so the preview needs no sign-in.
        </EmptyState>
      </Page>
    );
  }

  return (
    <Page>
      {state === "checking" && <div className="mx-auto max-w-xl py-20 text-center text-ink-subtle" aria-busy="true">Opening the preview…</div>}
      {state === "signed-out" && (
        <>
          <h1 className="sr-only">Log in</h1>
          <EmptyState className="mx-auto max-w-xl py-20" icon={<LockKeyhole />} title="Log in to continue" headingLevel={2}
            action={<ButtonLink href={`/login/?next=${encodeURIComponent(`/preview-access/${typeof window === "undefined" ? "" : window.location.search}`)}`}>Sign in</ButtonLink>}>
            Log in with your Between Gigs account.
          </EmptyState>
        </>
      )}
      {(state === "refused" || state === "unavailable") && (
        <>
          <h1 className="sr-only">Page not found</h1>
          <EmptyState className="mx-auto max-w-xl py-20" icon={<Compass />} title={state === "refused" ? "This page isn't on the call sheet" : "Something went wrong"} headingLevel={2}
            action={<ButtonLink href="/">Back to Between Gigs</ButtonLink>}>
            {state === "refused" ? "The link may be mistyped, or the page may have moved." : "Try again in a moment."}
          </EmptyState>
        </>
      )}
    </Page>
  );
}
