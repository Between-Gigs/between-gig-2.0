"use client";
import { Badge, EmptyState, PageHeader } from "@ds/components";
import { ArrowRight, ArrowUpRight, Inbox } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { emailNames, emailTemplates } from "@/emails";
import { data, type OutboxEmail } from "@/lib/data";
import { AppPage } from "@/components/site/AppPage";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { renderPreview } from "./preview";

const when = (iso: string) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

/** /emails: every email Between Gigs sends, and the sample outbox of everything "sent" so far. */
export function EmailsIndex() {
  const [outbox, setOutbox] = React.useState<OutboxEmail[] | null>(null);
  const [thumbs, setThumbs] = React.useState<Record<string, string>>({});
  React.useEffect(() => {
    void data.emails.outbox().then(setOutbox);
    // Rendered on the client so the logo URLs resolve against this deployment.
    setThumbs(Object.fromEntries(emailNames.map((n) => [n, renderPreview(n, undefined, "light").html]))); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  return (
    <AppPage>
      <PageHeader eyebrow="Messages" title="Emails"
        description="Every email Between Gigs sends, from the invite to the welcome. Open one to see it in light and dark mail apps, on desktop and phone." />

      <ul className="mt-8 grid gap-6 md:grid-cols-3">
        {emailNames.map((n) => {
          const t = emailTemplates[n];
          const sample = renderPreview(n, undefined, "light");
          return (
            <li key={n} className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-sm transition duration-base hover:-translate-y-0.5 hover:shadow-lg">
              <div aria-hidden="true" className="relative h-64 overflow-hidden border-b border-line bg-surface-embed">
                {thumbs[n] && <iframe title="" tabIndex={-1} srcDoc={thumbs[n]} className="pointer-events-none absolute top-0 left-1/2 h-240 w-150 origin-top -translate-x-1/2 scale-50" />}
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
          <EmptyState className="mt-4" icon={<Inbox />} title="Nothing sent yet" headingLevel={3}
            action={<ButtonLink href="/login/" size="sm" iconEnd={<ArrowRight />}>Try a sign-in</ButtonLink>}>
            Sign in with a sample account, submit a profile or invite from the waitlist, and each email lands here as it's sent.
          </EmptyState>
        ) : (
          <ul className="mt-4 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {outbox.map((e) => (
              <li key={e.id} className="relative flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 hover:bg-surface-hover">
                <Badge tone="neutral" size="sm">{emailTemplates[e.template].label}</Badge>
                <Link href={`/emails/${e.template}/?outbox=${e.id}`} className="min-w-0 flex-1 truncate text-label-md text-ink after:absolute after:inset-0 hover:text-ink-brand">{e.subject}</Link>
                <span className="text-body-sm text-ink-muted">{e.to}</span>
                <span className="text-body-sm whitespace-nowrap text-ink-subtle tabular-nums">{when(e.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppPage>
  );
}
