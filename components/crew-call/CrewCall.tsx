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
import { Planner } from "@/components/funnel/Storyboard";
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
 * Crew Call grid with the embroidered patches, Explore all services, and the Coming soon strip. Kept in the light
 * look the client approved, in both themes. The search filters the crew as you type; every service, live or
 * coming soon, opens the Storyboard's "Find talent" form with that service filled in.
 */
export function CrewCall() {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [ask, setAsk] = React.useState<Record<string, string> | null>(null);
  const crew = React.useRef<HTMLElement>(null);
  const shown = services.filter((s) => matches(q, s.title, s.line));
  const soon = comingSoon.filter((s) => matches(q, s.title));
  const open = (project: string) => setAsk({ project });
  const toCrew = () => crew.current?.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" });

  return (
    <Page bare>
      <div data-theme="light" data-client-locked="" className="bg-bg text-ink">
        {/* Hero: the client's film-set photo, the promise in the forest serif, one search. */}
        <section aria-labelledby="cc-h" className="relative isolate mx-auto max-w-7xl overflow-hidden">
          <img src={asset(hero.image)} alt="" width={1600} height={800} className="absolute inset-0 -z-10 size-full object-cover" />
          <div className="mx-auto grid max-w-3xl justify-items-center gap-5 px-4 pt-12 pb-14 text-center sm:px-6 sm:pt-16 sm:pb-16">
            <p className="text-label-md tracking-widest text-forest-900 uppercase">{hero.eyebrow}</p>
            <h1 id="cc-h" className="font-serif text-display-md font-bold text-balance text-forest-800 sm:text-display-lg lg:text-display-xl">
              {hero.title[0]}<br />{hero.title[1]}
            </h1>
            <p className="max-w-xl text-body-lg text-forest-900">{hero.lead}</p>
            <form role="search" onSubmit={(e) => { e.preventDefault(); if (q.trim() && !shown.length && !soon.length) open(q.trim()); else toCrew(); }}
              className="flex w-full max-w-xl items-center gap-2 rounded-full bg-surface p-1.5 pl-6 shadow-lg focus-within:ring-2 focus-within:ring-forest-600">
              <label htmlFor="cc-search" className="sr-only">Search the crew</label>
              <input id="cc-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={hero.search}
                className="min-w-0 flex-1 bg-transparent py-2 text-body-lg tracking-wider text-ink uppercase outline-none placeholder:text-ink-muted" />
              <IconButton type="submit" label="Find the crew" icon={<ArrowRight />} className="rounded-full bg-forest-800 text-surface hover:bg-forest-700" />
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
                    <span className="flex gap-0.5 text-amber-700" role="img" aria-label="Five stars (sample)">
                      {Array.from({ length: 5 }, (_, i) => <Star key={i} className="size-4 fill-current" aria-hidden="true" />)}
                    </span>
                    <span className="text-label-sm tracking-wider text-amber-700 uppercase">Sample</span>
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
          <h2 id="cc-crew-h" className="text-center font-serif text-display-md font-bold text-forest-800 uppercase sm:text-display-lg">Crew Call</h2>
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
                  <ServiceCard title={s.title} line={s.line} badge={s.badge} icon={icons[s.icon]} image={s.image} onOpen={() => open(`${s.title}: `)} />
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
              className="inline-flex min-h-12 items-center gap-3 rounded-full bg-forest-800 px-16 text-label-md tracking-widest text-surface uppercase shadow-md transition-colors duration-fast hover:bg-forest-700">
              Explore all services<ArrowRight className="size-5" aria-hidden="true" />
            </Link>
          </div>

          {soon.length > 0 && (
            <div className="mt-6 border-t border-line pt-6">
              <h3 className="sr-only">Coming soon</h3>
              <Strip label="Coming soon services" itemClass="w-1/3 sm:w-1/5 lg:w-auto lg:min-w-0 lg:flex-1 lg:shrink">
                {soon.map((s) => (
                  <button key={s.id} type="button" onClick={() => open(`${s.title}: `)} aria-label={`${s.title}, coming soon. Tell us you need it.`}
                    className="group grid w-full justify-items-center gap-1 rounded-xl p-1 text-center hover:bg-surface-hover">
                    <span className="relative">
                      <SoonPatch icon={icons[s.icon]} />
                      <span aria-hidden="true" className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-sm bg-forest-800 px-2 py-0.5 text-label-sm whitespace-nowrap text-surface uppercase">Coming soon</span>
                    </span>
                    <span className="mt-2 font-serif text-body-md text-ink">{s.title}</span>
                  </button>
                ))}
              </Strip>
            </div>
          )}
          <p className="mt-10 text-center text-body-sm text-ink-muted">Private design preview · Featured services are provisional until Gigster profiles are reviewed.</p>
        </section>
        <p className="border-t border-line px-4 py-6 text-body-sm text-ink-muted sm:text-center">Sample quotes, generated photos, names, ratings and production-credit claims are unverified mockup content. Real testimonials require review before publication.</p>
      </div>

      {ask && <Planner kind="buyer" initial={ask} onClose={() => setAsk(null)} onBrowse={() => { setAsk(null); router.push("/storyboard/#plates"); }} />}
    </Page>
  );
}

/** A row with round arrows on either side; swipes on touch. */
function Strip({ label, children, className, itemClass }: { label: string; children: React.ReactNode; className?: string; itemClass: string }) {
  const ref = React.useRef<HTMLUListElement>(null);
  const [edge, setEdge] = React.useState({ start: true, end: false });
  const measure = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft < 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
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
  return (
    <div className={cx("flex items-center gap-2", className)}>
      <IconButton label={`Previous: ${label}`} variant="ghost" icon={<ChevronLeft />} disabled={edge.start} onClick={() => go(-1)} className={arrow} />
      <ul ref={ref} aria-label={label} tabIndex={0} onScroll={measure} className="no-scrollbar flex min-w-0 flex-1 snap-x snap-mandatory gap-3 overflow-x-auto">
        {items.map((c, i) => <li key={i} className={cx("flex shrink-0 snap-start", itemClass)}>{c}</li>)}
      </ul>
      <IconButton label={`Next: ${label}`} variant="ghost" icon={<ChevronRight />} disabled={edge.end} onClick={() => go(1)} className={arrow} />
    </div>
  );
}

/** Coming-soon patch until the client's own patches for these arrive: the icon on cream inside a gold and red ring. */
function SoonPatch({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span aria-hidden="true" className="grid size-16 place-items-center rounded-full border-4 border-amber-300 bg-surface ring-2 ring-amber-700">
      <Icon className="size-8 text-forest-800" strokeWidth={1.75} />
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
            <button type="button" onClick={onOpen} className="rounded-sm text-left after:absolute after:inset-0 group-hover:text-forest-700">{title}</button>
          </h3>
          <p className="text-body-sm text-ink-muted">{line}</p>
          <span aria-hidden="true" className="mt-1 grid size-7 place-items-center rounded-full border border-line bg-surface-sunken text-ink transition-colors duration-fast group-hover:bg-forest-800 group-hover:text-surface">
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
