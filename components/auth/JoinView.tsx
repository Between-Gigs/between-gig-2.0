"use client";
import { Banner, Button, Checkbox, Field, Input, Skeleton, useToast } from "@ds/components";
import { SignUp } from "@clerk/react";
import { ArrowLeft, ArrowRight, Clock, Lock, Mail, SearchX, UserCheck } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { data, type InviteLookup } from "@/lib/data";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { clerkEnabled } from "@/lib/auth/clerk";
import { demoActive } from "@/lib/demo-flow";
import { useSession } from "@/lib/session";
import { basePath } from "@/lib/site";
import { AuthShell } from "./AuthShell";
import { ClerkSlot } from "./ClerkSlot";

/**
 * /join?invite=<token>: register from the invite email. The email comes from the invite and can't be
 * changed; we ask only for a name and agreement to the terms, then go straight to the questionnaire.
 */
export function JoinView() {
  const token = useSearchParams().get("invite") ?? "";
  const [lookup, setLookup] = React.useState<InviteLookup | null>(null);

  React.useEffect(() => {
    if (!token) { setLookup({ state: "unknown" }); return; } // eslint-disable-line react-hooks/set-state-in-effect
    void data.invites.lookup(token).then(setLookup);
  }, [token]);

  if (!lookup) {
    return (
      <AuthShell eyebrow="Professional onboarding" title="Your next chapter" accent="starts here.">
        <div className="grid gap-4" aria-busy="true" aria-label="Checking your invite"><Skeleton className="h-8 w-2/3" /><Skeleton /><Skeleton shape="block" className="h-40" /></div>
      </AuthShell>
    );
  }
  if (lookup.state === "valid" && lookup.invite) return <JoinForm token={token} email={lookup.invite.email} />;
  return <InviteProblem lookup={lookup} hasToken={!!token} />;
}

function JoinForm({ token, email }: { token: string; email: string }) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = React.useState("");
  const [terms, setTerms] = React.useState(false);
  const [errors, setErrors] = React.useState<{ name?: string; terms?: string; form?: string }>({});
  const [busy, setBusy] = React.useState(false);
  const [verify, setVerify] = React.useState(false);
  const [demo, setDemo] = React.useState(false);
  React.useEffect(() => { setDemo(!!data.demo && demoActive()); }, []); // eslint-disable-line react-hooks/set-state-in-effect

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!name.trim()) next.name = "Enter your full name, as you'd like clients to see it.";
    if (!terms) next.terms = "Agree to the Terms of Use and Privacy Policy to continue.";
    setErrors(next);
    if (Object.keys(next).length) return;
    if (clerkEnabled) { setVerify(true); return; } // Clerk confirms the email next; ClerkLayer then registers them.
    setBusy(true);
    const r = await data.auth.register({ token, name, acceptTerms: terms });
    if (!r.ok) {
      setBusy(false);
      setErrors({ form: r.error === "used" ? "This invite was just used. Sign in instead." : "Something went wrong. Try again, or contact us." });
      return;
    }
    toast({ message: "Account created", tone: "success" });
    router.push("/profile/edit/");
  };

  if (verify) return <ClerkVerify token={token} email={email} name={name.trim()} onBack={() => setVerify(false)} />;

  return (
    <AuthShell eyebrow="Professional onboarding" title="Your next chapter" accent="starts here."
      lead={<p>You're on the call sheet. Create your account, then build a profile that feels like you. It takes about 10 minutes, and it saves as you go.</p>}>
      <h2 className="font-display text-display-sm text-ink">Create your account</h2>
      <p className="mt-2 text-body-md text-ink-muted">Step 1 of 2. Next, the questionnaire.</p>
      <form noValidate onSubmit={submit} className="mt-8 grid gap-5">
        {errors.form && <Banner tone="danger" title="We couldn't create your account">{errors.form}</Banner>}
        <Field label="Email" hint="From your invite. You'll sign in with it.">
          <Input type="email" value={email} readOnly autoComplete="email" start={<Mail />} end={<Lock aria-label="Can't be changed" />} />
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
        <Button type="submit" variant="primary" size="lg" fullWidth className="glow-hover" loading={busy} iconEnd={<ArrowRight />}>Create my profile</Button>
        {clerkEnabled && demo && <DemoSkip token={token} name={name.trim()} />}
        <p className="text-center text-body-sm text-ink-muted">Already joined? <Link href="/login/" className="inline-flex min-h-6 items-center font-semibold text-link underline underline-offset-2">Sign in</Link></p>
      </form>
    </AuthShell>
  );
}

/**
 * Clerk mode, step 1b: Clerk's sign-up confirms the invite email with a code. The invite token, name and
 * terms ride along in unsafeMetadata; ClerkLayer reads them and registers the person, then we head to step 2.
 */
