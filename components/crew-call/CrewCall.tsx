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
const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * /crew-call: the client's Call sheet prototype, V15, as shared: a light film-set hero, sample testimonials, the
 * Crew Call grid with the embroidered patches, Explore all services, and the Coming soon grid. Light follows the
 * client's look; dark keeps its layout with the brand's dark palette (the patches and photos stay as they are). The search filters the crew as you type; every service, live or
 * coming soon, opens the Storyboard's "Find talent" form with that service filled in.
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
        {/* Hero: the client's film-set photo, the promise in the forest serif, one search. */}
        <section aria-labelledby="cc-h" className="relative isolate mx-auto max-w-7xl overflow-hidden">
          <img src={asset(hero.image)} alt="" width={1600} height={800} className="absolute inset-0 -z-20 size-full object-cover" />
          {/* A wash in the page colour behind the words: barely there on light, a dusk scrim on dark. */}
          <span aria-hidden="true" className="absolute inset-0 -z-10 bg-radial from-bg/70 via-bg/30 to-transparent" />
          <div className="mx-auto grid max-w-3xl justify-items-center gap-5 px-4 pt-12 pb-14 text-center sm:px-6 sm:pt-16 sm:pb-16">
            <p className="text-label-md tracking-widest text-ink-deep uppercase">{hero.eyebrow}</p>
            <h1 id="cc-h" className="font-serif text-display-md font-bold text-balance text-ink-deep sm:text-display-lg lg:text-display-xl">
              {hero.title[0]}<br />{hero.title[1]}
            </h1>
            <p className="max-w-xl text-body-lg font-medium text-ink">{hero.lead}</p>
            <form role="search" onSubmit={(e) => { e.preventDefault(); if (q.trim() && !shown.length && !soon.length) open(q.trim()); else toCrew(); }}
              className="flex w-full max-w-xl items-center gap-2 rounded-full bg-surface p-1.5 pl-6 shadow-lg focus-within:ring-2 focus-within:ring-ink-brand">
              <label htmlFor="cc-search" className="sr-only">Search the crew</label>
              <input id="cc-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={hero.search}
                className="min-w-0 flex-1 bg-transparent py-2 text-body-lg tracking-wider text-ink uppercase outline-none placeholder:text-ink-muted" />
              <IconButton type="submit" label="Find the crew" icon={<ArrowRight />} className="rounded-full bg-ink-deep text-bg hover:bg-ink-deep-hover" />
            </form>
          </div>
        </section>

        {/* Sample testimonials, with arrows to page through them. */}
        <section aria-labelledby="cc-reviews-h" className="mx-auto max-w-7xl px-4 pt-4 sm:px-6">
          <h2 id="cc-reviews-h" className="text-center text-body-sm text-ink-muted">Illustrative testimonial layout · Not customer reviews</h2>
          <Strip label="Sample testimonials" className="mt-3" itemClass="w-11/12 sm:w-2/3 lg:w-auto lg:min-w-0 lg:flex-1 lg:shrink">
            {testimonials.map((t) => (
              <figure key={t.name} className="flex h-full w-full gap-3 rounded-md border border-line bg-surface p-2">
                <img src={asset(t.image)} alt="" width={512} height={512} loading="lazy" decoding="async" className="w-2/5 shrink-0 rounded-sm object-cover" />
                <div className="flex min-w-0 flex-1 flex-col gap-2 py-1 pr-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex gap-0.5 text-warning" role="img" aria-label="Five stars (sample)">
                      {Array.from({ length: 5 }, (_, i) => <Star key={i} className="size-4 fill-current" aria-hidden="true" />)}
                    </span>
                    <span className="text-label-sm tracking-wider text-warning uppercase">Sample</span>
                  </div>
                  <blockquote className="text-body-sm font-semibold text-ink">&ldquo;{t.quote}&rdquo;</blockquote>
                  <figcaption className="mt-auto flex items-center gap-2">
                    <img src={asset(t.avatar)} alt="" width={128} height={128} loading="lazy" className="size-8 rounded-full object-cover" />
                    <span className="grid"><span className="text-label-sm tracking-wide text-ink uppercase">{t.name}</span><span className="text-body-sm text-ink-muted">{t.kind}</span></span>
                  </figcaption>
                </div>
              </figure>
            ))}
          </Strip>
        </section>

        {/* Crew Call */}
        <section ref={crew} id="crew" aria-labelledby="cc-crew-h" className="mx-auto max-w-7xl scroll-mt-20 px-4 pt-8 pb-16 sm:px-6">
          <h2 id="cc-crew-h" className="text-center font-serif text-display-md font-bold text-ink-deep uppercase sm:text-display-lg">Crew Call</h2>
          {q && (
            <p aria-live="polite" className="mt-3 flex flex-wrap items-center justify-center gap-2 text-body-md text-ink-muted">
              {shown.length + soon.length ? <>Showing <b className="text-ink tabular-nums">{shown.length + soon.length}</b> for &ldquo;{q}&rdquo;</> : <>Nothing listed for &ldquo;{q}&rdquo; yet.</>}
              <button type="button" onClick={() => setQ("")} className="inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-label-md text-link hover:underline"><X className="size-4" aria-hidden="true" />Clear</button>
            </p>
          )}

          {shown.length > 0 && (
            <ul className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {shown.map((s) => (
                <li key={s.id} className="flex">
                  <ServiceCard title={s.title} line={s.line} badge={s.badge} icon={icons[s.icon]} image={s.image} onOpen={() => pick(s.title, <img src={asset(s.badge)} alt="" width={192} height={192} className="size-14" />, false)} />
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
            <Link href="/storyboard/#plates"
              className="inline-flex min-h-12 items-center gap-3 rounded-full bg-ink-deep px-16 text-label-md tracking-widest text-bg uppercase shadow-md transition-colors duration-fast hover:bg-ink-deep-hover">
              Explore all services<ArrowRight className="size-5" aria-hidden="true" />
            </Link>
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
          <p className="mt-10 text-center text-body-sm text-ink-muted">Private design preview · Featured services are provisional until Gigster profiles are reviewed.</p>
        </section>
        <p className="border-t border-line px-4 py-6 text-body-sm text-ink-muted sm:text-center">Sample quotes, generated photos, names, ratings and production-credit claims are unverified mockup content. Real testimonials require review before publication.</p>
      </div>

      {ask && <Planner kind="buyer" initial={ask.initial} topic={ask.topic} onClose={() => setAsk(null)} onBrowse={() => { setAsk(null); router.push("/storyboard/#plates"); }} />}
    </Page>
  );
}

/** A row with round arrows on either side; swipes on touch. */
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
  const arrow = "shrink-0 rounded-full border border-line bg-surface shadow-sm max-sm:hidden";
  const row = (
    <div className={cx("flex items-center gap-2", !progress && className)}>
      <IconButton label={`Previous: ${label}`} variant="ghost" icon={<ChevronLeft />} disabled={edge.start} onClick={() => go(-1)} className={arrow} />
      <ul ref={ref} aria-label={label} tabIndex={0} onScroll={measure} className="no-scrollbar flex min-w-0 flex-1 snap-x snap-mandatory gap-3 overflow-x-auto">
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

/** One featured service: the embroidered patch and words on the left, the photo cut on the diagonal on the right. */
function ServiceCard({ title, line, badge, icon, image, onOpen }: { title: string; line: string; badge: string; icon: LucideIcon; image: string | null; onOpen: () => void }) {
  const Icon = icon;
  return (
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
}
