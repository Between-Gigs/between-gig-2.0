"use client";
import { Badge, Banner, Breadcrumbs, Button, SegmentedControl, Tab, TabList, TabPanel, Tabs, useToast } from "@ds/components";
import { Copy, Monitor, Moon, Smartphone, Sun } from "lucide-react";
import { useSearchParams } from "next/navigation";
import * as React from "react";
import { emailTemplates } from "@/emails";
import { data, type EmailTemplate, type OutboxEmail } from "@/lib/data";
import { AppPage } from "@/components/site/AppPage";
import { OwnerPage } from "@/components/owners/kit";
import { renderPreview, type PreviewScheme } from "./preview";
import { basePath } from "@/lib/site";

const widths = { desktop: "w-full max-w-160", mobile: "w-full max-w-sm" } as const;

/** /emails/[name]: one template in light or dark, desktop or phone width, with its subject, preheader and text twin. */
export function EmailPreview({ name }: { name: EmailTemplate }) {
  return (
    <React.Suspense fallback={<AppPage><span /></AppPage>}>
      <Preview name={name} />
    </React.Suspense>
  );
}

function Preview({ name }: { name: EmailTemplate }) {
  const t = emailTemplates[name];
  const outboxId = useSearchParams().get("outbox");
  const toast = useToast();
  const [scheme, setScheme] = React.useState<PreviewScheme>("light");
  const [width, setWidth] = React.useState<keyof typeof widths>("desktop");
  const [tab, setTab] = React.useState("html");
  const [queued, setQueued] = React.useState<OutboxEmail | null>(null);
  const [email, setEmail] = React.useState<ReturnType<typeof renderPreview> | null>(null);
  const frame = React.useRef<HTMLIFrameElement>(null);

  React.useEffect(() => {
    if (!outboxId) return;
    void data.emails.get(outboxId).then((e) => setQueued(e && e.template === name ? e : null));
  }, [outboxId, name]);

  React.useEffect(() => {
    setEmail(renderPreview(name, queued?.props, scheme)); // eslint-disable-line react-hooks/set-state-in-effect
  }, [name, queued, scheme]);

  // Grow the frame to the email's height, so the page scrolls, not the frame.
  const fit = () => {
    const doc = frame.current?.contentDocument;
    if (frame.current && doc?.body) frame.current.style.height = `${doc.documentElement.scrollHeight}px`;
  };
  React.useEffect(() => { fit(); }, [width, email]);

  const copy = async (text: string, what: string) => {
    try { await navigator.clipboard.writeText(text); toast({ message: `${what} copied`, tone: "success" }); }
    catch { toast({ message: "Couldn't copy. Select the text instead.", tone: "danger" }); }
  };

  return (
    <AppPage>
      {/* The owner pages' slim bar: pinned while you scroll, with its one action in reach. */}
      <OwnerPage title={t.label} description={t.when}
        breadcrumbs={<Breadcrumbs items={[{ label: "Emails", href: `${basePath}/emails/` }, { label: t.label }]} />}
        actions={email && <Button size="sm" iconStart={<Copy />} onClick={() => copy(email.html, "HTML")}>Copy HTML</Button>}>
      {queued && <Banner tone="info" title="From the sample outbox">Showing the email queued for {queued.to}. Nothing was sent.</Banner>}

      <div className="grid gap-6 lg:grid-cols-12">
        <aside className="grid content-start gap-4 lg:col-span-4">
          <section aria-labelledby="env-h" className="rounded-lg border border-line bg-surface p-5">
            <h2 id="env-h" className="font-display text-heading-md text-ink">In the inbox</h2>
            <dl className="mt-3 grid gap-3 text-body-sm">
              {[
                ["When", t.when],
                ["From", "Between Gigs <hello@between-gigs.com>"],
                ["To", queued?.to ?? (t.sample as Record<string, string>).email ?? "riley.park@example.com"],
                ["Subject", email?.subject],
                ["Preheader", email?.preheader],
              ].map(([k, v]) => (
                <div key={k} className="grid gap-0.5 border-t border-line pt-3 first:border-0 first:pt-0">
                  <dt className="text-label-sm text-ink-subtle">{k}</dt>
                  <dd className={k === "Subject" ? "text-label-md text-ink" : "text-ink-muted"}>{v}</dd>
                </div>
              ))}
            </dl>
            {!queued && <p className="mt-3 border-t border-line pt-3 text-body-sm text-ink-subtle">Shown with fictional sample details.</p>}
          </section>
          <section aria-labelledby="view-h" className="grid gap-3 rounded-lg border border-line bg-surface p-5">
            <h2 id="view-h" className="font-display text-heading-md text-ink">View</h2>
            <SegmentedControl label="Mail client theme" value={scheme} onChange={(v) => setScheme(v as PreviewScheme)}
              options={[{ value: "light", label: "Light", icon: <Sun /> }, { value: "dark", label: "Dark", icon: <Moon /> }]} />
            <SegmentedControl label="Screen width" value={width} onChange={(v) => setWidth(v as keyof typeof widths)}
              options={[{ value: "desktop", label: "Desktop", icon: <Monitor /> }, { value: "mobile", label: "Phone", icon: <Smartphone /> }]} />
            <p className="text-body-sm text-ink-subtle">Dark is what Apple Mail and Outlook.com show in dark mode. Gmail keeps the light version.</p>
          </section>
          <section aria-labelledby="notes-h" className="rounded-lg border border-line bg-surface p-5">
            <h2 id="notes-h" className="font-display text-heading-md text-ink">Built for every inbox</h2>
            <ul className="mt-2 grid gap-1.5 text-body-sm text-ink-muted">
              <li>Tables and inline styles, 600px wide</li>
              <li>Bulletproof button for Outlook desktop</li>
              <li>Logo as PNG with alt text</li>
              <li>Plain-text twin for every send</li>
            </ul>
            <div className="mt-3 flex flex-wrap gap-1.5"><Badge size="sm" tone="neutral">Gmail</Badge><Badge size="sm" tone="neutral">Apple Mail</Badge><Badge size="sm" tone="neutral">Outlook</Badge></div>
          </section>
        </aside>

        {/* Phones: the email first, its details after. */}
        <div className="order-first min-w-0 lg:order-none lg:col-span-8">
          <Tabs value={tab} onChange={setTab}>
            <TabList label="Format">
              <Tab value="html">HTML</Tab>
              <Tab value="text">Plain text</Tab>
            </TabList>
            <TabPanel value="html" className="pt-4">
              <div className="grid justify-items-center rounded-lg border border-line bg-surface-sunken p-3 sm:p-6">
                <div className={`${widths[width]} overflow-hidden rounded-xl border border-line bg-surface-embed shadow-md transition-all duration-slow`}>
                  {email && <iframe ref={frame} title={`${t.label} email, ${scheme} theme`} srcDoc={email.html} onLoad={fit} className="block h-240 w-full" />}
                </div>
              </div>
            </TabPanel>
            <TabPanel value="text" className="pt-4">
              <div className="relative rounded-lg border border-line bg-surface p-5">
                <Button size="sm" variant="ghost" iconStart={<Copy />} className="absolute top-3 right-3" onClick={() => email && copy(email.text, "Plain text")}>Copy</Button>
                <pre className="overflow-x-auto pt-8 font-mono text-data-sm whitespace-pre-wrap text-ink">{email?.text}</pre>
              </div>
            </TabPanel>
          </Tabs>
        </div>
      </div>
      </OwnerPage>
    </AppPage>
  );
}
