"use client";
import { Accordion, Button, cx } from "@ds/components";
import { Reveal } from "@ds/motion";
import { ArrowUpRight, Brush, CalendarCheck, CalendarClock, Camera, ChevronDown, Clapperboard, Drama, Film, Hammer, MapPinned, Scissors, Shirt, Sofa, Tag } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { asset } from "@/lib/site";
import { Page } from "@/components/site/Page";
import { CallSheetDialog } from "./CallSheetDialog";
import { CallSheetButton, Founders, Horizon, SectionHeading } from "./parts";

/*
 * /professionals. Copy is the live page's, approved by Patti Lenkov on 27 Sep 2026
 * (imagine-os/between-gigs app/professionals/current.tsx). Polish, don't rewrite: the only changes are
 * layout, the design system, and line-icon glyphs in place of the unicode symbols.
 */

const services = [
  { icon: Hammer, cat: "builds", from: "Set carpenters & craftspeople", to: "Furniture & Creative Builds", text: "Put your skills to work on custom furniture, furniture repair and restoration, and freestanding creative displays.", ideas: ["Custom furniture building", "Furniture repair and restoration", "Freestanding museum and gallery displays", "Custom creative builds"] },
  { icon: Brush, cat: "makeup", from: "Makeup artists", to: "Makeup services", text: "Bring your artistry to weddings, events, headshots and personal lessons.", ideas: ["Bridal and event makeup", "Headshot and professional photo makeup", "Makeup lessons and personal consultations", "Special effects, Halloween and creator makeup"] },
  { icon: Scissors, cat: "hair", from: "Hairstylists", to: "Hair styling", text: "Offer styling for everyday occasions, special appearances and photo shoots.", ideas: ["At-home blowouts and styling", "Wedding and special-event hair", "Photo-shoot hair styling", "Wig styling and appearance grooming"] },
  { icon: Shirt, cat: "wardrobe", from: "Costume & wardrobe professionals", to: "Wardrobe & personal styling", text: "Turn your eye for character and fit into personal style, custom pieces and organized wardrobes.", ideas: ["Closet editing, organization and outfits from existing clothes", "Trip packing, event dressing and personal shopping", "Sourcing hard-to-find pieces and group-photo styling", "Tailoring, resizing, alteration coordination and custom costumes"] },
  { icon: Sofa, cat: "interiors", from: "Art directors & set decorators", to: "Interior styling", text: "Apply your eye for color, furnishings and atmosphere to spaces beyond the set.", ideas: ["Room styling and mood boards", "Furniture and decor sourcing", "Seasonal styling and creative displays"] },
  { icon: Camera, cat: "photo", from: "Camera professionals & photographers", to: "Photography & video", text: "Use your visual storytelling skills for portraits, events and original video.", ideas: ["Portraits and professional headshots", "Event photography and video", "Original videos for people and businesses"] },
  { icon: CalendarCheck, cat: "events", from: "Production coordinators", to: "Events & organization", text: "Put your planning and logistics experience to work on events and complex projects.", ideas: ["Event planning and timelines", "Vendor coordination and scheduling", "On-site event logistics"] },
  { icon: Drama, cat: "coaching", from: "Actors, writers & directors", to: "Coaching & mentorship", text: "Share your craft with people developing their performance, writing or storytelling skills.", ideas: ["One-on-one craft coaching", "Audition and performance preparation", "Writing and storytelling mentorship"] },
  { icon: MapPinned, cat: "venues", from: "Location scouts & location professionals", to: "Venue & location scouting", text: "Research distinctive sites for restaurants, retail stores, corporate events and travel companies.", ideas: ["Restaurant and retail location research", "Corporate-event venue sourcing", "Distinctive hotel and restaurant research for travel companies", "Site visits and practical location assessments"] },
  { icon: Film, cat: "archives", from: "Editors, producers & camera professionals", to: "Family films & digital archives", text: "Transform family footage, photographs and recordings into polished legacy films and organized digital archives.", ideas: ["Family and legacy films", "Editing archival footage and recordings", "Organizing photographs and digital media"] },
];

