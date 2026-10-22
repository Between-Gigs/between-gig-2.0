"use client";
import { Logo, ThemeToggle, cx } from "@ds/components";
import { buttonSizes, buttonVariants } from "@ds/components/Button";
import { Reveal } from "@ds/motion";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

const links = [
  { label: "For professionals", href: "/professionals/" },
  { label: "Storyboard", href: "/storyboard/" },
  { label: "Privacy", href: "/privacy/" },
  { label: "Terms", href: "/terms/" },
];

/**
 * Milestone 5a: today's home page, the "call sheet", rebuilt from the design system's ComingSoon template.
 * Same words as the live page: "Extraordinary talent. Everyday solutions." / "Coming soon." /
 * "Los Angeles Call Sheet" / "Get on the call sheet ↗" → /professionals. Always a dark-theme island.
 */
export function CallSheetHome() {
  return (
    <div data-theme="dark" className="flex min-h-dvh bg-bg p-2 sm:p-3">
      <div className="backdrop-europium relative isolate flex flex-1 flex-col overflow-hidden rounded-xl border border-line text-ink sm:rounded-2xl">
        <span aria-hidden="true" className="glow-horizon" />

        <header className="relative z-raised flex items-center justify-between gap-4 px-6 py-6 sm:px-10">
          <Link href="/" aria-label="Between Gigs home" className="rounded-md"><Logo height={30} /></Link>
          <div className="flex items-center gap-3">
            <Link href="/login/" className="inline-flex min-h-8 items-center rounded-md px-2 text-label-md text-ink-muted transition-colors duration-fast hover:text-ink">Sign in</Link>
            <ThemeToggle size="sm" showLabel={false} />
          </div>
        </header>

        <main id="main" className="relative z-raised flex flex-1 flex-col items-center justify-center gap-6 px-6 pt-10 pb-24 text-center">
          <Reveal effect="fade-up"><p className="text-eyebrow text-ink-brand uppercase">Extraordinary talent. Everyday solutions.</p></Reveal>
          <Reveal effect="fade-up" delay={80}>
            <h1 className="max-w-3xl font-display text-display-lg text-balance text-ink sm:text-display-xl">
              Coming <span className="glow-text text-ink-brand">soon.</span>
            </h1>
          </Reveal>
          <Reveal effect="fade-up" delay={160}><p className="text-body-lg text-ink-muted">Los Angeles Call Sheet</p></Reveal>
          <Reveal effect="fade-up" delay={240}>
            <Link href="/professionals/"
              className={cx("group glow-hover mt-4 inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-sans whitespace-nowrap transition-colors duration-fast [&_svg]:size-5",
                buttonVariants.primary, buttonSizes.lg, "h-14 px-8 text-heading-sm")}>
              Get on the call sheet
              <ArrowUpRight aria-hidden="true" className="transition-transform duration-base group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </Reveal>
        </main>

        <footer className="relative z-raised flex flex-wrap items-center justify-between gap-3 px-6 py-5 text-caption text-ink-subtle sm:px-10">
          <span>© 2026 Between Gigs</span>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="inline-flex min-h-6 items-center rounded-xs text-ink-muted underline-offset-4 transition-colors duration-fast hover:text-ink-brand hover:underline">{l.label}</Link>
            ))}
            <a href="mailto:hello@between-gigs.com" className="inline-flex min-h-6 items-center rounded-xs text-ink-muted underline-offset-4 transition-colors duration-fast hover:text-ink-brand hover:underline">hello@between-gigs.com</a>
          </nav>
        </footer>
      </div>
    </div>
  );
}
