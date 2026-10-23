"use client";
import { Banner, Button, Field, Input, Skeleton } from "@ds/components";
import { ArrowRight, Mail, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { data, type OutboxEmail } from "@/lib/data";
import { useAuthActions } from "@/lib/auth/context";
import { clerkEnabled } from "@/lib/auth/clerk";
import { setDemoActive } from "@/lib/demo-flow";
import { basePath } from "@/lib/site";
import { renderPreview } from "@/components/emails/preview";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Page } from "@/components/site/Page";

const SAMPLE = "you@example.com";

/** The invite link inside the email, as an app path (without the Pages base path). */
const appPath = (href: string) => {
  try { const u = new URL(href, window.location.href); const p = u.pathname.startsWith(basePath) ? u.pathname.slice(basePath.length) : u.pathname; return `${p}${u.search}`; }
  catch { return null; }
};

/**
 * /demo, step 1: the invite email, as the client would receive it. Its "Create your profile" button opens the real
 * sign-up for that invite; the demo bar then follows them through building and seeing the profile.
 */
export function DemoStart() {
  const router = useRouter();
  const { sdkLoaded, prepareDemo } = useAuthActions();
  const [email, setEmail] = React.useState(SAMPLE);
  const [sentTo, setSentTo] = React.useState<string | null>(null);
  const [mail, setMail] = React.useState<OutboxEmail | null>(null);
  const [ready, setReady] = React.useState(false);
  const [setupError, setSetupError] = React.useState("");
  const [error, setError] = React.useState("");
  const [height, setHeight] = React.useState(1200);
  const frame = React.useRef<HTMLIFrameElement>(null);

  const send = React.useCallback(async (to: string) => {
    setReady(false);
    setSetupError("");
    setMail(null);
    try {
      await prepareDemo();
      if (!data.demo) { setReady(true); return; }
      const r = await data.demo.inviteMe(to);
      setMail(await data.emails.get(r.outboxId));
      setSentTo(to);
      setDemoActive(true);
      setReady(true);
    } catch {
      setSetupError("We couldn't finish signing out of the previous account. Retry setup before starting signup.");
    }
  }, [prepareDemo]);

  // Back from Clerk with an email the invite wasn't sent to: offer that email instead.
  const [clerkEmail, setClerkEmail] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!sdkLoaded) return;
    const fromClerk = new URLSearchParams(window.location.search).get("clerk");
    if (fromClerk) { setClerkEmail(fromClerk); setEmail(fromClerk); } // eslint-disable-line react-hooks/set-state-in-effect
    void send(SAMPLE);
  }, [send, sdkLoaded]);

  React.useEffect(() => {
    if (sdkLoaded) return;
    const timer = window.setTimeout(() => setSetupError("Sign-in is still loading. Check your connection and reload to start signup."), 10_000);
    return () => window.clearTimeout(timer);
  }, [sdkLoaded]);

  const resend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready || !sdkLoaded) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError("Enter an email address, like name@example.com."); return; }
    setError("");
    void send(email.trim());
  };

  const html = mail ? renderPreview(mail.template, mail.props, "light").html : null;
  const join = mail ? appPath(mail.props.inviteUrl) : null;

  // Clicks on the email's links open the invite here, in the same tab.
  const wire = () => {
    const d = frame.current?.contentDocument;
    if (!d) return;
    setHeight(Math.max(d.documentElement.scrollHeight, d.body?.scrollHeight ?? 0));
    for (const a of Array.from(d.querySelectorAll("a"))) {
      a.addEventListener("click", (ev) => {
        const p = appPath(a.getAttribute("href") ?? "");
        if (p?.startsWith("/join/")) { ev.preventDefault(); router.push(p); }
        else { a.target = "_blank"; a.rel = "noreferrer"; }
      });
    }
  };

  return (
    <Page>
      <div className="mx-auto grid max-w-5xl gap-8 pb-16 lg:grid-cols-12">
        <div className="grid content-start gap-5 lg:col-span-4">
          <div>
            <p className="text-label-md text-ink-brand">Try it yourself · Step 1 of 4</p>
            <h1 className="mt-2 font-display text-display-sm text-balance text-ink">You&apos;ve got an invite.</h1>
            <p className="mt-3 text-body-md text-ink-muted">No invite is required to join. This is the optional email a Gigster gets from the waitlist. Press <b className="text-ink">Create your profile</b> in it to sign up, build a profile and see how it looks.</p>
          </div>
          {setupError && <Banner tone="danger" title="Signup setup couldn't finish"
            action={<Button onClick={() => { if (sdkLoaded) void send(email.trim() || SAMPLE); else window.location.reload(); }}>Retry setup</Button>}>{setupError}</Banner>}
          {ready && sdkLoaded
            ? <ButtonLink href="/join/" variant="primary" iconEnd={<ArrowRight />}>Sign up without an invite</ButtonLink>
            : <Button variant="primary" disabled loading>Preparing signup</Button>}
          {clerkEmail && (
            <Banner tone="warning" title="Try signing up again">
              The previous sign-in used {clerkEmail}. You can sign up with any email above, or preview an optional invite below.
            </Banner>
          )}
          <form onSubmit={resend} className="grid gap-3 rounded-xl border border-line bg-surface p-4">
            <Field label="Send the invite to" error={error}
              hint={clerkEnabled ? "Use your real email to get the real sign-in code. Keep the sample, and you can skip sign-in on the next page." : "Any email works. Nothing is sent."}>
              <Input id="demo-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} start={<Mail />} autoComplete="email" />
            </Field>
            <Button type="submit" variant="secondary" disabled={!ready || !sdkLoaded} loading={!ready || !sdkLoaded} iconStart={<Send />}>Send the invite</Button>
          </form>
          <p className="text-body-sm text-ink-subtle">Everything saves in this browser only. Nothing reaches our team yet, and no email leaves this page except Clerk&apos;s sign-in code.</p>
        </div>

        <div className="grid content-start gap-3 lg:col-span-8">
          {sentTo && <p className="text-body-sm text-ink-muted">To: <b className="text-ink">{sentTo}</b> · From: Between Gigs &lt;hello@between-gigs.com&gt;</p>}
          <div className="overflow-hidden rounded-xl border border-line bg-surface-embed shadow-lg">
            {html ? (
              <iframe ref={frame} title="Your invite email" srcDoc={html} onLoad={wire} className="block w-full" style={{ height: `${height}px` }} />
            ) : (
              <div className="grid gap-3 p-8" aria-busy="true" aria-label="Preparing your invite"><Skeleton className="h-8 w-1/2" /><Skeleton /><Skeleton shape="block" className="h-64" /></div>
            )}
          </div>
          {join && (
            <Banner tone="info" title="Button not working?">
              <Button size="sm" variant="primary" iconEnd={<ArrowRight />} onClick={() => router.push(join)}>Open my invite</Button>
            </Banner>
          )}
        </div>
      </div>
    </Page>
  );
}
