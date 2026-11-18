"use client";

import * as React from "react";
import { Button, ConfirmDialog } from "@ds/components";
import type { EmailTemplate } from "@/lib/data";
import { nextReleaseAction, type ReleaseAction, type ReleaseStatus } from "@/lib/email-manual";
import { StoredEmailCopy } from "./StoredEmailCopy";
import { ManualEmailApiError, requestManualEmail, useOwnerEmailOperation } from "./manual-request";

const actions: Record<ReleaseAction, { label: string; prompt: string; detail: string }> = {
  draft: {
    label: "Create stored draft",
    prompt: "Create a draft of the stored template?",
    detail: "Company OS will snapshot the current stored subject and body for review.",
  },
  approve: {
    label: "Approve stored draft",
    prompt: "Approve this stored draft?",
    detail: "Confirm that you reviewed the stored subject and body. Publication is a separate decision.",
  },
  publish: {
    label: "Publish approved version",
    prompt: "Publish this approved version for manual resends?",
    detail: "Company OS will make this version eligible for manual approval checks and record your decision. Publishing a version does not send email or change an automatic trigger.",
  },
  revoke: {
    label: "Revoke published version",
    prompt: "Revoke this published version?",
    detail: "Company OS will stop using this version to authorize new manual resends. Requests that already exist keep their receipts.",
  },
};

const releaseReason: Record<string, string> = {
  template_missing: "Company OS has no installed source template for this email.",
  template_unavailable: "The stored Company OS source template is unavailable.",
  template_ambiguous: "Company OS found multiple candidates for this stored template.",
  unsupported: "Company OS does not support release history for this template.",
};

function releaseNotAvailable(reason?: string) {
  return reason && Object.hasOwn(releaseReason, reason)
    ? releaseReason[reason]
    : "Stored template history is unavailable or unsupported by this backend.";
}

export function TemplateReleaseControls({ name, enabled, status, onStatus }: {
  name: EmailTemplate;
  enabled: boolean;
  status?: ReleaseStatus;
  onStatus: (status?: ReleaseStatus) => void;
}) {
  const [message, setMessage] = React.useState("");
  const [loaded, setLoaded] = React.useState(false);
  const [confirmation, setConfirmation] = React.useState<ReleaseAction | null>(null);
  const { busy, run } = useOwnerEmailOperation();

  const refresh = React.useCallback(() => run(async signal => {
    if (!enabled) return;
    setMessage("");
    onStatus(undefined);
    try {
      const result = await requestManualEmail("manualStatus", name, signal);
      signal.throwIfAborted();
      onStatus(result);
    } catch {
      if (!signal.aborted) setMessage("Company OS could not verify stored template history. Refresh to check again.");
    } finally {
      if (!signal.aborted) setLoaded(true);
    }
  }), [enabled, name, onStatus, run]);

  React.useEffect(() => {
    let current = true;
    queueMicrotask(() => { if (current && enabled) void refresh(); });
    return () => { current = false; };
  }, [enabled, refresh]);

  const action = status?.supported ? nextReleaseAction(status.templateId, status.sourceHash, status.current) : null;
  const confirm = () => run(async signal => {
    if (!enabled || !status?.templateId || !status.sourceHash || !action || confirmation !== action) return;
    setConfirmation(null);
    setMessage("");
    onStatus(undefined);
    try {
      const result = await requestManualEmail("releaseVersion", {
        name,
        action,
        templateId: status.templateId,
        sourceHash: status.sourceHash,
        ...(action !== "draft" && status.current ? { releaseId: status.current.id } : {}),
      }, signal);
      signal.throwIfAborted();
      onStatus(result);
    } catch (error) {
      if (!signal.aborted) setMessage(error instanceof ManualEmailApiError && error.status === 409
        ? "The stored version changed. Refresh and review the current version before deciding again."
        : "Company OS did not confirm this action. Refresh stored history before attempting another change.");
    }
  });

  const current = status?.current?.sourceHash === status?.sourceHash && status?.current?.templateId === status?.templateId ? status?.current : null;
  const staleSource = !!status?.current && !current;
  const decision = confirmation ? actions[confirmation] : null;
  return <section aria-label="Stored template versions" className="grid min-w-0 gap-3 rounded-lg border border-line bg-surface p-5">
    <h2 className="font-display text-heading-md text-ink">Stored template versions</h2>
    <p className="text-body-sm text-ink-muted">These releases track the copy stored in Company OS. The sample preview and automatic trigger configuration are separate.</p>
    {!enabled ? <p className="text-body-sm text-ink-muted">Stored version history requires a live owner session.</p> : <>
      {!loaded && <p role="status" className="text-body-sm text-ink-muted">Checking stored template history…</p>}
      {status && !status.supported && <p className="text-body-sm text-ink-muted">{releaseNotAvailable(status.reason)}</p>}
      {status?.supported && !current && <p className="text-body-sm text-ink-muted">
        {staleSource ? "The stored source changed. Create a draft to review the current copy." : "No recorded release for the current stored template."}
      </p>}
      {current && <>
        <dl className="grid gap-1 text-body-sm text-ink-muted">
          <div><dt className="inline font-semibold">Current release </dt><dd className="inline capitalize">{current.status}</dd></div>
          <div><dt className="inline font-semibold">Version hash </dt><dd className="inline break-all font-mono text-data-sm">{current.sourceHash}</dd></div>
          {current.approvedAt && <div><dt className="inline font-semibold">Approved </dt><dd className="inline"><time dateTime={current.approvedAt}>{new Date(current.approvedAt).toLocaleString()}</time></dd></div>}
          {current.publishedAt && <div><dt className="inline font-semibold">Published </dt><dd className="inline"><time dateTime={current.publishedAt}>{new Date(current.publishedAt).toLocaleString()}</time></dd></div>}
        </dl>
        <StoredEmailCopy subject={current.subject} body={current.body} bodyHtml={current.bodyHtml} />
      </>}
      {!!status?.releases?.length && <details className="text-body-sm text-ink-muted">
        <summary className="min-h-8 cursor-pointer">Release history</summary>
        <ul className="grid gap-2">
          {status.releases.map(release => <li key={release.id} className="grid gap-1 border-t border-line pt-2">
            <span className="capitalize">{release.status} · <time dateTime={release.createdAt}>{new Date(release.createdAt).toLocaleString()}</time></span>
            <span className="break-all font-mono text-data-sm">{release.sourceHash}</span>
          </li>)}
        </ul>
      </details>}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => void refresh()}>Refresh stored version</Button>
        {action && <Button size="sm" disabled={busy} onClick={() => setConfirmation(action)}>{actions[action].label}</Button>}
      </div>
    </>}
    <p role="status" aria-live="polite" className="text-body-sm text-ink-muted">{message}</p>
    {decision && <ConfirmDialog open={confirmation === action && !busy} onCancel={() => setConfirmation(null)} onConfirm={() => void confirm()}
      title={decision.prompt} description={decision.detail} confirmLabel={decision.label}
      tone={confirmation === "revoke" ? "danger" : "default"} />}
  </section>;
}
