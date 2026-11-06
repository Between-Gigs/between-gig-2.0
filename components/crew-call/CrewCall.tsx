"use client";
import { Button, IconButton, cx } from "@ds/components";
import {
  Armchair, ArrowRight, Brush, Camera, Car, ChefHat, ChevronLeft, ChevronRight, ClipboardList, Clapperboard, FilePen, Hammer,
  Laptop, Lightbulb, MapPinned, Music, PackageOpen, PaintRoller, PartyPopper, ShieldCheck, Shirt, Sofa, Star, X, type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { comingSoon, hero, services, testimonials, type CrewIcon } from "@/lib/crew-call";
import { asset } from "@/lib/site";
import { Planner, type PlannerTopic } from "@/components/funnel/Storyboard";
import { Page } from "@/components/site/Page";

const icons: Record<CrewIcon, LucideIcon> = {
  moving: PackageOpen, carpentry: Hammer, furniture: Armchair, photography: Camera, location: MapPinned, events: PartyPopper,
  hair: Brush, production: ClipboardList, drivers: Car, security: ShieldCheck, tech: Laptop, script: FilePen,
  painting: PaintRoller, creative: Lightbulb, audio: Music, wardrobe: Shirt, interior: Sofa, video: Clapperboard, catering: ChefHat,
};

const matches = (q: string, ...text: string[]) => !q || text.join(" ").toLowerCase().includes(q.toLowerCase());
const wrap = "mx-auto max-w-7xl px-4 sm:px-6";
const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * /crew-call: the client's Call sheet prototype, V15, words as shared, laid out in direction G · Swiss grid (6 Nov 2026):
 * the promise flush left beside the client's film-set photo, sample testimonials and the Crew Call services as ruled
 * grids with square crops and the embroidered patches, "Explore all services" as the one mint block, and the Coming
 * soon grid. It follows the visitor's theme like the other pages (the photos and patches stay as they are). The search
 * filters the crew as you type; every service, live or coming soon, opens the Storyboard's "Find talent" form with that
 * service filled in.
 */
export function CrewCall() {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [ask, setAsk] = React.useState<{ initial: Record<string, string>; topic?: PlannerTopic } | null>(null);
  const crew = React.useRef<HTMLElement>(null);
  const shown = services.filter((s) => matches(q, s.title, s.line));
  const soon = comingSoon.filter((s) => matches(q, s.title));
  const open = (project: string) => setAsk({ initial: { project } });
  const pick = (title: string, media: React.ReactNode, soon: boolean) => setAsk({
    initial: {},
    topic: { title, media, note: soon ? "Coming soon. Tell us what you need and we'll find someone now." : "Tell us about the job, and we'll match you with the right person." },
  });
  const toCrew = () => crew.current?.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" });

  return (
    <Page bare>
      <div data-client-locked="" className="bg-bg text-ink">
        {/* Hero: the promise flush left and huge, the client's film-set photo hard-cropped into the grid, one search. */}
        <section aria-labelledby="cc-h" className={cx(wrap, "grid grid-cols-12 gap-x-6 gap-y-8 pt-8 lg:pt-12")}>
          <p className="col-span-12 text-eyebrow text-ink uppercase">{hero.eyebrow}</p>
          <h1 id="cc-h" className="col-span-12 font-display text-display-md text-ink md:text-display-lg xl:text-display-xl">
            {hero.title[0]}<br /><span className="text-ink-brand">{hero.title[1]}</span>
          </h1>
          <div className="col-span-12 grid content-start gap-6 lg:col-span-5">
            <p className="text-body-lg text-ink">{hero.lead}</p>
            <form role="search" onSubmit={(e) => { e.preventDefault(); if (q.trim() && !shown.length && !soon.length) open(q.trim()); else toCrew(); }}
              className="flex items-stretch border-4 border-line-strong bg-surface focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus">
              <label htmlFor="cc-search" className="sr-only">Search the crew</label>
              <input id="cc-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={hero.search}
                className="min-h-12 min-w-0 flex-1 bg-transparent px-4 text-body-lg font-medium tracking-wider text-ink uppercase outline-none placeholder:text-ink-muted" />
              <IconButton type="submit" label="Find the crew" icon={<ArrowRight />} className="size-auto min-h-12 min-w-12 bg-action text-on-action hover:bg-action-hover" />
            </form>
          </div>
          <div className="col-span-12 aspect-2/1 overflow-hidden bg-surface-sunken lg:col-span-7">
            <img src={asset(hero.image)} alt="" width={1600} height={800} className="size-full object-cover" />
          </div>
        </section>

        {/* 01 Sample testimonials, with arrows to page through them on smaller screens. */}
        <section aria-labelledby="cc-reviews-h" className={cx(wrap, "grid grid-cols-12 gap-x-6 gap-y-6 pt-16 lg:pt-24")}>
          <div className="col-span-12 grid content-start gap-1 border-t-4 border-line-strong pt-3 lg:col-span-3">
            <span aria-hidden="true" className="text-label-sm text-ink tabular-nums">01</span>
            <h2 id="cc-reviews-h" className="text-body-sm text-ink-muted">Illustrative testimonial layout · Not customer reviews</h2>
          </div>
          <Strip label="Sample testimonials" className="col-span-12 lg:col-span-9" itemClass="w-10/12 sm:w-5/12 lg:w-auto lg:min-w-0 lg:flex-1 lg:shrink">
            {testimonials.map((t) => (
              <figure key={t.name} className="grid h-full w-full content-start gap-3 border-t-4 border-line-strong pt-3">
                <div className="aspect-square overflow-hidden bg-surface-sunken">
                  <img src={asset(t.image)} alt="" width={512} height={512} loading="lazy" decoding="async" className="size-full object-cover" />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex gap-0.5 text-ink" role="img" aria-label="Five stars (sample)">
                    {Array.from({ length: 5 }, (_, i) => <Star key={i} className="size-4 fill-current" aria-hidden="true" />)}
                  </span>
                  <span className="border border-line-strong px-1.5 text-label-sm tracking-wider text-ink uppercase">Sample</span>
                </div>
                <blockquote className="text-body-md font-semibold text-ink">&ldquo;{t.quote}&rdquo;</blockquote>
                <figcaption className="mt-auto flex items-center gap-3 border-t border-line pt-3">
                  <img src={asset(t.avatar)} alt="" width={128} height={128} loading="lazy" className="size-10 object-cover" />
                  <span className="grid"><span className="text-label-sm tracking-wide text-ink uppercase">{t.name}</span><span className="text-body-sm text-ink-muted">{t.kind}</span></span>
                </figcaption>
              </figure>
            ))}
          </Strip>
        </section>

        {/* 02 Crew Call */}
        <section ref={crew} id="crew" aria-labelledby="cc-crew-h" className={cx(wrap, "scroll-mt-20 pt-16 pb-16 lg:pt-24")}>
          <div className="grid grid-cols-12 gap-x-6 gap-y-3 border-t-4 border-line-strong pt-3">
            <span aria-hidden="true" className="col-span-12 text-label-sm text-ink tabular-nums lg:col-span-3">02</span>
            <div className="col-span-12 grid content-start gap-3 lg:col-span-9">
              <h2 id="cc-crew-h" className="font-display text-display-md text-ink uppercase sm:text-display-lg">Crew Call</h2>
              {q && (
                <p aria-live="polite" className="flex flex-wrap items-center gap-2 text-body-md text-ink-muted">
                  {shown.length + soon.length ? <>Showing <b className="text-ink tabular-nums">{shown.length + soon.length}</b> for &ldquo;{q}&rdquo;</> : <>Nothing listed for &ldquo;{q}&rdquo; yet.</>}
                  <button type="button" onClick={() => setQ("")} className="inline-flex min-h-11 items-center gap-1 px-2 text-label-md text-ink underline decoration-2 underline-offset-4 hover:text-ink-brand"><X className="size-4" aria-hidden="true" />Clear</button>
                </p>
              )}
            </div>
          </div>

          {shown.length > 0 && (
            <ul className="mt-10 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((s) => (
                <li key={s.id} className="flex">
                  <ServiceCard title={s.title} line={s.line} badge={s.badge} icon={icons[s.icon]} image={s.image} onOpen={() => pick(s.title, <img src={asset(s.badge)} alt="" width={192} height={192} className="size-14" />, false)} />
                </li>
              ))}
            </ul>
          )}
          {q && !shown.length && !soon.length && (
            <div className="mt-10 grid max-w-xl justify-items-start gap-4 border-t-4 border-line-strong pt-4">
              <p className="font-display text-heading-md text-ink">Tell us what you need, and we&apos;ll cast the right person.</p>
              <Button variant="primary" iconEnd={<ArrowRight />} onClick={() => open(q)}>Describe your project</Button>
            </div>
          )}

          {/* The page's one mint block. */}
          <Link href="/storyboard/#plates"
            className="group mt-12 flex min-h-20 items-center justify-between gap-4 border-t-4 border-forest-950 bg-tint-mint px-5 py-4 font-display text-heading-md text-forest-950 uppercase sm:px-8 sm:text-heading-lg">
            Explore all services<ArrowRight className="size-8 shrink-0 transition-transform duration-fast group-hover:translate-x-1 motion-reduce:transition-none" aria-hidden="true" />
          </Link>

          {soon.length > 0 && (
            <div className="mt-16 grid grid-cols-12 gap-x-6 gap-y-6 border-t-4 border-line-strong pt-3">
              <div className="col-span-12 grid content-start gap-2 lg:col-span-3">
                <h3 className="font-display text-heading-lg text-ink">Coming soon</h3>
                <p className="text-body-sm text-ink-muted">Need one now? Tap it and tell us. We&apos;ll find someone.</p>
              </div>
              <ul className="col-span-12 grid grid-cols-2 gap-x-6 sm:grid-cols-3 md:grid-cols-5 lg:col-span-9">
                {soon.map((s) => (
                  <li key={s.id} className="flex border-t border-line">
                    <button type="button" onClick={() => pick(s.title, <SoonTile icon={icons[s.icon]} small />, true)} aria-label={`${s.title}, coming soon. Tell us you need it.`}
                      className="group grid w-full content-start justify-items-start gap-3 py-4 text-left transition-colors duration-fast hover:bg-surface-hover">
                      <SoonTile icon={icons[s.icon]} />
                      <span className="grid gap-0.5">
                        <span className="text-label-md text-ink group-hover:underline">{s.title}</span>
                        <span aria-hidden="true" className="text-label-sm tracking-wide text-ink-muted uppercase">Coming soon</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="mt-12 text-body-sm text-ink-muted">Private design preview · Featured services are provisional until Gigster profiles are reviewed.</p>
        </section>
        <div className={wrap}>
          <p className="border-t border-line py-6 text-body-sm text-ink-muted">Sample quotes, generated photos, names, ratings and production-credit claims are unverified mockup content. Real testimonials require review before publication.</p>
        </div>
      </div>

      {ask && <Planner kind="buyer" initial={ask.initial} topic={ask.topic} onClose={() => setAsk(null)} onBrowse={() => { setAsk(null); router.push("/storyboard/#plates"); }} />}
    </Page>
  );
}

/** A row with square arrows on either side (until it all fits, from lg); swipes on touch. */
function Strip({ label, children, className, itemClass, progress = false }: { label: string; children: React.ReactNode; className?: string; itemClass: string; progress?: boolean }) {
  const ref = React.useRef<HTMLUListElement>(null);
  const [edge, setEdge] = React.useState({ start: true, end: false, at: 0, shown: 1 });
  const measure = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = Math.max(el.scrollWidth - el.clientWidth, 1);
    setEdge({ start: el.scrollLeft < 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4, at: el.scrollLeft / max, shown: el.clientWidth / el.scrollWidth });
  }, []);
  React.useEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (ref.current) ro.observe(ref.current);
    return () => ro.disconnect();
  }, [measure]);
  const go = (d: 1 | -1) => ref.current?.scrollBy({ left: d * ref.current.clientWidth * 0.8, behavior: reduced() ? "auto" : "smooth" });
  const items = React.Children.toArray(children);
  const arrow = "shrink-0 border-2 border-line-strong bg-surface max-sm:hidden lg:hidden";
  const row = (
    <div className={cx("flex items-center gap-2", !progress && className)}>
      <IconButton label={`Previous: ${label}`} variant="ghost" icon={<ChevronLeft />} disabled={edge.start} onClick={() => go(-1)} className={arrow} />
      <ul ref={ref} aria-label={label} tabIndex={0} onScroll={measure} className="no-scrollbar flex min-w-0 flex-1 snap-x snap-mandatory gap-6 overflow-x-auto">
        {items.map((c, i) => <li key={i} className={cx("flex shrink-0 snap-start", itemClass)}>{c}</li>)}
      </ul>
      <IconButton label={`Next: ${label}`} variant="ghost" icon={<ChevronRight />} disabled={edge.end} onClick={() => go(1)} className={arrow} />
    </div>
  );
  if (!progress) return row;
  // How far along the row you are: a slim line, not a scroll bar, and only when there's more to see.
  return (
    <div className={cx("grid gap-4", className)}>
      {row}
      {edge.shown < 0.99 && (
        <span aria-hidden="true" className="mx-auto block h-1 w-full max-w-md overflow-hidden rounded-full bg-surface-sunken">
          <span className="block h-full rounded-full bg-ink-brand transition-transform duration-fast"
            style={{ width: `${edge.shown * 100}%`, transform: `translateX(${(edge.at * (1 - edge.shown) / edge.shown) * 100}%)` }} />
        </span>
      )}
    </div>
  );
}

