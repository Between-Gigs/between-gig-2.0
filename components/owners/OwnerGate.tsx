"use client";
import { Button, EmptyState } from "@ds/components";
import { LockKeyhole, Users } from "lucide-react";
import * as React from "react";
import { data, type Session } from "@/lib/data";
import { useSession } from "@/lib/session";
import { Page } from "@/components/site/Page";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { HeaderSkeleton } from "./kit";
import { OwnerShell } from "./OwnerShell";

/**
 * Owner pages render only for an owner session. In the sample, a visitor can switch to the sample owner
 * here; production sends owners through sign-in and checks the role server-side.
 */
export function OwnerGate({ children }: { children: (session: Session) => React.ReactNode }) {
  const { session, loading } = useSession();
  if (loading) return <OwnerShell><div aria-busy="true" aria-label="Loading"><HeaderSkeleton /></div></OwnerShell>;
  if (session?.role === "owner") return <>{children(session)}</>;
  return (
    <Page>
      <h1 className="sr-only">Owners only</h1>
      <EmptyState className="mx-auto max-w-xl py-20" icon={<LockKeyhole />} title="For the Between Gigs team" headingLevel={2}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            {data.demo && <Button variant="primary" iconStart={<Users />} onClick={() => void data.demo?.signInAs("owner")}>Continue as owner (sample)</Button>}
            <ButtonLink href="/login/?next=/owners/">Sign in</ButtonLink>
          </div>
        }>
        {session ? "You're signed in as a Gigster. People search is for the Between Gigs owners." : "Sign in with an owner account to search everyone who has joined."}
      </EmptyState>
    </Page>
  );
}
