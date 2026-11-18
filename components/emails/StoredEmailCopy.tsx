/** Stored HTML is untrusted content. The frame is inert and cannot load remote assets or execute code. */
export function StoredEmailCopy({ subject, body, bodyHtml }: { subject: string; body: string; bodyHtml: string }) {
  const html = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; form-action 'none'; base-uri 'none'">${bodyHtml}`;
  return <div className="grid min-w-0 gap-2">
    <p className="break-words text-label-md text-ink">{subject}</p>
    <pre className="max-h-60 overflow-y-auto whitespace-pre-wrap break-words font-mono text-data-sm text-ink">{body}</pre>
    {bodyHtml && <details className="text-body-sm text-ink-muted">
      <summary className="min-h-8 cursor-pointer">View stored HTML preview</summary>
      <p className="pb-2">Links and remote images are disabled here.</p>
      <iframe title="Stored email HTML" sandbox="" inert tabIndex={-1} referrerPolicy="no-referrer" srcDoc={html}
        className="pointer-events-none block h-100 w-full rounded-md border border-line bg-surface-embed" />
    </details>}
  </div>;
}
