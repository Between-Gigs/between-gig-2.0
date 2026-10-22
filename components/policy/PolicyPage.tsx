"use client";
import { IconButton, cx } from "@ds/components";
import { ArrowUp, ChevronDown, Mail } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { Page } from "@/components/site/Page";

export interface PolicySection { title: string; body: React.ReactNode }

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const policies = [["/privacy/", "Privacy"], ["/terms/", "Terms of Use"], ["/provider-standards/", "Provider standards"], ["/licensing-insurance/", "Licensing & insurance"]];

/** Highlights the section being read: the last heading that has scrolled past the top third of the screen. */
function useActiveSection(ids: string[]) {
  const [active, setActive] = React.useState(ids[0]);
  React.useEffect(() => {
    const onScroll = () => {
      let current = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top < innerHeight / 3) current = id;
      }
      setActive(current);
    };
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    return () => removeEventListener("scroll", onScroll);
  }, [ids]);
  return active;
}

/**
 * A policy page: title, effective date, a contents rail that follows your place, a readable column, and a
 * contact card. On phones the contents fold into a disclosure and a back-to-top button appears once you've
 * scrolled. Copy is the live site's, unchanged.
 */
export function PolicyPage({ title, sections, children }: { title: string; sections: PolicySection[]; children?: React.ReactNode }) {
  const ids = React.useMemo(() => sections.map((s) => slug(s.title)), [sections]);
  const active = useActiveSection(ids);
  const [scrolled, setScrolled] = React.useState(false);
  React.useEffect(() => {
    const on = () => setScrolled(scrollY > 800);
    addEventListener("scroll", on, { passive: true });
    return () => removeEventListener("scroll", on);
  }, []);
  const words = React.useRef<HTMLDivElement>(null);
  const [minutes, setMinutes] = React.useState<number | null>(null);
  React.useEffect(() => { setMinutes(Math.max(1, Math.round((words.current?.innerText.split(/\s+/).length ?? 0) / 230))); }, []);

  const contents = (
    <ol className="grid gap-0.5">
      {sections.map((s, i) => {
        const on = active === ids[i];
        return (
          <li key={s.title}>
            <a href={`#${ids[i]}`} aria-current={on ? "location" : undefined}
              className={cx("flex min-h-8 items-center gap-3 rounded-md border-l-2 py-1 pr-2 pl-3 text-body-sm transition-colors duration-fast",
                on ? "border-action bg-surface-selected text-ink" : "border-transparent text-ink-muted hover:text-ink-brand")}>
              <span className="w-5 shrink-0 text-ink-subtle tabular-nums">{i + 1}</span>{s.title}
            </a>
          </li>
        );
      })}
    </ol>
  );

  return (
    <Page>
      <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
        <aside className="lg:col-span-3">
          {/* Phones: the contents fold away so the policy starts on the first screen. */}
          <details className="group rounded-xl border border-line bg-surface lg:hidden">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 px-4 text-label-md text-ink">
              On this page <span className="text-ink-subtle">{sections.length} sections</span>
              <ChevronDown aria-hidden="true" className="size-4 text-ink-subtle transition-transform group-open:rotate-180" />
            </summary>
            <nav aria-label="On this page" className="px-2 pb-3">{contents}</nav>
          </details>
          <nav aria-label="Contents" className="hidden gap-1 lg:sticky lg:top-24 lg:grid">
            <p className="mb-2 px-3 text-label-sm text-ink-subtle">On this page</p>
            {contents}
            <div className="mt-6 grid gap-1 border-t border-line px-3 pt-4">
              <p className="mb-1 text-label-sm text-ink-subtle">Policies</p>
              {policies.map(([href, label]) => (
                <Link key={href} href={href} className="inline-flex min-h-6 items-center text-body-sm text-ink-muted hover:text-ink-brand">{label}</Link>
              ))}
            </div>
          </nav>
        </aside>
        <article className="min-w-0 lg:col-span-6">
          <p className="text-eyebrow text-ink-brand uppercase">Between Gigs</p>
          <h1 className="mt-2 font-display text-display-sm text-balance text-ink sm:text-display-md">{title}</h1>
          <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-body-sm text-ink-subtle tabular-nums">
            <span>Effective September 24, 2026</span><span aria-hidden="true">·</span><span>Phase 1 waitlist</span>
            <span aria-hidden="true">·</span><span>{sections.length} sections{minutes ? `, about ${minutes} min read` : ""}</span>
          </p>
          <div ref={words} className="mt-10 grid max-w-prose gap-12 text-body-lg text-ink-muted [&_a]:text-link [&_a]:underline [&_a]:underline-offset-2 [&_p+p]:mt-0">
            {sections.map((s, i) => (
              <section key={s.title} id={ids[i]} aria-labelledby={`${ids[i]}-h`} className="grid scroll-mt-24 gap-3">
                <h2 id={`${ids[i]}-h`} className="flex items-baseline gap-3 font-display text-heading-lg text-ink">
                  <span aria-hidden="true" className="text-heading-sm text-ink-brand tabular-nums">{String(i + 1).padStart(2, "0")}</span>{s.title}
                </h2>
                {s.body}
              </section>
            ))}
            {children}
          </div>
        </article>
        <aside aria-label="Questions" className="hidden lg:col-span-3 lg:block">
          <div className="sticky top-24 grid gap-3 rounded-2xl border border-line bg-surface p-5">
            <p className="font-display text-heading-sm text-ink">Questions about this policy?</p>
            <p className="text-body-sm text-ink-muted">Write to us and a person on the team will answer.</p>
            <a href="mailto:hello@between-gigs.com" className="inline-flex min-h-8 items-center gap-2 text-label-md text-link underline underline-offset-2"><Mail className="size-4" aria-hidden="true" />hello@between-gigs.com</a>
          </div>
        </aside>
      </div>
      <div className={cx("fixed right-4 bottom-4 z-sticky transition-opacity duration-fast print:hidden", scrolled ? "opacity-100" : "pointer-events-none opacity-0")}>
        <IconButton label="Back to top" variant="secondary" icon={<ArrowUp />} tabIndex={scrolled ? 0 : -1} className="shadow-md"
          onClick={() => scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })} />
      </div>
    </Page>
  );
}
