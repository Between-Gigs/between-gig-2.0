import Link from "next/link";
import { Page } from "@/components/site/Page";

export interface PolicySection { title: string; body: React.ReactNode }

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** A policy page: title, effective date, contents rail, readable column. Copy is the live site's, unchanged. */
export function PolicyPage({ title, sections, children }: { title: string; sections: PolicySection[]; children?: React.ReactNode }) {
  return (
    <Page>
      <div className="grid gap-10 lg:grid-cols-12">
        <aside className="lg:col-span-3">
          <nav aria-label="On this page" className="grid gap-1 lg:sticky lg:top-24">
            <p className="mb-2 text-label-sm text-ink-subtle">On this page</p>
            {sections.map((s) => <a key={s.title} href={`#${slug(s.title)}`} className="inline-flex min-h-6 items-center rounded-xs text-body-sm text-ink-muted hover:text-ink-brand">{s.title}</a>)}
            <div className="mt-6 grid gap-1 border-t border-line pt-4">
              <p className="mb-1 text-label-sm text-ink-subtle">Policies</p>
              {[["/privacy/", "Privacy"], ["/terms/", "Terms of Use"], ["/provider-standards/", "Provider standards"], ["/licensing-insurance/", "Licensing & insurance"]].map(([href, label]) => (
                <Link key={href} href={href} className="inline-flex min-h-6 items-center text-body-sm text-ink-muted hover:text-ink-brand">{label}</Link>
              ))}
            </div>
          </nav>
        </aside>
        <article className="min-w-0 lg:col-span-8">
          <p className="text-eyebrow text-ink-brand uppercase">Between Gigs</p>
          <h1 className="mt-2 font-display text-display-sm text-balance text-ink sm:text-display-md">{title}</h1>
          <p className="mt-2 font-mono text-data-sm text-ink-subtle">Effective September 24, 2026 · Phase 1 waitlist</p>
          <div className="mt-10 grid max-w-prose gap-10 text-body-lg text-ink-muted [&_a]:text-link [&_a]:underline [&_a]:underline-offset-2">
            {sections.map((s) => (
              <section key={s.title} id={slug(s.title)} aria-labelledby={`${slug(s.title)}-h`} className="grid scroll-mt-24 gap-3">
                <h2 id={`${slug(s.title)}-h`} className="font-display text-heading-lg text-ink">{s.title}</h2>
                {s.body}
              </section>
            ))}
            {children}
          </div>
        </article>
      </div>
    </Page>
  );
}
