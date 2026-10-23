"use client";
import { Banner, Button, Checkbox, Field, Input, Skeleton, useToast } from "@ds/components";
import { SignUp } from "@clerk/react";
import { ArrowLeft, ArrowRight, Clock, Mail, SearchX, UserCheck } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { data, type InviteLookup } from "@/lib/data";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { useAuthActions } from "@/lib/auth/context";
import { clerkEnabled } from "@/lib/auth/clerk";
import { demoActive } from "@/lib/demo-flow";
import { useSession } from "@/lib/session";
import { basePath } from "@/lib/site";
import { AuthShell } from "./AuthShell";
import { ClerkSlot } from "./ClerkSlot";

/** Open signup, with an optional invite to prefill the email and retain its attribution. */
export function JoinView() {
  const token = useSearchParams().get("invite") ?? "";
  const { onboarding } = useAuthActions();
  if (onboarding) return <JoinForm key={`onboarding-${onboarding.email}`} initialEmail={onboarding.email} initialName={onboarding.name} authenticated />;
  return <JoinForToken key={token} token={token} />;
}

function JoinForToken({ token }: { token: string }) {
  const [lookup, setLookup] = React.useState<InviteLookup | null>(null);

  React.useEffect(() => {
    if (!token) { setLookup({ state: "unknown" }); return; } // eslint-disable-line react-hooks/set-state-in-effect
    let active = true;
    setLookup(null);
    void data.invites.lookup(token).then((result) => { if (active) setLookup(result); });
    return () => { active = false; };
  }, [token]);

  if (!token) return <JoinForm key="open" />;
  if (!lookup) {
    return (
      <AuthShell eyebrow="Professional onboarding" title="Your next chapter" accent="starts here.">
        <div className="grid gap-4" aria-busy="true" aria-label="Checking your invite"><Skeleton className="h-8 w-2/3" /><Skeleton /><Skeleton shape="block" className="h-40" /></div>
      </AuthShell>
    );
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
  const [demo, setDemo] = React.useState(false);
  React.useEffect(() => { setDemo(!!data.demo && demoActive()); }, []); // eslint-disable-line react-hooks/set-state-in-effect

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = "Enter your email address, like name@example.com.";
    if (!name.trim()) next.name = "Enter your full name, as you'd like clients to see it.";
    if (!terms) next.terms = "Agree to the Terms of Use and Privacy Policy to continue.";
    setErrors(next);
    if (Object.keys(next).length) return;
    if (authenticated && auth.onboarding) {
      setBusy(true);
      try {
        await auth.onboarding.finish({ name, acceptTerms: terms });
        router.replace("/profile/edit/");
      } catch { setBusy(false); setErrors({ form: "We couldn't finish your setup. Try again." }); }
      return;
    }
    if (clerkEnabled) { setVerify(true); return; } // Clerk confirms the email next; ClerkLayer then registers them.
    setBusy(true);
    const r = await data.auth.register({ token: matchingToken, email, name, acceptTerms: terms });
    if (!r.ok) {
      setBusy(false);
      setErrors({ form: r.error === "existing-account" || r.error === "used" ? "This email already has an account. Sign in instead." : "Something went wrong. Try again, or contact us." });
      return;
    }
    toast({ message: "Account created", tone: "success" });
    router.push("/profile/edit/");
  };

  if (verify) return <ClerkAccount token={matchingToken} email={email.trim().toLowerCase()} name={name.trim()} onBack={() => setVerify(false)} />;

  return (
    <AuthShell eyebrow="Professional onboarding" title="Your next chapter" accent="starts here."
      lead={<p>Create your account, then build a profile that feels like you. It takes about 10 minutes, and it saves as you go.</p>}>
      <h2 className="font-display text-display-sm text-ink">{authenticated ? "Finish your account setup" : "Create your account"}</h2>
      <p className="mt-2 text-body-md text-ink-muted">{authenticated ? "You are signed in. Confirm your details and agree to the terms to create your profile." : "No invite needed. Enter your details to get started."}</p>
      <form noValidate onSubmit={submit} className="mt-8 grid gap-5">
        {errors.form && <Banner tone="danger" title="We couldn't create your account">{errors.form}</Banner>}
        <Field label="Email" error={errors.email} hint={authenticated ? "You are signed in with this email." : "Use the email you want to sign in with."}>
          <Input type="email" value={email} readOnly={authenticated} autoComplete="email" start={<Mail />} onChange={(e) => { setEmail(e.target.value); setErrors((x) => ({ ...x, email: undefined })); }} />
        </Field>
        <Field label="Full name" error={errors.name}>
          <Input value={name} autoComplete="name" autoFocus onChange={(e) => { setName(e.target.value); setErrors((x) => ({ ...x, name: undefined })); }} />
        </Field>
        <div className="grid gap-1.5">
          <Checkbox checked={terms} aria-invalid={!!errors.terms || undefined} aria-describedby={errors.terms ? "terms-error" : undefined}
            onChange={(e) => { setTerms(e.target.checked); setErrors((x) => ({ ...x, terms: undefined })); }}
            label={<>I agree to the <a className="text-link underline underline-offset-2" href="https://between-gigs.com/terms" target="_blank" rel="noreferrer">Terms of Use</a> and <a className="text-link underline underline-offset-2" href="https://between-gigs.com/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>.</>}
            description="You can ask us to delete your account at any time." />
          {errors.terms && <p id="terms-error" className="text-body-sm text-danger">{errors.terms}</p>}
        </div>
        {clerkEnabled && !authenticated && <p className="text-body-sm text-ink-muted">Next, create your password (at least 8 characters). Clerk may then ask for a code to verify your email.</p>}
        <Button type="submit" variant="primary" size="lg" fullWidth className="glow-hover" loading={busy} iconEnd={<ArrowRight />}>{authenticated ? "Finish setup" : clerkEnabled ? "Continue to password" : "Create my profile"}</Button>
        {clerkEnabled && !authenticated && demo && <DemoSkip token={matchingToken} email={email} name={name.trim()} />}
        {authenticated
          ? <Button variant="ghost" disabled={busy} onClick={() => {
            setBusy(true);
            void auth.signOut().catch(() => { setBusy(false); setErrors({ form: "We couldn't sign out. Try again." }); });
          }}>Use a different account</Button>
          : <p className="text-center text-body-sm text-ink-muted">Already joined? <Link href="/login/" className="inline-flex min-h-6 items-center font-semibold text-link underline underline-offset-2">Sign in</Link></p>}
      </form>
    </AuthShell>
  );
}

/**
 * Clerk mode, step 1b: Clerk's sign-up collects the password and verifies the chosen email. The invite token, name and
 * terms ride along in unsafeMetadata; ClerkLayer reads them and registers the person, then we head to step 2.
 */
function ClerkAccount({ token, email, name, onBack }: { token?: string; email: string; name: string; onBack: () => void }) {
  const router = useRouter();
  const [demo, setDemo] = React.useState(false);
  React.useEffect(() => { setDemo(!!data.demo && demoActive()); }, []); // eslint-disable-line react-hooks/set-state-in-effect
  const { session, loading } = useSession();
  React.useEffect(() => { if (!loading && session?.via === "clerk") router.replace("/profile/edit/"); }, [session, loading, router]);
  const [firstName, ...rest] = name.split(" ");
  return (
    <AuthShell eyebrow="Professional onboarding" title="Your next chapter" accent="starts here."
      lead={<p>Create a password for {email}. You may then need to verify your email before continuing.</p>}>
      <div className="grid gap-6">
        <h2 className="font-display text-display-sm text-ink">Create your password</h2>
        <p className="text-body-md text-ink-muted">Use at least 8 characters. If Clerk asks for a 6-digit code afterward, that confirms your email; it does not replace your password.</p>
        <ClerkSlot label="Loading sign-up">
          <SignUp routing="hash" signInUrl={`${basePath}/login/`}
            initialValues={{ emailAddress: email, firstName, lastName: rest.join(" ") || undefined }}
            unsafeMetadata={{ inviteToken: token, name, acceptedTerms: true }}
            fallbackRedirectUrl={`${basePath}/profile/edit/`} />
        </ClerkSlot>
        <Button variant="ghost" size="sm" iconStart={<ArrowLeft />} onClick={onBack} className="justify-self-start">Back</Button>
        {demo && <DemoSkip token={token} email={email} name={name} />}
      </div>
    </AuthShell>
  );
}

/**
 * The client demo only (/demo): once Clerk has initialized, preview without a real account in this
 * browser's sample store and carry on. The live site has no sample store, so this never shows there.
 */
function DemoSkip({ token, email, name }: { token?: string; email: string; name: string }) {
  const { sdkLoaded } = useAuthActions();
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const skip = async () => {
    setBusy(true);
    const r = await data.auth.register({ token, email, name: name || "Demo Gigster", acceptTerms: true });
    if (r.ok) router.push("/profile/edit/"); else setBusy(false);
  };
  if (!sdkLoaded) return null;
  return (
    <div className="grid gap-2 rounded-lg border border-dashed border-line-strong p-4">
      <p className="text-label-md text-ink">Demo: continue with browser-only sample data?</p>
      <p className="text-body-sm text-ink-muted">Skip the email check for this demo. Your account is made in this browser only.</p>
      <Button variant="secondary" loading={busy} iconEnd={<ArrowRight />} onClick={() => void skip()} className="justify-self-start">Skip sign-in and continue</Button>
    </div>
  );
}

function InviteProblem({ lookup }: { lookup: InviteLookup }) {
  const email = lookup.invite?.email;
  const copy: Record<InviteLookup["state"], { icon: React.ReactNode; title: string; body: string; steps: string[]; primary?: React.ReactNode; secondary?: React.ReactNode }> = {
    used: {
      icon: <UserCheck />, title: "You've already joined",
      body: `This invite has been used to create an account${email ? ` for ${email}` : ""}.`,
      steps: ["Sign in with the same email.", "Use your existing sign-in method.", "You'll pick up your profile where you left off."],
      primary: <ButtonLink href={`/login/?email=${encodeURIComponent(email ?? "")}`} variant="primary" iconEnd={<ArrowRight />}>Sign in</ButtonLink>,
    },
    expired: {
      icon: <Clock />, title: "This invite has expired",
      body: "Invites last 30 days, and this one has run out.",
      steps: ["You can create an account without an invite.", "Already created your account? Sign in instead."],
      primary: <ButtonLink href="/join/" variant="primary" iconEnd={<ArrowRight />}>Create an account</ButtonLink>,
      secondary: <ButtonLink href="/login/" iconEnd={<ArrowRight />}>Sign in</ButtonLink>,
    },
    unknown: {
      icon: <SearchX />, title: "We can't find that invite",
      body: "The link may be incomplete or mistyped. You can still sign up.",
      steps: ["Create an account without an invite.", "Already joined? Sign in with your existing account."],
      primary: <ButtonLink href="/join/" variant="primary" iconEnd={<ArrowRight />}>Create an account</ButtonLink>,
      secondary: <ButtonLink href="/login/" iconEnd={<ArrowRight />}>Sign in</ButtonLink>,
    },
    valid: { icon: <Mail />, title: "", body: "", steps: [] },
  };
  const c = copy[lookup.state];

  return (
    <AuthShell eyebrow="Professional onboarding" title="Your next chapter" accent="starts here.">
      <div className="grid gap-6">
        <div className="flex items-start gap-4">
          <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-xl bg-surface-selected text-ink-brand [&_svg]:size-6">{c.icon}</span>
          <div>
            <h2 className="font-display text-display-sm text-ink">{c.title}</h2>
            <p className="mt-1 text-body-md text-ink-muted">{c.body}</p>
          </div>
        </div>
        <div>
          <h3 className="text-label-md text-ink">What to do next</h3>
          <ol className="mt-3 grid gap-3">
            {c.steps.map((step, i) => (
              <li key={step} className="flex items-start gap-3 text-body-md text-ink-muted">
                <span aria-hidden="true" className="grid size-6 shrink-0 place-items-center rounded-full border border-line-strong text-label-sm text-ink tabular-nums">{i + 1}</span>{step}
              </li>
            ))}
          </ol>
        </div>
        <div className="flex flex-wrap gap-2 border-t border-line pt-6">{c.primary}{c.secondary}{lookup.state === "used" && <ButtonLink href="/join/">Create another account</ButtonLink>}</div>
        <p className="text-body-sm text-ink-muted">Questions? Write to <a className="text-link underline underline-offset-2" href="mailto:hello@between-gigs.com">hello@between-gigs.com</a>.</p>
      </div>
    </AuthShell>
  );
}
