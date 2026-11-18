"use client";
import { EmptyState, SegmentedControl } from "@ds/components";
import { ArrowRight, ArrowUpRight, Inbox, Mail, Send } from "lucide-react";
import * as React from "react";
import { activeEmailNames, emailTemplates } from "@/emails";
import { data, type OutboxEmail } from "@/lib/data";
import { AppPage } from "@/components/site/AppPage";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { OwnerPage, Panel, Row, RowSkeletons } from "@/components/owners/kit";
import { emailTemplateHref } from "@/lib/owner-email-preview";
import { basePath } from "@/lib/site";
import { diagnostic } from "@/emails/diagnostic";
import { forceScheme, previewContext, type PreviewScheme } from "./preview";
import { EmailViewControls } from "./EmailViewControls";
import { EmailPreviewFrame } from "./EmailPreviewFrame";
import type { EmailPreviewDevice, EmailPreviewView } from "@/lib/email-preview-view";
import { useEmailHubStatus } from "./EmailActions";
import { lifecycleWords, usageWords } from "@/lib/email-hub";

import { renderPreview } from "./preview";

const when = (iso: string) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

/**
 * /emails: one slim bar like the owner pages, with a switch between two views: every email Between Gigs sends, and the sample
 * outbox of everything "sent" so far. Nothing else moves when you switch.
 */
export function EmailsIndex() {
  const status = useEmailHubStatus();
  const [outbox, setOutbox] = React.useState<OutboxEmail[] | null>(null);
  const [thumbs, setThumbs] = React.useState<Record<string, string>>({});
  const [tab, setTab] = React.useState("templates");
  const [view, setView] = React.useState<EmailPreviewView>("thumbnails");
  const [device, setDevice] = React.useState<EmailPreviewDevice>("desktop");
  const [scheme, setScheme] = React.useState<PreviewScheme>("light");
  React.useEffect(() => {
    void data.emails.outbox().then(setOutbox);
  }, []);
  React.useEffect(() => {
    // Rendered on the client so the logo URLs resolve against this deployment.
    setThumbs({ ...Object.fromEntries(activeEmailNames.map((n) => [n, renderPreview(n, undefined, scheme).html])), diagnostic: forceScheme(diagnostic(previewContext()).html, scheme) }); // eslint-disable-line react-hooks/set-state-in-effect
  }, [scheme]);

  return (
    <AppPage>
      <OwnerPage title="Emails" meta={tab === "templates" ? activeEmailNames.length + 1 : outbox?.length}
        description={`Email template previews and a fictional sample outbox, not live delivery history. ${data.kind === "live" ? "Open a detail view for separate test and real-send controls." : "Nothing here sends email."} Open a template to review it on desktop and phone.`}
        actions={
          // In the pinned bar, so switching never needs a scroll back up.
          <SegmentedControl label="Show" value={tab} onChange={setTab}
            options={[{ value: "templates", label: "Templates", icon: <Mail /> }, { value: "outbox", label: `Sample outbox${outbox?.length ? ` (${outbox.length})` : ""}`, icon: <Send /> }]} />
        }>
          {tab === "templates" ? (
            <>
            <section aria-label="Email preview views" className="mb-6 grid gap-4">
              <EmailViewControls view={view} device={device} onView={setView} onDevice={setDevice} />
              <SegmentedControl label="Mail client theme" value={scheme} onChange={v => setScheme(v === "dark" ? "dark" : "light")}
                options={[{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }]} />
            </section>
            <ul className={`grid items-stretch gap-5 ${view === "thumbnails" ? "sm:grid-cols-2 xl:grid-cols-3" : ""}`} data-email-gallery={view}>
              {activeEmailNames.map((n) => {
                const t = emailTemplates[n];
                const sample = renderPreview(n, undefined, "light");
                return (
                  <li key={n} data-tilt="" className="lift group relative flex flex-col overflow-hidden rounded-lg border border-line bg-surface">
                    {view !== "list" && thumbs[n] && <EmailPreviewFrame html={thumbs[n]} title={`${t.label} source preview`} view={view} device={device} passive />}
                    <div className="flex flex-1 flex-col gap-1 p-5">
                      <h2 className="font-display text-heading-sm text-ink">
                        <a href={emailTemplateHref(data.kind, n, basePath)} className="rounded-xs after:absolute after:inset-0 group-hover:text-ink-brand">{t.label}</a>
                      </h2>
                      <p className="text-body-sm text-ink-muted">Intended use: {t.when}</p>
                      <p className="text-body-sm text-ink-subtle">{data.kind === "live" ? "Stored approval and publication status in details." : lifecycleWords}</p>
                      <p className="text-body-sm text-ink-subtle">Backend content: {status[n]?.content.replaceAll("_", " ") ?? "not verified"}</p>
                      <p className="text-body-sm text-ink-subtle">{usageWords(status[n])}</p>
                      <dl className="mt-auto grid gap-0.5 border-t border-line pt-3 text-body-sm">
                        <div><dt className="sr-only">Subject</dt><dd className="truncate font-semibold text-ink">{sample.subject}</dd></div>
                        <div><dt className="sr-only">Preheader</dt><dd className="line-clamp-2 text-ink-subtle">{sample.preheader}</dd></div>
                      </dl>
                    </div>
                    <ArrowUpRight aria-hidden="true" className="absolute top-3 right-3 size-6 rounded-full bg-surface p-1 text-ink-brand opacity-0 shadow-sm transition-opacity duration-fast group-hover:opacity-100" />
                  </li>
                );
              })}
              <li className="group relative flex flex-col overflow-hidden rounded-lg border border-line bg-surface">
                {view !== "list" && thumbs.diagnostic && <EmailPreviewFrame html={thumbs.diagnostic} title="Diagnostic source preview" view={view} device={device} passive />}
                <div className="flex flex-1 flex-col gap-1 p-5">
                  <h2 className="font-display text-heading-sm text-ink"><a href={data.kind === "live" ? "/owners/emails/?template=diagnostic" : `${basePath}/emails/?template=diagnostic`} className="after:absolute after:inset-0">Diagnostic email</a></h2>
                  <p className="text-body-sm text-ink-muted">Fictional TEST email to one entered address; existing one-time authorization and receipt are separate.</p>
                  <p className="text-body-sm text-ink-subtle">{lifecycleWords}</p>
                  <p className="text-body-sm text-ink-subtle">Backend content: {status.diagnostic?.content.replaceAll("_", " ") ?? "not verified"}</p>
                  <p className="text-body-sm text-ink-subtle">{usageWords(status.diagnostic)}</p>
                </div>
              </li>
            </ul>
            </>
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
