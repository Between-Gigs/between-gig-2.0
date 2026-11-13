"use client";
import { Banner, Button, Checkbox, Field, Input } from "@ds/components";
import { SignUp } from "@clerk/react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { clerkEnabled } from "@/lib/auth/clerk";
import { useAuthActions } from "@/lib/auth/context";
import { useSession } from "@/lib/session";
import { basePath } from "@/lib/site";
import { AuthShell } from "./AuthShell";
import { ClerkSlot } from "./ClerkSlot";
import { GoogleSignup } from "./GoogleSignup";
import { authSubtitle, authTitle, useAuthV2 } from "./authDesign";
import { SignedInPanel, useSignedInGate } from "./SignedIn";

/**
 * /join live: open sign-up for Gigsters. With the invitation email's link (Clerk's ticket, `__clerk_ticket`) the address is
 * already proven; without one Clerk's public sign-up proves it. Either way: name and terms, Clerk's sign-up, then Company OS
 * registers the account (the app's bridge calls /api/auth/signup; a login that arrives without a name finishes here).
 */
export function InviteJoin() {
  const ticket = useSearchParams().get("__clerk_ticket") ?? "";
  const [resume, setResume] = React.useState(false);
  // Clerk owns its hash routes (a verification step after a reload): mount its sign-up so it can carry on.
  React.useEffect(() => { setResume(clerkEnabled && window.location.hash.startsWith("#/")); }, []); // eslint-disable-line react-hooks/set-state-in-effect
  // Signed in with Clerk but not registered yet (Google from the login page, say): finish with the name and terms.
  const { onboarding } = useAuthActions();
  // Already signed in: who they are and Log out, instead of a sign-up they don't need.
  const gate = useSignedInGate();
  if (onboarding) return <Details key={onboarding.email} ticket={!!ticket} finish={onboarding} />;
  if (resume) return <TicketSignUp />;
  if (gate) return <AuthShell header="Sign up" steps={false}><SignedInPanel session={gate} /></AuthShell>;
  if (!clerkEnabled) return <Unavailable />;
  return <Details ticket={!!ticket} />;
}

const finishError: Record<string, string> = {
  email_not_verified: "Verify your email address first, then try again.",
  email_linked_to_other_login: "That email already belongs to another login. Contact us and we'll sort it out.",
  signup_disabled: "Sign-up is closed right now. Please try again later.",
  consent_required: "The terms changed while you were signing up. Reload the page and try again.",
};

