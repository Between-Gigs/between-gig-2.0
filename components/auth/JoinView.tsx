"use client";
import { Banner, Button, Checkbox, EmptyState, Field, Input, Skeleton, useToast } from "@ds/components";
import { ArrowRight, Clock, Lock, Mail, SearchX, UserCheck } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { data, type InviteLookup } from "@/lib/data";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { AuthShell } from "./AuthShell";

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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!name.trim()) next.name = "Enter your full name, as you'd like clients to see it.";
    if (!terms) next.terms = "Agree to the Terms of Use and Privacy Policy to continue.";
    setErrors(next);
    if (Object.keys(next).length) return;
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
        <Button type="submit" variant="strong" size="lg" fullWidth loading={busy} iconEnd={<ArrowRight />}>Create my profile</Button>
        <p className="text-center text-body-sm text-ink-muted">Already joined? <Link href="/login/" className="inline-flex min-h-6 items-center font-semibold text-link underline underline-offset-2">Sign in</Link></p>
      </form>
    </AuthShell>
  );
}

function InviteProblem({ lookup, hasToken }: { lookup: InviteLookup; hasToken: boolean }) {
  const email = lookup.invite?.email;
  const copy = {
    used: { icon: <UserCheck />, title: "You've already joined", body: `This invite has been used to create an account${email ? ` for ${email}` : ""}. Sign in with your email to pick up where you left off.` },
    expired: { icon: <Clock />, title: "This invite has expired", body: "Invites last 30 days. Ask us for a fresh one and we'll send it to the same email." },
    unknown: hasToken
      ? { icon: <SearchX />, title: "We can't find that invite", body: "The link may be incomplete. Open it again from your invite email, or copy the whole link into your browser." }
      : { icon: <Mail />, title: "Joining is by invite", body: "Professional onboarding opens by email invite to everyone on the call sheet. Use the link in your invite to create your account." },
    valid: { icon: <Mail />, title: "", body: "" },
  }[lookup.state];

  return (
    <AuthShell eyebrow="Professional onboarding" title="Your next chapter" accent="starts here.">
      <EmptyState icon={copy.icon} title={copy.title} headingLevel={2} className="py-6"
        action={
          <div className="flex flex-wrap justify-center gap-2">
            {lookup.state === "used" && <ButtonLink href={`/login/?email=${encodeURIComponent(email ?? "")}`} variant="primary" iconEnd={<ArrowRight />}>Sign in</ButtonLink>}
            {lookup.state === "expired" && <ButtonLink href={`mailto:hello@between-gigs.com?subject=${encodeURIComponent("A new Between Gigs invite")}`} variant="primary" iconStart={<Mail />}>Ask for a new invite</ButtonLink>}
            {lookup.state === "unknown" && <ButtonLink href="/login/" iconEnd={<ArrowRight />}>Already joined? Sign in</ButtonLink>}
          </div>
        }>
        {copy.body}
      </EmptyState>
      <p className="mt-6 text-center text-body-sm text-ink-muted">Questions? Write to <a className="text-link underline underline-offset-2" href="mailto:hello@between-gigs.com">hello@between-gigs.com</a>.</p>
    </AuthShell>
  );
}
