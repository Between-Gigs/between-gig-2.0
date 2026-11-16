"use client";
import { SignUp, useUser } from "@clerk/react";
import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session";
import { GateSkeleton, SignedInPanel, homeFor } from "./SignedIn";
import { basePath } from "@/lib/site";
import { AuthShell } from "./AuthShell";
import { ClerkSlot } from "./ClerkSlot";

/** Identity first; the bridge still requires explicit app consent before registering a new profile. */
export function NativeSignup({ inviteToken, email }: { inviteToken?: string; email?: string }) {
  const { isLoaded, isSignedIn } = useUser();
  const { session, loading } = useSession();
  const router = useRouter();
  React.useEffect(() => {
    if (!loading && session?.via === "clerk") router.replace(homeFor(session));
  }, [loading, session, router]);
  if (!loading && session && session.via !== "clerk") return <AuthShell header="Sign up"><SignedInPanel session={session} /></AuthShell>;
  if (isLoaded && isSignedIn) return <AuthShell header="Sign up"><GateSkeleton /></AuthShell>;
  return (
    <AuthShell header="Sign up">
      <div className="grid gap-6">
        <h1 className="sr-only">Create your account</h1>
        <ClerkSlot label="Loading sign-up">
          <SignUp routing="hash" signInUrl={`${basePath}/login/`} initialValues={email ? { emailAddress: email } : undefined}
            unsafeMetadata={inviteToken ? { inviteToken } : undefined}
            fallbackRedirectUrl={`${basePath}/join/`} />
        </ClerkSlot>
      </div>
    </AuthShell>
  );
}
