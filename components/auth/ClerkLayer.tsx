"use client";
import { ClerkProvider, useClerk, useUser } from "@clerk/react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { AuthContext, type AuthActions } from "@/lib/auth/context";
import { clerkAppearance, clerkPublishableKey } from "@/lib/auth/clerk";
import { data } from "@/lib/data";
import { basePath } from "@/lib/site";

/** Clerk (@clerk/react: the Next.js SDK needs a server, this is a static export) around the app, themed with our tokens, plus the bridge from a Clerk user to a Between Gigs session. */
export function ClerkLayer({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  // Clerk hands us full paths (with the Pages base path); Next's router adds the base path itself.
  const strip = (to: string) => (basePath && to.startsWith(basePath) ? to.slice(basePath.length) || "/" : to);
  return (
    <ClerkProvider publishableKey={clerkPublishableKey} appearance={clerkAppearance}
      routerPush={(to) => router.push(strip(to))} routerReplace={(to) => router.replace(strip(to))}
      signInUrl={`${basePath}/login/`} signUpUrl={`${basePath}/join/`} afterSignOutUrl={`${basePath}/login/?signedOut=1`}>
      <Bridge>{children}</Bridge>
    </ClerkProvider>
  );
}

function Bridge({ children }: { children: React.ReactNode }) {
  const clerk = useClerk();
  const { isLoaded, isSignedIn, user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? null;
  const role = user?.publicMetadata?.role === "owner" ? "owner" : "gigster";
  const identity = !isLoaded ? undefined : isSignedIn && email ? `${user?.id}:${email.toLowerCase()}:${role}` : null;
  const [syncedIdentity, setSyncedIdentity] = React.useState<string | null | undefined>(undefined);

  React.useEffect(() => {
    if (!isLoaded) return;
    let cancelled = false;
    void (async () => {
      const current = await data.auth.session();
      if (cancelled) return;
      if (!isSignedIn || !email) {
        // Signed out of Clerk (here or in another tab): close the session Clerk opened. Demo sessions stay.
        if (current?.via === "clerk") await data.auth.signOut();
        if (!cancelled) setSyncedIdentity(null);
        return;
      }
      if (current?.via === "clerk" && current.email === email.toLowerCase() && current.role === role) {
        setSyncedIdentity(identity);
        return;
      }
      const meta = (user?.unsafeMetadata ?? {}) as { inviteToken?: string; name?: string; acceptedTerms?: boolean };
      const r = await data.auth.syncExternal({
        email,
        name: meta.name || user?.fullName || undefined,
        role: user?.publicMetadata?.role === "owner" ? "owner" : undefined,
        inviteToken: meta.inviteToken,
        acceptedTerms: meta.acceptedTerms,
      });
      if (cancelled) return;
      // Keep a failure recoverable; open signup does not depend on call-sheet membership.
      if (!r.ok) await clerk.signOut({ redirectUrl: `${basePath}/login/` });
      else setSyncedIdentity(identity);
    })();
    return () => { cancelled = true; };
  }, [isLoaded, isSignedIn, email, user, clerk, identity, role]);

  const value = React.useMemo<AuthActions>(() => ({
    provider: "clerk",
    loading: !isLoaded || syncedIdentity !== identity,
    signOut: async () => { await data.auth.signOut(); await clerk.signOut({ redirectUrl: `${basePath}/login/?signedOut=1` }); },
  }), [clerk, isLoaded, syncedIdentity, identity]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
