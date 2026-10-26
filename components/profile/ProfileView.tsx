"use client";
import { Accordion, Badge, Button, Field, IconButton, Input, Modal, Select, Textarea, cx } from "@ds/components";
import { Reveal } from "@ds/motion";
import { ArrowRight, ArrowUpRight, Calendar, Check, ChevronLeft, ChevronRight, MapPin, MessageSquare, Star, Wallet } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import type { Person, Profile, ProfileFields } from "@/lib/data";
import { basisShort, insuranceLabel, modeLabel, monthStatusLabel } from "@/lib/data/taxonomy";
import { asset } from "@/lib/site";
import { PersonPhoto } from "@/components/people/PersonPhoto";
import { pinnedCredits } from "@/lib/profile/validate";

export type ProfileMode = "public" | "own" | "owner";

interface Props {
  person: Person;
  fields: ProfileFields;
  extras?: Profile["extras"];
  /** public: what clients see. own: the Gigster's preview of it. owner: the team's view inside search. */
  mode: ProfileMode;
  similar?: { person: Person; profile: Profile }[];
}

const availabilityTone = { available: "success", limited: "info", away: "neutral" } as const;
const faqs = (first: string) => [
  { q: "How do I get started?", a: `Send a request with what you need, where and roughly when. ${first} replies to agree the scope, timing and final rate before anything starts.` },
  { q: "What does the rate cover?", a: "The rate is a starting point for time on your project. Materials, travel and the final scope are agreed together before you book." },
  { q: "Where can we work together?", a: "In your home or space across the Los Angeles area. Travel and work mode are agreed for each project." },
];

/**
 * A Gigster's profile, rebuilt from the GigsterProfile template over real fields. One component for the
 * public page, the Gigster's own preview and the owner's view, so all three always match.
 * No reviews section: there are no real reviews yet, and we don't show invented ones.
 */
