"use client";
import { Accordion, Badge, Button, Field, IconButton, Input, Modal, Select, Textarea, cx } from "@ds/components";
import { Reveal } from "@ds/motion";
import { ArrowRight, ArrowUpRight, BadgeCheck, Check, ChevronLeft, ChevronRight, Info, MapPin, MessageSquare, Star } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import type { Person, Profile, ProfileFields } from "@/lib/data";
import { basisShort, insuranceLabel, modeLabel, monthStatusLabel } from "@/lib/data/taxonomy";
import { asset } from "@/lib/site";
import { PersonPhoto } from "@/components/people/PersonPhoto";

export type ProfileMode = "public" | "own" | "owner";

interface Props {
  person: Person;
  fields: ProfileFields;
  extras?: Profile["extras"];
  /** public: what clients see. own: the Gigster's preview of it. owner: the team's view inside search. */
  mode: ProfileMode;
  similar?: { person: Person; profile: Profile }[];
}

/** The call-sheet stamp: short, uppercase, rubber-stamp words. */
const stampWord = { available: "Available", limited: "Limited", away: "Away" } as const;
const stampTone = { available: "border-success text-success", limited: "border-info text-info", away: "border-line-strong text-ink-muted" } as const;
const faqs = (first: string) => [
  { q: "How do I get started?", a: `Send a request with what you need, where and roughly when. ${first} replies to agree the scope, timing and final rate before anything starts.` },
  { q: "What does the rate cover?", a: "The rate is a starting point for time on your project. Materials, travel and the final scope are agreed together before you book." },
  { q: "Where can we work together?", a: "In your home or space across the Los Angeles area. Travel and work mode are agreed for each project." },
];

/** "Wardrobe & costume" and "Costume & wardrobe" are the same department. */
const norm = (s: string) => s.toLowerCase().split(/[^a-z]+/).filter((w) => w && w !== "and").sort().join(" ");

/** "Production · Role (sample credit)" → title and role. The sample marker is covered by the page's one sample note. */
function splitCredit(c: string, sample: boolean) {
  const clean = sample ? c.replace(/\s*\(sample credit\)\s*$/i, "") : c;
  const [title, ...rest] = clean.split(" · ");
  return { title: title.trim(), role: rest.join(" · ").trim() };
}

/**
 * A Gigster's profile, rebuilt from the GigsterProfile template over real fields. One component for the
 * public page, the Gigster's own preview and the owner's view, so all three always match.
 * The hero reads like a film call sheet: stamped fields for role, rate, area and availability, and the
 * credits as a strip of text-only poster tiles. No reviews section: there are no real reviews yet, and we
 * don't show invented ones. Sample people get one quiet note at the end, not a chip on every section.
 */
