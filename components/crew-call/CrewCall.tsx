"use client";
import { useLook } from "@/components/site/LookSync";
import { Button, IconButton, cx } from "@ds/components";
import {
  Armchair, ArrowRight, ArrowUpRight, Brush, Camera, Car, ChefHat, ChevronLeft, ChevronRight, ClipboardList, Clapperboard, FilePen, Hammer,
  Laptop, Lightbulb, MapPinned, Music, PackageOpen, PaintRoller, PartyPopper, ShieldCheck, Shirt, Sofa, Star, X, type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { comingSoon, hero, services, testimonials, type CrewIcon } from "@/lib/crew-call";
import { asset } from "@/lib/site";
import { crewCallDark } from "@/lib/wallpaper-theme";
import { ThemedImg } from "@/components/ui/ThemedImg";
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
/** One Crew Call service, as in Justin's design: the patch and serif title, one line, "View service", and the
 * still-life object fading in at the right edge. The whole tile opens the request form. */
function CrewTile({ title, line, badge, object, onOpen }: { title: string; line: string; badge: string; object: string; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen}
      className="group relative flex h-full min-h-32 w-full overflow-hidden rounded-md border border-line-strong bg-surface text-left shadow-xs transition-shadow duration-fast hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
      <ThemedImg src={object} width={180} height={165}
        className="absolute inset-y-0 right-0 h-full w-2/5 object-cover object-right mask-l-from-60% mask-l-to-100%" />
      <span className="relative grid w-3/5 min-w-0 content-start gap-2 p-3 pr-1">
        <span className="flex items-center gap-2.5">
          <img src={asset(badge)} alt="" width={96} height={96} className="size-12 shrink-0" />
          <span className="font-serif text-heading-lg leading-none font-bold text-balance text-ink-deep">{title}</span>
        </span>
        <span className="text-body-sm text-ink">{line}</span>
        <span className="mt-auto inline-flex w-fit items-center gap-1 text-label-md font-semibold text-ink underline underline-offset-4 group-hover:text-ink-brand">View service<ArrowUpRight aria-hidden="true" className="size-4" /></span>
      </span>
    </button>
  );
}

