"use client";
import { Badge, Button, Input } from "@ds/components";
import { Reveal } from "@ds/motion";
import { ArrowRight, ArrowUpRight, Brush, CalendarCheck, Camera, Film, Hammer, MapPin, Search, Shirt, Sofa } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { data, type Person, type Profile } from "@/lib/data";
import { basisShort, monthStatusLabel } from "@/lib/data/taxonomy";
import { asset } from "@/lib/site";
import { scenePages } from "@/lib/storyboard";
import { PersonPhoto } from "@/components/people/PersonPhoto";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ProposalNote } from "./ProposalNote";

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

/** Proposal: the home page once the platform is open, signed out. Two doors: find help, or join as a Gigster. */
export function VisitorHome() {
  const [featured, setFeatured] = React.useState<{ person: Person; profile: Profile }[]>([]);
  React.useEffect(() => { void data.people.similar("", 4).then(setFeatured); }, []);

  return (
    <div>
      {/* Hero with the search front and centre */}
      <section data-theme="dark" aria-labelledby="v-hero" className="relative isolate overflow-hidden rounded-2xl bg-surface-brand">
        <span aria-hidden="true" className="glow-horizon opacity-60" />
        <div className="relative z-raised grid gap-8 px-5 pt-12 pb-10 sm:px-10 lg:grid-cols-12 lg:pt-16">
          <div className="lg:col-span-8">
            <p className="text-eyebrow text-ink-brand uppercase">Extraordinary talent. Everyday solutions.</p>
            <h2 id="v-hero" className="mt-3 font-display text-display-md text-balance text-ink sm:text-display-lg">Hollywood's craftspeople, <span className="glow-text text-ink-brand">for everyday life.</span></h2>
            <p className="mt-4 max-w-xl text-body-lg text-ink-muted">Set builders, costumers, stylists and photographers between productions, ready for projects in your home, event or business.</p>
          </div>
          <form role="search" onSubmit={(e) => e.preventDefault()} className="grid gap-3 rounded-2xl border border-line bg-surface p-3 shadow-lg md:grid-cols-12 md:items-end lg:col-span-12">
            <label className="grid gap-1 md:col-span-6"><span className="text-label-sm text-ink-muted">What do you need?</span><Input aria-label="What do you need?" placeholder="Try alterations, a reading nook or portraits" start={<Search />} /></label>
            <label className="grid gap-1 md:col-span-4"><span className="text-label-sm text-ink-muted">Where?</span><Input aria-label="Where?" defaultValue="Los Angeles, CA" start={<MapPin />} /></label>
            <Button type="submit" variant="primary" size="lg" className="glow-hover md:col-span-2" iconStart={<Search />}>Search</Button>
          </form>
        </div>
      </section>
      <ProposalNote n={1} title="Search first, because clients arrive with a job" className="mt-3">
        <p>Today's home only collects Gigsters. Once clients can book, most visitors arrive with a task ("hem my trousers", "light my party"), so the first thing they meet is a plain-language search, not a pitch.</p>
        <p>The headline keeps the brand line ("Extraordinary talent. Everyday solutions.") as the eyebrow so the call-sheet voice carries over.</p>
      </ProposalNote>

      {/* Two doors */}
      <section aria-label="Two ways in" className="mt-10 grid gap-4 md:grid-cols-2">
        <div className="grid content-start gap-3 rounded-2xl border border-line bg-surface p-6 shadow-sm">
          <Badge tone="brand" size="sm" className="w-fit">For clients</Badge>
          <h2 className="font-display text-heading-lg text-ink">Tell us the project. We'll cast the crew.</h2>
          <p className="text-body-md text-ink-muted">One person for an afternoon, or a whole team for an event. Agree scope, timing and the final rate together.</p>
          <div><ButtonLink href="/storyboard/" variant="primary" iconEnd={<ArrowRight />}>Find talent for a project</ButtonLink></div>
        </div>
        <div className="grid content-start gap-3 rounded-2xl border border-line bg-surface p-6 shadow-sm">
          <Badge tone="neutral" size="sm" className="w-fit">For entertainment professionals</Badge>
          <h2 className="font-display text-heading-lg text-ink">Your skills don't stop when the cameras do.</h2>
          <p className="text-body-md text-ink-muted">Your craft, your rates, your schedule. Production comes first: pause any time.</p>
          <div><ButtonLink href="/professionals/" iconEnd={<ArrowUpRight />}>Get on the call sheet</ButtonLink></div>
        </div>
      </section>
      <ProposalNote n={2} title="Two doors, equal weight" className="mt-3">
        <p>Both audiences still need the home page: clients to hire, Gigsters to join. Side by side, with the approved lines from /professionals and the Storyboard, so neither group has to scroll past the other's pitch.</p>
      </ProposalNote>

      {/* Needs, not job titles */}
      <section aria-labelledby="v-needs" className="mt-14">
        <h2 id="v-needs" className="font-display text-display-sm text-ink">What can we help with?</h2>
        <ul className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          {needs.map((n, i) => (
            <li key={n.need}>
              <Reveal effect="fade-up" delay={i * 40} className="flex h-full flex-col gap-2 rounded-xl border border-line bg-surface p-4 transition duration-base hover:-translate-y-0.5 hover:border-line-strong">
                <span className="grid size-9 place-items-center rounded-full bg-surface-selected text-ink-brand" aria-hidden="true"><n.icon className="size-4" /></span>
                <span className="text-label-md text-ink">{n.need}</span>
                <span className="text-body-sm text-ink-muted">from {n.craft}</span>
              </Reveal>
            </li>
          ))}
        </ul>
      </section>
      <ProposalNote n={3} title="Needs, not departments" className="mt-3">
        <p>Clients don't know what a set decorator is. Each tile names the need first and the film craft second ("Refresh a room · from set decorators"), the same translation /professionals makes for Gigsters ("Art directors → Interior styling").</p>
      </ProposalNote>

      {/* Featured Gigsters */}
      <section aria-labelledby="v-featured" className="mt-14">
        <h2 id="v-featured" className="font-display text-display-sm text-ink">Meet a few Gigsters</h2>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map(({ person: p, profile: { fields: f } }) => (
            <li key={p.id} className="group relative overflow-hidden rounded-2xl border border-line bg-surface transition duration-base hover:-translate-y-0.5 hover:shadow-lg">
              <PersonPhoto id={p.id} name={p.name} src={f.photo || undefined} alt="" className="aspect-4/3 w-full" />
              <div className="grid gap-1 p-4">
                <h3 className="font-display text-heading-md text-ink"><Link href={`/p/${p.slug}/`} className="after:absolute after:inset-0 group-hover:text-ink-brand">{p.name}</Link></h3>
                <p className="text-label-sm text-ink-brand">{f.services[0]}</p>
                <p className="text-body-sm text-ink-muted">{f.areas[0]} · {monthStatusLabel[f.monthStatus]}{f.rate && ` · from $${f.rate}/${basisShort[f.basis]}`}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-caption text-ink-subtle">Fictional sample profiles.</p>
      </section>
      <ProposalNote n={4} title="Real people, approved profiles only" className="mt-3">
        <p>Only approved profiles appear (the Milestone 4 review is the gate). Faces build trust faster than copy. Order by availability this month, so the first people a client sees can actually take the job.</p>
      </ProposalNote>

      {/* Storyboard strip */}
      <section aria-labelledby="v-stories" className="mt-14 rounded-2xl bg-surface-sunken p-5 sm:p-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="v-stories" className="font-display text-display-sm text-ink">The credits keep rolling</h2>
          <Link href="/storyboard/" className="text-label-md text-link underline underline-offset-2">Open the Storyboard</Link>
        </div>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {scenes.map((s) => (
            <li key={s.file} className="overflow-hidden rounded-xl border border-line bg-surface">
              <img src={asset(`art/storyboard/${s.file}`)} alt="" loading="lazy" className="aspect-3/2 w-full object-cover" />
              <div className="grid gap-1 p-4"><p className="text-label-sm text-ink-brand">{s.place}</p><h3 className="text-label-md text-ink">{s.title}</h3></div>
            </li>
          ))}
        </ul>
      </section>
      <ProposalNote n={5} title="Keep the Storyboard as the imagination engine" className="mt-3">
        <p>The approved artwork already shows what's possible better than any list. A strip of four scenes, one solo and one crew for each kind of client, leads into the full book.</p>
      </ProposalNote>

      {/* How it works + trust */}
      <section aria-labelledby="v-how" data-theme="dark" className="relative isolate mt-14 overflow-hidden rounded-2xl bg-surface-brand p-6 sm:p-10">
        <span aria-hidden="true" className="glow-horizon opacity-50" />
        <div className="relative z-raised grid gap-8 lg:grid-cols-12">
          <h2 id="v-how" className="font-display text-display-sm text-ink lg:col-span-4">How it works</h2>
          <ol className="grid gap-5 sm:grid-cols-3 lg:col-span-8">
            {[["Tell us the project", "A garment, a room, an event, a portrait."], ["Meet your Gigster", "Agree scope, timing and the final rate together."], ["Book with confidence", "Real film-and-TV craft, for everyday life."]].map(([t, d], i) => (
              <li key={t} className="grid content-start gap-2">
                <span className="grid size-8 place-items-center rounded-full bg-action font-mono text-data-sm text-on-action">{i + 1}</span>
                <b className="text-label-md text-ink">{t}</b><span className="text-body-sm text-ink-muted">{d}</span>
              </li>
            ))}
          </ol>
          <p className="text-body-sm text-ink-muted lg:col-span-8 lg:col-start-5">Every profile is reviewed by the Between Gigs team before it goes live. Credits are self-reported; regulated work needs the right license (<Link className="text-link underline underline-offset-2" href="/licensing-insurance/">what we check, and what we don't</Link>).</p>
        </div>
      </section>
      <ProposalNote n={6} title="Honest trust, not badges" className="mt-3">
        <p>We say exactly what review means, and link the licensing disclosure, instead of "verified" badges we can't back up yet (see /provider-standards).</p>
      </ProposalNote>

    </div>
  );
}
