"use client";
import * as React from "react";
import { Button, SegmentedControl, Textarea } from "@ds/components";
import { data, type EmailTemplate } from "@/lib/data";
import { apiSource } from "@/lib/data/api";
import { useSession } from "@/lib/session";
import { basePath } from "@/lib/site";
import { plainRecipient, type EmailHubEntry, type EmailHubStatus } from "@/lib/email-hub";
import { InviteAddresses } from "./InviteAddresses";
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
export function EmailActions({ name, status }: { name: EmailTemplate; status?: EmailHubEntry }) {
  const { session } = useSession();
  const [mode, setMode] = React.useState("test");
  const [recipient, setRecipient] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const lock = React.useRef(false);
  const [pending, setPending] = React.useState<{ recipient: string; requestId: string } | null>(null);
  const [storageReady, setStorageReady] = React.useState(false);
  const storageKey = `bg-email-test:${encodeURIComponent(session?.email ?? "signed-out")}:${name}`;
  React.useEffect(() => {
    if (!session?.email) return;
    queueMicrotask(() => {
      try {
        const saved = sessionStorage.getItem(storageKey);
        if (saved) {
          const p = JSON.parse(saved);
          if (plainRecipient(p.recipient) && typeof p.requestId === "string") { setPending(p); setRecipient(p.recipient); }
          else throw new Error("invalid saved request");
        }
        sessionStorage.setItem(`${storageKey}:check`, "1");
        sessionStorage.removeItem(`${storageKey}:check`);
        setStorageReady(true);
      } catch { setMessage("Test sending unavailable: browser cannot safely preserve retry state."); }
    });
  }, [storageKey, session?.email]);
  const live = data.kind === "live";
  const send = async () => {
    const address = plainRecipient(recipient);
    if (lock.current || !live || !status?.testEnabled || !storageReady || !address) return;
    if (!window.confirm(`Send a TEST email to ${address}? This sends a real email with fictional sample data, TEST markings and inactive personal links. It does not invite anyone or publish content.`)) return;
    lock.current = true;
    setBusy(true);
    setMessage("");
    // Keep the exact request on uncertain outcomes. Retrying replays backend receipt.
    try {
      const request = pending ?? { recipient: address, requestId: crypto.randomUUID() };
      sessionStorage.setItem(storageKey, JSON.stringify(request));
      setPending(request);
      await emailHubRequest("testTemplate", [{ name, ...request }]);
      setMessage("Test request accepted for queuing. Delivery and inbox placement are not verified.");
      // A deliberate reset is required before another send.
    } catch (e) { setMessage(e instanceof Error ? `${e.message} Retry checks the same request; do not change addresses until resolved.` : "Request uncertain. Retry uses the same request."); }
    finally { lock.current = false; setBusy(false); }
  };
  return <section aria-label="Sending controls" className="grid gap-3 rounded-lg border border-line bg-surface p-5">
    <h2 className="font-display text-heading-md text-ink">Send email</h2>
    <SegmentedControl label="Send type" value={mode} onChange={setMode} options={[{ value: "test", label: "Test email" }, { value: "real", label: "Real email" }]} />
    {mode === "test" ? <>
      <p className="text-body-sm text-ink-muted">Tests send a real email marked TEST with backend fictional data. They use the stored backend template, which may differ from this source preview. No template is approved or published.</p>
      <label htmlFor={`recipient-${name}`} className="text-label-sm text-ink">Test recipient · one email address</label>
      <Textarea id={`recipient-${name}`} rows={2} value={recipient} disabled={busy || !!pending} onChange={e => setRecipient(e.target.value)} placeholder="you@example.com" />
      <Button size="sm" disabled={!live || !status?.testEnabled || !plainRecipient(recipient) || !storageReady || busy} onClick={() => void send()}>{busy ? "Requesting…" : pending ? "Check / retry same test" : "Send test email"}</Button>
      <p className="text-body-sm text-ink-subtle">{!live ? "Sample preview only. No sending." : !status?.testEnabled ? "Test sending unavailable: backend capability, template and configuration must be verified and enabled." : "Backend authorization, validation, rate limits and replay protection apply."}</p>
      {pending && <Button size="sm" variant="ghost" disabled={busy} onClick={() => { if (window.confirm("Start a new test? Only continue after resolving the previous request in backend test history. A new request can send another email.")) { try { sessionStorage.removeItem(storageKey); setPending(null); setMessage(""); setRecipient(""); } catch { setMessage("Cannot clear saved request safely."); } } }}>Start a new test</Button>}
    </> : <>
      <p className="text-body-sm text-ink-muted">Real emails contact people and can create account invitations. They are separate from template tests.</p>
      {name === "invite" && live ? <InviteAddresses /> : <>
        <label htmlFor={`real-recipient-${name}`} className="text-label-sm text-ink">Recipient email address</label>
        <Textarea id={`real-recipient-${name}`} rows={2} placeholder="person@example.com" />
        <Button size="sm" disabled>Real send unavailable</Button>
        <p className="text-body-sm text-ink-subtle">{name === "sign-in-code" ? "Clerk owns sign-in codes; this preview cannot generate or send a usable code." : "This email requires its authorized application event and recipient data. A safe manual real-send workflow is not available; preview content does not grant sending authority."}</p>
      </>}
    </>}
    <p role="status" aria-live="polite" className="text-body-sm text-ink-muted">{message}</p>
  </section>;
}