export function ProfileView({ person, fields: f, extras, mode, similar = [] }: Props) {
  const first = f.name.split(" ")[0] || "this Gigster";
  const helps = extras?.helps ?? f.services;
  const portfolio = extras?.portfolio ?? [];
  const sample = !!person.sample;
  const [active, setActive] = React.useState("overview");
  const [lightbox, setLightbox] = React.useState<number | null>(null);
  const [request, setRequest] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const root = React.useRef<HTMLDivElement>(null);
  // The owner view already has the person's name as its page title.
  const Name = mode === "owner" ? "h2" : "h1";
  const rate = f.rate ? `$${f.rate}/${basisShort[f.basis]}` : null;
  const where = f.market === "la" ? `${f.areas.join(" · ") || "Los Angeles"}, Los Angeles area` : f.otherCity;
  const sections = [["overview", "Overview"], ["services", "Services"], ...(portfolio.length ? [["portfolio", "Portfolio"]] : []), ["experience", "Experience"], ["faqs", "FAQs"]] as [string, string][];

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
  const jump = (id: string) => root.current?.querySelector(`[data-section="${id}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });

  const glance: [string, React.ReactNode, string?][] = [
    ["Location", where, f.zip ? `Based near ${f.zip}` : undefined],
    ["Rate", rate ? <>From <b className="text-ink">{rate}</b></> : "Discussed per project", "Project scope agreed together"],
    ["Availability", monthStatusLabel[f.monthStatus], [f.month, f.dates].filter(Boolean).join(" · ")],
    ["Travel & work mode", modeLabel[f.mode], f.travel || undefined],
    ...(f.tools ? [["Tools & equipment", f.tools] as [string, string]] : []),
    ...(f.languages ? [["Languages", f.languages] as [string, string]] : []),
    ["Insurance", `${insuranceLabel[f.insurance]} · Not verified`],
  ];

  return (
    <div ref={root} data-client-locked="" className="relative approved-type">
      {/* Ambient glow from the person's own work. */}
      {portfolio[0] && (
        <div aria-hidden="true" className="pointer-events-none absolute -top-8 left-1/2 -z-0 h-96 w-screen -translate-x-1/2 overflow-hidden">
          <img src={asset(portfolio[0].src)} alt="" className="size-full scale-125 object-cover opacity-30 blur-3xl" />
          <span className="absolute inset-0 bg-linear-to-b from-transparent to-bg" />
        </div>
      )}

      <div className="relative grid gap-10 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-8">
          <section className="grid gap-6 sm:grid-cols-12 sm:items-end">
            <div className="relative max-w-72 sm:col-span-5 sm:max-w-none">
              <PersonPhoto id={person.id} morph name={f.name} src={f.photo || undefined} alt={`Portrait of ${f.name}${sample ? " (fictional)" : ""}`}
                className="aspect-square w-full rounded-2xl shadow-lg ring-1 ring-line" textClass="text-display-xl" />
              <Badge tone={availabilityTone[f.monthStatus]} className="absolute top-3 left-3 shadow-sm">{monthStatusLabel[f.monthStatus]}</Badge>
            </div>
            <div className="min-w-0 sm:col-span-7">
              <Reveal effect="fade-up"><p className="text-eyebrow text-ink-brand uppercase">{f.services[0] ?? f.position}</p></Reveal>
              <Reveal effect="fade-up" delay={80}><Name className="mt-2 font-display text-display-md break-words text-ink sm:text-display-lg">{f.name}</Name></Reveal>
              <Reveal effect="fade-up" delay={160}>
                <p className="mt-2 text-body-lg text-ink-muted">{helps.slice(0, 3).join(" · ")}</p>
                <ul className="mt-5 grid gap-2 text-body-md text-ink">
                  <li className="flex items-start gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-ink-brand" aria-hidden="true" />{where}</li>
                  <li className="flex items-start gap-2"><Wallet className="mt-0.5 size-4 shrink-0 text-ink-brand" aria-hidden="true" />{rate ? <span>From <b>{rate}</b> · scope agreed together</span> : "Rate discussed per project"}</li>
                  <li className="flex items-start gap-2"><Calendar className="mt-0.5 size-4 shrink-0 text-ink-brand" aria-hidden="true" />{monthStatusLabel[f.monthStatus]}{f.dates && ` · ${f.dates}`}</li>
                </ul>
                <div className="mt-5 flex flex-wrap gap-2">
                  {sample && <Badge tone="neutral" size="sm">Fictional profile</Badge>}
                  <Badge tone="neutral" size="sm">{f.position}{f.years && ` · ${f.years} years`}</Badge>
                  <Badge tone="warning" size="sm">Credits not verified</Badge>
                </div>
              </Reveal>
            </div>
          </section>

          <nav aria-label="Profile sections" className="sticky top-16 z-sticky -mx-4 mt-10 border-b border-line bg-bg/90 px-4 backdrop-blur-md sm:mx-0 sm:px-0">
            <ul className="flex gap-1 overflow-x-auto">
              {sections.map(([id, label]) => (
                <li key={id}>
                  <button type="button" onClick={() => jump(id)} aria-current={active === id ? "true" : undefined}
                    className={cx("relative inline-flex min-h-12 items-center px-3 text-label-md whitespace-nowrap transition-colors duration-fast",
                      active === id ? "text-ink after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-action" : "text-ink-muted hover:text-ink")}>
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <Section name="overview" title="About me">
            <p className="font-serif text-editorial-lg whitespace-pre-line text-ink">{f.about}</p>
            {sample && <p className="mt-2 text-caption text-ink-subtle">Illustrative biography for this fictional profile.</p>}
            <h3 className="mt-10 font-display text-heading-lg text-ink">What I can help you with</h3>
            <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
              {helps.map((h, i) => (
                <li key={h}>
                  <Reveal effect="fade-up" delay={i * 50} className="flex h-full items-center gap-3 rounded-xl border border-line bg-surface p-2.5">
                    {portfolio.length
                      ? <img src={asset(portfolio[i % portfolio.length].src)} alt="" className="size-12 shrink-0 rounded-lg object-cover" />
                      : <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-lg bg-surface-selected text-ink-brand"><Check className="size-5" /></span>}
                    <span className="text-label-md text-ink">{h}</span>
                  </Reveal>
                </li>
              ))}
            </ul>
          </Section>

          <Section name="services" title="Services" meta={rate ? "Starting rate; final scope agreed together" : undefined}>
            <ul className="grid gap-4 sm:grid-cols-2">
              {f.services.map((s, i) => (
                <li key={s}>
                  <Reveal effect="fade-up" delay={i * 70} className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface">
                    {portfolio.length > 0 && <div className="aspect-video overflow-hidden"><img src={asset(portfolio[i % portfolio.length].src)} alt="" className="size-full object-cover" /></div>}
                    <div className="grid gap-1 p-4">
                      <h3 className="font-display text-heading-md text-ink">{s}</h3>
                      <p className="text-body-sm text-ink-muted">Discuss scope and details</p>
                      {rate && <p className="mt-2 text-body-sm text-ink-muted">From <b className="font-display text-heading-md text-ink">{rate}</b></p>}
                    </div>
                  </Reveal>
                </li>
              ))}
            </ul>
          </Section>

          {portfolio.length > 0 && (
            <Section name="portfolio" title="Portfolio" meta={`${portfolio.length} images`}>
              {sample && <p className="-mt-2 mb-4 text-body-sm text-ink-muted">Example imagery showing the kinds of projects we could discuss. Concept images, not completed client work.</p>}
              <ul className={cx("grid grid-cols-2 gap-3", portfolio.length === 4 ? "md:grid-cols-4" : "md:grid-cols-3")}>
                {portfolio.map((it, i) => (
                  <li key={it.src} className={cx(i === 0 ? "col-span-2 row-span-2" : "h-36 md:h-44", portfolio.length === 4 && i === 1 && "col-span-2")}>
                    <button type="button" onClick={() => setLightbox(i)} aria-label={`Open image: ${it.caption}`} className="group relative block size-full min-h-36 overflow-hidden rounded-xl">
                      <img src={asset(it.src)} alt="" className="size-full object-cover transition-transform duration-slow group-hover:scale-105" />
                      <span data-theme="dark" className="absolute inset-x-0 bottom-0 bg-linear-to-t from-surface-brand to-transparent p-3 pt-8 text-left text-label-md text-ink opacity-0 transition duration-base group-hover:opacity-100 group-focus-visible:opacity-100">{it.caption}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <Section name="experience" title="Professional experience">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-line bg-surface p-5">
                <h3 className="text-label-md text-ink">On set</h3>
                <p className="mt-1 text-body-md text-ink-muted">{[f.position, ...f.skills.filter((s) => s !== f.position)].join(" · ")}{f.years && ` · ${f.years} years in the business`}</p>
                {pinnedCredits(f).length > 0 && <>
                  <h3 className="mt-5 text-label-md text-ink">Selected credits</h3>
                  <ul className="mt-1 grid gap-1 text-body-sm text-ink-muted">{pinnedCredits(f).map((c) => <li key={c}>{c}</li>)}</ul>
                </>}
                {f.imdb && mode !== "public" && <p className="mt-3 text-body-sm"><a className="inline-flex min-h-11 items-center text-link underline underline-offset-2" href={f.imdb} target="_blank" rel="noreferrer">IMDb page<span className="sr-only"> (opens in a new tab)</span></a></p>}
              </div>
              <div className="rounded-2xl border border-line bg-surface p-5">
                <h3 className="text-label-md text-ink">What's been checked</h3>
                <p className="mt-1 text-body-sm text-ink-muted">Profile details and credits are self-reported. The Between Gigs team reviews each profile before it goes live; no identity, qualification or insurance checks are claimed.</p>
                <h3 className="mt-5 text-label-md text-ink">Languages</h3>
                <p className="mt-1 text-body-sm text-ink-muted">{f.languages || "Not specified."}</p>
              </div>
            </div>
          </Section>

          <Section name="faqs" title="FAQs">
            <Accordion variant="flush" items={faqs(first).map((x, i) => ({ id: `${person.id}-faq-${i}`, title: x.q, content: x.a }))} />
          </Section>

          {similar.length > 0 && (
            <section aria-labelledby="similar-h" className="mt-16">
              <h2 id="similar-h" className="font-display text-display-sm text-ink">You might also like</h2>
              <ul className="mt-5 grid gap-4 sm:grid-cols-3">
                {similar.map(({ person: o, profile }) => (
                  <li key={o.id}>
                    <Link href={`/p/${o.slug}/`} className="group block overflow-hidden rounded-2xl border border-line bg-surface transition duration-base hover:-translate-y-0.5 hover:shadow-lg">
                      <div className="aspect-video overflow-hidden"><PersonPhoto id={o.id} name={o.name} src={profile.fields.photo || undefined} alt="" className="size-full transition-transform duration-slow group-hover:scale-105" /></div>
                      <div className="flex items-center justify-between gap-2 p-4">
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

        <aside aria-label="Book and details" className="lg:col-span-4">
          <div className="grid gap-5 lg:sticky lg:top-24">
            <div className="rounded-2xl border border-line bg-surface p-5 shadow-lg">
              <div className="flex items-start justify-between gap-3">
                <p>
                  <span className="block text-caption text-ink-subtle">From</span>
                  {f.rate ? <><span className="font-display text-display-sm text-ink">${f.rate}</span><span className="text-body-md text-ink-muted">/{basisShort[f.basis]}</span></> : <span className="font-display text-heading-lg text-ink">Rate on request</span>}
                </p>
                {mode === "public" && <IconButton label={saved ? `Unsave ${first}` : `Save ${first}`} pressed={saved} onClick={() => setSaved(!saved)} variant="ghost" icon={<Star className={cx(saved && "fill-current")} />} />}
              </div>
              <p className="mt-1 text-body-sm text-ink-muted">{monthStatusLabel[f.monthStatus]}</p>
              <div className="mt-5 grid gap-2">
                <Button variant="primary" size="lg" fullWidth className="glow-hover" iconEnd={<ArrowRight />} disabled={mode !== "public"} aria-describedby={`${person.id}-request-note`} onClick={() => setRequest(true)}>Request {first}</Button>
              </div>
              <p id={`${person.id}-request-note`} className="mt-3 text-center text-caption text-ink-subtle">
                {mode === "public" ? "Preview only · requests open in a later milestone" : mode === "own" ? "This is how clients will see your booking card." : "Owner view · requests are off here"}
              </p>
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
      </div>

      <Lightbox name={f.name} items={portfolio} index={lightbox} onIndex={setLightbox} />
      <RequestModal first={first} open={request} onClose={() => setRequest(false)} />
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
            <span className="font-mono text-data-sm text-ink-subtle">{(index ?? 0) + 1} / {n}</span>
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
