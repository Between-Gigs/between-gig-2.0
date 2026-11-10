"use client";
import { Banner, Button, Checkbox, Field, Input, Skeleton, useToast } from "@ds/components";
import { SignUp } from "@clerk/react";
import { ArrowRight, Clock, Mail, SearchX, ShieldCheck, UserCheck } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { data, type InviteLookup, type Session } from "@/lib/data";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { useAuthActions } from "@/lib/auth/context";
import { clerkEnabled } from "@/lib/auth/clerk";
import { useSession } from "@/lib/session";
import { basePath } from "@/lib/site";
import { AuthShell } from "./AuthShell";
import { InviteJoin } from "./InviteJoin";
import { ClerkSlot } from "./ClerkSlot";
import { displayName, GateSkeleton, homeFor, SignedInPanel, useLeave, useSignedInGate } from "./SignedIn";

/** Open signup, with an optional invite to prefill the email and retain its attribution. Live, invite-only: InviteJoin. */
/** Longest full name: it heads the public page and becomes the profile link (live slugs are capped at 60). */
const NAME_MAX = 60;

export function JoinView() {
  return data.kind === "live" ? <InviteJoin /> : <SampleJoin />;
}

function SampleJoin() {
  const token = useSearchParams().get("invite") ?? "";
  const { onboarding } = useAuthActions();
  const [resumeClerk, setResumeClerk] = React.useState(false);
  React.useEffect(() => {
    // Clerk owns these hash routes (verification, OAuth callbacks, etc.). A full
    // redirect/reload loses the details form's React state, but must still mount
    // SignUp so the SDK can resume its own resource. No consent is inferred here.
    setResumeClerk(clerkEnabled && (window.location.hash.startsWith("#/") || /^#(?:sso-callback|verify-email-address|verify-phone-number)(?:[/?]|$)/.test(window.location.hash))); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);
  if (onboarding) return <JoinForm key={`onboarding-${onboarding.email}`} initialEmail={onboarding.email} initialName={onboarding.name} authenticated />;
  if (resumeClerk) return <ClerkAccount />;
  return <JoinForToken key={token} token={token} />;
}

function JoinForToken({ token }: { token: string }) {
  const [lookup, setLookup] = React.useState<InviteLookup | null>(null);
  // Someone already signed in sees who they are instead of the form (and, for someone else's invite, says so).
  const gate = useSignedInGate();

  React.useEffect(() => {
    if (!token) { setLookup({ state: "unknown" }); return; } // eslint-disable-line react-hooks/set-state-in-effect
    let active = true;
    setLookup(null);
    void data.invites.lookup(token).then((result) => { if (active) setLookup(result); });
    return () => { active = false; };
  }, [token]);

  if (gate === undefined) return <AuthShell header="Sign up" steps={false}><GateSkeleton /></AuthShell>;
  if (!token) return gate ? <AuthShell header="Sign up" steps={false}><SignedInPanel session={gate} /></AuthShell> : <JoinForm key="open" />;
  if (!lookup) {
    return (
      <AuthShell header="Sign up">
        <div className="grid gap-4" aria-busy="true" aria-label="Checking your invite"><Skeleton className="h-8 w-2/3" /><Skeleton /><Skeleton shape="block" className="h-40" /></div>
      </AuthShell>
    );
  }
  if (gate) {
    const inviteEmail = lookup.invite?.email ?? "";
    const theirs = !!inviteEmail && inviteEmail.toLowerCase() === gate.email.toLowerCase();
    if (lookup.state === "valid" || (lookup.state === "used" && theirs)) {
      return (
        <AuthShell header="Sign up" steps={false} eyebrow={theirs ? undefined : "You're invited"}>
          <SignedInPanel session={gate} title={lookup.state === "used" ? "You've already joined" : undefined} inviteFor={theirs ? undefined : inviteEmail || undefined} />
        </AuthShell>
      );
    }
    return <InviteProblem lookup={lookup} session={gate} />;
  }
  if (lookup.state === "valid" && lookup.invite) return <JoinForm key={token} token={token} initialEmail={lookup.invite.email} />;
  return <InviteProblem lookup={lookup} />;
}

function JoinForm({ token, initialEmail = "", initialName = "", authenticated = false }: { token?: string; initialEmail?: string; initialName?: string; authenticated?: boolean }) {
  const auth = useAuthActions();
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = React.useState(initialEmail);
  const matchingToken = email.trim().toLowerCase() === initialEmail.toLowerCase() ? token : undefined;
  const [name, setName] = React.useState(initialName);
  const [terms, setTerms] = React.useState(false);
  const [errors, setErrors] = React.useState<{ email?: string; name?: string; terms?: string; form?: string }>({});
  const [busy, setBusy] = React.useState(false);
  const [verify, setVerify] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = "Enter your email address, like name@example.com.";
    if (!name.trim()) next.name = "Enter your full name, as you'd like clients to see it.";
    else if (name.trim().length > NAME_MAX) next.name = `Keep your name to ${NAME_MAX} characters or fewer.`;
    if (!terms) next.terms = "Agree to the Terms of Use and Privacy Policy to continue.";
    setErrors(next);
    if (Object.keys(next).length) return;
    if (authenticated && auth.onboarding) {
      setBusy(true);
      try {
        await auth.onboarding.finish({ name, acceptTerms: terms });
        router.replace("/profile/canvas/");
      } catch { setBusy(false); setErrors({ form: "We couldn't finish your setup. Try again." }); }
      return;
    }
    if (clerkEnabled) { setVerify(true); return; } // Clerk confirms the email next; ClerkLayer then registers them.
    setBusy(true);
    const r = await data.auth.register({ token: matchingToken, email, name, acceptTerms: terms });
    if (!r.ok) {
      setBusy(false);
      setErrors({ form: r.error === "existing-account" || r.error === "used" ? "This email already has an account. Log in instead." : "Something went wrong. Try again, or contact us." });
      return;
    }
    toast({ message: "Account created", tone: "success" });
    router.push("/profile/canvas/");
  };

  if (verify) return <ClerkAccount token={matchingToken} email={email.trim().toLowerCase()} name={name.trim()} />;

  return (
    <AuthShell header="Sign up" eyebrow={token ? "You're invited" : undefined}
      lead={token ? <p className="flex items-center gap-2"><ShieldCheck aria-hidden="true" className="size-5 shrink-0 text-ink-brand" />Your page stays private until our team approves it.</p> : <p>Create your account, then build a profile that feels like you. It takes about 10 minutes, and it saves as you go.</p>}>
      <h1 className="font-display text-heading-lg text-balance text-ink">{authenticated ? "Finish your account setup" : "Create your account"}</h1>
      <p className="mt-2 text-body-md text-pretty text-ink-muted">{authenticated ? "You're logged in. Confirm your details and agree to the terms to create your profile." : token ? "Your invitation is here. Add your name to get started." : "No invite needed. Enter your details to get started."}</p>
      <form noValidate onSubmit={submit} className="mt-8 grid gap-5">
        {errors.form && <Banner tone="danger" title="We couldn't create your account">{errors.form}</Banner>}
        <Field label="Email" error={errors.email} hint={authenticated ? "You're logged in with this email." : token ? "From your invitation. You can change it." : "Use the email you want to log in with."}>
          <Input type="email" value={email} readOnly={authenticated} autoComplete="email" start={<Mail />} onChange={(e) => { setEmail(e.target.value); setErrors((x) => ({ ...x, email: undefined })); }} />
        </Field>
        <Field label="Full name" error={errors.name}>
          <Input value={name} autoComplete="name" autoFocus maxLength={NAME_MAX} onChange={(e) => { setName(e.target.value); setErrors((x) => ({ ...x, name: undefined })); }} />
        </Field>
        <div className="grid gap-1.5">
          <Checkbox checked={terms} aria-invalid={!!errors.terms || undefined} aria-describedby={errors.terms ? "terms-error" : undefined}
            onChange={(e) => { setTerms(e.target.checked); setErrors((x) => ({ ...x, terms: undefined })); }}
            label={<>I agree to the <a className="text-link underline underline-offset-2" href="https://between-gigs.com/terms" target="_blank" rel="noreferrer">Terms of Use</a> and <a className="text-link underline underline-offset-2" href="https://between-gigs.com/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>.</>}
            description="You can ask us to delete your account at any time." />
          {errors.terms && <p id="terms-error" className="pl-7.5 text-body-sm text-danger">{errors.terms}</p>}
        </div>
        {clerkEnabled && !authenticated && <p className="text-body-sm text-ink-muted">Next, create your password (at least 8 characters). Clerk may then ask for a code to verify your email.</p>}
        <Button type="submit" variant="primary" size="lg" fullWidth className="glow-hover swiss:h-14 swiss:justify-between swiss:px-6 swiss:font-display swiss:text-heading-sm" loading={busy} iconEnd={<ArrowRight />}>{authenticated ? "Finish setup" : clerkEnabled ? "Continue to password" : "Create my profile"}</Button>
        {authenticated
          ? <Button variant="ghost" disabled={busy} onClick={() => {
            setBusy(true);
            void auth.signOut().catch(() => { setBusy(false); setErrors({ form: "We couldn't sign out. Try again." }); });
          }}>Use a different account</Button>
          : <p className="text-body-md text-ink">Already joined? <Link href="/login/" className="inline-flex min-h-6 items-center font-bold text-ink underline underline-offset-4">Log in</Link></p>}
      </form>
    </AuthShell>
  );
}

/**
 * Clerk mode, step 1b: Clerk's sign-up collects the password and verifies the chosen email. The invite token, name and
 * terms ride along in unsafeMetadata; ClerkLayer reads them and registers the person, then we head to step 2.
 */
function ClerkAccount({ token, email, name }: { token?: string; email?: string; name?: string }) {
  const router = useRouter();
  const { session, loading } = useSession();
  React.useEffect(() => { if (!loading && session?.via === "clerk") router.replace("/profile/canvas/"); }, [session, loading, router]);
  const [firstName, ...rest] = (name ?? "").split(" ");
  return (
    <AuthShell header="Sign up"
      lead={<p>{email ? `Create a password for ${email}.` : "Continue your account setup."} You may need to verify your email before continuing.</p>}>
      <div className="grid gap-6">
        <h1 className="font-display text-heading-lg text-balance text-ink">{email ? "Create your password" : "Continue your signup"}</h1>
        <p className="text-body-md text-ink-muted">Use at least 8 characters. If Clerk asks for a 6-digit code afterward, that confirms your email; it does not replace your password.</p>
        <ClerkSlot label="Loading sign-up">
          <SignUp routing="hash" signInUrl={`${basePath}/login/`}
            initialValues={email ? { emailAddress: email, firstName, lastName: rest.join(" ") || undefined } : undefined}
            unsafeMetadata={email ? { inviteToken: token, name, acceptedTerms: true } : undefined}
            fallbackRedirectUrl={`${basePath}/profile/canvas/`} />
        </ClerkSlot>
      </div>
    </AuthShell>
  );
}

/** The invite screens' main action: the same 56px full-width button as the sign-up form. */
const BIG = "swiss:h-14 swiss:justify-between swiss:px-6 swiss:font-display swiss:text-heading-sm";

function InviteProblem({ lookup, session }: { lookup: InviteLookup; session?: Session }) {
  const email = lookup.invite?.email;
  const leave = useLeave();
  // Signed in as someone else: Log in / Create an account log them out first, so the link does what it says.
  const away = (href: string) => session ? { onClick: (e: React.MouseEvent) => { e.preventDefault(); void leave(session, href); } } : {};
  const copy: Record<InviteLookup["state"], { icon: React.ReactNode; title: string; body: string; steps: string[]; primary?: React.ReactNode; secondary?: React.ReactNode }> = {
    used: {
      icon: <UserCheck />, title: "You've already joined",
      body: `This invite has been used to create an account${email ? ` for ${email}` : ""}.`,
      steps: ["Log in with the same email.", "Use your existing sign-in method.", "You'll pick up your profile where you left off."],
      primary: <ButtonLink href={`/login/?email=${encodeURIComponent(email ?? "")}`} {...away(`/login/?email=${encodeURIComponent(email ?? "")}`)} variant="primary" className={BIG} size="lg" fullWidth iconEnd={<ArrowRight />}>Log in</ButtonLink>,
    },
    expired: {
      icon: <Clock />, title: "This invite has expired",
      body: "Invites last 30 days, and this one has run out.",
      steps: ["You can create an account without an invite.", "Already created your account? Log in instead."],
      primary: <ButtonLink href="/join/" {...away("/join/")} variant="primary" className={BIG} size="lg" fullWidth iconEnd={<ArrowRight />}>Create an account</ButtonLink>,
      secondary: <ButtonLink href="/login/" {...away("/login/")} size="lg" iconEnd={<ArrowRight />}>Log in</ButtonLink>,
    },
    unknown: {
      icon: <SearchX />, title: "We can't find that invite",
      body: "The link may be incomplete or mistyped. You can still sign up.",
      steps: ["Create an account without an invite.", "Already joined? Log in with your existing account."],
      primary: <ButtonLink href="/join/" {...away("/join/")} variant="primary" className={BIG} size="lg" fullWidth iconEnd={<ArrowRight />}>Create an account</ButtonLink>,
      secondary: <ButtonLink href="/login/" {...away("/login/")} size="lg" iconEnd={<ArrowRight />}>Log in</ButtonLink>,
    },
    valid: { icon: <Mail />, title: "", body: "", steps: [] },
  };
  const c = copy[lookup.state];

  return (
    <AuthShell header="Sign up" steps={false}>
      <div className="grid gap-6">
        <div>
          <h1 className="font-display text-heading-lg text-balance text-ink">{c.title}</h1>
          <p className="mt-2 text-body-md text-pretty text-ink-muted">{c.body}</p>
        </div>
        {session && <Banner tone="info" title={`You're signed in as ${displayName(session)}`}>
          Logging in or creating an account here logs you out first. <Link className="inline-flex min-h-6 items-center text-link underline underline-offset-2" href={homeFor(session)}>{session.role === "owner" ? "Go to the dashboard" : "Go to my profile"}</Link>
        </Banner>}
        <div>
          <h2 className="text-label-md text-ink">What to do next</h2>
          <ol className="mt-3 grid gap-3">
            {c.steps.map((step, i) => (
              <li key={step} className="flex items-start gap-3 text-body-md text-ink-muted">
                <span aria-hidden="true" className="grid size-6 shrink-0 place-items-center border-2 border-line-strong text-label-sm text-ink tabular-nums">{i + 1}</span>{step}
              </li>
            ))}
          </ol>
        </div>
        <div className="grid gap-3 border-t border-line pt-6">
          {c.primary}
          <div className="flex flex-wrap gap-3">{c.secondary}{lookup.state === "used" && <ButtonLink href="/join/" {...away("/join/")} size="lg">Create another account</ButtonLink>}</div>
        </div>
        <p className="text-body-sm text-ink-muted">Questions? Write to <a className="text-link underline underline-offset-2" href="mailto:hello@between-gigs.com">hello@between-gigs.com</a>.</p>
      </div>
    </AuthShell>
  );
}