export function CrewCall() {
  const brand = useLook() !== "swiss";
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
      {brand ? (
        <div data-client-locked="" className="bg-bg text-ink">
          {/* Hero: the client's film-set photo, the promise in the forest serif, one search. */}
          <section aria-labelledby="cc-h" className="relative isolate mx-auto max-w-7xl overflow-hidden">
            <img src={asset(hero.image)} alt="" width={1600} height={800} loading="eager" className="absolute inset-0 -z-20 size-full object-cover dark:hidden" />
            <picture>
              <source media="(orientation: portrait)" srcSet={asset(crewCallDark.portrait)} />
              <img src={asset(crewCallDark.desktop)} alt="" width={1672} height={941} loading="eager" decoding="async" className="absolute inset-0 -z-20 hidden size-full object-cover dark:block" />
            </picture>
            {/* Keep the light composition’s readability wash; the selected dark art provides its own quiet center. */}
            <span aria-hidden="true" className="absolute inset-0 -z-10 bg-radial from-bg/70 via-bg/30 to-transparent dark:hidden" />
            <div className="mx-auto grid max-w-3xl justify-items-center gap-5 px-4 pt-12 pb-14 text-center sm:px-6 sm:pt-16 sm:pb-16">
              <h1 id="cc-h" className="font-serif text-display-md font-bold text-balance text-ink-deep sm:text-display-lg lg:text-display-xl">
                {hero.title[0]}<br />{hero.title[1]}
              </h1>
              <p className="max-w-md text-body-lg font-medium text-balance text-ink">{hero.lead}</p>
              <form role="search" onSubmit={(e) => { e.preventDefault(); if (q.trim() && !shown.length && !soon.length) open(q.trim()); else toCrew(); }}
                className="flex w-full max-w-xl items-center gap-2 rounded-lg border border-line-strong bg-surface/95 p-1.5 pl-5 shadow-lg focus-within:ring-2 focus-within:ring-ink-brand">
                <label htmlFor="cc-search" className="sr-only">Search the crew</label>
                <input id="cc-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={hero.search}
                  className="min-w-0 flex-1 bg-transparent py-2 text-body-lg text-ink outline-none placeholder:text-ink-muted" />
                <button type="submit" aria-label="Find the crew" title="Find the crew"
                  className="grid size-10 shrink-0 place-items-center rounded-md bg-ink-deep text-bg transition-colors duration-fast hover:bg-ink-deep-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"><ArrowRight aria-hidden="true" className="size-5" /></button>
              </form>
            </div>
          </section>

          {/* Sample testimonials, with arrows to page through them. */}
          <section aria-labelledby="cc-reviews-h" className="mx-auto max-w-7xl px-4 pt-4 sm:px-6">
            <h2 id="cc-reviews-h" className="flex items-center gap-4 text-body-md text-ink before:h-px before:flex-1 before:bg-line-strong after:h-px after:flex-1 after:bg-line-strong">Illustrative testimonials · Sample content</h2>
            <Strip label="Sample testimonials" className="mt-3" itemClass="w-11/12 sm:w-2/3 lg:w-auto lg:min-w-0 lg:flex-1 lg:shrink">
              {testimonials.map((t) => (
                <figure key={t.name} className="flex h-full w-full gap-4 rounded-md border border-line-strong bg-surface p-2.5">
                  <img src={asset(t.image)} alt="" width={512} height={512} loading="lazy" decoding="async" className="w-2/5 shrink-0 rounded-md object-cover" />
                  <div className="flex min-w-0 flex-1 flex-col gap-2 py-1 pr-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex gap-0.5 text-warning" role="img" aria-label="Five stars (sample)">
                        {Array.from({ length: 5 }, (_, i) => <Star key={i} className="size-4 fill-current" aria-hidden="true" />)}
                      </span>
                      <span className="text-label-sm tracking-wider text-warning uppercase">Sample</span>
                    </div>
                    <figcaption className="font-serif text-heading-lg leading-tight font-bold text-balance text-ink-deep">{t.title}</figcaption>
                    <blockquote className="text-body-md text-ink">{t.short}</blockquote>
                  </div>
                </figure>
              ))}
            </Strip>
          </section>

          {/* Crew Call */}
          <section ref={crew} id="crew" aria-labelledby="cc-crew-h" className="mx-auto max-w-7xl scroll-mt-20 px-4 pt-8 pb-16 sm:px-6">
            <h2 id="cc-crew-h" className="flex items-center gap-6 font-serif text-display-md font-bold text-ink-deep before:h-px before:flex-1 before:bg-line-strong after:h-px after:flex-1 after:bg-line-strong sm:text-display-lg lg:text-display-xl">Crew Call</h2>
            {q && (
              <p aria-live="polite" className="mt-3 flex flex-wrap items-center justify-center gap-2 text-body-md text-ink-muted">
                {shown.length + soon.length ? <>Showing <b className="text-ink tabular-nums">{shown.length + soon.length}</b> for &ldquo;{q}&rdquo;</> : <>Nothing listed for &ldquo;{q}&rdquo; yet.</>}
                <button type="button" onClick={() => setQ("")} className="inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-label-md text-link hover:underline"><X className="size-4" aria-hidden="true" />Clear</button>
              </p>
            )}

            {shown.length > 0 && (
              <ul className="mt-8 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {shown.map((s) => (
                  <li key={s.id} className="flex">
                    <CrewTile title={s.title} line={s.short} badge={s.badge} object={s.object} onOpen={() => pick(s.title, <img src={asset(s.badge)} alt="" width={192} height={192} className="size-14" />, false)} />
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

            <div className="mt-6 flex justify-center">
              {(!q || shown.length + soon.length > 0) && <Link href="/storyboard/#plates"
                className="inline-flex min-h-14 items-center gap-3 rounded-full bg-ink-deep px-20 text-heading-md text-bg shadow-md transition-colors duration-fast hover:bg-ink-deep-hover">
                Explore all services<ArrowRight className="size-5" aria-hidden="true" />
              </Link>}
            </div>

            {soon.length > 0 && (
              <div className="mt-6 border-t border-line pt-6">
                              <div className="flex flex-wrap items-end justify-between gap-2">
                  <h3 className="font-serif text-heading-lg text-ink">Coming soon</h3>
                  <p className="text-body-sm text-ink-muted">Need one now? Tap it and tell us. We&apos;ll find someone.</p>
                </div>
                <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-5">
                  {soon.map((s) => (
                    <li key={s.id}>
                      <button type="button" onClick={() => pick(s.title, <SoonPatch icon={icons[s.icon]} small />, true)} aria-label={`${s.title}, coming soon. Tell us you need it.`}
                        className="group grid w-full justify-items-center gap-4 rounded-xl px-2 pt-3 pb-3 text-center transition-colors duration-fast hover:bg-surface-hover">
                        <span className="relative grid justify-items-center">
                          <SoonPatch icon={icons[s.icon]} />
                          <span aria-hidden="true" data-theme="dark" className="absolute -bottom-3 w-28 bg-surface-brand py-0.5 text-center text-label-sm tracking-wide text-ink uppercase shadow-sm"
                            style={{ clipPath: "polygon(0 0, 100% 0, 93% 50%, 100% 100%, 0 100%, 7% 50%)" }}>Coming soon</span>
                        </span>
                        <span className="font-serif text-body-md text-ink group-hover:text-ink-brand">{s.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="mt-10 text-center text-body-md text-ink italic">Design preview. Featured services are provisional.</p>
          </section>
        </div>
      ) : (
        <div data-client-locked="" className="bg-bg text-ink">
          {/* Hero: the promise flush left and huge, the client's film-set photo hard-cropped into the grid, one search. */}
          <section aria-labelledby="cc-h" className={cx(wrap, "grid grid-cols-12 gap-x-6 gap-y-8 pt-8 lg:pt-12")}>
            <p className="col-span-12 text-eyebrow text-ink uppercase">{hero.eyebrow}</p>
            <h1 id="cc-h" className="col-span-12 font-display text-display-md text-ink md:text-display-lg xl:text-display-xl">
              {hero.title[0]}<br /><span className="text-ink-brand">{hero.title[1]}</span>
            </h1>
            {/* From lg the column spans the photo: the lead on its top edge, the search on its bottom edge. */}
            <div className="col-span-12 grid content-start gap-6 lg:col-span-5 lg:content-between">
              <p className="text-body-lg text-pretty text-ink">{hero.lead}</p>
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
            {/* Number above, the heading flush left on column 1, so it shares its edge with the card grid below. */}
            <div className="grid gap-y-1 border-t-4 border-line-strong pt-3">
              <span aria-hidden="true" className="text-label-sm text-ink tabular-nums">02</span>
              <div className="grid content-start gap-3">
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
                {shown.map((s, i) => {
                  // Two across (sm to lg): an odd last card takes the whole row instead of standing alone.
                  const wide = shown.length % 2 === 1 && i === shown.length - 1 && shown.length > 1;
                  return (
                  <li key={s.id} className={cx("flex", wide && "sm:max-lg:col-span-2")}>
                    <ServiceCard wide={wide} title={s.title} line={s.line} badge={s.badge} icon={icons[s.icon]} image={s.image} onOpen={() => pick(s.title, <img src={asset(s.badge)} alt="" width={192} height={192} className="size-14" />, false)} />
                  </li>
                  );
                })}
              </ul>
            )}
            {q && !shown.length && !soon.length && (
              <div className="mt-10 grid max-w-xl justify-items-start gap-4 border-t-4 border-line-strong pt-4">
                <p className="font-display text-heading-md text-balance text-ink">Tell us what you need, and we&apos;ll cast the right person.</p>
                <Button variant="primary" iconEnd={<ArrowRight />} onClick={() => open(q)}>Describe your project</Button>
              </div>
            )}

            {/* The page's one mint block (held back while a search has no results: the empty state's button is the action then). */}
            {(!q || shown.length + soon.length > 0) && <Link href="/storyboard/#plates"
              className="group mt-12 flex min-h-20 items-center justify-between gap-4 border-t-4 border-forest-950 bg-tint-mint px-5 py-4 font-display text-heading-md text-forest-950 uppercase sm:px-8 sm:text-heading-lg">
              Explore all services<ArrowRight className="size-8 shrink-0 transition-transform duration-fast group-hover:translate-x-1 motion-reduce:transition-none" aria-hidden="true" />
            </Link>}

            {soon.length > 0 && (
              <div className="mt-16 grid grid-cols-12 gap-x-6 gap-y-6 border-t-4 border-line-strong pt-3">
                <div className="col-span-12 grid content-start gap-2 lg:col-span-3">
                  <h3 className="font-display text-heading-lg text-ink">Coming soon</h3>
                  <p className="text-body-sm text-ink-muted">Need one now? Tap it and tell us. We&apos;ll find someone.</p>
                </div>
                <ul className="col-span-12 grid grid-cols-2 gap-x-6 sm:grid-cols-3 md:grid-cols-5 lg:col-span-9">
                  {soon.map((s) => (
                    <li key={s.id} className="flex border-b border-line">
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
          </section>
          {/* The small print, together under one hairline. */}
          <div className={wrap}>
            <div className="grid gap-2 border-t border-line py-6 text-body-sm text-ink-muted">
              <p>Private design preview · Featured services are provisional until Gigster profiles are reviewed.</p>
              <p>Sample quotes, generated photos, names, ratings and production-credit claims are unverified mockup content. Real testimonials require review before publication.</p>
            </div>
          </div>
        </div>
      )}

      {ask && <Planner kind="buyer" initial={ask.initial} topic={ask.topic} onClose={() => setAsk(null)} onBrowse={() => { setAsk(null); router.push("/storyboard/#plates"); }} />}
    </Page>
  );
}

/** A row with square arrows on either side (until it all fits, from lg); swipes on touch. */
function Strip({ label, children, className, itemClass, progress = false }: { label: string; children: React.ReactNode; className?: string; itemClass: string; progress?: boolean }) {
  const brand = useLook() !== "swiss";
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
  const arrow = brand ? "shrink-0 rounded-full border border-line bg-surface shadow-sm max-sm:hidden" : "shrink-0 border-2 border-line-strong bg-surface max-sm:hidden lg:hidden";
  const row = (
    <div className={cx("flex items-center gap-2", !progress && className)}>
      <IconButton label={`Previous: ${label}`} variant="ghost" icon={<ChevronLeft />} disabled={edge.start} onClick={() => go(-1)} className={arrow} />
      <ul ref={ref} aria-label={label} tabIndex={0} onScroll={measure} className={cx("no-scrollbar flex min-w-0 flex-1 snap-x snap-mandatory overflow-x-auto", brand ? "gap-3" : "gap-6")}>
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

/** Coming-soon patch until the client's own art arrives: a duotone icon on cream inside the patches' gold ring. */
function SoonPatch({ icon: Icon, small = false }: { icon: LucideIcon; small?: boolean }) {
  return (
    <span aria-hidden="true" className={cx("grid place-items-center rounded-full border-4 border-amber-700 bg-amber-100 shadow-md transition-transform duration-fast group-hover:-translate-y-1",
      small ? "size-14" : "size-24")}>
      <span className={cx("grid place-items-center rounded-full border-2 border-dashed border-amber-700/40 bg-forest-50", small ? "size-10" : "size-18")}>
        <Icon className={cx("fill-amber-300/70 text-forest-800", small ? "size-6" : "size-10")} strokeWidth={1.6} />
      </span>
    </span>
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
function ServiceCard({ title, line, badge, icon, image, onOpen, wide = false }: { title: string; line: string; badge: string; icon: LucideIcon; image: string | null; onOpen: () => void; wide?: boolean }) {
  const brand = useLook() !== "swiss";
  const Icon = icon;
  if (brand) return (
    <article data-tilt="" className="lift group relative flex min-h-48 w-full overflow-hidden rounded-md border border-line bg-surface shadow-sm">
      <div className="relative z-raised flex min-w-0 flex-1 items-center gap-4 p-4">
        <img src={asset(badge)} alt="" width={192} height={192} loading="lazy" decoding="async" className="size-20 shrink-0 drop-shadow-md" />
        <div className="grid min-w-0 gap-1.5">
          <h3 className="text-body-lg font-semibold text-ink">
            <button type="button" onClick={onOpen} className="rounded-sm text-left after:absolute after:inset-0 group-hover:text-ink-brand">{title}</button>
          </h3>
          <p className="text-body-sm text-ink-muted">{line}</p>
          <span aria-hidden="true" className="mt-1 grid size-7 place-items-center rounded-full border border-line bg-surface-sunken text-ink transition-colors duration-fast group-hover:bg-ink-deep group-hover:text-bg">
            <ArrowRight className="size-4" />
          </span>
        </div>
      </div>
      <div aria-hidden="true" className="relative w-1/3 shrink-0" style={{ clipPath: "polygon(20% 0, 100% 0, 100% 100%, 0 100%)" }}>
        {image ? (
          <img src={asset(image)} alt="" width={800} height={800} loading="lazy" decoding="async" className="size-full object-cover transition-transform duration-slow group-hover:scale-105 motion-reduce:transition-none" />
        ) : (
          <span className="grid size-full place-items-center bg-forest-800 phosphor-dots">
            <Icon className="size-12 text-mint-300 opacity-50" strokeWidth={1.25} />
          </span>
        )}
      </div>
    </article>
  );
  return (
    <article className="group relative grid w-full content-start gap-4 border-t-4 border-line-strong pt-4">
      <div aria-hidden="true" className={cx("aspect-3/2 overflow-hidden bg-surface-sunken", wide && "sm:max-lg:aspect-3/1")}>
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