function Details({ ticket, finish }: { ticket: boolean; finish?: NonNullable<ReturnType<typeof useAuthActions>["onboarding"]> }) {
  const router = useRouter();
  const { signOut } = useAuthActions();
  const [name, setName] = React.useState(finish?.name ?? "");
  const [busy, setBusy] = React.useState(false);
  const [failed, setFailed] = React.useState("");
  const [terms, setTerms] = React.useState(false);
  const [errors, setErrors] = React.useState<{ name?: string; terms?: string }>({});
  const [next, setNext] = React.useState(false);
  const v2 = useAuthV2();
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found: typeof errors = {};
    if (!name.trim()) found.name = "Enter your full name, as you'd like clients to see it.";
    if (!terms) found.terms = "Agree to the Terms and Privacy Policy to continue.";
    setErrors(found);
    if (Object.keys(found).length) return;
    if (!finish) { setNext(true); return; }
    setBusy(true);
    setFailed("");
    try {
      await finish.finish({ name: name.trim(), acceptTerms: true });
      router.replace("/profile/canvas/");
    } catch (err) {
      setFailed(finishError[(err as { code?: string }).code ?? ""] ?? "Your setup could not be completed. Try again.");
      setBusy(false);
    }
  };
  if (next) return <TicketSignUp name={name.trim()} />;
  return (
    <AuthShell header="Sign up"
      lead={v2 ? undefined : <p>Create your account, then build a profile that feels like you. It takes about 10 minutes, and it saves as you go.</p>}>
      <h1 className={authTitle(v2, true)}>Create your account</h1>
      <p className={authSubtitle(v2, true)}>{ticket ? "Your invitation confirms your email. Tell us your name to get started." : finish ? `You're signed in as ${finish.email}. Tell us your name to finish.` : "Tell us your name, then we'll confirm your email."}</p>
      {/* Open sign-up offers Google first, as on the sample /join (GoogleSignup returns here: Clerk finishes the
          sign-in, then this page asks for the name and the terms). Invitations keep Clerk's own options. */}
      {!ticket && !finish && <GoogleSignup />}
      <form noValidate onSubmit={(e) => void submit(e)} className={!ticket && !finish ? "mt-5 grid gap-5" : "mt-8 grid gap-5"}>
        <Field label="Full name" error={errors.name}>
          <Input value={name} autoComplete="name" autoFocus placeholder={v2 ? "Maya Chen" : undefined} onChange={(e) => { setName(e.target.value); setErrors((x) => ({ ...x, name: undefined })); }} />
        </Field>
        <div className="grid gap-1.5">
          <Checkbox checked={terms} aria-invalid={!!errors.terms || undefined} aria-describedby={errors.terms ? "terms-error" : undefined}
            onChange={(e) => { setTerms(e.target.checked); setErrors((x) => ({ ...x, terms: undefined })); }}
            label={<>I agree to the <a className="text-link underline underline-offset-2" href="https://between-gigs.com/terms" target="_blank" rel="noreferrer">{v2 ? "Terms" : "Terms of Use"}</a> and <a className="text-link underline underline-offset-2" href="https://between-gigs.com/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>{v2 ? "" : "."}</>}
            description={v2 ? undefined : "You can ask us to delete your account at any time."} />
          {errors.terms && <p id="terms-error" className="pl-7.5 text-body-sm text-danger">{errors.terms}</p>}
        </div>
        {failed && <Banner tone="danger" title="We couldn't finish">{failed}</Banner>}
        {failed && finish && (
          <Button type="button" variant="secondary" size="lg" fullWidth onClick={() => void signOut()}>Log out and use another account</Button>
        )}
        <Button type="submit" variant="primary" size="lg" fullWidth loading={busy} className="glow-hover swiss:h-14 swiss:justify-between swiss:px-6 swiss:font-display swiss:text-heading-sm" iconEnd={<ArrowRight />}>Continue</Button>
        <p className={v2 ? "text-center text-body-md text-ink" : "text-body-md text-ink"}>Already joined? <Link href="/login/" className="inline-flex min-h-6 items-center font-bold text-ink underline underline-offset-4">Log in</Link></p>
      </form>
    </AuthShell>
  );
}

/** Clerk's sign-up, which reads the invitation ticket from the address bar. The name and consent ride along. */
function TicketSignUp({ name }: { name?: string }) {
  const router = useRouter();
  const { session, loading } = useSession();
  React.useEffect(() => { if (!loading && session) router.replace("/profile/canvas/"); }, [session, loading, router]);
  const [firstName, ...rest] = (name ?? "").split(" ");
  const v2 = useAuthV2();
  return (
    <AuthShell header="Sign up">
      <div className="grid gap-6">
        <h1 className={authTitle(v2)}>Finish your account</h1>
        <ClerkSlot label="Loading sign-up">
          <SignUp routing="hash" signInUrl={`${basePath}/login/`}
            initialValues={name ? { firstName, lastName: rest.join(" ") || undefined } : undefined}
            unsafeMetadata={name ? { name, acceptedTerms: true } : undefined}
            fallbackRedirectUrl={`${basePath}/profile/canvas/`} />
        </ClerkSlot>
      </div>
    </AuthShell>
  );
}

function Unavailable() {
  const v2 = useAuthV2();
  return (
    <AuthShell header="Sign up" steps={false}>
      <div className="grid gap-4">
        <h1 className={authTitle(v2)}>Sign-up isn&apos;t available</h1>
        <p className="text-body-md text-pretty text-ink-muted">Sign-in couldn&apos;t load. Reload the page, or <Link href="/login/" className="text-link underline underline-offset-2">log in</Link> if you already joined.</p>
      </div>
    </AuthShell>
  );
}
