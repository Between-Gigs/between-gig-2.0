"use client";
import { Badge, EmptyState, PageHeader } from "@ds/components";
import { ArrowUpRight, Inbox } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { emailNames, emailTemplates } from "@/emails";
import { data, type OutboxEmail } from "@/lib/data";
import { Page } from "@/components/site/Page";
import { renderPreview } from "./preview";

const when = (iso: string) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

/** /emails: the three Milestone 2 templates, and the sample outbox of everything "sent" so far. */
export function EmailsIndex() {
  const [outbox, setOutbox] = React.useState<OutboxEmail[] | null>(null);
  const [thumbs, setThumbs] = React.useState<Record<string, string>>({});
  React.useEffect(() => {
    void data.emails.outbox().then(setOutbox);
    // Rendered on the client so the logo URLs resolve against this deployment.
    setThumbs(Object.fromEntries(emailNames.map((n) => [n, renderPreview(n, undefined, "light").html]))); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  return (
    <Page>
      <PageHeader eyebrow="Milestone 2" title="Emails"
        description="Templates are plain functions that return a subject, preheader, HTML and a plain-text twin, ready for the Resend pipeline. Open one to check it in light and dark, desktop and phone." />

      <ul className="mt-8 grid gap-6 md:grid-cols-3">
        {emailNames.map((n) => {
          const t = emailTemplates[n];
          const sample = renderPreview(n, undefined, "light");
          return (
            <li key={n} className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-sm transition duration-base hover:-translate-y-0.5 hover:shadow-lg">
              <div aria-hidden="true" className="relative h-64 overflow-hidden border-b border-line bg-surface-embed">
                {thumbs[n] && <iframe title="" tabIndex={-1} srcDoc={thumbs[n]} className="pointer-events-none h-240 w-150 origin-top-left scale-50" />}
              </div>
              <div className="flex flex-1 flex-col gap-2 p-5">
                <h2 className="font-display text-heading-lg text-ink">
                  <Link href={`/emails/${n}/`} className="rounded-xs after:absolute after:inset-0 hover:text-ink-brand">{t.label}</Link>
                </h2>
                <p className="text-body-sm text-ink-muted">{t.when}</p>
                <dl className="mt-auto grid gap-1 border-t border-line pt-3 text-body-sm">
                  <div><dt className="sr-only">Subject</dt><dd className="font-semibold text-ink">{sample.subject}</dd></div>
                  <div><dt className="sr-only">Preheader</dt><dd className="text-ink-subtle">{sample.preheader}</dd></div>
                </dl>
              </div>
              <ArrowUpRight aria-hidden="true" className="absolute top-3 right-3 size-5 rounded-full bg-surface p-0.5 text-ink-brand shadow-sm" />
            </li>
          );
        })}
      </ul>

      <section aria-labelledby="outbox-h" className="mt-14">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="outbox-h" className="font-display text-display-sm text-ink">Sample outbox</h2>
          <p className="text-caption text-ink-subtle">Emails the sample would have sent. Nothing leaves this browser.</p>
        </div>
        {outbox === null ? null : outbox.length === 0 ? (
          <EmptyState className="mt-4" icon={<Inbox />} title="Nothing sent yet" headingLevel={3}>
            Sign in, or submit a profile, and the sign-in code and confirmation emails land here.
          </EmptyState>
        ) : (
          <ul className="mt-4 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {outbox.map((e) => (
              <li key={e.id} className="relative flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 hover:bg-surface-hover">
                <Badge tone="neutral" size="sm">{emailTemplates[e.template].label}</Badge>
                <Link href={`/emails/${e.template}/?outbox=${e.id}`} className="min-w-0 flex-1 truncate text-label-md text-ink after:absolute after:inset-0 hover:text-ink-brand">{e.subject}</Link>
                <span className="text-body-sm text-ink-muted">{e.to}</span>
                <span className="font-mono text-data-sm text-ink-subtle">{when(e.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Page>
  );
}
