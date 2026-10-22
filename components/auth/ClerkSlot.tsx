"use client";
import { Banner, Skeleton } from "@ds/components";
import { useClerk } from "@clerk/react";
import * as React from "react";

const GIVE_UP_MS = 10_000;

/**
 * Holds a Clerk form's place while Clerk's script loads, and says so plainly if it can't load. A blocked
 * script throws instead of setting Clerk's "error" status, so we also give up after a timeout.
 */
export function ClerkSlot({ label, children }: { label: string; children: React.ReactNode }) {
  const clerk = useClerk();
  const [timedOut, setTimedOut] = React.useState(false);
  const loaded = clerk.loaded;
  React.useEffect(() => {
    if (loaded) return;
    const t = window.setTimeout(() => setTimedOut(true), GIVE_UP_MS);
    return () => window.clearTimeout(t);
  }, [loaded]);

  if (loaded) return <>{children}</>;
  if (timedOut || clerk.status === "error") {
    return (
      <Banner tone="danger" title="Sign-in couldn't load">
        Check your connection (or a content blocker) and reload the page. Still stuck? Write to <a className="text-link underline underline-offset-2" href="mailto:hello@between-gigs.com">hello@between-gigs.com</a>.
      </Banner>
    );
  }
  return (
    <div className="grid gap-4" aria-busy="true" aria-label={label}>
      <Skeleton className="h-8 w-1/2" /><Skeleton /><Skeleton shape="block" className="h-12" /><Skeleton shape="block" className="h-12" />
    </div>
  );
}
