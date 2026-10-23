"use client";
import { Banner, Button, Field, Input, useToast } from "@ds/components";
import { startPageTransition } from "@ds/motion";
import { ArrowLeft, ArrowRight, Clock, Inbox, Mail, RotateCcw } from "lucide-react";
import { SignIn } from "@clerk/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { data, type RequestCodeResult, type SignInResult } from "@/lib/data";
import { SAMPLE_OWNER } from "@/lib/data/seed";
import { clerkEnabled } from "@/lib/auth/clerk";
import { useSession } from "@/lib/session";
import { basePath } from "@/lib/site";
import { AuthShell } from "./AuthShell";
import { ClerkSlot } from "./ClerkSlot";

const RESEND_SECONDS = 30;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const requestError: Record<Exclude<RequestCodeResult, { ok: true }>["error"], string> = {
  "unknown-email": "We couldn't find an account for that email. Check the spelling, or create an account.",
  "not-registered": "You haven't created your account yet. Create an account first.",
  "rate-limited": "We just sent you a code. You can ask for another in a few seconds.",
};

const verifyError: Record<Exclude<SignInResult, { ok: true }>["error"], string> = {
  "wrong-code": "That code doesn't match. Check the most recent email and try again.",
  "expired-code": "That code has expired. Send a new one and use it within 10 minutes.",
  "too-many-attempts": "Too many tries with that code. Send a new one to try again.",
  "no-code": "There's no active code for this email. Send a new one.",
};

/** /login: Clerk handles the configured methods; offline sample mode uses a clearly labeled demo code. */
export function LoginView() {
  return clerkEnabled ? <ClerkLogin /> : <SampleLogin />;
}

/** Where to go once signed in: a safe ?next=, else the role's home. */
function destination(next: string | null, role: "owner" | "gigster") {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : role === "owner" ? "/owners/" : "/profile/";
}

/**
 * Clerk's sign-in (password and other methods configured in the Clerk dashboard), themed with our tokens and sitting in
 * the same brand frame. Once Clerk signs someone in, ClerkLayer opens their Between Gigs session and we route.
 */
function ClerkLogin() {
  const params = useSearchParams();
  const router = useRouter();
  const { session } = useSession();

  React.useEffect(() => {
    if (session?.via === "clerk") router.replace(destination(params.get("next"), session.role));
  }, [session, params, router]);

  return (
    <AuthShell eyebrow="Welcome back" title="Sign in to" accent="Between Gigs."
      lead={<p>Use the email and password you created. Existing Google or email-code accounts can use their original sign-in method.</p>}>
      <div className="grid gap-6">
        {params.get("signedOut") && <Banner tone="success" title="You're signed out">See you next time.</Banner>}
        <ClerkSlot label="Loading sign-in">
          <SignIn routing="hash" signUpUrl={`${basePath}/join/`}
            initialValues={{ emailAddress: params.get("email") ?? undefined }}
            fallbackRedirectUrl={`${basePath}/login/${params.get("next") ? `?next=${encodeURIComponent(params.get("next")!)}` : ""}`} />
        </ClerkSlot>
        <p className="text-center text-body-sm text-ink-muted">Need to create a password? <Link href="/join/" className="text-link underline underline-offset-2">Create an account</Link>. Already have an account? Use your original sign-in method or Clerk's account recovery.</p>
      </div>
    </AuthShell>
  );
}