const profiles = [
  { id: "simone", name: "Simone", title: "Art Director → Interior Styling", category: "interiors", img: "simone", credits: "Independent shorts and branded shoots", services: "Room styling, mood boards and sourcing", pricing: "Styling consultations: $95-$140 / hour", availability: "Weekday afternoons between shoots", portfolio: "A warm living-room styling concept" },
  { id: "luis", name: "Luis", title: "Set Carpenter → Custom Builds", category: "builds", img: "luis", credits: "Television sets and music videos", services: "Custom furniture and creative builds", pricing: "Design consultations from $450. Fabrication quoted by project.", availability: "Weekends; 2-3 weeks' lead time", portfolio: "A sculpted walnut sideboard" },
  { id: "renee", name: "Renee", title: "Production Coordinator → Events", category: "events", img: "renee", credits: "Commercial shoots and indie-film logistics", services: "Event timelines and vendor coordination", pricing: "Coordination: $75-$110 / hour", availability: "Weekday planning and event-day coverage by arrangement", portfolio: "An intimate garden event" },
  { id: "devon", name: "Devon", title: "Location Scout → Commercial Locations & Venues", category: "venues", img: "devon", credits: "Independent films and commercial shoots", services: "Restaurant and retail location research, corporate-event venues, and hotel and restaurant scouting for travel companies", pricing: "Scouting packages from $350", availability: "Select weekdays between productions", portfolio: "A garden courtyard event setting" },
];

const faqs: [string, string][] = [
  ["What does it cost?", "It's free to join. You'll always see any applicable marketplace fees or commissions upfront before choosing to offer services."],
  ["Can I set my rates?", "Yes. You set your services and rates, and choose which projects to accept."],
  ["Can I pause for production?", "Yes. Pause your availability when production calls and return when you're ready."],
  ["When would I get paid?", "Payment terms and expected payout timing will be clearly outlined before you accept a booking. Payments will be processed securely through the platform once the service is completed."],
  ["Can clients book me again?", "Absolutely, Clients can rebook you directly through the platform, making it easy to build ongoing relationships and repeat business. All bookings that originate through Between Gigs should continue to be arranged and paid through the platform. The first engagement carries the standard marketplace fee; subsequent bookings with the same client will have a reduced fee."],
  ["Why didn't someone think of this sooner?", "We're asking ourselves the same question.\n\nWhile the world races to discover what AI can do, we're focused on something technology can't replace: the extraordinary things people can do.\n\nThe set decorator who transforms an ordinary room into something unforgettable. The location professional who makes the impossible possible. The production coordinator who turns chaos into clockwork.\n\nThese are the people who make movie magic happen.\n\nThey've built careers in one of the world's most competitive industries, where creativity meets precision, problems demand solutions, and delivering under pressure is just another day on the job.\n\nAnd their talents don't end when the cameras stop rolling.\n\nWe believe the skills that bring extraordinary stories to life can make an extraordinary difference in everyday life.\n\nThat's why we created Between Gigs.\n\nA marketplace that connects entertainment industry professionals with people and businesses who need their expertise, creativity, and ingenuity. New opportunities for exceptional talent. Real-world solutions for everyday needs.\n\nBecause technology may change how we work, but it will never replace the power of human talent.\n\nThe world is full of problems to solve. Hollywood is full of people who know how.\n\nBetween Gigs. Extraordinary Talent. Everyday Solutions."],
];

const heroArt = ["solo-carpenter", "solo-costume", "solo-sound", "solo-actor-coach"];

const benefits = [["Your craft. Your rates.", "Define what you offer and what your time is worth."], ["Choose your projects.", "Take the work that fits your interests and availability."], ["Production comes first.", "Pause your availability when the call comes. Return when you're ready."]];

const pad = (i: number) => String(i + 1).padStart(2, "0");
const wrap = "mx-auto max-w-7xl px-4 sm:px-6";

/** Content that sits in the nine columns right of the label column. */
function Right({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className="grid grid-cols-12 gap-x-6"><div className={cx("col-span-12 lg:col-span-9 lg:col-start-4", className)}>{children}</div></div>;
}

/*
 * Direction G · Swiss grid (6 Nov 2026): a square forest hero with the phosphor dots and the horizon, the headline flush
 * left and huge, then numbered sections on the 12-column grid (label column, 4px rules), services as a ruled list,
 * square hard-cropped photos, and the call-sheet dialog as the one primary action.
 */
export function ProfessionalsLanding() {
  const [dialog, setDialog] = React.useState<{ open: boolean; category: string; placement: string }>({ open: false, category: "", placement: "" });
  const join = (placement: string, category = "") => setDialog({ open: true, category, placement });

  return (
    <Page bare>
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

      <CallSheetDialog open={dialog.open} category={dialog.category} placement={dialog.placement} onClose={() => setDialog((d) => ({ ...d, open: false }))} />
    </Page>
  );
}
