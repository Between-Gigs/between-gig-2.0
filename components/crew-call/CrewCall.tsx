"use client";
import { Avatar, Badge, Button, IconButton, cx } from "@ds/components";
import { Reveal } from "@ds/motion";
import {
  Armchair, ArrowRight, Brush, Camera, Car, ChefHat, ClipboardList, Clapperboard, FilePen, Hammer, Laptop, Lightbulb,
  MapPinned, Music, PackageOpen, PaintRoller, PartyPopper, Search, ShieldCheck, Shirt, Sofa, Star, X, type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { comingSoon, hero, services, testimonials, type CrewIcon } from "@/lib/crew-call";
import { asset } from "@/lib/site";
import { Planner } from "@/components/funnel/Storyboard";
import { Horizon } from "@/components/funnel/parts";
import { Page } from "@/components/site/Page";
import { ButtonLink } from "@/components/ui/ButtonLink";

const icons: Record<CrewIcon, LucideIcon> = {
  moving: PackageOpen, carpentry: Hammer, furniture: Armchair, photography: Camera, location: MapPinned, events: PartyPopper,
  hair: Brush, production: ClipboardList, drivers: Car, security: ShieldCheck, tech: Laptop, script: FilePen,
  painting: PaintRoller, creative: Lightbulb, audio: Music, wardrobe: Shirt, interior: Sofa, video: Clapperboard, catering: ChefHat,
};

const matches = (q: string, ...text: string[]) => !q || text.join(" ").toLowerCase().includes(q.toLowerCase());

/**
 * /crew-call: the client's Call sheet prototype (V15) on the design system. The hero search filters the crew
 * below as you type; every service, live or coming soon, opens the Storyboard's "Find talent" form with that
 * service filled in, so there is always a next step.
 */
export function CrewCall() {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [ask, setAsk] = React.useState<Record<string, string> | null>(null);
  const crew = React.useRef<HTMLElement>(null);
  const shown = services.filter((s) => matches(q, s.title, s.line));
  const soon = comingSoon.filter((s) => matches(q, s.title));
  const open = (project: string) => setAsk({ project });
  const toCrew = () => crew.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });

  return (
    <Page bare>
      <p className="border-b border-line bg-surface-sunken px-4 py-2 text-body-sm text-ink-muted sm:text-center">
        <b className="font-semibold text-ink">Preview</b> · Sample reviews and stand-in photos. Featured services are provisional until Gigster profiles are reviewed.
      </p>

      {/* Hero: the film set behind a forest wash, the promise, and one search. */}
      <section data-theme="dark" aria-labelledby="cc-h" className="relative isolate overflow-hidden bg-surface-brand">
        <img src={asset(hero.image)} alt="" width={1000} height={1000} className="absolute inset-0 -z-10 size-full object-cover" />
        <span aria-hidden="true" className="absolute inset-0 -z-10 bg-linear-to-b from-surface-brand/85 via-surface-brand/70 to-surface-brand/95" />
        <span aria-hidden="true" className="absolute inset-0 -z-10 phosphor-dots opacity-60" />
        <Horizon />
        <div className="relative z-raised mx-auto grid max-w-4xl justify-items-start gap-5 px-4 pt-16 pb-32 sm:justify-items-center sm:px-6 sm:pt-24 sm:text-center lg:pb-36">
          <Reveal effect="fade-up"><p className="text-eyebrow tracking-widest text-ink-brand uppercase">{hero.eyebrow}</p></Reveal>
          <Reveal effect="fade-up" delay={60}>
            <h1 id="cc-h" className="font-serif text-display-md text-balance text-ink sm:text-display-lg lg:text-display-xl">
              {hero.title[0]}<br /><span className="glow-text text-ink-brand">{hero.title[1]}</span>
            </h1>
          </Reveal>
          <Reveal effect="fade-up" delay={120}><p className="max-w-2xl text-body-lg text-ink-muted">{hero.lead}</p></Reveal>
          <Reveal effect="fade-up" delay={180} className="w-full max-w-xl">
            <form role="search" onSubmit={(e) => { e.preventDefault(); if (q.trim() && !shown.length && !soon.length) open(q.trim()); else toCrew(); }}
              className="flex items-center gap-2 rounded-full border border-line bg-surface p-1.5 pl-5 shadow-lg focus-within:border-ink-brand">
              <Search className="size-5 shrink-0 text-ink-subtle" aria-hidden="true" />
              <label htmlFor="cc-search" className="sr-only">Search the crew</label>
              <input id="cc-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={hero.search}
                className="min-w-0 flex-1 bg-transparent py-2 text-body-lg text-ink outline-none placeholder:text-ink-subtle" />
              <IconButton type="submit" variant="primary" label="Find the crew" icon={<ArrowRight />} className="rounded-full" />
            </form>
          </Reveal>
        </div>
      </section>

      {/* Sample testimonials: swipe on phones, three across from lg. */}
      <section aria-labelledby="cc-reviews-h" className="mx-auto max-w-7xl px-4 pt-12 sm:px-6">
        <h2 id="cc-reviews-h" className="text-center text-body-sm text-ink-subtle">Illustrative testimonial layout · Not customer reviews</h2>
        <ul aria-label="Sample testimonials" tabIndex={0} className="no-scrollbar -mx-4 mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0 lg:grid lg:grid-cols-3 lg:overflow-visible">
          {testimonials.map((t) => (
            <li key={t.name} className="flex w-11/12 shrink-0 snap-start sm:w-2/3 lg:w-auto">
            <figure className="flex w-full overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
              <img src={asset(t.image)} alt="" width={480} height={640} loading="lazy" decoding="async" className="w-2/5 shrink-0 object-cover" />
              <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex gap-0.5 text-warning" role="img" aria-label="Five stars (sample)">
                    {Array.from({ length: 5 }, (_, i) => <Star key={i} className="size-4 fill-current" aria-hidden="true" />)}
                  </span>
                  <Badge tone="neutral" size="sm">Sample</Badge>
                </div>
                <blockquote className="text-body-md font-medium text-ink">&ldquo;{t.quote}&rdquo;</blockquote>
                <figcaption className="mt-auto flex items-center gap-2">
                  <Avatar name={t.name} size="sm" />
                  <span className="grid"><span className="text-label-md text-ink">{t.name}</span><span className="text-body-sm text-ink-muted">{t.kind}</span></span>
                </figcaption>
              </div>
            </figure>
            </li>
          ))}
        </ul>
      </section>

      {/* Crew Call: the nine featured services, then what's coming. */}
      <section ref={crew} id="crew" aria-labelledby="cc-crew-h" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-16 sm:px-6">
        <h2 id="cc-crew-h" className="text-center font-serif text-display-md tracking-tight text-ink uppercase sm:text-display-lg">Crew Call</h2>
        {q && (
          <p aria-live="polite" className="mt-3 flex flex-wrap items-center justify-center gap-2 text-body-md text-ink-muted">
            {shown.length + soon.length ? <>Showing <b className="text-ink tabular-nums">{shown.length + soon.length}</b> for &ldquo;{q}&rdquo;</> : <>Nothing listed for &ldquo;{q}&rdquo; yet.</>}
            <button type="button" onClick={() => setQ("")} className="inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-label-md text-link hover:underline"><X className="size-4" aria-hidden="true" />Clear</button>
          </p>
        )}

        {shown.length > 0 && (
          <ul className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {shown.map((s) => (
              <li key={s.id} className="flex">
                <ServiceCard title={s.title} line={s.line} icon={icons[s.icon]} image={s.image} onOpen={() => open(`${s.title}: `)} />
              </li>
            ))}
          </ul>
        )}
        {q && !shown.length && !soon.length && (
          <div className="mx-auto mt-8 grid max-w-xl justify-items-center gap-3 rounded-2xl border border-dashed border-line-strong p-8 text-center">
            <p className="text-body-lg text-ink">Tell us what you need, and we&apos;ll cast the right person.</p>
            <Button variant="primary" iconEnd={<ArrowRight />} onClick={() => open(q)}>Describe your project</Button>
          </div>
        )}

        <div className="mt-10 flex justify-center">
          <ButtonLink href="/storyboard/#plates" variant="primary" size="lg" className="glow-hover" iconEnd={<ArrowRight />}>Explore all services</ButtonLink>
        </div>

        {soon.length > 0 && (
          <div className="mt-14 border-t border-line pt-10">
            <h3 className="text-center font-display text-heading-md text-ink">Coming soon</h3>
            <p className="mt-1 text-center text-body-md text-ink-muted">Need one of these now? Tap it and tell us. We&apos;ll find someone.</p>
            <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-5">
              {soon.map((s) => (
                <li key={s.id} className="flex justify-center">
                  <button type="button" onClick={() => open(`${s.title}: `)}
                    className="group grid w-full max-w-40 justify-items-center gap-2 rounded-xl p-2 text-center hover:bg-surface-hover">
                    <span className="relative">
                      <Emblem icon={icons[s.icon]} small />
                      <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-ink-brand px-2 py-0.5 text-label-sm whitespace-nowrap text-surface uppercase">Coming soon</span>
                    </span>
                    <span className="mt-2 text-label-md text-ink">{s.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="mt-12 text-center text-body-sm text-ink-subtle">Featured services are provisional until Gigster profiles are reviewed.</p>
      </section>

      {ask && <Planner kind="buyer" initial={ask} onClose={() => setAsk(null)} onBrowse={() => { setAsk(null); router.push("/storyboard/#plates"); }} />}
    </Page>
  );
}

/** A round badge: the craft's icon on a brand disc with a double ring, like a crew patch. */
function Emblem({ icon: Icon, small = false }: { icon: LucideIcon; small?: boolean }) {
  return (
    <span aria-hidden="true" className={cx("grid shrink-0 place-items-center rounded-full border-2 border-ink-brand bg-surface-selected shadow-md ring-4 ring-surface",
      small ? "size-16" : "size-20")}>
      <span className={cx("grid place-items-center rounded-full border border-dashed border-ink-brand/40", small ? "size-12" : "size-15")}>
        <Icon className={cx("text-ink-brand", small ? "size-6" : "size-8")} strokeWidth={1.75} />
      </span>
    </span>
  );
}

/** One featured service: the patch and words on the left, a photo cut on the diagonal on the right. */
function ServiceCard({ title, line, icon, image, onOpen }: { title: string; line: string; icon: LucideIcon; image: string | null; onOpen: () => void }) {
  const Icon = icon;
  return (
    <article data-tilt="" className="lift group relative flex min-h-44 w-full overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="relative z-raised flex min-w-0 flex-1 items-center gap-4 p-5">
        <Emblem icon={icon} small />
        <div className="grid min-w-0 gap-1.5">
          <h3 className="font-display text-heading-sm text-ink">
            <button type="button" onClick={onOpen} className="rounded-sm text-left after:absolute after:inset-0 group-hover:text-ink-brand">{title}</button>
          </h3>
          <p className="text-body-sm text-ink-muted">{line}</p>
          <span aria-hidden="true" className="mt-1 grid size-8 place-items-center rounded-full bg-surface-sunken text-ink-muted transition-colors duration-fast group-hover:bg-action group-hover:text-on-action">
            <ArrowRight className="size-4" />
          </span>
        </div>
      </div>
      <div aria-hidden="true" className="relative w-1/4 shrink-0" style={{ clipPath: "polygon(24% 0, 100% 0, 100% 100%, 0 100%)" }}>
        {image ? (
          <img src={asset(image)} alt="" width={480} height={640} loading="lazy" decoding="async" className="size-full object-cover transition-transform duration-slow group-hover:scale-105 motion-reduce:transition-none" />
        ) : (
          <span data-theme="dark" className="grid size-full place-items-center bg-surface-brand phosphor-dots">
            <Icon className="size-12 text-ink-brand opacity-40" strokeWidth={1.25} />
          </span>
        )}
      </div>
    </article>
  );
}
