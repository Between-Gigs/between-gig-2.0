"use client";
/*
 * Coming soon (/), Green Room (feedback 13 Nov, Additional Pages p1). The still life fills the screen between the
 * header and a slim footer; the Los Angeles Call Sheet is the headline and "Coming soon" a seal above it, because
 * something is already happening that people can do. The one button goes straight to sign-up (/join/) and says so.
 * The previous design stays at /preview/drafts/coming-soon-v1/ (components/home/CallSheetHome).
 */
import { Eyebrow, Heading, Status, Text, TextLink } from "@/components/ds/atoms";
import { PhotoStage } from "@/components/ds/organisms";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { JoinButton } from "./JoinCta";

export const STILL_LIFE = { image: "/art/stage/still-life-desktop.jpg", portrait: "/art/stage/still-life-portrait.jpg" } as const;


export function ComingSoon() {
  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip bg-bg text-ink">
      <SiteHeader />
      <main id="main" tabIndex={-1} className="flex flex-1 flex-col outline-none">
        <PhotoStage {...STILL_LIFE} aria-labelledby="call-sheet-h" className="flex flex-1 items-center">
          <div className="mx-auto grid w-full max-w-3xl justify-items-start sm:justify-items-center gap-5 px-4 py-16 text-left sm:text-center sm:px-6 md:py-24">
            <div className="grid justify-items-start sm:justify-items-center gap-5 rounded-2xl bg-bg/85 px-5 py-8 shadow-sm backdrop-blur-sm sm:px-10 md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-none dark:bg-bg/80 dark:md:bg-transparent">
              <Eyebrow className="sm:justify-items-center!">Extraordinary talent. Everyday solutions.</Eyebrow>
              <Status tone="gold">Between Gigs is coming soon</Status>
              <Heading level="display-xl" as="h1" id="call-sheet-h" className="max-w-2xl max-sm:text-display-md">Los Angeles Call&nbsp;Sheet</Heading>
              <Text size="lg" className="max-w-xl">Put your behind-the-scenes skills to work between gigs. Founding Gigsters are joining now.</Text>
              <div className="mt-2 grid justify-items-start sm:justify-items-center gap-2">
                <JoinButton />
                <Text size="sm" muted>Free to join. About 10 minutes, and it saves as you go.</Text>
              </div>
              <TextLink href="/professionals/" kind="arrow" className="font-medium text-ink-muted">Why join? For professionals</TextLink>
            </div>
          </div>
        </PhotoStage>
      </main>
      {/* The same footer as every other page. */}
      <SiteFooter />
    </div>
  );
}
