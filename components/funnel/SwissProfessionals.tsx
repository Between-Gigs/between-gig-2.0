import { Accordion, Button, cx } from "@ds/components";
import { Reveal } from "@ds/motion";
import { ArrowUpRight, CalendarClock, ChevronDown, Clapperboard, Tag } from "lucide-react";
import Link from "next/link";
import { ExampleProfileLink, usePublishedExamples } from "@/components/profile/ExampleProfileLink";
import { asset } from "@/lib/site";
import { CallSheetButton, Founders, Horizon, SectionHeading } from "./parts";
import { benefits, faqs, heroArt, profiles, services, type JoinCallSheet } from "./professionals-content";

const pad = (i: number) => String(i + 1).padStart(2, "0");
const wrap = "mx-auto max-w-7xl px-4 sm:px-6";

/** Content that sits in the nine columns right of the label column. */
function Right({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className="grid grid-cols-12 gap-x-6"><div className={cx("col-span-12 lg:col-span-9 lg:col-start-4", className)}>{children}</div></div>;
}

export function SwissProfessionals({ join }: { join: JoinCallSheet }) {
  const examples = usePublishedExamples();
  return (
    <>
      {/* Hero: a square forest block on the grid. */}
      <div className={cx(wrap, "pt-6 lg:pt-8")}>
        <section data-theme="dark" aria-labelledby="hero-h" className="relative isolate overflow-hidden rounded-2xl bg-surface-brand phosphor-dots">
          <Horizon />
          <div className="relative z-raised grid grid-cols-12 gap-x-6 gap-y-8 px-5 pt-6 pb-32 sm:px-8 lg:px-10 lg:pt-8 lg:pb-14">
            <Reveal effect="fade-up" className="col-span-12 border-t-4 border-ink pt-3">
              <p className="text-eyebrow text-ink-brand uppercase">Entertainment expertise. Everyday possibilities.</p>
            </Reveal>
            <Reveal effect="fade-up" delay={80} className="col-span-12">
              <h1 id="hero-h" className="font-display text-display-sm text-ink sm:text-display-md md:text-display-lg xl:text-display-xl">
                Your skills don’t stop when the <span className="glow-text text-ink-brand">cameras do.</span>
              </h1>
            </Reveal>
            <Reveal effect="fade-up" delay={160} className="col-span-12 grid content-start gap-3 lg:col-span-5">
              <p className="text-body-lg text-ink">You&apos;ve spent your career mastering your craft. Put those skills to work beyond the set, on your terms, at your rates and around your production schedule.</p>
              <p className="text-body-md text-ink-muted">Offer your expertise to people and businesses beyond the industry. Clients don&apos;t need to work in entertainment to hire you.</p>
              <div className="mt-5 grid justify-items-start gap-3">
                <CallSheetButton onClick={() => join("hero")} />
                <p className="text-label-md text-ink-muted">Los Angeles Call Sheet · Free to join</p>
              </div>
            </Reveal>
            {/* Approved Storyboard scenes, hard-cropped square into the grid. */}
            <ul aria-hidden="true" className="col-span-12 grid grid-cols-4 gap-2 self-end lg:col-span-7">
              {heroArt.map((f, i) => (
                <li key={f}>
                  <Reveal effect="fade-up" delay={200 + i * 90} className="aspect-square overflow-hidden rounded-xl bg-surface">
                    <img src={asset(`art/storyboard/thumbs/${f}.jpg`)} alt="" width={800} height={533} decoding="async" className="size-full object-cover" />
                  </Reveal>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      {/* 01 Benefits */}
      <section aria-labelledby="benefits-h" className={cx(wrap, "grid grid-cols-12 gap-x-6 gap-y-6 pt-16 lg:pt-24")}>
        <SectionHeading compact id="benefits-h" n="01" title="Designed around production life" className="col-span-12 lg:col-span-3" />
        <ul className="col-span-12 grid gap-x-6 gap-y-6 sm:grid-cols-3 lg:col-span-9">
          {benefits.map(([t, d], i) => (
            <li key={t} className="border-t-4 border-line-strong pt-3">
              <Reveal effect="fade-up" delay={i * 70}>
                <h3 className="font-display text-heading-md text-ink">{t}</h3>
                <p className="mt-2 text-body-md text-ink-muted">{d}</p>
              </Reveal>
            </li>
          ))}
        </ul>
      </section>

      {/* 02 How it works / services: a ruled list, one row per craft. */}
      <section id="services" aria-labelledby="services-h" className={cx(wrap, "scroll-mt-20 pt-16 lg:pt-24")}>
        <SectionHeading id="services-h" n="02" eyebrow="How it works" title="Your craft." accent="More possibilities.">
          <Reveal effect="fade-up" delay={120} className="grid max-w-2xl gap-3">
            <h3 className="font-display text-heading-md text-balance text-ink sm:text-heading-lg">An on-demand talent marketplace for entertainment industry professionals.</h3>
            <p className="text-body-lg text-ink-muted">We connect skilled people between gigs with clients who need their expertise for projects, tasks, and services.</p>
            <p className="text-body-lg text-ink-muted">Our professionals come from entertainment. Our clients are anyone who could use their expertise.</p>
          </Reveal>
        </SectionHeading>
        <Right className="mt-12">
          <ul className="border-b border-line">
            {services.map((s, i) => (
              <li key={s.cat} className={cx("grid grid-cols-9 gap-x-6 gap-y-2 py-5", i === 0 ? "border-t-4 border-line-strong" : "border-t border-line")}>
                <div className="col-span-9 flex items-center gap-3 sm:col-span-1 sm:grid sm:content-start sm:gap-3">
                  <span aria-hidden="true" className="text-label-sm text-ink tabular-nums">{pad(i)}</span>
                  <s.icon aria-hidden="true" className="size-6 text-ink-brand" strokeWidth={1.75} />
                </div>
                <div className="col-span-9 grid content-start gap-1 sm:col-span-4">
                  <h3 className="font-display text-heading-md text-ink">{s.from}</h3>
                  <p className="text-label-md text-ink-brand"><span aria-hidden="true">→ </span>{s.to}</p>
                </div>
                <div className="col-span-9 grid content-start gap-1 sm:col-span-4">
                  <p className="text-body-md text-ink-muted">{s.text}</p>
                  <details className="group/ideas">
                    <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-label-md text-ink hover:text-ink-brand [&::-webkit-details-marker]:hidden">
                      <ChevronDown aria-hidden="true" className="size-4 transition-transform duration-fast group-open/ideas:rotate-180" />Explore service ideas
                    </summary>
                    <ul className="grid gap-1 border-l-4 border-line-strong pb-2 pl-3 text-body-sm text-ink-muted">
                      {s.ideas.map((x) => <li key={x}>{x}</li>)}
                    </ul>
                  </details>
                  <div>
                    <Button size="sm" variant="ghost" iconEnd={<ArrowUpRight />} onClick={() => join("service", s.cat)} aria-label={`I offer this service: ${s.to}`} className="-mx-3 underline decoration-2 underline-offset-4">I offer this service</Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Right>
      </section>

      {/* 03 Sample profiles: two across, each Gigster beside their work, square crops. */}
      <section id="profiles" aria-labelledby="profiles-h" className={cx(wrap, "scroll-mt-20 pt-16 lg:pt-24")}>
        <SectionHeading id="profiles-h" n="03" eyebrow="Sample professional profiles" title="Here's how your skills" accent="could translate." />
        <Right className="mt-12">
          <ul className="grid gap-x-6 gap-y-12 md:grid-cols-2">
            {profiles.map((p) => (
              <li key={p.id} className="flex">
                <article className="flex w-full flex-col gap-4 border-t-4 border-line-strong pt-4">
                  <div className="grid aspect-5/3 grid-cols-5 gap-2 overflow-hidden">
                    <img src={asset(`art/samples/cards/${p.img}-portrait.jpg`)} alt={`Illustrative portrait of ${p.name}`} width={480} height={640} loading="lazy" decoding="async" className="col-span-2 size-full min-h-0 object-cover object-top" />
                    <img src={asset(`art/samples/cards/${p.img}-work.jpg`)} alt={`Sample work: ${p.portfolio.toLowerCase()}`} width={480} height={640} loading="lazy" decoding="async" className="col-span-3 size-full min-h-0 object-cover" />
                  </div>
                  <div>
                    <h3 className="font-display text-heading-lg text-ink">{p.name}</h3>
                    <p className="mt-1 text-label-md text-ink-brand">{p.title}</p>
                  </div>
                  <p className="text-body-md text-ink">{p.services}</p>
                  <p className="inline-flex gap-2 text-body-sm text-ink-muted"><Clapperboard className="mt-0.5 size-4 shrink-0 text-ink-subtle" aria-label="Background" />{p.credits}</p>
                  <dl className="mt-auto grid gap-2 border-t border-line pt-3 text-body-sm sm:grid-cols-2 sm:gap-6">
                    <div className="flex gap-2"><dt><Tag className="mt-0.5 size-4 text-ink-subtle" aria-label="Pricing" /></dt><dd className="text-label-md text-ink tabular-nums">{p.pricing}</dd></div>
                    <div className="flex gap-2"><dt><CalendarClock className="mt-0.5 size-4 text-ink-subtle" aria-label="Availability" /></dt><dd className="text-ink-muted">{p.availability}</dd></div>
                  </dl>
                  <ExampleProfileLink example={p} handle={examples?.find(({ person }) => person.id === p.id)?.person.slug} />
                </article>
              </li>
            ))}
          </ul>
          {/* One clear ask after the examples, instead of the same button on every card. */}
          <div data-theme="dark" className="relative isolate mt-14 grid gap-6 overflow-hidden bg-surface-brand phosphor-dots p-6 sm:p-8 md:grid-cols-9 md:gap-x-6">
            <div className="grid grid-cols-4 gap-1 md:col-span-3 md:self-start" aria-hidden="true">
              {profiles.map((p) => <img key={p.id} src={asset(`art/samples/cards/${p.img}-portrait.jpg`)} alt="" width={480} height={640} loading="lazy" className="aspect-square w-full object-cover object-top" />)}
            </div>
            <div className="grid content-start gap-2 md:col-span-6">
              <p className="font-display text-heading-lg text-ink">Your craft could be the next profile here.</p>
              <p className="text-body-md text-ink-muted">Tell us what you do on set. We&apos;ll help you shape it into services, rates and availability like these.</p>
              <div className="mt-3">
                <CallSheetButton onClick={() => join("profiles")} label="Create your profile" />
              </div>
            </div>
          </div>
          <p className="mt-4 text-body-sm text-ink-subtle">Sample profiles, services and pricing shown for illustration.</p>
        </Right>
      </section>

      {/* 04 Your next chapter */}
      <section id="next-chapter" aria-labelledby="next-chapter-h" className={cx(wrap, "scroll-mt-20 pt-16 lg:pt-24")}>
        <SectionHeading id="next-chapter-h" n="04" title="Your next chapter" accent="starts here.">
          <Reveal effect="fade-up" delay={100} className="grid max-w-2xl gap-4">
            <h3 className="font-display text-heading-md text-ink sm:text-heading-lg">Extraordinary Talent. Everyday Solutions.</h3>
            <p className="text-body-lg font-semibold text-ink">Professional expertise. Available between productions.</p>
            <p className="text-body-lg text-ink-muted">Between Gigs connects you with clients who value the creativity, craftsmanship, and expertise you&apos;ve developed in entertainment.</p>
            <p className="text-body-lg text-ink-muted">Bring your skills beyond the set to projects, tasks, and services for people and businesses. Choose work that fits your interests, set your rates, and make room for your next production.</p>
            <p className="font-display text-heading-md text-ink">Your expertise. New clients. On your terms.</p>
          </Reveal>
        </SectionHeading>
        <Right className="mt-12 grid gap-4">
          <Reveal effect="fade-up" delay={160}>
            <div data-theme="dark" className="relative isolate overflow-hidden rounded-2xl bg-surface-brand phosphor-dots px-6 pt-6 pb-24 sm:px-8 lg:pb-16">
              <Horizon />
              <div className="relative z-raised grid gap-2 border-t-4 border-ink pt-3">
                <p className="font-display text-heading-lg text-ink-brand sm:text-display-sm">Launching in Los Angeles.</p>
                <p className="text-body-md text-ink-muted"><b className="text-ink">COMING SOON:</b> New York. Atlanta. Toronto. Vancouver.</p>
              </div>
            </div>
          </Reveal>
          <p className="text-body-sm text-ink-muted">Review our <Link className="text-ink underline decoration-2 underline-offset-2 hover:text-ink-brand" href="/provider-standards/">provider standards</Link> and <Link className="text-ink underline decoration-2 underline-offset-2 hover:text-ink-brand" href="/licensing-insurance/">service qualifications</Link> as you plan your offer.</p>
        </Right>
      </section>

      {/* 05 FAQ */}
      <section id="faq" aria-labelledby="faq-h" className={cx(wrap, "scroll-mt-20 pt-16 lg:pt-24")}>
        <SectionHeading id="faq-h" n="05" eyebrow="Professional FAQ" title="Built around life" accent="between productions." />
        <Right className="mt-12">
          <div className="max-w-3xl border-y-4 border-line-strong">
            <Accordion variant="flush" items={faqs.map(([q, a], i) => ({ id: `faq-${i}`, title: <span className="font-display text-body-lg font-bold">{q}</span>, content: <div className="grid max-w-prose gap-3 text-body-lg">{a.split("\n\n").map((para) => <p key={para}>{para}</p>)}</div> }))} />
          </div>
        </Right>
      </section>

      <Founders n="06" peterBio="Writer, producer, and showrunner with over 40 years of experience across film, television, and comic books. Credits include Hawaii Five-0, 24, CSI: NY, R.I.P.D., Demolition Man, and Magnum P.I." />

      {/* Final call to action: the forest block again, flush left. */}
      <div className={cx(wrap, "pb-16 lg:pb-24")}>
        <section id="waitlist" aria-labelledby="final-h" data-theme="dark" className="relative isolate overflow-hidden rounded-2xl bg-surface-brand phosphor-dots">
          <Horizon />
          <div className="relative z-raised grid grid-cols-12 gap-x-6 gap-y-6 px-5 pt-6 pb-32 sm:px-8 lg:px-10 lg:pt-8 lg:pb-20">
            <p className="col-span-12 border-t-4 border-ink pt-3 text-label-md text-ink-brand">Bring your craft beyond the set</p>
            <h2 id="final-h" className="col-span-12 font-display text-display-sm text-ink sm:text-display-md lg:col-span-10 lg:text-display-lg">Join the Los Angeles professionals shaping Between Gigs.</h2>
            <div className="col-span-12">
              <CallSheetButton onClick={() => join("footer")} />
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
