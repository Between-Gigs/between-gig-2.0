"use client";
import { Accordion, Button, cx } from "@ds/components";
import { Reveal } from "@ds/motion";
import { ArrowRight, ArrowUpRight, Brush, CalendarCheck, Camera, Drama, Film, Hammer, MapPinned, Scissors, Shirt, Sofa } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { asset } from "@/lib/site";
import { Page } from "@/components/site/Page";
import { CallSheetDialog } from "./CallSheetDialog";
import { CallSheetButton, Founders, SectionHeading } from "./parts";

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
  { id: "maya", name: "Maya", title: "Art Director → Interior Styling", category: "interiors", img: "maya", credits: "Independent shorts and branded shoots", services: "Room styling, mood boards and sourcing", pricing: "Styling consultations: $95-$140 / hour", availability: "Weekday afternoons between shoots", portfolio: "A warm living-room styling concept" },
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

export function ProfessionalsLanding() {
  const [dialog, setDialog] = React.useState<{ open: boolean; category: string; placement: string }>({ open: false, category: "", placement: "" });
  const join = (placement: string, category = "") => setDialog({ open: true, category, placement });

  return (
    <Page bare>
      {/* Hero */}
      <section data-theme="dark" aria-labelledby="hero-h" className="relative isolate overflow-hidden bg-surface-brand">
        <span aria-hidden="true" className="glow-horizon opacity-60" />
        <div className="relative z-raised mx-auto grid max-w-7xl items-center gap-12 px-4 pt-14 pb-24 sm:px-6 lg:grid-cols-12 lg:pt-20 lg:pb-28">
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
                <p className="font-mono text-data-sm tracking-wider text-ink-subtle uppercase">Los Angeles Call Sheet · Free to join</p>
              </div>
            </Reveal>
          </div>
          {/* A fan of approved Storyboard scenes: marketing moment, so the card fan is allowed (BRAND.md). */}
          <div aria-hidden="true" className="relative hidden h-96 lg:col-span-5 lg:block">
            {heroArt.map((f, i) => (
              <Reveal key={f} effect="fade-up" delay={200 + i * 90}
                className={cx("absolute w-56 overflow-hidden rounded-xl border-4 border-surface shadow-lg",
                  ["top-0 left-6 -rotate-6", "top-10 right-2 rotate-3", "bottom-0 left-0 rotate-2", "right-12 bottom-6 -rotate-3"][i])}>
                <img src={asset(`art/storyboard/${f}.jpg`)} alt="" className="aspect-3/2 w-full object-cover" />
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
          {[["Your craft. Your rates.", "Define what you offer and what your time is worth."], ["Choose your projects.", "Take the work that fits your interests and availability."], ["Production comes first.", "Pause your availability when the call comes. Return when you're ready."]].map(([t, d], i) => (
            <li key={t}><Reveal effect="fade-up" delay={i * 70}><h3 className="font-display text-heading-lg text-ink">{t}</h3><p className="mt-1 text-body-md text-ink-muted">{d}</p></Reveal></li>
          ))}
        </ul>
      </section>

      {/* How it works / services */}
      <section id="services" aria-labelledby="services-h" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-20 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-12">
          <SectionHeading id="services-h" eyebrow="How it works" title="Your craft." accent="More possibilities." className="lg:col-span-5" />
          <Reveal effect="fade-up" delay={120} className="grid content-start gap-3 lg:col-span-7">
            <h3 className="font-display text-heading-lg text-ink">An on-demand talent marketplace for entertainment industry professionals.</h3>
            <p className="text-body-lg text-ink-muted">We connect skilled people between gigs with clients who need their expertise for projects, tasks, and services.</p>
            <p className="text-body-lg text-ink-muted">Our professionals come from entertainment. Our clients are anyone who could use their expertise.</p>
          </Reveal>
        </div>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {services.map((s, i) => (
            <li key={s.cat}>
              <Reveal effect="fade-up" delay={(i % 5) * 50} className="flex h-full flex-col gap-2 rounded-2xl border border-line bg-surface p-5 transition duration-base hover:-translate-y-0.5 hover:shadow-md">
                <span className="grid size-10 place-items-center rounded-full bg-surface-selected text-ink-brand" aria-hidden="true"><s.icon className="size-5" /></span>
                <h3 className="mt-2 font-display text-heading-md text-ink">{s.from}</h3>
                <p className="text-label-md text-ink-brand"><span aria-hidden="true">→ </span>{s.to}</p>
                <p className="text-body-sm text-ink-muted">{s.text}</p>
                <details className="group mt-1 text-body-sm">
                  <summary className="inline-flex min-h-6 cursor-pointer items-center gap-1 text-label-sm text-ink marker:content-none">
                    <ArrowRight className="size-3.5 transition-transform duration-fast group-open:rotate-90" aria-hidden="true" />Explore service ideas
                  </summary>
                  <ul className="mt-2 grid list-disc gap-1 pl-5 text-ink-muted">{s.ideas.map((x) => <li key={x}>{x}</li>)}</ul>
                </details>
                <div className="mt-auto pt-3">
                  <Button size="sm" variant="ghost" iconEnd={<ArrowUpRight />} className="-ml-3" onClick={() => join("service", s.cat)} aria-label={`I offer this service: ${s.to}`}>I offer this service</Button>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </section>

      {/* Sample profiles */}
      <section id="profiles" aria-labelledby="profiles-h" className="scroll-mt-20 bg-surface-sunken py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading id="profiles-h" eyebrow="Sample professional profiles" title="Here's how your skills" accent="could translate." />
          <ul className="mt-10 grid gap-6 md:grid-cols-2">
            {profiles.map((p, i) => (
              <li key={p.id}>
                <Reveal effect="fade-up" delay={(i % 2) * 80} className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
                  <img src={asset(`art/samples/${p.img}.jpg`)} alt={`Illustrative portrait of ${p.name}, and ${p.portfolio.toLowerCase()}`} loading="lazy" className="aspect-3/2 w-full object-cover" />
                  <div className="flex flex-1 flex-col gap-3 p-5">
                    <div>
                      <h3 className="font-display text-heading-lg text-ink">{p.name}</h3>
                      <p className="text-label-md text-ink-brand">{p.title}</p>
                    </div>
                    <dl className="grid gap-2 text-body-sm sm:grid-cols-4">
                      {[["Background", p.credits], ["Services", p.services], ["Pricing", p.pricing], ["Availability", p.availability]].map(([k, v]) => (
                        <div key={k} className="contents"><dt className="text-label-sm text-ink-subtle">{k}</dt><dd className="text-ink-muted sm:col-span-3">{v}</dd></div>
                      ))}
                    </dl>
                    <div className="mt-auto pt-2"><Button iconEnd={<ArrowUpRight />} onClick={() => join(`profile-${p.id}`, p.category)}>Create a profile like this</Button></div>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-caption text-ink-subtle">Sample profiles, services and pricing shown for illustration.</p>
        </div>
      </section>

      {/* Your next chapter */}
      <section id="next-chapter" aria-labelledby="next-chapter-h" className="mx-auto grid max-w-7xl scroll-mt-20 gap-10 px-4 py-20 sm:px-6 lg:grid-cols-12">
        <SectionHeading id="next-chapter-h" title="Your next chapter" accent="starts here." className="lg:col-span-5" />
        <Reveal effect="fade-up" delay={100} className="grid gap-4 lg:col-span-7">
          <h3 className="font-display text-heading-lg text-ink">Extraordinary Talent. Everyday Solutions.</h3>
          <p className="text-body-lg text-ink">Professional expertise. Available between productions.</p>
          <p className="text-body-lg text-ink-muted">Between Gigs connects you with clients who value the creativity, craftsmanship, and expertise you've developed in entertainment.</p>
          <p className="text-body-lg text-ink-muted">Bring your skills beyond the set to projects, tasks, and services for people and businesses. Choose work that fits your interests, set your rates, and make room for your next production.</p>
          <p className="font-display text-heading-md text-ink">Your expertise. New clients. On your terms.</p>
          <div data-theme="dark" className="relative isolate mt-2 overflow-hidden rounded-2xl bg-surface-brand p-6">
            <span aria-hidden="true" className="glow-horizon opacity-60" />
            <div className="relative z-raised">
              <p className="font-display text-heading-lg text-ink-brand">Launching in Los Angeles.</p>
              <p className="mt-1 text-body-md text-ink-muted"><b className="text-ink">COMING SOON:</b> New York. Atlanta. Toronto. Vancouver.</p>
            </div>
          </div>
          <p className="text-body-sm text-ink-muted">Review our <Link className="text-link underline underline-offset-2" href="/provider-standards/">provider standards</Link> and <Link className="text-link underline underline-offset-2" href="/licensing-insurance/">service qualifications</Link> as you plan your offer.</p>
        </Reveal>
      </section>

      {/* FAQ */}
      <section id="faq" aria-labelledby="faq-h" className="mx-auto grid max-w-7xl scroll-mt-20 gap-10 px-4 pb-20 sm:px-6 lg:grid-cols-12">
        <SectionHeading id="faq-h" eyebrow="Professional FAQ" title="Built around life" accent="between productions." className="lg:col-span-5" />
        <div className="lg:col-span-7">
          <Accordion variant="framed" items={faqs.map(([q, a], i) => ({ id: `faq-${i}`, title: q, content: <div className="grid gap-3">{a.split("\n\n").map((para) => <p key={para}>{para}</p>)}</div> }))} />
        </div>
      </section>

      <div className="border-t border-line">
        <Founders peterBio="Writer, producer, and showrunner with over 40 years of experience across film, television, and comic books. Credits include Hawaii Five-0, 24, CSI: NY, R.I.P.D., Demolition Man, and Magnum P.I." />
      </div>

      {/* Final call to action */}
      <section id="waitlist" aria-labelledby="final-h" data-theme="dark" className="relative isolate overflow-hidden bg-surface-brand">
        <span aria-hidden="true" className="glow-horizon opacity-60" />
        <div className="relative z-raised mx-auto grid max-w-3xl justify-items-center gap-4 px-4 py-20 text-center sm:px-6">
          <p className="text-eyebrow text-ink-brand uppercase">Bring your craft beyond the set</p>
          <h2 id="final-h" className="font-display text-display-sm text-balance text-ink sm:text-display-md">Join the Los Angeles professionals shaping Between Gigs.</h2>
          <CallSheetButton onClick={() => join("footer")} className="mt-2" />
        </div>
      </section>

      <CallSheetDialog open={dialog.open} category={dialog.category} placement={dialog.placement} onClose={() => setDialog((d) => ({ ...d, open: false }))} />
    </Page>
  );
}
