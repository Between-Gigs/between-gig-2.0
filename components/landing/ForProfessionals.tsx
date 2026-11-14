"use client";
/*
 * For professionals (/professionals), Green Room (feedback 13 Nov, Additional Pages p2): the still-life hero, the
 * three benefits, How it works with the crafts grid, "Here's how your skills could translate", the roadmap, the FAQ,
 * the founders and a closing call to action on the still life again. Every call to action goes straight to /join/;
 * the practical reasons ("You set your rates. Choose your projects. Decide when you're available.") sit beside the
 * join button. Copy and content come from the previous page (components/funnel/professionals-content), which stays
 * at /preview/drafts/professionals-v1/.
 */
import { Accordion } from "@ds/components";
import { ArrowRight, CalendarClock, ChevronDown, Clapperboard, Tag } from "lucide-react";
import Link from "next/link";
import { Eyebrow, Heading, Text, TextLink } from "@/components/ds/atoms";
import { PhotoStage } from "@/components/ds/organisms";
import { Founders } from "@/components/funnel/parts";
import { benefits, faqs, profiles, services } from "@/components/funnel/professionals-content";
import { Page } from "@/components/site/Page";
import { asset } from "@/lib/site";
import { STILL_LIFE } from "./ComingSoon";
import { JOIN_HREF, JoinCta } from "./JoinCta";

const CITIES = ["New York", "Atlanta", "Toronto", "Vancouver"];

/** A small "→ /join/" text link that names where it goes. */
function JoinLink({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <Link href={JOIN_HREF} aria-label={label} className="inline-flex min-h-11 w-fit items-center gap-1.5 text-label-md font-semibold text-ink underline decoration-1 underline-offset-4 hover:decoration-2">
      {children}<ArrowRight aria-hidden="true" className="size-4" />
    </Link>
  );
}

