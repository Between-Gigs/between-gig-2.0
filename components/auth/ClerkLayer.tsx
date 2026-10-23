"use client";
import { ClerkProvider, useClerk, useUser } from "@clerk/react";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { demoActive } from "@/lib/demo-flow";
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
  const router = useRouter();
  const pathname = usePathname();
  const clerk = useClerk();
  const { isLoaded, isSignedIn, user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? null;
  const role = user?.publicMetadata?.role === "owner" ? "owner" : "gigster";
  const identity = !isLoaded ? undefined : isSignedIn && email ? `${user?.id}:${email.toLowerCase()}:${role}` : null;
  const [syncedIdentity, setSyncedIdentity] = React.useState<string | null | undefined>(undefined);
  const [needsConsent, setNeedsConsent] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const sync = async () => {
      const current = await data.auth.session();
      if (cancelled) return;
      if (!isLoaded) return;
      if (!isSignedIn || !email) {
        if (current?.via === "clerk") await data.auth.signOut();
        if (!cancelled) { setNeedsConsent(null); setSyncedIdentity(null); }
        return;
      }
      if (current?.via === "clerk" && current.email === email.toLowerCase() && current.role === role) {
        setNeedsConsent(null);
        setSyncedIdentity(identity);
        return;
      }
      const meta = (user?.unsafeMetadata ?? {}) as { inviteToken?: string; name?: string; acceptedTerms?: boolean };
      const result = await data.auth.syncExternal({ email, name: meta.name || user?.fullName || undefined,
        role: role === "owner" ? "owner" : undefined, inviteToken: meta.inviteToken, acceptedTerms: meta.acceptedTerms });
      if (cancelled) return;
      if (!result.ok && result.error === "terms") {
        setNeedsConsent(identity ?? null);
        if (!pathname.startsWith("/join") && !pathname.startsWith("/demo")) router.replace("/join/");
        return;
      }
      if (!result.ok) await clerk.signOut({ redirectUrl: demoActive() ? `${basePath}/demo/?clerk=${encodeURIComponent(email)}` : `${basePath}/login/` });
      else { setNeedsConsent(null); setSyncedIdentity(identity); }
    };
    void sync();
    const unsubscribe = data.auth.onChange(() => { setSyncedIdentity(undefined); void sync(); });
    return () => { cancelled = true; unsubscribe(); };
  }, [isLoaded, isSignedIn, email, user, clerk, identity, role, pathname, router]);

  const prepareDemo = React.useCallback(async () => {
    if (!isLoaded) throw new Error("Sign-in is still loading. Try again when it finishes.");
    if (clerk.user) await clerk.signOut(() => undefined);
    if (clerk.user !== null) throw new Error("Sign-in has not confirmed sign-out yet. Try again.");
    await data.auth.signOut();
  }, [clerk, isLoaded]);

  const value = React.useMemo<AuthActions>(() => ({
    provider: "clerk",
    loading: !isLoaded || syncedIdentity !== identity || (isSignedIn === true && needsConsent === identity),
    sdkLoaded: !!isLoaded,
    prepareDemo,
    onboarding: needsConsent === identity && isSignedIn && email ? {
      email,
      name: user?.fullName || "",
      finish: async ({ name, acceptTerms }) => {
        if (!acceptTerms || !name.trim()) throw new Error("Enter your name and agree to the terms to continue.");
        const meta = (user?.unsafeMetadata ?? {}) as { inviteToken?: string };
        const result = await data.auth.syncExternal({ email, name, acceptedTerms: true, inviteToken: meta.inviteToken, role: role === "owner" ? "owner" : undefined });
        if (!result.ok) throw new Error("Your setup could not be completed. Try again.");
        setNeedsConsent(null);
        setSyncedIdentity(identity);
      },
    } : null,
    signOut: async () => {
      await data.auth.signOut();
      if (isLoaded) await clerk.signOut({ redirectUrl: `${basePath}/login/?signedOut=1` });
      else router.replace("/login/?signedOut=1");
    },
  }), [clerk, isLoaded, syncedIdentity, identity, prepareDemo, needsConsent, isSignedIn, email, user, role, router]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
