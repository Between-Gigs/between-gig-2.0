"use client";
/*
 * Coming soon (/), the client's logo-led hero (art and copy from the client via Justin, 14 Nov 2026; first reviewed
 * at /preview/drafts/home-peter/). The still life fills the screen between the header and the footer; "Coming soon"
 * is a forest seal, the brand line and the full logo lead, and the one button goes straight to sign-up (/join/).
 * The closing three lines break where the client asked, with only "who need your expertise." in bold.
 * Earlier designs: /preview/drafts/coming-soon-v1/ (CallSheetHome) and /preview/drafts/coming-soon-v2/ (ComingSoonV2).
 */
import { Logo } from "@ds/components";
import { PhotoStage } from "@/components/ds/organisms";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { JoinButton } from "./JoinCta";

export const STILL_LIFE = { image: "/art/stage/still-life-desktop.jpg", portrait: "/art/stage/still-life-portrait.jpg" } as const;

/** A short gold rule either side of a line, as on the client's art. */
const Rule = ({ className = "w-8 sm:w-12" }: { className?: string }) => <span aria-hidden="true" className={`h-px shrink-0 bg-accent-gold ${className}`} />;

export function ComingSoon() {
  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip bg-bg text-ink">
      <SiteHeader />
      <main id="main" tabIndex={-1} className="flex flex-1 flex-col outline-none">
        <PhotoStage {...STILL_LIFE} aria-labelledby="home-title" className="flex flex-1 items-center">
          <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-8 md:py-16">
            {/* Phones get a soft panel so the copy reads over the still life; from md the photo frames it on its own. */}
            <div className="grid justify-items-center rounded-2xl bg-bg/90 px-5 py-8 max-xs:px-4 text-center shadow-sm backdrop-blur-sm sm:px-10 md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-none dark:bg-bg/85 dark:md:bg-transparent">
              {/* An announcement shaped like the art's seal, not a disabled button. */}
              <p className="inline-flex items-center gap-4 rounded-full bg-surface-brand px-6 py-2.5 whitespace-nowrap max-xs:gap-2.5 max-xs:px-4 text-label-md font-bold tracking-widest text-ink-on-brand uppercase shadow-md ring-1 ring-accent-gold/40 sm:gap-6 sm:px-10 sm:py-3 sm:text-body-lg">
                <Rule className="w-6 max-xs:w-4 sm:w-12" />Coming soon<Rule className="w-6 max-xs:w-4 sm:w-12" />
              </p>
              <p className="mt-5 max-w-xl text-label-sm font-bold tracking-widest text-balance text-ink uppercase sm:text-label-md">Extraordinary talent. Everyday solutions.</p>
              <h1 id="home-title" className="mt-4 w-full max-w-md sm:max-w-lg">
                <Logo height={128} className="h-auto w-full" />
              </h1>
              <p className="mt-5 max-w-2xl text-body-lg font-medium text-balance text-ink md:text-heading-lg">
                Put your behind-the-scenes skills to work beyond the set.
              </p>
              <div className="mt-6 grid justify-items-center gap-2.5">
                <JoinButton className="max-w-full rounded-full! shadow-md md:h-16! md:px-10! md:text-body-lg! font-semibold!" />
                <p className="text-body-md font-bold italic text-ink sm:text-body-lg md:text-heading-md">It&rsquo;s free to join!</p>
              </div>
              <div data-home-connection className="mt-6 grid justify-items-center gap-0.5 text-body-lg leading-snug max-xs:text-body-md text-ink md:text-heading-lg">
                <p className="flex items-center gap-3 font-medium italic max-xs:gap-2 sm:gap-5"><Rule className="w-6 max-xs:w-4 sm:w-14" />Let us connect you to<Rule className="w-6 max-xs:w-4 sm:w-14" /></p>
                <p className="font-medium">businesses and individuals</p>
                <p className="font-bold text-ink-brand">who need your expertise.</p>
              </div>
            </div>
          </div>
        </PhotoStage>
      </main>
      {/* The same footer as every other page. */}
      <SiteFooter />
    </div>
  );
}