export function ForProfessionals() {
  return (
    <Page bare>
      {/* Hero */}
      <PhotoStage {...STILL_LIFE} aria-labelledby="hero-h">
        <div className="mx-auto grid max-w-4xl justify-items-start sm:justify-items-center gap-5 px-4 py-16 text-left sm:text-center sm:px-6 md:py-24 lg:py-28">
          <div className="grid justify-items-start sm:justify-items-center gap-5 rounded-2xl bg-bg/85 px-5 py-8 shadow-sm backdrop-blur-sm sm:px-10 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none dark:bg-bg/80 dark:lg:bg-transparent">
            <Eyebrow rule className="sm:justify-items-center!">For entertainment professionals</Eyebrow>
            <Heading level="display-xl" as="h1" id="hero-h" className="max-w-3xl max-sm:text-display-md">Your skills don't stop when the cameras do.</Heading>
            <Text size="lg" className="max-w-xl">Bring your craft to homes and businesses between productions. Clients don't need to work in entertainment to hire you.</Text>
            <JoinCta className="mt-2" />
          </div>
        </div>
      </PhotoStage>

      {/* Benefits */}
      <section aria-labelledby="benefits-h" className="border-y border-line bg-surface">
        <h2 id="benefits-h" className="sr-only">Designed around production life</h2>
        <ul className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 md:grid-cols-3 md:gap-0 md:py-10">
          {benefits.map(([t, d]) => (
            <li key={t} className="grid content-start gap-1 md:border-l md:border-line md:px-8 md:first:border-l-0 md:first:pl-0">
              <Heading level="h3" as="h3">{t}</Heading>
              <Text muted>{d}</Text>
            </li>
          ))}
        </ul>
      </section>

      {/* How it works: the crafts grid */}
      <section id="services" aria-labelledby="services-h" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-16 sm:px-6 lg:py-24">
        <div className="mx-auto grid max-w-3xl justify-items-start sm:justify-items-center gap-4 text-left sm:text-center">
          <Eyebrow rule className="sm:justify-items-center!">How it works</Eyebrow>
          <Heading level="display-l" id="services-h" className="max-sm:text-display-md">Your craft.<br />More possibilities.</Heading>
          <Text size="lg" muted>An on-demand talent marketplace for entertainment industry professionals. Turn your on-set role into a service you can offer to homes and businesses between productions.</Text>
        </div>
        <ul className="mt-12 grid gap-4 md:grid-cols-2">
          {services.map((s) => (
            <li key={s.cat} className="flex">
              <article className="flex w-full gap-4 rounded-lg border border-line bg-surface p-5 shadow-sm">
                <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-full bg-accent-gold-soft ring-2 ring-accent-gold"><s.icon className="size-5 text-ink" /></span>
                <div className="grid min-w-0 flex-1 content-start gap-1.5">
                  <Heading level="h3" as="h3">{s.from}</Heading>
                  <p className="text-label-md font-semibold text-ink-brand"><span aria-hidden="true">→ </span>{s.to}</p>
                  <Text size="sm" muted>{s.text}</Text>
                  <details className="group/ideas">
                    <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-label-md text-ink hover:text-ink-brand [&::-webkit-details-marker]:hidden">
                      <ChevronDown aria-hidden="true" className="size-4 transition-transform duration-fast group-open/ideas:rotate-180" />Service ideas
                    </summary>
                    <ul className="grid gap-1 pb-2 text-body-sm text-ink-muted">
                      {s.ideas.map((x) => <li key={x} className="flex gap-2"><span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-action" />{x}</li>)}
                    </ul>
                  </details>
                  <div className="border-t border-line pt-1">
                    <JoinLink label={`I offer ${s.to.toLowerCase()}: create your Gigster profile`}>I offer this: create my profile</JoinLink>
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </section>

      {/* Sample profiles */}
      <section id="profiles" aria-labelledby="profiles-h" className="scroll-mt-24 border-y border-line bg-surface-sunken py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto grid max-w-3xl justify-items-start sm:justify-items-center gap-4 text-left sm:text-center">
            <Eyebrow rule className="sm:justify-items-center!">Sample profiles</Eyebrow>
            <Heading level="display-l" id="profiles-h" className="max-sm:text-display-md">Here's how your skills could translate.</Heading>
            <Text size="lg" muted>Tell us what you do on set. We'll help you shape it into services, rates and availability like these.</Text>
          </div>
          <ul className="mt-10 grid gap-6 md:grid-cols-2">
            {profiles.map((p) => (
              <li key={p.id} className="flex">
                <article className="flex w-full flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-sm">
                  <div className="grid h-56 grid-cols-5 gap-0.5 overflow-hidden bg-line sm:h-64">
                    <img src={asset(`art/samples/cards/${p.img}-portrait.jpg`)} alt={`Illustrative portrait of ${p.name}`} width={480} height={640} loading="lazy" decoding="async" className="col-span-2 size-full min-h-0 object-cover object-top" />
                    <img src={asset(`art/samples/cards/${p.img}-work.jpg`)} alt={`Sample work: ${p.portfolio.toLowerCase()}`} width={480} height={640} loading="lazy" decoding="async" className="col-span-3 size-full min-h-0 object-cover" />
                  </div>
                  <div className="flex flex-1 flex-col gap-3 p-5 sm:p-6">
                    <div>
                      <Heading level="h2" as="h3">{p.name}</Heading>
                      <p className="text-label-md font-semibold text-ink-brand">{p.title}</p>
                    </div>
                    <Text>{p.services}</Text>
                    <p className="inline-flex gap-2 text-body-sm text-ink-muted"><Clapperboard className="mt-0.5 size-4 shrink-0 text-ink-subtle" aria-label="Background" />{p.credits}</p>
                    <dl className="mt-auto grid gap-2 border-t border-line pt-3 text-body-sm sm:grid-cols-2 sm:gap-4">
                      <div className="flex gap-2"><dt><Tag className="mt-0.5 size-4 text-ink-subtle" aria-label="Pricing" /></dt><dd className="text-label-md text-ink tabular-nums">{p.pricing}</dd></div>
                      <div className="flex gap-2"><dt><CalendarClock className="mt-0.5 size-4 text-ink-subtle" aria-label="Availability" /></dt><dd className="text-ink-muted">{p.availability}</dd></div>
                    </dl>
                    <div className="flex flex-wrap items-center gap-x-6">
                      <JoinLink label={`Create a profile like ${p.name}'s: go to sign-up`}>Create a profile like this</JoinLink>
                    </div>
                  </div>
                </article>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-center font-display text-body-md text-ink-muted italic">Illustrative profiles and pricing.</p>
        </div>
      </section>

      {/* Roadmap */}
      <section id="next-chapter" aria-labelledby="next-chapter-h" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-16 sm:px-6 lg:py-24">
        <div className="grid justify-items-start sm:justify-items-center gap-4 rounded-xl bg-surface-brand px-6 py-12 text-left sm:text-center shadow-md sm:px-10 lg:py-16">
          <h2 id="next-chapter-h" className="font-display text-display-md text-balance text-ink-on-brand sm:text-display-lg">Your next chapter <i>starts here.</i></h2>
          <p className="max-w-2xl text-body-lg text-ink-on-brand">Professional expertise, available between productions. Choose work that fits your interests, set your rates, and make room for your next production.</p>
          <p className="mt-2 font-display text-heading-lg text-ink-on-brand">Launching in Los Angeles.</p>
          <p className="text-label-md text-ink-on-brand">Coming soon to {CITIES.join(", ").replace(/, ([^,]*)$/, " and $1")}.</p>
        </div>
        <Text size="sm" muted className="mt-6 text-center">
          Review our <Link className="text-link underline underline-offset-2" href="/provider-standards/">provider standards</Link> and <Link className="text-link underline underline-offset-2" href="/licensing-insurance/">service qualifications</Link> as you plan your offer.
        </Text>
      </section>

      {/* FAQ */}
      <section id="faq" aria-labelledby="faq-h" className="mx-auto grid max-w-3xl scroll-mt-24 gap-8 px-4 pb-16 sm:px-6 lg:pb-24">
        <div className="grid justify-items-start sm:justify-items-center gap-4 text-left sm:text-center">
          <Eyebrow rule className="sm:justify-items-center!">Your questions, answered</Eyebrow>
          <Heading level="h1" id="faq-h">Built around life between productions.</Heading>
        </div>
        <Accordion variant="framed" items={faqs.map(([q, a], i) => ({ id: `faq-${i}`, title: q, content: <div className="grid gap-3">{a.split("\n\n").map((para) => <p key={para}>{para}</p>)}</div> }))} />
      </section>

      <div className="border-t border-line">
        <Founders centered peterBio="Writer, producer, and showrunner with over 40 years of experience across film, television, and comic books. Credits include Hawaii Five-0, 24, CSI: NY, R.I.P.D., Demolition Man, and Magnum P.I." />
      </div>

      {/* Closing call to action */}
      <PhotoStage {...STILL_LIFE} aria-labelledby="final-h" className="border-t border-line">
        <div className="mx-auto grid max-w-4xl justify-items-start sm:justify-items-center px-4 py-16 sm:px-6 md:py-24">
          <div className="grid justify-items-start sm:justify-items-center gap-5 rounded-2xl bg-bg/85 px-5 py-8 text-left sm:text-center shadow-sm backdrop-blur-sm sm:px-10 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none dark:bg-bg/80 dark:lg:bg-transparent">
            <Eyebrow rule className="sm:justify-items-center!">Join the community</Eyebrow>
            <Heading level="display-l" id="final-h" className="max-w-2xl max-sm:text-display-sm">Get discovered, get hired, and keep creating.</Heading>
            <JoinCta className="mt-2" />
            <TextLink href="/storyboard/" kind="arrow" className="font-medium text-ink-muted">See it in the Storyboard</TextLink>
          </div>
        </div>
      </PhotoStage>
    </Page>
  );
}
