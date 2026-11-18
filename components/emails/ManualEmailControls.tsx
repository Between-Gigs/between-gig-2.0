"use client";

import * as React from "react";
import { Button, ConfirmDialog, Textarea } from "@ds/components";
import {
  canStartAnotherManualRequest, manualBindingMatchesName, manualReceiptStatus, manualRecipient,
  manualRetryMatches, savedManualEmailRequests, type ManualEmailName, type ManualEmailRequest,
  type ManualPreview, type Receipt, type ReleaseStatus,
} from "@/lib/email-manual";
import { StoredEmailCopy } from "./StoredEmailCopy";
import { ManualEmailApiError, manualEmailToken, requestManualEmail, useOwnerEmailOperation } from "./manual-request";

type AvailablePreview = Extract<ManualPreview, { available: true }>;

const unavailable: Record<string, string> = {
  manual_sends_disabled: "Manual resends are disabled in Company OS.",
  automation_unavailable: "This notification has no verified manual resend configuration.",
  account_unavailable: "Company OS could not match that address to a single account and profile.",
  context_missing_or_ambiguous: "Company OS could not identify a single profile for this notification.",
  context_state_changed: "The profile is no longer in a state that permits this notification.",
  source_event_unavailable: "Company OS could not verify the source event for this profile notification.",
  review_unavailable: "Company OS could not verify the current review and its notes.",
  original_history_unavailable: "Company OS could not verify the original notification in send history.",
  original_pending: "The original notification is still pending. Check it before resending.",
  original_delivery_unconfirmed: "Sending stopped on the original notification, but the email provider may already have accepted it.",
  template_missing: "Company OS could not find the applicable stored template.",
  template_ambiguous: "Company OS found more than one applicable stored template.",
  published_release_required: "The applicable stored template needs a published release.",
  delivery_preferences: "The account’s delivery preferences do not allow this resend.",
  manual_send_pending: "Another delivery of this notification is pending.",
  manual_history_unavailable: "The outcome of a previous delivery of this notification is unavailable.",
  manual_delivery_unconfirmed: "Sending stopped on a previous resend, but the email provider may already have accepted it.",
  unsafe_link: "A link in the stored email could not be verified.",
  unsafe_html: "The stored email HTML could not be verified.",
};

function unavailableReason(reason: string) {
  return Object.hasOwn(unavailable, reason)
    ? unavailable[reason]
    : "Company OS could not verify that this notification can be resent for the entered account.";
}

const ownerAccessRefusals = new Set([
  "super-admin only", "no access to this tenant", "read_only_identity", "submit_only_identity", "account_not_invited",
]);

function freshRefusalReason(error: unknown) {
  if (!(error instanceof ManualEmailApiError)) return null;
  // These authorization codes originate in the site gateway or Company OS prehandlers.
  if (error.status === 401 && error.code === "unauthorized") return "Sign in with your owner account, then review the email again.";
  if (error.status === 403) {
    if (error.code === "email_not_verified") return "Verify the owner account’s email, then sign in and review the email again.";
    if (ownerAccessRefusals.has(error.code)) return "Company OS requires owner permission for this resend. Sign in with an authorized owner account.";
  }
  // These business refusals occur after same-ID lookup and before queue reservation.
  if (error.status !== 409) return null;
  if (error.code === "binding_changed") return "The reviewed email changed. Review it again before sending.";
  return Object.hasOwn(unavailable, error.code) ? unavailable[error.code] : null;
}

function readRequests(key: string, name: ManualEmailName) {
  const raw = sessionStorage.getItem(key);
  if (raw === null) return null;
  const saved = savedManualEmailRequests(JSON.parse(raw), name);
  if (!saved) throw new Error("Invalid saved resend intent");
  return saved;
}

