"use client";
import { EmptyState, SegmentedControl } from "@ds/components";
import { ArrowRight, ArrowUpRight, Inbox, Mail, Send } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { emailNames, emailTemplates } from "@/emails";
import { data, type OutboxEmail } from "@/lib/data";
import { AppPage } from "@/components/site/AppPage";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { OwnerPage, Panel, Row, RowSkeletons } from "@/components/owners/kit";
import { renderPreview } from "./preview";

const when = (iso: string) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

/**
 * /emails: one slim bar like the owner pages, with a switch between two views: every email Between Gigs sends, and the sample
 * outbox of everything "sent" so far. Nothing else moves when you switch.
 */
export function EmailsIndex() {
  const [outbox, setOutbox] = React.useState<OutboxEmail[] | null>(null);
  const [thumbs, setThumbs] = React.useState<Record<string, string>>({});
  const [tab, setTab] = React.useState("templates");
  React.useEffect(() => {
    void data.emails.outbox().then(setOutbox);
    // Rendered on the client so the logo URLs resolve against this deployment.
    setThumbs(Object.fromEntries(emailNames.map((n) => [n, renderPreview(n, undefined, "light").html]))); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  return (
    <AppPage>
      <OwnerPage title="Emails" meta={tab === "templates" ? emailNames.length : outbox?.length}
        description="Every email Between Gigs sends, from the invite to the welcome, and the sample outbox. Open one to see it in light and dark mail apps, on desktop and phone."
        actions={
          // In the pinned bar, so switching never needs a scroll back up.
          <SegmentedControl label="Show" value={tab} onChange={setTab}
            options={[{ value: "templates", label: "All emails", icon: <Mail /> }, { value: "outbox", label: `Sample outbox${outbox?.length ? ` (${outbox.length})` : ""}`, icon: <Send /> }]} />
        }>
          {tab === "templates" ? (
            <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {emailNames.map((n) => {
                const t = emailTemplates[n];
                const sample = renderPreview(n, undefined, "light");
                return (
                  <li key={n} data-tilt="" className="lift group relative flex flex-col overflow-hidden rounded-lg border border-line bg-surface">
                    <EmailThumb html={thumbs[n]} />
                    <div className="flex flex-1 flex-col gap-1 p-5">
                      <h2 className="font-display text-heading-sm text-ink">
                        <Link href={`/emails/${n}/`} className="rounded-xs after:absolute after:inset-0 group-hover:text-ink-brand">{t.label}</Link>
                      </h2>
                      <p className="text-body-sm text-ink-muted">{t.when}</p>
                      <dl className="mt-auto grid gap-0.5 border-t border-line pt-3 text-body-sm">
                        <div><dt className="sr-only">Subject</dt><dd className="truncate font-semibold text-ink">{sample.subject}</dd></div>
                        <div><dt className="sr-only">Preheader</dt><dd className="line-clamp-2 text-ink-subtle">{sample.preheader}</dd></div>
                      </dl>
                    </div>
                    <ArrowUpRight aria-hidden="true" className="absolute top-3 right-3 size-6 rounded-full bg-surface p-1 text-ink-brand opacity-0 shadow-sm transition-opacity duration-fast group-hover:opacity-100" />
                  </li>
                );
              })}
            </ul>
          ) : outbox?.length === 0 ? (
                <EmptyState icon={<Inbox />} title="Nothing sent yet" headingLevel={3}
                  action={<ButtonLink href="/login/" size="sm" iconEnd={<ArrowRight />}>Try a sign-in</ButtonLink>}>
                  Sign in, submit a profile or send an invite, and each email lands here.
                </EmptyState>
          ) : (
            <Panel title="Sent from the sample" flush aside={<span>Nothing leaves this browser</span>}>
              {outbox === null ? <RowSkeletons count={3} /> : (
                <ul>
                  {outbox.map((e) => (
                    <Row key={e.id} href={`/emails/${e.template}/?outbox=${e.id}`} title={e.subject}
                      leading={<span className="grid size-10 place-items-center rounded-md bg-surface-selected text-ink-brand"><Mail className="size-5" aria-hidden="true" /></span>}
                      subtitle={`${emailTemplates[e.template].label} · to ${e.to}`}
                      meta={<span>{when(e.createdAt)}</span>} />
                  ))}
                </ul>
              )}
            </Panel>
          )}
      </OwnerPage>
    </AppPage>
  );
}

/**
 * A live miniature of an email: drawn at its real 600px width and scaled to fill the card, with no scroll bar
 * (the frame never scrolls; the card opens the full preview).
 */
function EmailThumb({ html }: { html?: string }) {
  const box = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(0.5);
  React.useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setScale(e.contentRect.width / 600));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const doc = html?.replace("</head>", "<style>html,body{overflow:hidden!important;scrollbar-width:none}::-webkit-scrollbar{display:none}</style></head>");
  return (
    <div ref={box} aria-hidden="true" className="relative h-56 overflow-hidden border-b border-line bg-surface-embed">
      {doc && (
        <iframe title="" tabIndex={-1} srcDoc={doc} scrolling="no"
          className="pointer-events-none absolute top-0 left-0 w-150 origin-top-left"
          style={{ transform: `scale(${scale})`, height: `${Math.ceil(224 / scale)}px` }} />
      )}
      <span className="absolute inset-x-0 bottom-0 h-10 bg-linear-to-t from-surface to-transparent" />
    </div>
  );
}