export function ProfileView({ person, fields: f, extras, mode, similar = [] }: Props) {
  const first = f.name.split(" ")[0] || "this Gigster";
  const sample = !!person.sample;
  const approved = person.status === "approved";
  const [active, setActive] = React.useState("overview");
  const [lightbox, setLightbox] = React.useState<number | null>(null);
  const [request, setRequest] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const root = React.useRef<HTMLDivElement>(null);
  const tabs = React.useRef<HTMLUListElement>(null);
  // The owner view already has the person's name as its page title.
  const Name = mode === "owner" ? "h2" : "h1";
  const rate = f.rate ? `$${f.rate}/${basisShort[f.basis]}` : null;
  const area = f.market === "la" ? (f.areas.join(" · ") || "Los Angeles") : f.otherCity || "Another market";
  const where = f.market === "la" ? `${f.areas.join(" · ") || "Los Angeles"}, Los Angeles area` : f.otherCity;

  // Each image is used once: services get their own pictures only when the portfolio still has some left.
  const all = extras?.portfolio ?? [];
  const serviceImgs = all.length >= f.services.length + 2 ? all.slice(0, f.services.length) : [];
  const portfolio = all.slice(serviceImgs.length);
  // Show the specialty once: "What I can help with" lists only what the Services cards don't already say.
  const serviceKeys = new Set(f.services.map(norm));
  const helps = (extras?.helps ?? []).filter((h) => !serviceKeys.has(norm(h)));
  const alsoOnSet = f.skills.filter((s) => norm(s) !== norm(f.position));
  const credits = f.credits.filter((c) => c.trim()).map((c) => splitCredit(c, sample));
  const showImdb = !!f.imdb && (mode !== "public" || !sample);

  const sections = [["overview", "Overview"], ["services", "Services"], ...(portfolio.length ? [["portfolio", "Portfolio"]] : []), ["faqs", "FAQs"]] as [string, string][];

  // Scrollspy: the tab for the section in view lights up.
  React.useEffect(() => {
    const els = Array.from(root.current?.querySelectorAll<HTMLElement>("[data-section]") ?? []);
    const io = new IntersectionObserver((es) => {
      const vis = es.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (vis) setActive(vis.target.getAttribute("data-section") ?? "overview");
    }, { rootMargin: "-35% 0px -55% 0px" });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [person.id]);
  // Keep the lit tab visible in the scrolling tab row on phones.
  React.useEffect(() => {
    const ul = tabs.current;
    const tab = ul?.querySelector<HTMLElement>(`[data-tab="${active}"]`);
    if (!ul || !tab) return;
    const left = tab.offsetLeft, right = left + tab.offsetWidth;
    if (left >= ul.scrollLeft && right <= ul.scrollLeft + ul.clientWidth) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    ul.scrollTo({ left: Math.max(0, left - 16), behavior: reduce ? "auto" : "smooth" });
  }, [active]);
  const jump = (id: string) => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    root.current?.querySelector(`[data-section="${id}"]`)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };

  const glance: [string, React.ReactNode, string?][] = [
    ["Location", where, f.zip ? `Based near ${f.zip}` : undefined],
    ["This month", monthStatusLabel[f.monthStatus], [f.month, f.dates].filter(Boolean).join(" · ")],
    ["Travel & work mode", modeLabel[f.mode], f.travel || undefined],
    ...(f.tools ? [["Tools & equipment", f.tools] as [string, string]] : []),
    ...(f.transport ? [["Transport", f.transport] as [string, string]] : []),
    ...(f.languages ? [["Languages", f.languages] as [string, string]] : []),
    ["Insurance", insuranceLabel[f.insurance]],
  ];

  const stamps: [string, React.ReactNode, string?][] = [
    ["Role", f.position || "Gigster", f.years ? `${f.years} ${f.years === "1" ? "year" : "years"} in the business` : undefined],
    ["Rate", rate ? <span className="tabular-nums">{rate}</span> : "On request", rate ? "Starting rate" : "Agreed per project"],
    ["Area", area, f.market === "la" ? "Los Angeles" : undefined],
    ["Availability", <span key="s" className={cx("inline-block -rotate-2 rounded-md border-2 px-2 text-label-md tracking-wider uppercase", stampTone[f.monthStatus])}>{stampWord[f.monthStatus]}</span>, f.dates || f.month],
  ];

  const creditStrip = (className: string) => credits.length > 0 && (
    <div className={className}>
      <div className="flex items-baseline gap-3">
        <h2 className="text-eyebrow text-ink-subtle uppercase">Credits</h2>
        <span className="text-caption text-ink-subtle">As listed by {first}</span>
      </div>
      <ul className="mt-2 flex gap-2.5 overflow-x-auto pb-1">
        {credits.map((c) => (
          <li key={`${c.title}-${c.role}`} data-theme="dark" className="flex aspect-2/3 w-28 shrink-0 sm:w-32 flex-col justify-between gap-2 rounded-lg border border-line bg-surface-brand phosphor-dots p-3">
            <span aria-hidden="true" className="border-t-2 border-dotted border-ink-brand" />
            <span lang="en" className="font-display text-heading-sm text-balance hyphens-auto text-ink">{c.title}</span>
            <span className="text-label-sm text-ink-brand">{c.role || "Crew"}</span>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div ref={root} className="relative">
      {/* Ambient glow from the person's own work. */}
      {mode === "public" && all[0] && (
        <div aria-hidden="true" className="pointer-events-none absolute -top-8 left-1/2 -z-0 h-96 w-screen -translate-x-1/2 overflow-hidden">
          <img src={asset(all[0].src)} alt="" className="size-full scale-125 object-cover opacity-30 blur-3xl" />
          <span className="absolute inset-0 bg-linear-to-b from-transparent to-bg" />
        </div>
      )}

      <div className="relative grid gap-x-10 gap-y-6 lg:grid-cols-12">
        {/* The call sheet. */}
        <section aria-labelledby={`${person.id}-name`} className="min-w-0 overflow-hidden rounded-2xl border border-line bg-surface shadow-lg lg:col-span-8 lg:row-start-1">
          <div data-theme="dark" className="flex items-center justify-between gap-3 bg-surface-brand phosphor-dots px-5 py-2.5 sm:px-6">
            <span className="text-eyebrow text-ink-brand uppercase">Call sheet</span>
            <span className="truncate text-label-sm text-ink-muted tabular-nums">Between Gigs · {f.month}</span>
          </div>
          <div className="flex items-start gap-4 p-5 sm:grid sm:grid-cols-12 sm:gap-6 sm:p-6">
            <div className="relative w-24 shrink-0 sm:col-span-4 sm:w-full">
              <PersonPhoto id={person.id} morph name={f.name} src={f.photo || undefined} alt={f.photo ? `Portrait of ${f.name}` : `${f.name} (no photo yet)`}
                fallback="brand" department={f.position} skills={f.skills} iconClass="size-6 sm:size-12" textClass="text-label-md sm:text-display-sm"
                className="aspect-square w-full rounded-xl ring-1 ring-line" />
            </div>
            <div className="min-w-0 sm:col-span-8">
              <Reveal effect="fade-up"><Name id={`${person.id}-name`} className="font-display text-display-sm break-words text-ink sm:text-display-lg">{f.name}</Name></Reveal>
              {extras?.tagline && <Reveal effect="fade-up" delay={80}><p className="mt-2 text-body-md text-ink-muted sm:text-body-lg">{extras.tagline}</p></Reveal>}
              {(approved || showImdb) && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {approved && <Badge tone="success" icon={<BadgeCheck aria-hidden="true" />}>Reviewed by Between Gigs</Badge>}
                  {showImdb && (
                    <a href={f.imdb} target="_blank" rel="noreferrer" className="inline-flex h-6 items-center gap-1 rounded-full border border-line-strong px-2.5 text-label-sm text-ink transition-colors duration-fast hover:bg-surface-hover">
                      IMDb<ArrowUpRight className="size-3.5" aria-hidden="true" /><span className="sr-only"> page for {f.name} (opens in a new tab)</span>
                    </a>
                  )}
                </div>
              )}
              {creditStrip("mt-5 hidden sm:block")}
            </div>
          </div>
          <dl className="grid grid-cols-2 border-t border-line md:grid-cols-4">
            {stamps.map(([k, v, note], i) => (
              <div key={k} className={cx("grid content-start gap-1 border-line px-5 py-4 sm:px-6", i % 2 === 0 && "border-r", i < 2 && "border-b md:border-b-0", i === 1 && "md:border-r", i === 2 && "md:border-r")}>
                <dt className="text-eyebrow text-ink-subtle uppercase">{k}</dt>
                <dd className="font-display text-heading-md break-words text-ink">{v}</dd>
                {note && <dd className="text-caption text-ink-subtle">{note}</dd>}
              </div>
            ))}
          </dl>
          {creditStrip("border-t border-line px-5 py-4 sm:hidden")}
        </section>

        <aside aria-label={mode === "public" ? "Book and details" : "Booking card and details"} className="min-w-0 lg:col-span-4 lg:col-start-9 lg:row-span-2 lg:row-start-1">
          <div className="grid gap-5 lg:sticky lg:top-24">
            <div className={cx("rounded-2xl border border-line bg-surface p-5 shadow-lg", mode === "public" && "hidden lg:block")}>
              <div className="flex items-start justify-between gap-3">
                <p>
                  <span className="block text-caption text-ink-subtle">From</span>
                  {f.rate ? <><span className="font-display text-display-sm text-ink tabular-nums">${f.rate}</span><span className="text-body-md text-ink-muted">/{basisShort[f.basis]}</span></> : <span className="font-display text-heading-lg text-ink">Rate on request</span>}
                </p>
                {mode === "public" && <IconButton label={saved ? `Unsave ${first}` : `Save ${first}`} pressed={saved} onClick={() => setSaved(!saved)} variant="ghost" icon={<Star className={cx(saved && "fill-current")} />} />}
              </div>
              <p className="mt-1 text-body-sm text-ink-muted">{monthStatusLabel[f.monthStatus]}</p>
              <div className="mt-5">
                {mode === "public"
                  ? <Button variant="primary" size="lg" fullWidth className="glow-hover" iconEnd={<ArrowRight />} onClick={() => setRequest(true)}>Request {first}</Button>
                  : <RequestOff first={first} mode={mode} />}
              </div>
              {mode === "public" && <p className="mt-3 text-center text-caption text-ink-subtle">Preview: requests open in a later milestone.</p>}
            </div>
            <section aria-labelledby={`${person.id}-glance`} className="rounded-2xl border border-line bg-surface p-5">
              <h2 id={`${person.id}-glance`} className="font-display text-heading-lg text-ink">At a glance</h2>
              <dl className="mt-3 grid gap-3">
                {glance.map(([k, v, note]) => (
                  <div key={k} className="grid gap-0.5 border-t border-line pt-3 first:border-0 first:pt-0">
                    <dt className="text-label-sm text-ink-subtle">{k}</dt>
                    <dd className="text-body-md break-words text-ink-muted">{v}{note && <span className="block text-caption text-ink-subtle">{note}</span>}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>
        </aside>

        <div className="min-w-0 lg:col-span-8 lg:row-start-2">
          <nav aria-label="Profile sections" className="sticky top-16 z-sticky -mx-4 mt-2 border-b border-line bg-bg/90 backdrop-blur-md sm:mx-0">
            <ul ref={tabs} className="relative flex gap-1 overflow-x-auto px-4 sm:px-0">
              {sections.map(([id, label]) => (
                <li key={id} className="last:pr-8 sm:last:pr-0">
                  <button type="button" data-tab={id} onClick={() => jump(id)} aria-current={active === id ? "true" : undefined}
                    className={cx("relative inline-flex min-h-12 items-center px-3 text-label-md whitespace-nowrap transition-colors duration-fast",
                      active === id ? "text-ink after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-action" : "text-ink-muted hover:text-ink")}>
                    {label}
                  </button>
                </li>
              ))}
            </ul>
            {/* Edge fade: there is more to scroll to. */}
            <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-linear-to-l from-bg to-transparent sm:hidden" />
          </nav>

          <Section name="overview" title="About me">
            <p className="text-body-lg whitespace-pre-line text-ink">{f.about}</p>
            {alsoOnSet.length > 0 && (
              <p className="mt-4 text-body-md text-ink-muted"><b className="font-semibold text-ink">Also on set:</b> {alsoOnSet.join(" · ")}</p>
            )}
            {helps.length > 1 && (
              <>
                <h3 className="mt-10 font-display text-heading-lg text-ink">What I can help you with</h3>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {helps.map((h) => (
                    <li key={h} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line bg-surface px-4 text-label-md text-ink">
                      <Check className="size-4 text-ink-brand" aria-hidden="true" />{h}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Section>

          <Section name="services" title="Services" meta={rate ? "Starting rate; final scope agreed together" : undefined}>
            <ul className={cx("grid gap-4", f.services.length > 1 && "sm:grid-cols-2")}>
              {f.services.map((s, i) => (
                <li key={s}>
                  <Reveal effect="fade-up" delay={i * 70} className={cx("flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface", f.services.length === 1 && serviceImgs[i] && "sm:flex-row")}>
                    {serviceImgs[i] && <div className={cx("aspect-video overflow-hidden", f.services.length === 1 && "sm:aspect-auto sm:w-2/5")}><img src={asset(serviceImgs[i].src)} alt="" className="size-full object-cover" /></div>}
                    <div className="grid flex-1 content-center gap-1 p-5">
                      <h3 className="font-display text-heading-md text-ink">{s}</h3>
                      <p className="text-body-sm text-ink-muted">Discuss scope and details with {first}</p>
                      {rate && <p className="mt-2 text-body-sm text-ink-muted">From <b className="font-display text-heading-md text-ink tabular-nums">{rate}</b></p>}
                    </div>
                  </Reveal>
                </li>
              ))}
            </ul>
          </Section>

          {portfolio.length > 0 && (
            <Section name="portfolio" title="Portfolio" meta={`${portfolio.length} ${portfolio.length === 1 ? "image" : "images"}`}>
              <ul className={cx("grid grid-cols-2 gap-3", portfolio.length === 4 ? "md:grid-cols-4" : portfolio.length > 2 && "md:grid-cols-3")}>
                {portfolio.map((it, i) => (
                  <li key={it.src} className={cx(portfolio.length <= 2 ? cx("h-48 md:h-64", portfolio.length === 1 && "col-span-2") : i === 0 ? "col-span-2 row-span-2" : "h-36 md:h-44", portfolio.length === 4 && i === 1 && "col-span-2")}>
                    <button type="button" onClick={() => setLightbox(i)} aria-label={`Open image: ${it.caption}`} className="group relative block size-full min-h-36 overflow-hidden rounded-xl">
                      <img src={asset(it.src)} alt="" className="size-full object-cover transition-transform duration-slow group-hover:scale-105 motion-reduce:transition-none" />
                      <span data-theme="dark" className="absolute inset-x-0 bottom-0 bg-linear-to-t from-surface-brand to-transparent p-3 pt-8 text-left text-label-md text-ink opacity-0 transition duration-base group-hover:opacity-100 group-focus-visible:opacity-100">{it.caption}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <Section name="faqs" title="FAQs">
            <Accordion variant="flush" items={faqs(first).map((x, i) => ({ id: `${person.id}-faq-${i}`, title: x.q, content: x.a }))} />
          </Section>

          {sample && (
            <p className="mt-12 flex items-start gap-2 border-t border-line pt-4 text-caption text-ink-subtle">
              <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              <span>Sample profile: {f.name} is a fictional Gigster used to preview Between Gigs. The biography, credits and images are illustrative.</span>
            </p>
          )}

          {similar.length > 0 && (
            <section aria-labelledby="similar-h" className="mt-16">
              <h2 id="similar-h" className="font-display text-display-sm text-ink">You might also like</h2>
              <ul className="mt-5 grid gap-4 sm:grid-cols-3">
                {similar.map(({ person: o, profile }) => (
                  <li key={o.id}>
                    <Link href={`/p/${o.slug}/`} className="group flex overflow-hidden sm:block rounded-2xl border border-line bg-surface transition duration-base hover:-translate-y-0.5 hover:shadow-lg motion-reduce:hover:translate-y-0">
                      <div className="w-24 shrink-0 overflow-hidden sm:aspect-video sm:w-auto">
                        <PersonPhoto id={o.id} name={o.name} src={profile.fields.photo || undefined} alt="" fallback="brand" department={profile.fields.position} skills={profile.fields.skills}
                          textClass="text-heading-md" className="size-full transition-transform duration-slow group-hover:scale-105 motion-reduce:transition-none" />
                      </div>
                      <div className="flex min-w-0 flex-1 items-center justify-between gap-2 p-4">
                        <span className="min-w-0"><b className="block truncate font-display text-heading-md text-ink">{o.name}</b><span className="text-body-sm text-ink-muted">{profile.fields.services[0]}</span></span>
                        <ArrowUpRight className="size-5 shrink-0 text-ink-brand" aria-hidden="true" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      {/* Phones: the price and the request button stay in reach. */}
      {mode === "public" && (
        <>
          <div className="sticky bottom-0 z-sticky -mx-4 mt-10 border-t border-line bg-surface/95 px-4 py-3 shadow-lg backdrop-blur-md sm:-mx-6 sm:px-6 lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <p className="min-w-0">
                {f.rate
                  ? <><b className="font-display text-heading-lg text-ink tabular-nums">${f.rate}</b><span className="text-body-sm text-ink-muted">/{basisShort[f.basis]}</span></>
                  : <b className="font-display text-heading-md text-ink">Rate on request</b>}
                <span className="block truncate text-caption text-ink-subtle">{monthStatusLabel[f.monthStatus]}</span>
              </p>
              <Button variant="primary" iconEnd={<ArrowRight />} onClick={() => setRequest(true)}>Request {first}</Button>
            </div>
          </div>
        </>
      )}

      <Lightbox name={f.name} items={portfolio} index={lightbox} onIndex={setLightbox} />
      <RequestModal first={first} open={request} onClose={() => setRequest(false)} />
    </div>
  );
}

/** Outside the public page the request button is off. Say so plainly instead of showing a dim button. */
function RequestOff({ first, mode }: { first: string; mode: ProfileMode }) {
  return (
    <div className="grid gap-2">
      <div aria-hidden="true" className="grid h-12 place-items-center rounded-lg border border-dashed border-line-strong text-label-md text-ink-muted">Request {first}</div>
      <p className="text-center text-caption text-ink-subtle">
        {mode === "own" ? "Clients use this button to send you a request. It's off in your preview." : "Clients see a request button here. It's off in the owner view."}
      </p>
    </div>
  );
}

function Section({ name, title, meta, children }: { name: string; title: string; meta?: string; children: React.ReactNode }) {
  return (
    <section data-section={name} aria-labelledby={`sec-${name}`} className="scroll-mt-32 pt-14">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id={`sec-${name}`} className="font-display text-display-sm text-ink">{title}</h2>
        {meta && <span className="text-caption text-ink-subtle">{meta}</span>}
      </div>
      {children}
    </section>
  );
}

function Lightbox({ name, items, index, onIndex }: { name: string; items: { src: string; caption: string }[]; index: number | null; onIndex: (i: number | null) => void }) {
  const n = items.length;
  const it = index === null ? null : items[index];
  React.useEffect(() => {
    if (index === null) return;
    const key = (e: KeyboardEvent) => { if (e.key === "ArrowRight") onIndex((index + 1) % n); if (e.key === "ArrowLeft") onIndex((index - 1 + n) % n); };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [index, n, onIndex]);
  return (
    <Modal open={index !== null} onClose={() => onIndex(null)} size="lg" title={it?.caption ?? ""} description={`${name} · image ${index === null ? "" : index + 1} of ${n}`}>
      {it && (
        <div className="grid gap-3">
          <img key={it.src} src={asset(it.src)} alt={it.caption} className="aspect-video w-full rounded-xl object-cover" />
          <div className="flex items-center justify-between">
            <Button variant="secondary" size="sm" iconStart={<ChevronLeft />} onClick={() => onIndex(((index ?? 0) - 1 + n) % n)}>Previous</Button>
            <span className="text-label-sm text-ink-subtle tabular-nums">{(index ?? 0) + 1} / {n}</span>
            <Button variant="secondary" size="sm" iconEnd={<ChevronRight />} onClick={() => onIndex(((index ?? 0) + 1) % n)}>Next</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/** Booking requests are out of scope for Milestone 2; the modal shows the proposed shape and sends nothing. */
function RequestModal({ first, open, onClose }: { first: string; open: boolean; onClose: () => void }) {
  const [sent, setSent] = React.useState(false);
  const [what, setWhat] = React.useState("");
  const [err, setErr] = React.useState<string>();
  React.useEffect(() => { if (!open) { setSent(false); setErr(undefined); } }, [open]); // eslint-disable-line react-hooks/set-state-in-effect
  return (
    <Modal open={open} onClose={onClose} title={sent ? "Request drafted" : `Request ${first}`} description={sent ? undefined : "Preview only. Nothing is sent in this milestone."}
      footer={sent ? <Button variant="primary" onClick={onClose}>Done</Button> : (
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" iconStart={<MessageSquare />} onClick={() => { if (what.trim().length < 10) { setErr("Add a sentence about the project, like what and where."); return; } setSent(true); }}>Draft request</Button>
        </>
      )}>
      {sent ? (
        <p className="py-6 text-center text-body-md text-ink-muted">When requests open, {first} gets your note and replies to agree scope, timing and the final rate. Nothing was sent.</p>
      ) : (
        <div className="grid gap-4">
          <Field label="What's the project?" error={err} hint={err ? undefined : "For example: “Hem two pairs of trousers and take in a jacket.”"}>
            <Textarea rows={3} value={what} onChange={(e) => setWhat(e.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="When?"><Select defaultValue="this-week" options={[{ value: "this-week", label: "This week" }, { value: "next-week", label: "Next week" }, { value: "flexible", label: "I'm flexible" }]} /></Field>
            <Field label="Where?"><Input defaultValue="Los Angeles, CA" start={<MapPin />} /></Field>
          </div>
        </div>
      )}
    </Modal>
  );
}