function clearRequest(key: string, name: ManualEmailName, request: ManualEmailRequest) {
  const stored = readRequests(key, name);
  const confirmed = stored?.requests.find(item => item.binding.recipient === request.binding.recipient);
  if (!stored || confirmed?.requestId !== request.requestId || !manualRetryMatches(confirmed.binding, request.binding)) {
    throw new Error("Saved intent changed");
  }
  const requests = stored.requests.filter(item => item.requestId !== request.requestId);
  if (requests.length === 0) sessionStorage.removeItem(key);
  else {
    const lastRecipient = stored.lastRecipient === request.binding.recipient ? requests[requests.length - 1].binding.recipient : stored.lastRecipient;
    sessionStorage.setItem(key, JSON.stringify({ lastRecipient, requests }));
  }
  return requests;
}

function validateReceipt(result: Receipt, request: ManualEmailRequest) {
  if (result?.requestId !== request.requestId || result.recipient !== request.binding.recipient || typeof result.status !== "string") {
    throw new Error("Unverified resend receipt");
  }
  return result;
}

export function ManualEmailControls({ name, identity, release }: { name: ManualEmailName; identity: string; release?: ReleaseStatus }) {
  const [storageReady, setStorageReady] = React.useState(false);
  const [recipient, setRecipient] = React.useState("");
  const [requests, setRequests] = React.useState<ManualEmailRequest[]>([]);
  const [preview, setPreview] = React.useState<AvailablePreview | null>(null);
  const [confirming, setConfirming] = React.useState(false);
  const [resetConfirming, setResetConfirming] = React.useState(false);
  const [receipt, setReceipt] = React.useState<Receipt | null>(null);
  const [message, setMessage] = React.useState("");
  const { busy, run } = useOwnerEmailOperation();
  const key = `bg-email-real:${encodeURIComponent(identity)}:${name}`;

  React.useEffect(() => {
    if (!identity) return;
    let current = true;
    queueMicrotask(() => {
      if (!current) return;
      try {
        const saved = readRequests(key, name);
        if (saved) {
          setRequests(saved.requests);
          setRecipient(saved.lastRecipient);
        }
        sessionStorage.setItem(`${key}:check`, "1");
        sessionStorage.removeItem(`${key}:check`);
        setStorageReady(true);
      } catch {
        setMessage("Real resend unavailable because this browser cannot safely preserve the request.");
      }
    });
    return () => { current = false; };
  }, [identity, key, name]);

  const address = manualRecipient(recipient);
  const pending = requests.find(request => request.binding.recipient === address);
  const otherRequests = requests.filter(request => request !== pending);
  const changeRecipient = (value: string) => {
    setRecipient(value);
    setPreview(null);
    setConfirming(false);
    setResetConfirming(false);
    setMessage("");
    if (manualRecipient(value) !== address) setReceipt(null);
  };
  const publishedRelease = release?.supported && release.current?.status === "published"
    && release.current.sourceHash === release.sourceHash && release.current.templateId === release.templateId
    ? release.current
    : null;
  const readyToReview = storageReady && !!address && !!publishedRelease && !receipt;
  const readyToSend = readyToReview && !!preview && preview.binding.releaseId === publishedRelease?.id
    && preview.binding.recipient === address && (!pending || manualRetryMatches(pending.binding, preview.binding));

  const prepare = () => run(async signal => {
    if (!readyToReview || !address || !publishedRelease) return;
    setPreview(null);
    setMessage("");
    try {
      const result = await requestManualEmail("previewReal", { name, recipient: address }, signal);
      signal.throwIfAborted();
      if (result.available === false) {
        setMessage(unavailableReason(result.reason));
        return;
      }
      if (result.available !== true || !manualBindingMatchesName(result.binding, name) || result.binding.recipient !== address
        || result.person?.email !== address || result.binding.releaseId !== publishedRelease.id) {
        setMessage("The stored version or recipient could not be confirmed. Refresh the stored version and review again.");
        return;
      }
      if (pending && !manualRetryMatches(pending.binding, result.binding)) {
        setMessage("The notification changed since the saved request. Check its receipt before taking further action.");
        return;
      }
      setPreview(result);
      setConfirming(false);
    } catch (error) {
      if (!signal.aborted) {
        setMessage(error instanceof ManualEmailApiError && error.status === 401
          ? "Sign in with your owner account to preview this resend."
          : "Company OS could not prepare a resend preview. Try reviewing again.");
      }
    }
  });

  const submit = () => run(async signal => {
    if (!confirming || !readyToSend || !preview) return;
    setConfirming(false);
    setPreview(null);
    setMessage("");
    // A missing or failed token lookup cannot dispatch this send, so leave existing intents untouched.
    let token: string;
    try {
      token = await manualEmailToken(signal);
    } catch {
      if (!signal.aborted) setMessage("Could not verify your owner sign-in. Sign in, then review the email again.");
      return;
    }
    if (signal.aborted) return;
    try {
      // Recheck storage synchronously before allocating an intent, including when this view was remounted.
      const stored = readRequests(key, name);
      const saved = stored?.requests.find(request => request.binding.recipient === preview.binding.recipient);
      if (saved?.requestId !== pending?.requestId || (saved && !manualRetryMatches(saved.binding, preview.binding))) {
        setMessage("The saved request changed. Reopen this email and check the request receipt.");
        return;
      }
      const request = saved ?? { requestId: crypto.randomUUID(), binding: preview.binding };
      const nextRequests = saved && stored ? stored.requests : [...(stored?.requests ?? []), request];
      sessionStorage.setItem(key, JSON.stringify({ lastRecipient: request.binding.recipient, requests: nextRequests }));
      setRequests(nextRequests);
      try {
        const result = await requestManualEmail("sendReal", { name, ...request }, signal, token);
        signal.throwIfAborted();
        setReceipt(validateReceipt(result, request));
      } catch (error) {
        if (signal.aborted) return;
        // A refusal to retry doesn't settle an earlier request that timed out in transit.
        const refusal = !saved && freshRefusalReason(error);
        if (!refusal) {
          setMessage("Company OS did not confirm the outcome. Check the receipt or review and retry the same request.");
          return;
        }
        try {
          setRequests(clearRequest(key, name, request));
          setMessage(`The server declined this resend before queuing it. ${refusal}`);
        } catch {
          setMessage("The server declined this resend before queuing it. The browser could not clear this saved request safely.");
        }
      }
    } catch {
      setMessage("Real resend unavailable because this browser could not save the request before sending.");
    }
  });

  const refresh = () => run(async signal => {
    if (!pending) return;
    setMessage("");
    try {
      const result = await requestManualEmail("realReceipt", { name, requestId: pending.requestId }, signal);
      signal.throwIfAborted();
      setReceipt(validateReceipt(result, pending));
      setPreview(null);
    } catch (error) {
      if (!signal.aborted) setMessage(error instanceof ManualEmailApiError && error.status === 404
        ? "Company OS has no receipt for this request. Its outcome is still unconfirmed."
        : "The request receipt is temporarily unavailable.");
    }
  });

  const startAgain = () => {
    if (!resetConfirming || busy || !pending || !canStartAnotherManualRequest(receipt?.status)) return;
    setResetConfirming(false);
    try {
      setRequests(clearRequest(key, name, pending));
      setReceipt(null);
      setPreview(null);
      setRecipient("");
      setMessage("");
    } catch {
      setMessage("Could not clear the saved request safely. Reopen this email and check its receipt.");
    }
  };

  return <div className="grid min-w-0 gap-3">
    <p className="text-body-sm text-ink-muted">Resend a prior profile notification to the person’s account email. Company OS checks the recipient, current profile state and published template before allowing a resend.</p>
    <label htmlFor={`real-recipient-${name}`} className="text-label-sm text-ink">Account email address</label>
    <Textarea id={`real-recipient-${name}`} rows={1} inputMode="email" autoComplete="off" value={recipient}
      disabled={busy} placeholder="person@example.com" onChange={event => changeRecipient(event.target.value)} />
    {otherRequests.length > 0 && <details className="text-body-sm text-ink-muted">
      <summary className="min-h-8 cursor-pointer">Saved requests for other accounts</summary>
      <ul className="grid gap-1">
        {otherRequests.map(request => <li key={request.requestId}>
          <Button size="sm" variant="ghost" className="max-w-full whitespace-normal break-all" disabled={busy}
            onClick={() => changeRecipient(request.binding.recipient)}>{request.binding.recipient}</Button>
        </li>)}
      </ul>
    </details>}
    {!publishedRelease && <p className="text-body-sm text-ink-muted">
      {release?.supported ? "Real resend requires a published release of the current stored template."
        : "Real resend availability is unverified. Check the stored template version below."}
    </p>}
    {pending && <div className="grid gap-2 rounded-md border border-line bg-surface-sunken p-3">
      <p className="text-label-sm text-ink">Saved real resend request</p>
      <p className="break-all font-mono text-data-sm text-ink-muted">{pending.requestId}</p>
      <p role="status" className="text-body-sm text-ink-muted">
        {receipt ? manualReceiptStatus(receipt.status) : "Outcome unconfirmed. Any retry here uses this same request."}
      </p>
      {(receipt?.status === "delivery_unconfirmed" || receipt?.status === "failed") && <p className="text-body-sm text-ink-muted">
        The email provider may already have accepted this resend.
      </p>}
      <Button size="sm" disabled={busy} onClick={() => void refresh()}>Check resend receipt</Button>
      {canStartAnotherManualRequest(receipt?.status) && <Button size="sm" variant="ghost" disabled={busy} onClick={() => setResetConfirming(true)}>Start a separate resend</Button>}
    </div>}
    {!receipt && <Button size="sm" disabled={!readyToReview || busy} onClick={() => void prepare()}>
      {pending ? "Review same request" : "Review real email"}
    </Button>}
    {preview && <div className="grid gap-3 rounded-md border border-line px-4 py-3">
      <h3 className="font-display text-heading-sm text-ink">Real email preview</h3>
      <p className="text-body-sm text-ink-muted">
        {preview.person.name ? `${preview.person.name} · ` : ""}{preview.person.email} · Profile state: {preview.contextState.replaceAll("_", " ")}
      </p>
      <p className="text-body-sm text-ink-muted">Original notification · {manualReceiptStatus(preview.originalReceipt.status)}</p>
      <StoredEmailCopy subject={preview.subject} body={preview.body} bodyHtml={preview.bodyHtml} />
      {publishedRelease && preview.binding.releaseId !== publishedRelease.id && <p className="text-body-sm text-ink-muted">The stored release changed. Review the real email again before sending.</p>}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="danger" disabled={!readyToSend || busy} onClick={() => setConfirming(true)}>
          {pending ? "Continue same REAL resend" : "Continue to REAL resend"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => { setConfirming(false); setPreview(null); }}>Cancel preview</Button>
      </div>
    </div>}
    <p role="status" aria-live="polite" className="text-body-sm text-ink-muted">{message}</p>
    <ConfirmDialog open={confirming && readyToSend && !busy} onCancel={() => setConfirming(false)} onConfirm={() => void submit()}
      title={`Send a REAL email to ${preview?.binding.recipient ?? "this account"}?`}
      description="This requests delivery of the reviewed profile notification to the account address."
      confirmLabel={pending ? "Retry same REAL resend" : "Send REAL email"} />
    <ConfirmDialog open={resetConfirming} onCancel={() => setResetConfirming(false)} onConfirm={startAgain}
      title="Start a separate real resend?"
      description="The recipient can receive another email. You’ll review and confirm the new request before sending."
      confirmLabel="Start a separate resend" tone="default" />
  </div>;
}