/** The sample login: email → 6-digit code, with the code shown on screen and in the outbox. */
function SampleLogin() {
  const params = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const stage = React.useRef<HTMLDivElement>(null);
  const [step, setStep] = React.useState<"email" | "code">("email");
  const [email, setEmail] = React.useState(params.get("email") ?? "");
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string>();
  const [codeError, setCodeError] = React.useState<{ kind: string; text: string }>();
  const [busy, setBusy] = React.useState(false);
  const [wait, setWait] = React.useState(0);
  const [sample, setSample] = React.useState<string | null>(null);
  const codeInput = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (wait <= 0) return;
    const t = window.setTimeout(() => setWait((w) => w - 1), 1000);
    return () => window.clearTimeout(t);
  }, [wait]);

  const refreshSample = React.useCallback(async (address: string) => setSample((await data.demo?.peekCode(address)) ?? null), []);

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!EMAIL_RE.test(email.trim())) { setError("Enter your email address, like name@example.com."); return; }
    setBusy(true);
    const r = await data.auth.requestCode(email);
    setBusy(false);
    if (!r.ok) {
      if (step === "code") setCodeError({ kind: r.error, text: requestError[r.error] }); else setError(requestError[r.error]);
      return;
    }
    setWait(RESEND_SECONDS);
    setCode("");
    setCodeError(undefined);
    await refreshSample(r.email);
    if (step === "email") {
      startPageTransition(() => setStep("code"), { effect: "shift", target: stage.current });
      requestAnimationFrame(() => codeInput.current?.focus());
    } else {
      toast({ message: "New code sent", tone: "success" });
      codeInput.current?.focus();
    }
  };

  const verify = async (value = code) => {
    if (!/^\d{6}$/.test(value)) { setCodeError({ kind: "format", text: "Enter the 6 digits from the email." }); return; }
    setBusy(true);
    const r = await data.auth.verifyCode(email, value);
    if (!r.ok) {
      setBusy(false);
      setCodeError({ kind: r.error, text: verifyError[r.error] });
      if (r.error !== "wrong-code") setWait(0);
      return;
    }
    toast({ message: `Signed in as ${r.session.email}`, tone: "success" });
    router.push(destination(params.get("next"), r.session.role));
  };

  const back = () => startPageTransition(() => { setStep("email"); setCodeError(undefined); setCode(""); }, { effect: "shift", direction: "back", target: stage.current });
  const needsNewCode = codeError && ["expired-code", "too-many-attempts", "no-code"].includes(codeError.kind);

  return (
    <AuthShell eyebrow="Welcome back" title="Sign in to" accent="Between Gigs."
      lead={<p>Offline sample mode: this demo uses a visible 6-digit code and sends no email. Password accounts use Clerk when it is configured.</p>}>
      <div ref={stage} className="vt-page">
        {params.get("signedOut") && step === "email" && <Banner tone="success" className="mb-6" title="You're signed out">See you next time.</Banner>}

        {step === "email" ? (
          <form noValidate onSubmit={send} className="grid gap-5">
            <div>
              <h2 className="font-display text-display-sm text-ink">Sign in</h2>
              <p className="mt-2 text-body-md text-ink-muted">Use the email you signed up with.</p>
            </div>
            <Field label="Email" error={error}>
              <Input type="email" inputMode="email" autoComplete="email" value={email} start={<Mail />} autoFocus
                onChange={(e) => { setEmail(e.target.value); setError(undefined); }} />
            </Field>
            <Button type="submit" variant="primary" size="lg" fullWidth loading={busy} iconEnd={<ArrowRight />}>Email me a code</Button>
            <p className="text-center text-body-sm text-ink-muted">New here? <Link href="/join/" className="text-link underline underline-offset-2">Create an account</Link>.</p>
            {data.kind === "sample" && (
              <p className="rounded-lg border border-dashed border-line-dashed p-3 text-body-sm text-ink-subtle">
                Sample accounts: <button type="button" className="inline-flex min-h-6 items-center font-semibold text-link underline underline-offset-2" onClick={() => setEmail("maya.chen@example.com")}>maya.chen@example.com</button> (Gigster) or{" "}
                <button type="button" className="inline-flex min-h-6 items-center font-semibold text-link underline underline-offset-2" onClick={() => setEmail(SAMPLE_OWNER.email)}>{SAMPLE_OWNER.email}</button> (owner).
              </p>
            )}
          </form>
        ) : (
          <form noValidate onSubmit={(e) => { e.preventDefault(); void verify(); }} className="grid gap-5">
            <div>
              <h2 className="font-display text-display-sm text-ink">Check your email</h2>
              <p className="mt-2 text-body-md text-ink-muted">We sent a 6-digit code to <b className="text-ink">{email.trim().toLowerCase()}</b>. It expires in 10 minutes.</p>
            </div>
            {needsNewCode && (
              <Banner tone="warning" title={codeError.kind === "expired-code" ? "Code expired" : "Send a new code"}
                action={<Button size="sm" onClick={() => send()} loading={busy} iconStart={<RotateCcw />}>Send a new code</Button>}>
                {codeError.text}
              </Banner>
            )}
            <Field label="6-digit code" error={needsNewCode ? undefined : codeError?.text}>
              <Input ref={codeInput} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code}
                className="font-mono text-heading-lg tracking-widest"
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setCode(v);
                  setCodeError(undefined);
                  if (v.length === 6) void verify(v);
                }} />
            </Field>
            <Button type="submit" variant="primary" size="lg" fullWidth loading={busy} disabled={!!needsNewCode} iconEnd={<ArrowRight />}>Sign in</Button>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button variant="ghost" size="sm" iconStart={<ArrowLeft />} onClick={back}>Use a different email</Button>
              <Button variant="ghost" size="sm" iconStart={<RotateCcw />} disabled={wait > 0 || busy} onClick={() => send()} title={wait > 0 ? "You can ask for a new code when the timer runs out" : undefined}>
                {wait > 0 ? <>Resend in <span className="tabular-nums">{wait}s</span></> : "Resend code"}
              </Button>
            </div>
            {data.kind === "sample" && sample && (
              <Banner tone="info" title="Sample mode: no email was sent"
                action={<Button size="sm" variant="ghost" iconStart={<Clock />} onClick={async () => { await data.demo?.expireCode(email); toast({ message: "Code expired (sample)" }); }}>Expire it</Button>}>
                Your code is <b className="font-mono tracking-wider">{sample}</b>. <Link href="/emails/" className="inline-flex min-h-6 items-center gap-1 text-link underline underline-offset-2"><Inbox className="size-3.5" aria-hidden="true" />See it in the outbox</Link>
              </Banner>
            )}
          </form>
        )}
      </div>
    </AuthShell>
  );
}
