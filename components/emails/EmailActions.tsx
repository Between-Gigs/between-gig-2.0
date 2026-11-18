"use client";
import * as React from "react";
import { Button, SegmentedControl, Textarea } from "@ds/components";
import { data, type EmailTemplate } from "@/lib/data";
import { apiSource } from "@/lib/data/api";
import { useSession } from "@/lib/session";
import { basePath } from "@/lib/site";
import { plainRecipient, type EmailHubEntry, type EmailHubStatus } from "@/lib/email-hub";
import { EMAIL_TEST_RETRY_MS, TEST_RETRY_EXPIRED, reusableEmailTest, savedEmailTest, type EmailTestAttempt } from "@/lib/email-test-retry";
import { clerkEnabled } from "@/lib/auth/clerk";
import { isManualEmailName, type ReleaseStatus } from "@/lib/email-manual";
import { InviteAddresses } from "./InviteAddresses";
import { ManualEmailControls } from "./ManualEmailControls";
import { TemplateReleaseControls } from "./TemplateReleaseControls";
export async function emailHubRequest(method: "hubStatus" | "testTemplate", args: unknown[] = []) {
  const token = await apiSource.token();
  if (!token) throw new Error("Sign in with your real owner account.");
  const res = await fetch(`${basePath}/api/emails/${method}/`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ args }), cache: "no-store" });
  const body = await res.json();
  if (!res.ok) throw new Error(`${body.error ?? "unavailable"} (${res.status}). No new send is confirmed.`);
  return body.result;
}
export function useEmailHubStatus() {
  const [status, setStatus] = React.useState<EmailHubStatus>({});
  React.useEffect(() => {
    if (data.kind !== "live") return;
    let current = true;
    void emailHubRequest("hubStatus").then(s => { if (current) setStatus(s); }).catch(() => { /* unknown is visible */ });
    return () => { current = false; };
  }, []);
  return status;
}
export function EmailActions(props: { name: EmailTemplate; status?: EmailHubEntry }) {
  const { session, loading } = useSession();
  const email = session?.email ?? "";
  const ownerKey = session?.personId ?? email;
  return <EmailActionsForOwner key={`${ownerKey}:${email}:${props.name}:${loading ? "loading" : "ready"}`} {...props}
    identity={loading ? "" : email} ownerKey={loading ? "" : ownerKey} />;
}
function EmailActionsForOwner({ name, status, identity, ownerKey }: { name: EmailTemplate; status?: EmailHubEntry; identity: string; ownerKey: string }) {
  const [release, setRelease] = React.useState<ReleaseStatus>();
  const [mode, setMode] = React.useState("test");
  const [recipient, setRecipient] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const lock = React.useRef(false);
  const [pending, setPending] = React.useState<EmailTestAttempt | null>(null);
  const [clock, setClock] = React.useState(Date.now);
  const expired = !!pending && !reusableEmailTest(pending, clock);
  React.useEffect(() => {
    if (!pending?.startedAt || expired) return;
    const timer = setTimeout(() => setClock(Date.now()), Math.max(0, pending.startedAt + EMAIL_TEST_RETRY_MS - Date.now()) + 1);
    return () => clearTimeout(timer);
  }, [pending, expired]);
  const [storageReady, setStorageReady] = React.useState(false);
  const storageKey = `bg-email-test:${encodeURIComponent(identity || "signed-out")}:${name}`;
  React.useEffect(() => {
    if (!identity) return;
    queueMicrotask(() => {
      try {
        const saved = sessionStorage.getItem(storageKey);
        if (saved) {
          const p = savedEmailTest(JSON.parse(saved));
          if (p) { setClock(Date.now()); setPending(p); setRecipient(p.recipient); }
          else throw new Error("invalid saved request");
        }
        sessionStorage.setItem(`${storageKey}:check`, "1");
        sessionStorage.removeItem(`${storageKey}:check`);
        setStorageReady(true);
      } catch { setMessage("Test sending unavailable: browser cannot safely preserve retry state."); }
    });
  }, [storageKey, identity]);
  const live = data.kind === "live";
  const send = async () => {
    const address = plainRecipient(recipient);
    if (lock.current || !live || !status?.testEnabled || !storageReady || !address) return;
    if (pending && !reusableEmailTest(pending)) { setClock(Date.now()); setMessage(TEST_RETRY_EXPIRED); return; }
    if (!window.confirm(`Send a TEST email to ${address}? This sends a real email with fictional sample data, TEST markings and inactive personal links. It does not invite anyone or publish content.`)) return;
    lock.current = true;
    setBusy(true);
    setMessage("");
    // Preserve uncertain intent only inside the shorter site retry window. Backend replay expires.
    try {
      const now = Date.now();
      const request = pending ?? { recipient: address, requestId: crypto.randomUUID(), startedAt: now };
      sessionStorage.setItem(storageKey, JSON.stringify(request));
      setClock(now);
      setPending(request);
      await emailHubRequest("testTemplate", [{ name, ...request }]);
      setMessage("Test request accepted for queuing. Delivery and inbox placement are not verified.");
      // A deliberate reset is required before another send.
    } catch (e) { setMessage(e instanceof Error ? `${e.message} Retry uses the same request only within 23 hours of the first attempt; do not change addresses until resolved.` : "Request uncertain. Retry uses the same request only within 23 hours."); }
    finally { lock.current = false; setBusy(false); }
  };
  return <>
    <section aria-label="Sending controls" className="grid gap-3 rounded-lg border border-line bg-surface p-5">
      <h2 className="font-display text-heading-md text-ink">Send email</h2>
      <SegmentedControl label="Send type" value={mode} onChange={setMode} options={[{ value: "test", label: "Test email" }, { value: "real", label: "Real email" }]} />
      {mode === "test" ? <>
        <p className="text-body-sm text-ink-muted">Tests send a real email marked TEST with backend fictional data. They use the stored backend template, which may differ from this source preview. No template is approved or published.</p>
        <label htmlFor={`recipient-${name}`} className="text-label-sm text-ink">Test recipient · one email address</label>
        <Textarea id={`recipient-${name}`} rows={2} value={recipient} disabled={busy || !!pending} onChange={e => setRecipient(e.target.value)} placeholder="you@example.com" />
        <Button size="sm" disabled={!live || !status?.testEnabled || !plainRecipient(recipient) || !storageReady || busy || expired} onClick={() => void send()}>{busy ? "Requesting…" : pending ? "Check / retry same test" : "Send test email"}</Button>
        <p className="text-body-sm text-ink-subtle">{!live ? "Sample preview only. No sending." : !status?.testEnabled ? "Test sending unavailable: backend capability, template and configuration must be verified and enabled." : "Backend authorization, validation and rate limits apply. Retry is offered for up to 23 hours; backend replay lasts at most 24 hours, not indefinitely."}</p>
        {expired && <p role="status" className="text-body-sm text-ink-muted">{TEST_RETRY_EXPIRED}</p>}
        {pending && <Button size="sm" variant="ghost" disabled={busy} onClick={() => { if (window.confirm("Start a new test? Only continue after resolving the previous request in backend test history. A new request can send another email.")) { try { sessionStorage.removeItem(storageKey); setPending(null); setMessage(""); setRecipient(""); } catch { setMessage("Cannot clear saved request safely."); } } }}>Start a new test</Button>}
      </> : name === "invite" && live ? <>
        <p className="text-body-sm text-ink-muted">Sending a real invitation contacts the entered recipients and can create account invitations.</p>
        <InviteAddresses />
      </> : isManualEmailName(name) && live ? <ManualEmailControls name={name} identity={ownerKey} release={release} />
      : name === "sign-in-code" && clerkEnabled && live ? <>
        <p className="text-body-sm text-ink-muted">The account holder can use Clerk sign-in. Clerk sends a code only when its configured sign-in flow requests one.</p>
        <a className="inline-flex min-h-8 items-center text-label-sm text-link underline underline-offset-2" href={`${basePath}/login/`}>Open Clerk sign-in</a>
        <p className="text-body-sm text-ink-subtle">Open the sign-in page while signed out to start authentication. This hub does not send authentication codes.</p>
      </> : <>
        <Button size="sm" disabled>Real send unavailable</Button>
        <p className="text-body-sm text-ink-muted">{!live ? "Sample preview only. Real sending is unavailable."
          : name === "sign-in-code" ? "Real sign-in is unavailable in this environment. Authentication codes require a configured Clerk sign-in flow."
          : "Real sending is unavailable for this template. Company OS has no supported owner resend workflow for it."}</p>
      </>}
      <p role="status" aria-live="polite" className="text-body-sm text-ink-muted">{message}</p>
    </section>
    <TemplateReleaseControls name={name} enabled={live && !!ownerKey} status={release} onStatus={setRelease} />
  </>;
}
