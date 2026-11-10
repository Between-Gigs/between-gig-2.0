"use client";
import { Banner, Button, Skeleton } from "@ds/components";
import { ArrowRight, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { useAuthActions } from "@/lib/auth/context";
import { data, type Session } from "@/lib/data";

/**
 * Who is signed in when an auth page opens, for /login/ and /join/. Unlike useSession it doesn't wait for the identity
 * SDK (a blocked Clerk must not hide the form). undefined while reading. Once someone logs out here it stays null, so a
 * sign-up or log-in that then happens on this page keeps its own flow (and its own redirect) instead of this screen.
 */
export function useSignedInGate() {
  const [gate, setGate] = React.useState<Session | null | undefined>(undefined);
  React.useEffect(() => {
    let active = true;
    const read = () => data.auth.session().catch(() => null).then((s) => {
      if (active) setGate((g) => (g === undefined ? s : g === null ? null : s));
    });
    void read();
    const off = data.auth.onChange(() => void read());
    return () => { active = false; off(); };
  }, []);
  return gate;
}

export const displayName = (s: Session) => (s.name || s.email).replace(/\s*\(.*\)$/, "");
export const homeFor = (s: Session) => (s.role === "owner" ? "/owners/" : "/profile/");

/** Ends the session that is signed in here: Clerk's too when Clerk opened it, else only the app's own (sample) session. */
export function useLeave() {
  const auth = useAuthActions();
  const router = useRouter();
  return React.useCallback(async (session: Session, then?: string) => {
    if (session.via === "clerk") await auth.signOut();
    else await data.auth.signOut();
    if (then) router.push(then);
  }, [auth, router]);
}

/** The form column while the gate reads the session. */
export function GateSkeleton() {
  return <div className="grid gap-4" aria-busy="true" aria-label="Checking who's signed in"><Skeleton className="h-8 w-2/3" /><Skeleton /><Skeleton shape="block" className="h-24" /></div>;
}

/**
 * Shown instead of the Log in / Sign up form to someone already signed in: who they are, the way to their page and a
 * real Log out (after which the form shows). `inviteFor` names another person's invite: then logging out is the action.
 */
export function SignedInPanel({ session, title, inviteFor }: { session: Session; title?: string; inviteFor?: string }) {
  const leave = useLeave();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState(false);
  const name = displayName(session);
  const owner = session.role === "owner";
  const logOut = async () => {
    setBusy(true);
    setError(false);
    try { await leave(session); } catch { setError(true); }
    setBusy(false);
  };
  const go = <ButtonLink href={homeFor(session)} variant={inviteFor ? "secondary" : "primary"} size="lg"
    className={inviteFor ? undefined : "swiss:h-14 swiss:justify-between swiss:px-6 swiss:font-display swiss:text-heading-sm"}
    fullWidth={!inviteFor} iconEnd={<ArrowRight />}>{owner ? "Go to the dashboard" : "Go to my profile"}</ButtonLink>;
  const out = <Button variant={inviteFor ? "primary" : "secondary"} size="lg" loading={busy} iconStart={inviteFor ? undefined : <LogOut />} iconEnd={inviteFor ? <LogOut /> : undefined} onClick={() => void logOut()}
    fullWidth={!!inviteFor} className={inviteFor ? "swiss:h-14 swiss:justify-between swiss:px-6 swiss:font-display swiss:text-heading-sm" : undefined}>
    {inviteFor ? "Log out to use this invite" : "Log out"}
  </Button>;

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-display text-heading-lg text-balance text-ink">{inviteFor ? <>This invite is for <span className="break-all">{inviteFor}</span></> : title ?? "You're already signed in"}</h1>
        <p className="mt-2 text-body-md text-ink-muted">
          You&apos;re signed in as <b className="text-ink">{name}</b>{session.name && session.email ? <> ({session.email})</> : null}.
          {inviteFor ? " Log out to create that account with this invite." : ""}
        </p>
      </div>
      {error && <Banner tone="danger" title="We couldn't log you out">Try again.</Banner>}
      <div className="grid gap-3">
        {inviteFor ? <>{out}<div>{go}</div></> : <>{go}<div>{out}</div></>}
      </div>
      <p className="border-t border-line pt-5 text-body-md text-ink">
        Need a separate account? <CreateAccountLink session={session} />. We&apos;ll log you out first.
      </p>
    </div>
  );
}

/** "Create an account" for someone signed in: logs out, then opens the sign-up form. */
export function CreateAccountLink({ session, className = "inline-flex min-h-6 items-center font-bold text-ink underline underline-offset-4" }: { session: Session; className?: string }) {
  const leave = useLeave();
  return <Link href="/join/" className={className} onClick={(e) => { e.preventDefault(); void leave(session, "/join/"); }}>Create an account</Link>;
}
