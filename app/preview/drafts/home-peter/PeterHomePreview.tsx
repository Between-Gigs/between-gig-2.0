"use client";

import Link from "next/link";
import { Logo, ThemeToggle } from "@ds/components";
import { ArrowRight } from "lucide-react";
import { PhotoStage } from "@/components/ds/organisms";
import { SiteFooter } from "@/components/site/SiteFooter";
import { STILL_LIFE } from "@/components/landing/ComingSoon";
import { ButtonLink } from "@/components/ui/ButtonLink";

/** Peter's November 13 direction, isolated for review. Delete this route to retire it. */
export function PeterHomePreview() {
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-ink">
      <header className="relative z-sticky border-b border-line bg-bg shadow-sm">
        <div className="mx-auto grid max-w-7xl grid-cols-2 items-center gap-2 sm:grid-cols-3 px-4 py-3 sm:gap-4 sm:px-6 lg:py-5">
          <Link href="/" aria-label="Between Gigs home" className="inline-flex min-h-11 w-fit items-center rounded-md">
            <Logo height={28} className="hidden md:block" />
            <Logo layout="mark" height={28} className="md:hidden" />
          </Link>
          <p className="order-3 col-span-2 pb-1 text-center font-display text-heading-sm sm:order-none sm:col-span-1 sm:pb-0 font-semibold leading-tight sm:text-heading-md" data-preview-title>
            Los Angeles Call Sheet
          </p>
          <div className="flex items-center justify-end gap-1 sm:gap-2">
            <ThemeToggle size="sm" showLabel={false} className="min-h-11" />
            <Link href="/login/" className="inline-flex min-h-11 shrink-0 items-center rounded-full px-2 text-label-sm font-medium hover:bg-surface-hover sm:px-3 sm:text-label-md">Sign in</Link>
          </div>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="flex flex-1 flex-col outline-none">
        <PhotoStage {...STILL_LIFE} className="flex flex-1 items-center" aria-labelledby="peter-home-title">
          <div className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-8 md:py-20">
            <div className="grid justify-items-center gap-6 rounded-2xl bg-bg/90 px-5 py-8 text-center shadow-sm backdrop-blur-sm sm:px-8 md:bg-transparent md:px-0 md:py-0 md:shadow-none md:backdrop-blur-none dark:bg-bg/90 dark:md:bg-transparent">
              {/* Button-shaped announcement, not a misleading disabled call to action. */}
              <p className="inline-flex items-center gap-4 rounded-full border border-line-strong bg-surface-brand px-7 py-3 text-label-md font-semibold uppercase tracking-widest text-ink-on-brand shadow-sm sm:gap-6 sm:px-10">
                <span aria-hidden="true" className="h-px w-6 bg-accent-gold sm:w-10" />
                Coming soon
                <span aria-hidden="true" className="h-px w-6 bg-accent-gold sm:w-10" />
              </p>
              <p className="max-w-xl text-label-sm font-semibold uppercase tracking-widest text-ink-muted sm:text-label-md">Extraordinary talent. Everyday solutions.</p>
              <h1 id="peter-home-title" className="my-2 w-full max-w-lg">
                <Logo height={128} className="h-auto w-full" />
              </h1>
              <p className="max-w-2xl text-body-lg leading-relaxed sm:text-heading-sm">Put your behind-the-scenes skills to work beyond the set.</p>
              <div className="grid w-full justify-items-center gap-3 sm:mt-2">
                <ButtonLink href="/join/" variant="primary" size="lg" iconEnd={<ArrowRight aria-hidden="true" />} className="min-h-14 max-w-full gap-3 whitespace-normal! rounded-full px-5 text-label-md sm:px-8 sm:text-heading-sm">
                  Create your Gigster profile
                </ButtonLink>
                <p className="text-body-md font-semibold italic">It’s free to join!</p>
              </div>
              <div className="grid max-w-xl justify-items-center gap-4 sm:mt-1">
                <span aria-hidden="true" className="h-px w-16 bg-accent-gold" />
                <p className="text-body-lg leading-relaxed">Let us connect you to businesses and individuals who need your expertise.</p>
              </div>
            </div>
          </div>
        </PhotoStage>
      </main>
      <SiteFooter />
      <aside aria-label="Preview notice" className="border-t border-line bg-surface px-4 py-3 text-center text-label-sm text-ink-muted">
        Homepage direction preview · Not the current homepage · <Link href="/" className="underline underline-offset-4">View current homepage</Link>
      </aside>
    </div>
  );
}
