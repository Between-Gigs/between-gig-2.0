"use client";
import * as React from "react";
import { Button, Textarea } from "@ds/components";
import { data } from "@/lib/data";

type Result = { email: string; result: "sent" | "already_member" | "suppressed" | "opted_out" | "invalid" | "failed" };

/** Plain words for each outcome, one line per address. */
export const resultWords: Record<Result["result"], string> = {
  sent: "Invitation accepted for sending; delivery not verified.",
  already_member: "Skipped: this address already has an account.",
  suppressed: "Not sent: this address asked us not to contact them.",
  opted_out: "Not sent: this person unsubscribed from our emails.",
  invalid: "Not sent: this isn't a valid email address.",
  failed: "Outcome uncertain. Check invitation and delivery history before retrying.",
};

const LIMIT = 10;
const split = (text: string) => [...new Set(text.split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean))];

/** The Invitation email to addresses typed here: for testing delivery to ourselves, or inviting people who never opted in. */
export function InviteAddresses() {
  const send = data.owners.inviteAddresses;
  const lock = React.useRef(false);
  const [text, setText] = React.useState("");
  const [uncertain, setUncertain] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [results, setResults] = React.useState<Result[]>([]);
  const emails = split(text);
  if (!send) return null;

  const submit = async () => {
    if (lock.current || uncertain) return;
    if (!window.confirm(`Send the invitation to ${emails.length} ${emails.length === 1 ? "address" : "addresses"}? Each person gets a marketing invitation with an unsubscribe link. This is a REAL invitation, not a template test. Addresses with an account are skipped.`)) return;
    lock.current = true;
    setBusy(true);
    setMessage("");
    setResults([]);
    try {
      const outcome = await send(emails);
      setResults(outcome);
      if (outcome.some(r => r.result === "failed")) setUncertain(true);
    } catch {
      setUncertain(true);
      setMessage("Outcome uncertain. Do not resend until an owner checks backend invitation and delivery history; retrying can send another invitation.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  return (
    <section className="mb-6 grid gap-4 rounded-lg border border-line bg-surface p-5" aria-labelledby="invite-addresses-heading">
      <h2 id="invite-addresses-heading" className="font-display text-heading-md text-ink">Send this invitation to…</h2>
      <p className="text-body-sm text-ink-muted">
        Type or paste up to {LIMIT} email addresses, separated by commas, spaces or new lines. Each person gets a marketing invitation with an unsubscribe link.
        This is a REAL invitation, not a template test. Addresses with an account are skipped.
      </p>
      <label htmlFor="invite-addresses" className="sr-only">Email addresses</label>
      <Textarea id="invite-addresses" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="you+test@example.com, someone@example.org" />
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" disabled={uncertain || busy || emails.length === 0 || emails.length > LIMIT} onClick={() => void submit()}>
          {busy ? "Sending…" : emails.length ? `Send to ${emails.length} ${emails.length === 1 ? "address" : "addresses"}` : "Send invitation"}
        </Button>
        {emails.length > LIMIT && <span className="text-body-sm text-ink-muted">Too many: at most {LIMIT} at a time.</span>}
      </div>
      <div role="status" aria-live="polite" className="text-body-sm text-ink-muted">
        {message}
        {results.length > 0 && (
          <ul className="grid gap-1">
            {results.map((r) => (
              <li key={r.email}><span className="font-semibold text-ink">{r.email}</span> · {resultWords[r.result]}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
