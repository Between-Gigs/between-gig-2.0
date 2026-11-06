"use client";
import { Banner, Button, Checkbox, Field, Input } from "@ds/components";
import { SignUp } from "@clerk/react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { clerkEnabled } from "@/lib/auth/clerk";
import { useSession } from "@/lib/session";
import { basePath } from "@/lib/site";
import { AuthShell } from "./AuthShell";
import { ClerkSlot } from "./ClerkSlot";

/**
 * /join live: invite-only (Company OS decision N-05). The invitation email's link carries Clerk's ticket
 * (`__clerk_ticket`), which already proves the address: the person gives their name and agrees to the terms, then
 * Clerk's sign-up takes the ticket and finishes the account. Without a ticket there is nothing to join yet.
 */
export function InviteJoin() {
  const ticket = useSearchParams().get("__clerk_ticket") ?? "";
  const [resume, setResume] = React.useState(false);
  // Clerk owns its hash routes (a verification step after a reload): mount its sign-up so it can carry on.
  React.useEffect(() => { setResume(clerkEnabled && window.location.hash.startsWith("#/")); }, []); // eslint-disable-line react-hooks/set-state-in-effect
  if (resume) return <TicketSignUp />;
  if (!ticket || !clerkEnabled) return <InviteOnly />;
  return <Details />;
}

function Details() {
  const [name, setName] = React.useState("");
  const [terms, setTerms] = React.useState(false);
  const [errors, setErrors] = React.useState<{ name?: string; terms?: string }>({});
  const [next, setNext] = React.useState(false);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const found: typeof errors = {};
    if (!name.trim()) found.name = "Enter your full name, as you'd like clients to see it.";
    if (!terms) found.terms = "Agree to the Terms of Use and Privacy Policy to continue.";
    setErrors(found);
    if (!Object.keys(found).length) setNext(true);
  };
  if (next) return <TicketSignUp name={name.trim()} />;
  return (
    <AuthShell header="Sign up"
      lead={<p>Create your account, then build a profile that feels like you. It takes about 10 minutes, and it saves as you go.</p>}>
      <h1 className="font-display text-heading-lg text-balance text-ink">Create your account</h1>
      <p className="mt-2 text-body-md text-ink-muted">Your invitation confirms your email. Tell us your name to get started.</p>
      <form noValidate onSubmit={submit} className="mt-8 grid gap-5">
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
        <Button type="submit" variant="primary" size="lg" fullWidth className="glow-hover swiss:h-14 swiss:justify-between swiss:px-6 swiss:font-display swiss:text-heading-sm" iconEnd={<ArrowRight />}>Continue</Button>
        <p className="text-body-md text-ink">Already joined? <Link href="/login/" className="inline-flex min-h-6 items-center font-bold text-ink underline underline-offset-4">Log in</Link></p>
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
  return (
    <AuthShell header="Sign up">
      <div className="grid gap-6">
        <h1 className="font-display text-heading-lg text-balance text-ink">Finish your account</h1>
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

function InviteOnly() {
  return (
    <AuthShell header="Sign up" steps={false}>
      <div className="grid gap-6">
        <div>
            <h1 className="font-display text-heading-lg text-balance text-ink">Joining is by invitation</h1>
            <p className="mt-2 text-body-md text-ink-muted">Open the link in your invitation email to create your account. No invitation yet? Get on the call sheet and we'll email you when it's your turn.</p>
        </div>
        <Banner tone="info" title="Already joined?">Log in with the email your invitation was sent to.</Banner>
        <div className="flex flex-wrap gap-2 border-t border-line pt-6">
          <ButtonLink href="/login/" variant="primary" iconEnd={<ArrowRight />}>Log in</ButtonLink>
          <ButtonLink href="/professionals/">Get on the call sheet</ButtonLink>
        </div>
      </div>
    </AuthShell>
  );
}