function ClerkVerify({ token, email, name, onBack }: { token: string; email: string; name: string; onBack: () => void }) {
  const router = useRouter();
  const [demo, setDemo] = React.useState(false);
  React.useEffect(() => { setDemo(!!data.demo && demoActive()); }, []); // eslint-disable-line react-hooks/set-state-in-effect
  const { session } = useSession();
  React.useEffect(() => { if (session?.via === "clerk") router.replace("/profile/edit/"); }, [session, router]);
  const [firstName, ...rest] = name.split(" ");
  return (
    <AuthShell eyebrow="Professional onboarding" title="Your next chapter" accent="starts here."
      lead={<p>One quick check: we'll email {email} a code to confirm it's you.</p>}>
      <div className="grid gap-6">
        <ClerkSlot label="Loading sign-up">
          <SignUp routing="hash" signInUrl={`${basePath}/login/`}
            initialValues={{ emailAddress: email, firstName, lastName: rest.join(" ") || undefined }}
            unsafeMetadata={{ inviteToken: token, name, acceptedTerms: true }}
            fallbackRedirectUrl={`${basePath}/join/?invite=${encodeURIComponent(token)}`} />
        </ClerkSlot>
        <Button variant="ghost" size="sm" iconStart={<ArrowLeft />} onClick={onBack} className="justify-self-start">Back</Button>
        {demo && <DemoSkip token={token} name={name} />}
      </div>
    </AuthShell>
  );
}

/**
 * The client demo only (/demo): if Clerk's code doesn't arrive or Clerk won't load, create the account in this
 * browser's sample store and carry on. The live site has no sample store, so this never shows there.
 */
function DemoSkip({ token, name }: { token: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const skip = async () => {
    setBusy(true);
    const r = await data.auth.register({ token, name: name || "Demo Gigster", acceptTerms: true });
    if (r.ok) router.push("/profile/edit/"); else setBusy(false);
  };
  return (
    <div className="grid gap-2 rounded-lg border border-dashed border-line-strong p-4">
      <p className="text-label-md text-ink">Demo: no code, or the sign-in won&apos;t load?</p>
      <p className="text-body-sm text-ink-muted">Skip the email check for this demo. Your account is made in this browser only.</p>
      <Button variant="secondary" loading={busy} iconEnd={<ArrowRight />} onClick={() => void skip()} className="justify-self-start">Skip sign-in and continue</Button>
    </div>
  );
}

function InviteProblem({ lookup, hasToken }: { lookup: InviteLookup; hasToken: boolean }) {
  const email = lookup.invite?.email;
  const ask = `mailto:hello@between-gigs.com?subject=${encodeURIComponent("A new Between Gigs invite")}`;
  const copy: Record<InviteLookup["state"], { icon: React.ReactNode; title: string; body: string; steps: string[]; primary?: React.ReactNode; secondary?: React.ReactNode }> = {
    used: {
      icon: <UserCheck />, title: "You've already joined",
      body: `This invite has been used to create an account${email ? ` for ${email}` : ""}.`,
      steps: ["Sign in with the same email.", "We'll email you a 6-digit code: no password needed.", "You'll pick up your profile where you left off."],
      primary: <ButtonLink href={`/login/?email=${encodeURIComponent(email ?? "")}`} variant="primary" iconEnd={<ArrowRight />}>Sign in</ButtonLink>,
    },
    expired: {
      icon: <Clock />, title: "This invite has expired",
      body: "Invites last 30 days, and this one has run out.",
      steps: ["Ask us for a fresh invite. We'll send it to the same email.", "Already created your account? Sign in instead."],
      primary: <ButtonLink href={ask} variant="primary" iconStart={<Mail />}>Ask for a new invite</ButtonLink>,
      secondary: <ButtonLink href="/login/" iconEnd={<ArrowRight />}>Sign in</ButtonLink>,
    },
    unknown: hasToken
      ? {
        icon: <SearchX />, title: "We can't find that invite",
        body: "The link may be incomplete or mistyped.",
        steps: ["Open the link again from your invite email.", "Or copy the whole link into your browser.", "Still stuck? Ask us for a new invite."],
        primary: <ButtonLink href={ask} variant="primary" iconStart={<Mail />}>Ask for a new invite</ButtonLink>,
        secondary: <ButtonLink href="/login/" iconEnd={<ArrowRight />}>Already joined? Sign in</ButtonLink>,
      }
      : {
        icon: <Mail />, title: "Joining is by invite",
        body: "Professional onboarding opens by email invite to everyone on the call sheet.",
        steps: ["Use the “Create your profile” link in your invite email.", "Not on the call sheet yet? Join it from the professionals page."],
        primary: <ButtonLink href="/professionals/" variant="primary" iconEnd={<ArrowRight />}>Get on the call sheet</ButtonLink>,
        secondary: <ButtonLink href="/login/" iconEnd={<ArrowRight />}>Already joined? Sign in</ButtonLink>,
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
        <div className="flex flex-wrap gap-2 border-t border-line pt-6">{c.primary}{c.secondary}</div>
        <p className="text-body-sm text-ink-muted">Questions? Write to <a className="text-link underline underline-offset-2" href="mailto:hello@between-gigs.com">hello@between-gigs.com</a>.</p>
      </div>
    </AuthShell>
  );
}
