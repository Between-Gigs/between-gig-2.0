"use client";
import { Button, Input, cx } from "@ds/components";
import { ArrowRight, Brush, CalendarCheck, Camera, Film, Hammer, MapPin, Search, Shirt, Sofa } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { data, type Person, type Profile } from "@/lib/data";
import { basisShort, monthStatusLabel } from "@/lib/data/taxonomy";
import { asset } from "@/lib/site";
import { scenePages } from "@/lib/storyboard";
import { PersonPhoto } from "@/components/people/PersonPhoto";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Carousel } from "@/components/funnel/Carousel";
import { Marquee } from "@/components/funnel/Marquee";
import { BrandBlock, Section, eyebrow, mintBlock, onMint } from "./kit";
import { ProposalNote, type Note } from "./ProposalNote";

/* Client needs, worded the way people ask (BRAND.md "name things the way people say them"), each mapped to the craft behind it. */
const needs = [
  { icon: Sofa, need: "Refresh a room", craft: "Set decorators", service: "Interior Styling" },
  { icon: Hammer, need: "Build or fix furniture", craft: "Set carpenters", service: "Furniture & Creative Builds" },
  { icon: Shirt, need: "Sort a wardrobe", craft: "Costume pros", service: "Wardrobe & Personal Styling" },
  { icon: Camera, need: "Portraits and events", craft: "Camera crew", service: "Photography & Portraits" },
  { icon: Brush, need: "Hair and makeup", craft: "Makeup artists", service: "Makeup Services" },
  { icon: CalendarCheck, need: "Plan an event", craft: "Production coordinators", service: "Event Styling" },
  { icon: Film, need: "Turn footage into a film", craft: "Editors", service: "" },
  { icon: MapPin, need: "Find the right venue", craft: "Location scouts", service: "" },
];

const scenes = ["solo-carpenter", "home-transformation", "bakery-launch", "backyard-wedding"].map((f) => scenePages.find((p) => p.file === `${f}.jpg`)!);

/** The reasoning beside each section, shown with "Show design notes". */
export const visitorNotes: Note[] = [
  { title: "Search first, because clients arrive with a job", body: <>
        <p>Today's home only collects Gigsters. Once clients can book, most visitors arrive with a task ("hem my trousers", "light my party"), so the first thing they meet is a plain-language search, not a pitch.</p>
        <p>The headline keeps the brand line ("Extraordinary talent. Everyday solutions.") as the eyebrow so the call-sheet voice carries over.</p>
  </> },
  { title: "Two doors, equal weight", body: <>
        <p>Both audiences still need the home page: clients to hire, Gigsters to join. Side by side, with the approved lines from /professionals and the Storyboard, so neither group has to scroll past the other's pitch.</p>
  </> },
  { title: "Needs, not departments", body: <>
        <p>Clients don't know what a set decorator is. Each tile names the need first and the film craft second ("Refresh a room · from set decorators"), the same translation /professionals makes for Gigsters ("Art directors → Interior styling").</p>
  </> },
  { title: "Real people, approved profiles only", body: <>
        <p>Only approved profiles appear (the Milestone 4 review is the gate). Faces build trust faster than copy. Order by availability this month, so the first people a client sees can actually take the job.</p>
  </> },
  { title: "Keep the Storyboard as the imagination engine", body: <>
        <p>The approved artwork already shows what's possible better than any list. A strip of four scenes, one solo and one crew for each kind of client, leads into the full book.</p>
  </> },
  { title: "Honest trust, not badges", body: <>
        <p>We say exactly what review means, and link the licensing disclosure, instead of "verified" badges we can't back up yet (see /provider-standards).</p>
  </> },
];

