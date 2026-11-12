import { Accordion, Button, cx } from "@ds/components";
import { Reveal } from "@ds/motion";
import { ArrowUpRight, CalendarClock, ChevronDown, Clapperboard, Tag } from "lucide-react";
import Link from "next/link";
import { ExampleProfileLink, usePublishedExamples } from "@/components/profile/ExampleProfileLink";
import { asset } from "@/lib/site";
import { CallSheetButton, Founders, Horizon, BrandSectionHeading } from "./parts";
import { benefits, faqs, heroArt, profiles, services, type JoinCallSheet } from "./professionals-content";

export function BrandProfessionals({ join }: { join: JoinCallSheet }) {
  const examples = usePublishedExamples();
  return (
    <>
      {/* Hero */}
      <section data-theme="dark" aria-labelledby="hero-h" className="relative isolate overflow-hidden bg-surface-brand phosphor-dots">
        <Horizon />
        <div className="relative z-raised mx-auto grid max-w-7xl items-center gap-12 px-4 pt-14 pb-36 sm:px-6 lg:grid-cols-12 lg:pt-20 lg:pb-28">
          <div className="lg:col-span-7">
            <Reveal effect="fade-up"><p className="text-eyebrow text-ink-brand uppercase">Entertainment expertise. Everyday possibilities.</p></Reveal>
            <Reveal effect="fade-up" delay={80}>
              <h1 id="hero-h" className="mt-4 font-display text-display-md text-balance text-ink sm:text-display-lg lg:text-display-xl">
                Your skills don't stop when the <span className="glow-text text-ink-brand">cameras do.</span>
              </h1>
            </Reveal>
            <Reveal effect="fade-up" delay={160}>
              <p className="mt-6 max-w-xl text-body-lg text-ink-muted">You've spent your career mastering your craft. Put those skills to work beyond the set, on your terms, at your rates and around your production schedule.</p>
              <p className="mt-3 max-w-xl text-body-md text-ink-muted">Offer your expertise to people and businesses beyond the industry. Clients don't need to work in entertainment to hire you.</p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <CallSheetButton onClick={() => join("hero")} />
                <p className="text-label-md text-ink-muted">Los Angeles Call Sheet · Free to join</p>
              </div>
            </Reveal>
          </div>
          {/* A fan of approved Storyboard scenes: marketing moment, so the card fan is allowed (BRAND.md). */}
          <div aria-hidden="true" className="relative hidden h-96 lg:col-span-5 lg:block">
            {heroArt.map((f, i) => (
              <Reveal key={f} effect="fade-up" delay={200 + i * 90}
                className={cx("absolute w-56 overflow-hidden rounded-xl border-4 border-surface shadow-lg",
                  ["top-0 left-6 -rotate-6", "top-10 right-2 rotate-3", "bottom-0 left-0 rotate-2", "right-12 bottom-6 -rotate-3"][i])}>
                <img src={asset(`art/storyboard/thumbs/${f}.jpg`)} alt="" width={800} height={533} decoding="async" className="aspect-3/2 h-auto w-full object-cover" />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section aria-labelledby="benefits-h" className="relative z-raised mx-auto -mt-12 max-w-7xl px-4 sm:px-6">
        <h2 id="benefits-h" className="sr-only">Designed around production life</h2>
        <ul className="grid gap-4 rounded-2xl border border-line bg-surface p-6 shadow-lg md:grid-cols-3 md:gap-8 md:p-8">
          <li className="md:col-span-3"><p className="text-eyebrow text-ink-brand uppercase" aria-hidden="true">Designed around production life</p></li>
          {benefits.map(([t, d], i) => (
            <li key={t}><Reveal effect="fade-up" delay={i * 70}><h3 className="font-display text-heading-lg text-ink">{t}</h3><p className="mt-1 text-body-md text-ink-muted">{d}</p></Reveal></li>
          ))}
        </ul>
      </section>

      {/* How it works / services: the live page's centred heading and grid of cards (4 across, the last pair centred). */}
      <section id="services" aria-labelledby="services-h" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-20 sm:px-6">
        <BrandSectionHeading id="services-h" eyebrow="How it works" title="Your craft." accent="More possibilities." center>
          <Reveal effect="fade-up" delay={120} className="mt-3 grid max-w-3xl gap-3">
            <h3 className="font-display text-heading-lg text-balance text-ink">An on-demand talent marketplace for entertainment industry professionals.</h3>
            <p className="text-left text-body-lg text-ink-muted lg:text-center">We connect skilled people between gigs with clients who need their expertise for projects, tasks, and services.</p>
            <p className="text-left text-body-lg text-ink-muted lg:text-center">Our professionals come from entertainment. Our clients are anyone who could use their expertise.</p>
          </Reveal>
        </BrandSectionHeading>
        {/* Each card spans six subgrid rows, so titles, translations and buttons line up across a row. */}
        <ul className="mt-12 grid gap-4 sm:grid-cols-4 lg:grid-cols-8">
          {services.map((s) => (
            <li key={s.cat} className="grid sm:col-span-2 sm:row-span-6 sm:grid-rows-subgrid lg:nth-last-2:col-start-3">
              <article data-tilt="" className="lift grid gap-2 rounded-2xl border border-line bg-surface p-5 sm:row-span-6 sm:grid-rows-subgrid sm:gap-y-2">
                <span className="grid size-10 place-items-center rounded-full bg-surface-selected text-ink-brand" aria-hidden="true"><s.icon className="size-5" /></span>
                <h3 className="font-display text-heading-md text-ink">{s.from}</h3>
                <p className="text-label-md text-ink-brand"><span aria-hidden="true">→ </span>{s.to}</p>
                <p className="text-body-sm text-ink-muted">{s.text}</p>
                <details className="group/ideas">
                  <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-sm text-label-md text-ink hover:text-ink-brand [&::-webkit-details-marker]:hidden">
                    <ChevronDown aria-hidden="true" className="size-4 transition-transform duration-fast group-open/ideas:rotate-180" />Explore service ideas
                  </summary>
                  <ul className="grid gap-1 pb-2 text-body-sm text-ink-muted">
                    {s.ideas.map((x) => <li key={x} className="flex gap-2"><span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-action" />{x}</li>)}
                  </ul>
                </details>
                <div className="self-end border-t border-line pt-3">
                  <Button size="sm" variant="ghost" iconEnd={<ArrowUpRight />} onClick={() => join("service", s.cat)} aria-label={`I offer this service: ${s.to}`} className="-mx-3">I offer this service</Button>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </section>

      {/* Sample profiles: a two-across grid; each card shows the Gigster beside their work, as on the live page. */}
      <section id="profiles" aria-labelledby="profiles-h" className="scroll-mt-20 bg-surface-sunken py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <BrandSectionHeading id="profiles-h" eyebrow="Sample professional profiles" title="Here's how your skills" accent="could translate." center />
          <ul className="mt-12 grid gap-6 md:grid-cols-2">
            {profiles.map((p) => (
              <li key={p.id} className="flex">
                <article data-tilt="" className="lift flex w-full flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
                  <div className="grid h-56 grid-cols-5 grid-rows-1 gap-0.5 overflow-hidden bg-line sm:h-64">
                    <img src={asset(`art/samples/cards/${p.img}-portrait.jpg`)} alt={`Illustrative portrait of ${p.name}`} width={480} height={640} loading="lazy" decoding="async" className="col-span-2 size-full min-h-0 object-cover object-top" />
                    <img src={asset(`art/samples/cards/${p.img}-work.jpg`)} alt={`Sample work: ${p.portfolio.toLowerCase()}`} width={480} height={640} loading="lazy" decoding="async" className="col-span-3 size-full min-h-0 object-cover" />
                  </div>
                  <div className="flex flex-1 flex-col gap-3 p-5 sm:p-6">
                    <div>
                      <h3 className="font-display text-heading-lg text-ink">{p.name}</h3>
                      <p className="text-label-md text-ink-brand">{p.title}</p>
                    </div>
                    <p className="text-body-md text-ink">{p.services}</p>
                    <p className="inline-flex gap-2 text-body-sm text-ink-muted"><Clapperboard className="mt-0.5 size-4 shrink-0 text-ink-subtle" aria-label="Background" />{p.credits}</p>
                    <dl className="mt-auto grid gap-2 border-t border-line pt-3 text-body-sm sm:grid-cols-2 sm:gap-4">
                      <div className="flex gap-2"><dt><Tag className="mt-0.5 size-4 text-ink-subtle" aria-label="Pricing" /></dt><dd className="text-label-md text-ink tabular-nums">{p.pricing}</dd></div>
                      <div className="flex gap-2"><dt><CalendarClock className="mt-0.5 size-4 text-ink-subtle" aria-label="Availability" /></dt><dd className="text-ink-muted">{p.availability}</dd></div>
                    </dl>
                    <ExampleProfileLink example={p} handle={examples?.find(({ person }) => person.id === p.id)?.person.slug} />
                  </div>
                </article>
              </li>
            ))}
          </ul>
          {/* One clear ask after the examples, instead of the same button on every card. */}
          <div data-theme="dark" className="relative isolate mt-10 grid items-center gap-6 overflow-hidden rounded-2xl bg-surface-brand phosphor-dots p-6 sm:p-8 md:grid-cols-12">
            <div className="flex -space-x-3 md:col-span-3" aria-hidden="true">
              {profiles.map((p) => <img key={p.id} src={asset(`art/samples/cards/${p.img}-portrait.jpg`)} alt="" width={480} height={640} loading="lazy" className="size-14 rounded-full border-2 border-surface-brand object-cover sm:size-16" />)}
            </div>
            <div className="grid gap-1 md:col-span-6">
              <p className="font-display text-heading-lg text-ink">Your craft could be the next profile here.</p>
              <p className="text-body-md text-ink-muted">Tell us what you do on set. We'll help you shape it into services, rates and availability like these.</p>
            </div>
            <div className="md:col-span-3 md:justify-self-end">
              <CallSheetButton onClick={() => join("profiles")} label="Create your profile" />
            </div>
          </div>
          <p className="mt-6 text-body-sm text-ink-subtle">Sample profiles, services and pricing shown for illustration.</p>
        </div>
      </section>

      {/* Your next chapter: centred, one column, as on the live page; long paragraphs centre only where they fit in two lines. */}
      <section id="next-chapter" aria-labelledby="next-chapter-h" className="mx-auto grid max-w-4xl scroll-mt-20 justify-items-center gap-6 px-4 py-20 text-center sm:px-6">
        <BrandSectionHeading id="next-chapter-h" title="Your next chapter" accent="starts here." center />
        <Reveal effect="fade-up" delay={100} className="grid gap-4">
          <h3 className="font-display text-heading-lg text-ink">Extraordinary Talent. Everyday Solutions.</h3>
          <p className="text-body-lg font-semibold text-ink">Professional expertise. Available between productions.</p>
          <p className="text-left text-body-lg text-ink-muted lg:text-center">Between Gigs connects you with clients who value the creativity, craftsmanship, and expertise you've developed in entertainment.</p>
          <p className="text-left text-body-lg text-ink-muted lg:text-center">Bring your skills beyond the set to projects, tasks, and services for people and businesses. Choose work that fits your interests, set your rates, and make room for your next production.</p>
          <p className="font-display text-heading-md text-ink">Your expertise. New clients. On your terms.</p>
        </Reveal>
        <Reveal effect="fade-up" delay={160} className="w-full">
          <div data-theme="dark" className="relative isolate overflow-hidden rounded-2xl bg-surface-brand phosphor-dots px-6 pt-8 pb-24">
            <Horizon />
            <div className="relative z-raised">
              <p className="font-display text-heading-lg text-ink-brand">Launching in Los Angeles.</p>
              <p className="mt-1 text-body-md text-ink-muted"><b className="text-ink">COMING SOON:</b> New York. Atlanta. Toronto. Vancouver.</p>
            </div>
          </div>
        </Reveal>
        <p className="text-body-sm text-ink-muted">Review our <Link className="text-link underline underline-offset-2" href="/provider-standards/">provider standards</Link> and <Link className="text-link underline underline-offset-2" href="/licensing-insurance/">service qualifications</Link> as you plan your offer.</p>
      </section>

      {/* FAQ */}
      <section id="faq" aria-labelledby="faq-h" className="mx-auto grid max-w-3xl scroll-mt-20 gap-10 px-4 pb-20 sm:px-6">
        <BrandSectionHeading id="faq-h" eyebrow="Professional FAQ" title="Built around life" accent="between productions." center />
        <div>
          <Accordion variant="framed" items={faqs.map(([q, a], i) => ({ id: `faq-${i}`, title: q, content: <div className="grid gap-3">{a.split("\n\n").map((para) => <p key={para}>{para}</p>)}</div> }))} />
        </div>
      </section>

      <div className="border-t border-line">
        <Founders centered peterBio="Writer, producer, and showrunner with over 40 years of experience across film, television, and comic books. Credits include Hawaii Five-0, 24, CSI: NY, R.I.P.D., Demolition Man, and Magnum P.I." />
      </div>

      {/* Final call to action */}
      <section id="waitlist" aria-labelledby="final-h" data-theme="dark" className="relative isolate overflow-hidden bg-surface-brand phosphor-dots">
        <Horizon />
        <div className="relative z-raised mx-auto grid max-w-3xl justify-items-center gap-4 px-4 pt-20 pb-32 text-center sm:px-6 lg:pb-20">
          <p className="text-label-md text-ink-brand">Bring your craft beyond the set</p>
          <h2 id="final-h" className="font-display text-display-sm text-balance text-ink sm:text-display-md">Join the Los Angeles professionals shaping Between Gigs.</h2>
          <CallSheetButton onClick={() => join("footer")} className="mt-2" />
        </div>
      </section>
    </>
  );
}
