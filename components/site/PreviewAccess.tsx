"use client";
import { EmptyState } from "@ds/components";
import { Compass, LockKeyhole, Telescope } from "lucide-react";
import * as React from "react";
import { data } from "@/lib/data";
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
    if (!session) { setState("signed-out"); return; } // eslint-disable-line react-hooks/set-state-in-effect
    if (session.role !== "owner") { setState("refused"); return; }
    const target = previewTarget(new URLSearchParams(window.location.search).get("next"));
    let cancelled = false;
    // Clerk keeps its __session cookie fresh while this page is open; the server reads it (lib/server/preview.ts).
    void fetch("/api/preview/grant/", { method: "POST", headers: { "content-type": "application/json" }, body: "{}", credentials: "same-origin" })
      .then((res) => {
        if (cancelled) return;
        if (res.status === 204) window.location.assign(target);
        else setState(res.status === 401 ? "signed-out" : res.status === 404 ? "refused" : "unavailable");
      })
      .catch(() => { if (!cancelled) setState("unavailable"); });
    return () => { cancelled = true; };
  }, [session, loading]);

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
          <h1 className="sr-only">Sign in</h1>
          <EmptyState className="mx-auto max-w-xl py-20" icon={<LockKeyhole />} title="Sign in to continue" headingLevel={2}
            action={<ButtonLink href={`/login/?next=${encodeURIComponent(`/preview-access/${typeof window === "undefined" ? "" : window.location.search}`)}`}>Sign in</ButtonLink>}>
            Sign in with your Between Gigs account.
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