/** Proposal: the home page once the platform is open, signed out. Two doors: find help, or join as a Gigster. */
export function VisitorHome() {
  const [approved, setApproved] = React.useState<{ person: Person; profile: Profile }[]>([]);
  React.useEffect(() => { void data.people.similar("", 24).then(setApproved); }, []);
  const featured = approved.slice(0, 4);
  const rate = (f: Profile["fields"]) => f.rate ? `from $${f.rate}/${basisShort[f.basis]}` : "";

  return (
    <div className="grid gap-14 lg:gap-16">
      {/* Hero: the line huge and flush left, the search as the screen's one mint block, the brand block beside it.
          The brand block's copy is kept short enough that the mint block, stretched to its height, has no empty band. */}
      <div>
        <section aria-labelledby="v-hero" className="grid grid-cols-12 gap-x-6 gap-y-6">
          <div className="col-span-12 min-w-0">
            <p className={eyebrow}>Extraordinary talent. Everyday solutions.</p>
            <h2 id="v-hero" className="mt-4 max-w-6xl font-display text-display-sm text-balance text-ink sm:text-display-md md:text-display-lg xl:text-display-xl">Hollywood's craftspeople, <span className="text-ink-brand">for everyday life.</span></h2>
          </div>
          <form role="search" onSubmit={(e) => e.preventDefault()} className={cx(mintBlock, "col-span-12 grid content-end gap-4 p-5 sm:grid-cols-12 sm:items-end sm:gap-x-4 sm:p-6 lg:col-span-8 lg:p-8")}>
            <label className="grid gap-1.5 sm:col-span-12 md:col-span-6"><span className="text-label-sm font-bold tracking-widest uppercase">What do you need?</span><Input size="lg" aria-label="What do you need?" placeholder="Alterations, portraits…" start={<Search />} /></label>
            <label className="grid gap-1.5 sm:col-span-8 md:col-span-4"><span className="text-label-sm font-bold tracking-widest uppercase">Where?</span><Input size="lg" aria-label="Where?" defaultValue="Los Angeles, CA" start={<MapPin />} /></label>
            <Button type="submit" variant="primary" size="lg" className={cx(onMint, "justify-center! sm:col-span-4 md:col-span-2")} iconStart={<Search />}>Search</Button>
          </form>
          <BrandBlock className="col-span-12 lg:col-span-4">
            <p className="max-w-md p-5 pb-24 text-body-lg text-ink sm:p-6 sm:pb-24 lg:pb-12 lg:text-body-md">Set builders, costumers, stylists and photographers between productions, ready for projects in your home, event or business.</p>
          </BrandBlock>
        </section>
        <ProposalNote n={1} />
      </div>

      {/* Credits roll of the sample Gigsters: name, craft, area, rate, the way end credits read. */}
      <Marquee label="Sample Gigsters on the call sheet" className="-mt-6 border-y border-line lg:-mt-8"
        lines={approved.map(({ person: p, profile: { fields: f } }) => (
          <span key={p.id}><b className="font-bold text-ink">{p.name}</b> · {f.position} · {f.areas[0]}{f.rate ? <> · {rate(f)}</> : null}</span>
        ))} />

      {/* Two doors */}
      <div>
        <section aria-label="Two ways in" className="grid gap-x-6 gap-y-10 md:grid-cols-2">
          <div className="grid content-start gap-4 border-t-4 border-line-strong pt-3">
            <p className={eyebrow}>For clients</p>
            <h2 className="font-display text-heading-lg text-ink sm:text-display-sm">Tell us the project. We'll cast the crew.</h2>
            <p className="max-w-lg text-body-md text-ink-muted">One person for an afternoon, or a whole team for an event. Agree scope, timing and the final rate together.</p>
            <div><ButtonLink href="/storyboard/" variant="secondary" size="lg" className="border-2" iconEnd={<ArrowRight />}>Find talent for a project</ButtonLink></div>
          </div>
          <div className="grid content-start gap-4 border-t-4 border-line-strong pt-3">
            <p className={eyebrow}>For entertainment professionals</p>
            <h2 className="font-display text-heading-lg text-ink sm:text-display-sm">Your skills don't stop when the cameras do.</h2>
            <p className="max-w-lg text-body-md text-ink-muted">Your craft, your rates, your schedule. Production comes first: pause any time.</p>
            <div><ButtonLink href="/professionals/" variant="secondary" size="lg" className="border-2" iconEnd={<ArrowRight />}>Get on the call sheet</ButtonLink></div>
          </div>
        </section>
        <ProposalNote n={2} />
      </div>

      {/* Needs, not job titles */}
      <div>
        <Section id="v-needs" n="01" title="What can we help with?">
          <ul className="grid grid-cols-2 gap-x-6 md:grid-cols-4">
            {needs.map((n) => (
              <li key={n.need} className="flex min-w-0 items-start gap-3 border-b border-line py-4">
                <n.icon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-ink" strokeWidth={1.75} />
                <span className="grid min-w-0 gap-0.5">
                  <span className="text-label-md font-bold text-ink">{n.need}</span>
                  <span className="text-body-sm text-ink-muted">from {n.craft}</span>
                </span>
              </li>
            ))}
          </ul>
        </Section>
        <ProposalNote n={3} />
      </div>

      {/* Featured Gigsters */}
      <div>
        <Section id="v-featured" n="02" title="Meet a few Gigsters" aside={<p className="text-body-sm text-ink-muted">Fictional sample profiles.</p>}>
          {/* Phone: compact rows with a small square crop (the source photos are soft when blown up). sm+: square photos in the grid. */}
          <ul className="grid gap-x-6 sm:grid-cols-2 sm:gap-y-10 xl:grid-cols-4">
            {featured.map(({ person: p, profile: { fields: f } }) => (
              <li key={p.id} className="group relative flex items-center gap-4 border-b border-line py-3 sm:block sm:border-0 sm:py-0">
                <PersonPhoto id={p.id} name={p.name} src={f.photo || undefined} alt="" className="size-20 shrink-0 sm:aspect-square sm:size-auto sm:w-full" textClass="text-display-sm" />
                <div className="grid min-w-0 flex-1 gap-0.5 sm:mt-3">
                  <h3 className="min-w-0 font-display text-heading-md text-ink"><Link href={`/p/${p.slug}/`} className="after:absolute after:inset-0 group-hover:underline group-hover:decoration-2 group-hover:underline-offset-4">{p.name}</Link></h3>
                  <p className="truncate text-body-sm text-ink">{f.services[0]}</p>
                  <p className="text-body-sm text-ink-muted">{f.areas[0]} · {monthStatusLabel[f.monthStatus]}</p>
                  {f.rate && <p className="text-label-md font-bold whitespace-nowrap text-ink tabular-nums sm:mt-1">{rate(f)}</p>}
                </div>
              </li>
            ))}
          </ul>
        </Section>
        <ProposalNote n={4} />
      </div>

      {/* Storyboard strip */}
      <div>
        <Section id="v-stories" n="03" title="The credits keep rolling"
          aside={<Link href="/storyboard/" className="group inline-flex min-h-11 items-center gap-1.5 text-label-md font-bold text-ink underline decoration-2 underline-offset-4 hover:text-ink-brand">Open the Storyboard<ArrowRight aria-hidden="true" className="size-4" /></Link>}>
          <Carousel label="Storyboard scenes" gridFrom="lg" itemClassName="w-3/4 sm:w-5/12">
            {scenes.map((s) => (
              <article key={s.file} className="w-full">
                <img src={asset(`art/storyboard/thumbs/${s.file}`)} alt="" width={800} height={533} loading="lazy" decoding="async" className="aspect-3/2 h-auto w-full object-cover" />
                <div className="grid gap-1 border-b border-line py-3"><p className={eyebrow}>{s.place}</p><h3 className="text-label-md font-bold text-ink">{s.title}</h3></div>
              </article>
            ))}
          </Carousel>
        </Section>
        <ProposalNote n={5} />
      </div>

      {/* How it works + trust, in the forest brand block */}
      <div>
        <BrandBlock as="section" aria-labelledby="v-how">
          <div className="grid grid-cols-12 gap-x-6 gap-y-8 p-5 pb-28 sm:p-8 sm:pb-28 lg:p-10">
            <div className="col-span-12 lg:col-span-3">
              <span aria-hidden="true" className="text-label-sm font-extrabold text-ink tabular-nums">04</span>
              <h2 id="v-how" className="mt-1 font-display text-heading-lg text-ink lg:text-display-sm">How it works</h2>
            </div>
            <ol className="col-span-12 grid gap-x-6 gap-y-8 sm:grid-cols-3 lg:col-span-9">
              {[["Tell us the project", "A garment, a room, an event, a portrait."], ["Meet your Gigster", "Agree scope, timing and the final rate together."], ["Book with confidence", "Real film-and-TV craft, for everyday life."]].map(([t, d], i) => (
                <li key={t} className="grid content-start gap-2 border-t-4 border-line-strong pt-3">
                  <span aria-hidden="true" className="font-display text-display-sm text-ink-brand tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                  <b className="text-label-md text-ink">{t}</b><span className="text-body-sm text-ink-muted">{d}</span>
                </li>
              ))}
            </ol>
            <p className="col-span-12 max-w-3xl text-body-md text-ink-muted lg:col-span-9 lg:col-start-4">Every profile is reviewed by the Between Gigs team before it goes live. Credits are self-reported; regulated work needs the right license (<Link className="text-link underline underline-offset-2" href="/licensing-insurance/">what we check, and what we don't</Link>).</p>
          </div>
        </BrandBlock>
        <ProposalNote n={6} />
      </div>
    </div>
  );
}
