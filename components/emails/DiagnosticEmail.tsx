"use client";
import * as React from "react";
import { Button } from "@ds/components";
import { diagnostic } from "@/emails/diagnostic";
import { data } from "@/lib/data";
import { apiSource } from "@/lib/data/api";
import { basePath } from "@/lib/site";
import { previewContext } from "./preview";
type Receipt = {
  requestId: string;
  status: string;
  requestedAt: string;
  providerId: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  error: string | null;
};
type Status = {
  enabled: boolean;
  recipient: string | null;
  sender: string | null;
  receipt: Receipt | null;
};
export function DiagnosticEmail() {
  const live = data.kind === "live";
  const [status, setStatus] = React.useState<Status | null>(null);
  const [message, setMessage] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [phone, setPhone] = React.useState(false);
  const [html, setHtml] = React.useState("");
  const frame = React.useRef<HTMLIFrameElement>(null);
  const fit = () => {
    const el = frame.current;
    if (el?.contentDocument?.body)
      el.style.height = `${el.contentDocument.documentElement.scrollHeight}px`;
  };
  React.useEffect(() => {
    queueMicrotask(() => setHtml(diagnostic(previewContext()).html));
  }, []);
  React.useEffect(() => {
    fit();
  }, [phone]);
  const request = React.useCallback(async (send = false) => {
    const token = await apiSource.token();
    if (!token)
      throw new Error(
        "Sign in with your real owner account to check delivery.",
      );
    const res = await fetch(
      `${basePath}/api/emails/${send ? "sendDiagnostic" : "diagnosticStatus"}/`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ args: [] }),
        cache: "no-store",
      },
    );
    const body = await res.json();
    if (!res.ok)
      throw new Error(
        body.error === "diagnostic_disabled"
          ? "Diagnostic sending is disabled pending backend review and activation."
          : `Diagnostic unavailable (${res.status}: ${body.error ?? "unknown"}). No new send is confirmed; refresh status before trying again.`,
      );
    setStatus(body.result);
    return body.result as Status;
  }, []);
  React.useEffect(() => {
    if (live)
      queueMicrotask(() => void request().catch((e) => setMessage(e.message)));
  }, [live, request]);
  const act = async (send: boolean) => {
    setBusy(true);
    setMessage("");
    try {
      await request(send);
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : "Status unavailable. Refresh before retrying.",
      );
    } finally {
      setBusy(false);
    }
  };
  const receipt = status?.receipt;
  return (
    <section
      className="mb-6 grid gap-4 rounded-lg border border-line bg-surface p-5"
      aria-labelledby="diagnostic-heading"
    >
      <h2
        id="diagnostic-heading"
        className="font-display text-heading-md text-ink"
      >
        Diagnostic email · one-time test
      </h2>
      <p className="text-body-sm text-ink-muted">
        From hello@between-gigs.com, only to jmassion@gmail.com. Uses our
        existing background, logo and footer. This is separate from invitations,
        welcome emails and the fictional outbox.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button
          size="sm"
          disabled={!live || busy || !status?.enabled || !!receipt}
          onClick={() => void act(true)}
        >
          {busy ? "Checking…" : "Send one diagnostic"}
        </Button>
        {live && (
          <Button size="sm" disabled={busy} onClick={() => void act(false)}>
            Refresh delivery status
          </Button>
        )}
        <Button size="sm" onClick={() => setPhone((v) => !v)}>
          {phone ? "Desktop preview" : "Phone preview"}
        </Button>
      </div>
      <div
        role="status"
        aria-live="polite"
        className="text-body-sm text-ink-muted"
      >
        {!live
          ? "Preview only. Open Emails in the live owner dashboard to send; the sample never sends."
          : message ||
            (!status
              ? "Checking backend availability…"
              : receipt
                ? `Status: ${receipt.status}`
                : status.enabled
                  ? "Ready for the single approved diagnostic."
                  : "Sending is disabled. Backend review, approved configuration and deployment are required.")}
      </div>
      {receipt && (
        <dl className="grid gap-2 break-words text-body-sm text-ink-muted">
          {Object.entries({
            "Request ID": receipt.requestId,
            "Requested at": receipt.requestedAt,
            "Provider ID": receipt.providerId ?? "Not available",
            "Provider accepted at": receipt.sentAt ?? "Not confirmed",
            "Receiving server accepted at":
              receipt.deliveredAt ?? "Not confirmed",
            "Delivery issue": receipt.error ?? "None reported",
          }).map(([k, v]) => (
            <div key={k}>
              <dt className="font-semibold">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      )}
      <p className="text-body-sm text-ink-subtle">
        Queued means stored for sending. Sent means provider acceptance.
        Delivered means acceptance by the receiving mail server, not confirmed
        inbox placement. Failed, bounced or cancelled do not permit a second
        diagnostic. Refresh after an uncertain request; duplicate clicks reuse
        the same request.
      </p>
      <div
        className={
          phone ? "mx-auto w-full max-w-sm" : "mx-auto w-full max-w-160"
        }
      >
        {html && (
          <iframe
            ref={frame}
            title="Diagnostic email preview"
            sandbox="allow-same-origin"
            srcDoc={html}
            onLoad={fit}
            className="w-full border-0"
          />
        )}
      </div>
    </section>
  );
}
