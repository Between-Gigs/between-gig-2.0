"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { basePath } from "@/lib/site";
import { buttonSizes, buttonVariants } from "@ds/components/Button";
import { Logo, ThemeToggle } from "@ds/components";
import { ArrowRight } from "lucide-react";
import { PhotoStage } from "@/components/ds/organisms";
import { SiteFooter } from "@/components/site/SiteFooter";
import { STILL_LIFE } from "@/components/landing/ComingSoon";


function subscribeTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}
function readTheme(): "light" | "dark" { return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light"; }

/** Peter's November 13 direction, isolated for review. Delete this route to retire it. */
export function PeterHomePreview() {
  const theme = useSyncExternalStore<"light" | "dark">(subscribeTheme, readTheme, () => "light");
  const joinHref = basePath === "/hub" ? "/join/" : `${basePath}/join/`;
  function changeTheme(next: "light" | "dark") {
    // Apply immediately: this review page should never wait on a view-transition callback.
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("bg-theme", next); } catch { /* storage blocked: still switches */ }
  }
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-ink">
      <header className="relative z-sticky border-b border-line bg-bg shadow-sm">
        <div className="mx-auto grid max-w-7xl grid-cols-2 items-center gap-x-2 gap-y-0 sm:grid-cols-3 px-4 py-2 sm:gap-x-3 sm:px-6">
          <Link href="/" aria-label="Between Gigs home" className="inline-flex min-h-11 w-fit items-center rounded-md">
            <Logo height={28} className="hidden lg:block" />
            <Logo layout="mark" height={28} className="lg:hidden" />
          </Link>
          <p className="order-3 col-span-2 min-w-0 max-w-full break-words text-center font-display text-heading-sm sm:order-none sm:col-span-1 font-semibold leading-tight" data-preview-title>
            Los Angeles Call Sheet
          </p>
          <div className="flex items-center justify-end gap-1 sm:gap-2">
            <ThemeToggle theme={theme} onChange={changeTheme} size="sm" showLabel={false} />
            <a href={joinHref} className="inline-flex min-h-11 shrink-0 items-center rounded-full px-2 text-label-sm font-medium hover:bg-surface-hover sm:px-3 sm:text-label-md">Join / Sign in</a>
          </div>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="flex flex-1 flex-col outline-none">
        <PhotoStage {...STILL_LIFE} className="flex flex-1 items-center" aria-labelledby="peter-home-title">
          <div className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-8 md:py-20 md:pb-32">
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
                <a href={joinHref} className={`inline-flex items-center justify-center min-h-14 max-w-full gap-3 whitespace-normal rounded-full px-5 text-label-md sm:px-8 sm:text-heading-sm ${buttonVariants.primary} ${buttonSizes.lg}`}>
                  Create your Gigster profile <ArrowRight aria-hidden="true" className="size-4 shrink-0" />
                </a>
                <p className="text-body-md font-semibold italic">It’s free to join!</p>
              </div>
              <div className="grid w-full max-w-3xl justify-items-center gap-1 sm:mt-1 md:max-w-sm lg:max-w-xl" data-preview-connection>
                <p className="flex max-w-full items-center justify-center gap-3 text-body-md font-normal italic leading-relaxed sm:gap-5 sm:text-body-lg">
                  <span aria-hidden="true" className="h-px w-4 shrink-0 bg-accent-gold lg:w-16" />
                  <span>Let us connect you to</span>
                  <span aria-hidden="true" className="h-px w-4 shrink-0 bg-accent-gold lg:w-16" />
                </p>
                <p className="text-body-md font-normal leading-relaxed sm:text-body-lg">businesses and individuals</p>
                <p className="text-body-md font-bold leading-relaxed sm:text-body-lg">who need your expertise.</p>
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