/** Coming-soon tile until the client's own art arrives: a square with the service's line icon. */
function SoonTile({ icon: Icon, small = false }: { icon: LucideIcon; small?: boolean }) {
  return (
    <span aria-hidden="true" className={cx("grid place-items-center bg-surface-sunken text-ink transition-colors duration-fast group-hover:bg-ink group-hover:text-bg", small ? "size-14" : "size-16")}>
      <Icon className={small ? "size-6" : "size-7"} strokeWidth={1.5} />
    </span>
  );
}

/** One featured service: the photo hard-cropped into its grid cell, then the embroidered patch and the words. */
function ServiceCard({ title, line, badge, icon, image, onOpen }: { title: string; line: string; badge: string; icon: LucideIcon; image: string | null; onOpen: () => void }) {
  const Icon = icon;
  return (
    <article className="group relative grid w-full content-start gap-4 border-t-4 border-line-strong pt-4">
      <div aria-hidden="true" className="aspect-3/2 overflow-hidden bg-surface-sunken">
        {image ? (
          <img src={asset(image)} alt="" width={800} height={800} loading="lazy" decoding="async" className="size-full object-cover transition-transform duration-slow group-hover:scale-105 motion-reduce:transition-none" />
        ) : (
          <span data-theme="dark" className="grid size-full place-items-center bg-surface-brand phosphor-dots">
            <Icon className="size-14 text-ink-brand opacity-60" strokeWidth={1.25} />
          </span>
        )}
      </div>
      <div className="flex items-start gap-4">
        <img src={asset(badge)} alt="" width={192} height={192} loading="lazy" decoding="async" className="size-16 shrink-0" />
        <div className="grid min-w-0 flex-1 gap-1">
          <h3 className="font-display text-heading-md text-ink">
            <button type="button" onClick={onOpen} className="text-left after:absolute after:inset-0 group-hover:underline">{title}</button>
          </h3>
          <p className="text-body-md text-ink-muted">{line}</p>
        </div>
        <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center border-2 border-line-strong text-ink transition-colors duration-fast group-hover:bg-ink group-hover:text-bg">
          <ArrowRight className="size-5" />
        </span>
      </div>
    </article>
  );
}
