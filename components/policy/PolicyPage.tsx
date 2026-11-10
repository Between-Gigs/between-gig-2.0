"use client";
import { IconButton, cx } from "@ds/components";
import { ArrowUp, ChevronDown, Mail } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const raw = usePathname();
  const pathname = raw.endsWith("/") ? raw : `${raw}/`;
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
              className={cx("flex min-h-8 items-baseline gap-3 border-l-4 py-1.5 pr-2 pl-3 text-body-sm transition-colors duration-fast",
                on ? "border-line-strong font-bold text-ink" : "border-transparent text-ink-muted hover:text-ink")}>
              <span className="w-5 shrink-0 text-label-sm text-ink-subtle tabular-nums">{String(i + 1).padStart(2, "0")}</span>{s.title}
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
          <details className="group border-t-4 border-b border-line-strong lg:hidden">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 text-label-md text-ink [&::-webkit-details-marker]:hidden">
              On this page <span className="text-ink-subtle">{sections.length} sections</span>
              <ChevronDown aria-hidden="true" className="size-4 text-ink-subtle transition-transform group-open:rotate-180" />
            </summary>
            <nav aria-label="On this page" className="pb-3">{contents}</nav>
          </details>
          <nav aria-label="Contents" className="hidden gap-1 border-t-4 border-line-strong pt-3 lg:sticky lg:top-24 lg:grid">
            <p className="mb-2 text-eyebrow text-ink-muted uppercase">On this page</p>
            {contents}
            <div className="mt-6 grid gap-1 border-t border-line pt-3">
              <p className="mb-1 text-eyebrow text-ink-muted uppercase">Policies</p>
              {policies.map(([href, label]) => (
                <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}
                  className="inline-flex min-h-8 items-center text-body-sm text-ink-muted hover:text-ink hover:underline hover:underline-offset-4 aria-[current=page]:font-bold aria-[current=page]:text-ink">{label}</Link>
              ))}
            </div>
          </nav>
        </aside>
        <article className="min-w-0 lg:col-span-6 lg:border-t-4 lg:border-line-strong lg:pt-3">
          <p className="text-eyebrow text-ink-brand uppercase">Between Gigs</p>
          <h1 className="mt-2 font-display text-display-sm text-balance text-ink sm:text-display-md">{title}</h1>
          <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-body-sm text-ink-subtle tabular-nums">
            <span>Effective September 24, 2026</span><span aria-hidden="true">·</span><span>Phase 1 waitlist</span>
            <span aria-hidden="true">·</span><span>{sections.length} sections{minutes ? `, about ${minutes} min read` : ""}</span>
          </p>
          {/* The reading column: 65ch, sections on hairlines, lists and tables set for reading if a policy gains them. */}
          <div ref={words} className="mt-12 grid max-w-prose gap-12 text-body-lg text-pretty text-ink-muted [&_a]:text-link [&_a]:underline [&_a]:underline-offset-2 [&_li]:pl-1 [&_li+li]:mt-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_p+p]:mt-0 [&_table]:w-full [&_table]:border-t-2 [&_table]:border-line-strong [&_table]:text-body-md [&_td]:border-b [&_td]:border-line [&_td]:py-2 [&_td]:pr-4 [&_td]:align-top [&_th]:border-b [&_th]:border-line-strong [&_th]:py-2 [&_th]:pr-4 [&_th]:text-left [&_th]:text-label-md [&_th]:text-ink [&_ul]:list-disc [&_ul]:pl-6">
            {sections.map((s, i) => (
              <section key={s.title} id={ids[i]} aria-labelledby={`${ids[i]}-h`} className="grid scroll-mt-28 gap-3 border-t border-line pt-3">
                <h2 id={`${ids[i]}-h`} className="grid gap-1 font-display text-heading-md text-balance text-ink">
                  <span aria-hidden="true" className="font-sans text-label-sm tracking-normal text-ink-brand tabular-nums">{String(i + 1).padStart(2, "0")}</span>{s.title}
                </h2>
                {s.body}
              </section>
            ))}
            {children}
          </div>
        </article>
        <aside aria-label="Questions" className="hidden lg:col-span-3 lg:block">
          <div className="sticky top-24 grid gap-3 border-t-4 border-line-strong pt-3">
            <p className="font-display text-heading-sm text-ink">Questions about this policy?</p>
            <p className="text-body-sm text-ink-muted">Write to us and a person on the team will answer.</p>
            <a href="mailto:hello@between-gigs.com" className="inline-flex min-h-11 items-center gap-2 text-label-md text-link underline underline-offset-2"><Mail className="size-4" aria-hidden="true" />hello@between-gigs.com</a>
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
