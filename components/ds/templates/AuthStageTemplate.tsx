/*
 * Template · Auth stage (Figma: Flow p2, Create account / Log in). The launch sign-up and log-in frame: the craft
 * still life fills the stage, the welcome sits on the open paper on the left and the form card on the right.
 * At lg and up the landscape photo covers the stage; below it the portrait photo frames the top of the page and
 * fades into the page colour, so the welcome reads on the paper and the card sits below the props.
 * Routes fill it through components/auth/AuthShell. The previous frame is AuthTemplate (Hub draft v1).
 */
import { cx } from "@ds/components/cx";
import type * as React from "react";
import { selectedDarkWallpaper } from "@/lib/wallpaper-theme";
import { asset } from "@/lib/site";
import { Eyebrow, Heading, Text } from "../atoms";

export function AuthStageTemplate({ eyebrow, title, lead, children, className }: {
  /** Uppercase line above the headline, with the short accent rule. */
  eyebrow: string;
  /** The serif headline on the paper. */
  title: React.ReactNode;
  /** One line under the headline. */
  lead: React.ReactNode;
  /** The form card's contents. */
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className="relative isolate overflow-hidden bg-bg">
      {/* lg and up: the landscape still life covers the stage. Below lg: the portrait one frames the top of the page
          (scissors, flowers, lens, photos) and fades into the paper, so the card's lower half sits on plain paper. */}
      {[false, true].map((dark) => (
        <picture key={String(dark)}>
          <source media="(min-width: 64rem)" srcSet={asset(dark ? selectedDarkWallpaper("/art/stage/still-life-desktop.jpg")! : "/art/stage/still-life-desktop.jpg")} />
          <img src={asset(dark ? selectedDarkWallpaper("/art/stage/still-life-portrait.jpg")! : "/art/stage/still-life-portrait.jpg")} alt="" aria-hidden="true"
            className={cx("absolute inset-x-0 top-0 -z-10 aspect-3/4 w-full object-cover mask-b-from-30% mask-b-to-75% sm:mask-b-from-45% sm:mask-b-to-100% lg:inset-y-0 lg:aspect-auto lg:h-full lg:mask-none", dark ? "hidden dark:block" : "dark:hidden")} />
        </picture>
      ))}
      <div className="grid w-full gap-10 px-4 pt-40 pb-12 sm:px-6 sm:pt-72 sm:pb-16 lg:min-h-180 lg:grid-cols-20 lg:items-center lg:gap-0 lg:px-0 lg:py-20">
        <aside aria-label="Welcome to Between Gigs" className="mx-auto grid w-full max-w-sm content-start gap-5 sm:max-w-lg sm:gap-6 lg:col-span-9 lg:col-start-3 lg:mx-0 lg:max-w-none lg:gap-7 lg:pr-10 xl:col-span-8 xl:col-start-4">
          <Eyebrow rule className="gap-4">{eyebrow}</Eyebrow>
          <Heading level="h1" as="p" className="max-[22rem]:text-display-sm sm:text-display-lg xl:text-display-xl">{title}</Heading>
          <Text size="lg" className="max-w-xs text-pretty sm:max-w-md">{lead}</Text>
        </aside>
        <div className={cx("mx-auto w-full max-w-md rounded-xl border border-line bg-surface p-6 shadow-md sm:p-8 lg:col-span-8 lg:col-start-12 lg:mx-0 xl:col-span-6", className)}>
          {children}
        </div>
      </div>
    </section>
  );
}
