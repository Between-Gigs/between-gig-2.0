"use client";
import { Accordion, Button, Field, IconButton, Input, Modal, Select, Textarea, cx, useToast } from "@ds/components";
import { Reveal } from "@ds/motion";
import { ArrowRight, ArrowUpRight, BadgeCheck, Calendar, ChevronLeft, ChevronRight, Clapperboard, Handshake, Info, MapPin, MessageSquare, Share2, Star } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { data, type Person, type Profile, type ProfileFields } from "@/lib/data";
import { basisShort, insuranceLabel, modeLabel, monthStatusLabel } from "@/lib/data/taxonomy";
import { locationLabel } from "@/lib/profile/location";
import { absoluteUrl, asset } from "@/lib/site";
import { PersonPhoto } from "@/components/people/PersonPhoto";
import { pinnedCredits } from "@/lib/profile/validate";

export type ProfileMode = "public" | "own" | "owner";

/** The parts of a profile someone can fill in. The editor (/profile/canvas/) wraps each one to edit it in place. */
export type ProfilePart = "photo" | "name" | "position" | "years" | "services" | "skills" | "where" | "availability" | "rate" | "about" | "credits" | "imdb" | "languages" | "details";
/** How a part looks while empty in the editor: the portrait, the name, a line of the hero, or a block in the body. */
export type PartKind = "photo" | "title" | "line" | "block";
export type PartRenderer = (id: ProfilePart, part: { content: React.ReactNode; hint: string; kind: PartKind }) => React.ReactNode;

interface Props {
  person: Person;
  fields: ProfileFields;
  extras?: Profile["extras"];
  /** public: what clients see. own: the Gigster's preview of it. owner: the team's view inside search. */
  mode: ProfileMode;
  similar?: { person: Person; profile: Profile }[];
  /** A draft being previewed: empty parts show where they'll go instead of disappearing. */
  draft?: boolean;
  /** Editing in place: every part is handed to this, filled or not, to wrap with its edit controls. */
  part?: PartRenderer;
  /** Replaces the booking card column (the editor puts its panel there). */
  aside?: React.ReactNode;
}

const dot = { available: "bg-success", limited: "bg-info", away: "bg-ink-subtle" } as const;
const faqs = (first: string) => [
  { q: "How do I get started?", a: `Send a request with what you need, where and roughly when. ${first} replies to agree the scope, timing and final rate before anything starts.` },
  { q: "What does the rate cover?", a: "The rate is a starting point for time on your project. Materials, travel and the final scope are agreed together before you book." },
  { q: "Where can we work together?", a: "In your home or space across the Los Angeles area. Travel and work mode are agreed for each project." },
];

/** "Production · Role" → the title and the role, as a film credit reads. */
const splitCredit = (c: string) => { const [title, ...rest] = c.split("·").map((s) => s.trim()); return { title, role: rest.join(" · ") }; };

/**
 * A Gigster's profile: one component for the public page, the Gigster's own preview, the owner's view and the editor,
 * so all four always match. A portrait-led hero, then their story, services, work and credits, with the booking card
 * beside them (a bar along the bottom on phones). No reviews section: there are none yet, and we don't invent them.
 */
export function ProfileView({ person, fields: f, extras, mode, similar = [], draft = false, part, aside }: Props) {
  const toast = useToast();
  const first = f.name.split(" ")[0] || "this Gigster";
  const services = f.services;
  const offers = extras?.helps?.length ? extras.helps : services;
  const portfolio = extras?.portfolio ?? [];
  const sample = !!person.sample;
  const editing = !!part;
  const show = draft || editing;
  const [lightbox, setLightbox] = React.useState<number | null>(null);
  const [request, setRequest] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  // The owner view already has the person's name as its page title.
  const Name = mode === "owner" ? "h2" : "h1";
  const rate = f.rate ? `$${f.rate}/${basisShort[f.basis]}` : null;
  const where = f.market === "la" ? (f.areas.length ? locationLabel(f) : "") : locationLabel(f);
  const credits = pinnedCredits(f);
  const years = f.years ? `${f.years} ${f.years === "1" ? "year" : "years"} in the business` : "";
  // Live, the public page reads only what Company OS's public_reader may see: no insurance answer, so it's left out.
  const unseen = mode === "public" && data.kind === "live";
  const details: [string, string][] = ([
    ["Languages", f.languages],
    ["Work mode", [modeLabel[f.mode], f.travel].filter(Boolean).join(" · ")],
    ["Tools & equipment", f.tools],
    ["Getting there", f.transport],
    ...(unseen ? [] : [["Insurance", insuranceLabel[f.insurance]] as [string, string]]),
  ] as [string, string][]).filter(([, v]) => v);

  /** A part of the page: wrapped by the editor, else shown when filled (or as a quiet placeholder in a draft preview). */
  const P = (id: ProfilePart, filled: boolean, content: React.ReactNode, hint: string, kind: PartKind = "line") =>
    part ? <React.Fragment key={id}>{part(id, { content, hint, kind })}</React.Fragment>
      : filled ? content : draft ? <Placeholder key={id} block={kind === "block"}>{hint}</Placeholder> : null;

  const share = async () => {
    const url = absoluteUrl(`/p/${person.slug}/`);
    try {
      if (typeof navigator.share === "function") await navigator.share({ title: `${f.name} · Between Gigs`, url });
      else { await navigator.clipboard.writeText(url); toast({ message: "Link copied", tone: "success" }); }
    } catch { /* closed the share sheet */ }
  };

  const booking = (
    <div className="grid gap-4">
      <section aria-label={`Book ${first}`} className="rounded-2xl border border-line bg-surface p-6 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <p className="grid">
            {f.rate
              ? <span><span className="font-display text-display-sm text-ink">${f.rate}</span><span className="text-body-md text-ink-muted"> / {basisShort[f.basis]}</span></span>
              : <span className="font-display text-heading-lg text-ink">Rate on request</span>}
            <span className="text-body-sm text-ink-muted">{f.rate ? "Starting rate · final scope agreed together" : "Agreed with you for each project"}</span>
          </p>
          {mode === "public" && <IconButton label={saved ? `Unsave ${first}` : `Save ${first}`} pressed={saved} onClick={() => setSaved(!saved)} variant="ghost" icon={<Star className={cx(saved && "fill-current")} />} />}
        </div>
        <p className="mt-4 flex items-center gap-2 text-body-md text-ink">
          <span aria-hidden="true" className={cx("size-2 shrink-0 rounded-full", dot[f.monthStatus])} />{monthStatusLabel[f.monthStatus]}
        </p>
        {f.dates && <p className="mt-1 pl-4 text-body-sm text-ink-muted">{f.dates}</p>}
        <Button variant="primary" size="lg" fullWidth className="mt-5 glow-hover" iconEnd={<ArrowRight />} disabled={mode !== "public"} aria-describedby={`${person.id}-request-note`} onClick={() => setRequest(true)}>
          Request {first}
        </Button>
        <p id={`${person.id}-request-note`} className="mt-3 text-center text-body-sm text-ink-subtle">
          {mode === "public" ? "Free to ask. Nothing is booked until you both agree." : mode === "own" ? "Clients see this card beside your profile." : "Owner view: requests are off here."}
        </p>
      </section>
      <ul className="grid gap-3 rounded-2xl bg-surface-sunken p-5 text-body-sm text-ink-muted">
        <li className="flex gap-3"><BadgeCheck className="mt-0.5 size-4 shrink-0 text-ink-brand" aria-hidden="true" />Reviewed by the Between Gigs team before going live</li>
        <li className="flex gap-3"><Handshake className="mt-0.5 size-4 shrink-0 text-ink-brand" aria-hidden="true" />Scope, timing and the final rate agreed with you first</li>
        <li className="flex gap-3"><Info className="mt-0.5 size-4 shrink-0 text-ink-subtle" aria-hidden="true" />Credits and details are shared by {first} and not independently verified</li>
      </ul>
    </div>
  );

  return (
    <div className="relative">
      {/* Ambient light from the person's own work, behind the hero. */}
      {portfolio[0] && (
        <div aria-hidden="true" className="pointer-events-none absolute -top-10 left-1/2 h-112 w-screen -translate-x-1/2 overflow-hidden">
          <img src={asset(portfolio[0].src)} alt="" className="size-full scale-125 object-cover opacity-25 blur-3xl" />
          <span className="absolute inset-0 bg-linear-to-b from-transparent to-bg" />
        </div>
      )}

      <div className="relative grid gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="min-w-0 lg:col-span-8">
      {/* Hero: the portrait and who they are, with the one action. */}
      <header className="relative grid gap-8 md:grid-cols-12 md:items-end">
        <div className="relative w-full max-w-xs md:col-span-5 md:max-w-none">
          {P("photo", !!f.photo, (
            <span className="relative block">
              <PersonPhoto id={person.id} morph={!editing} name={f.name} src={f.photo || undefined} alt={`Portrait of ${f.name}${sample ? " (fictional)" : ""}`}
                className="aspect-square w-full rounded-2xl shadow-lg ring-1 ring-line" textClass="text-display-xl" />
              <span className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-full bg-surface/90 px-3 py-1.5 text-label-md text-ink shadow-sm backdrop-blur-sm">
                <span aria-hidden="true" className={cx("size-2 rounded-full", dot[f.monthStatus])} />{monthStatusLabel[f.monthStatus]}
              </span>
            </span>
          ), "Add your photo", "photo")}
        </div>
        <div className="min-w-0 md:col-span-7 md:pb-2">
          <Reveal effect="fade-up">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {P("position", !!f.position, <p className="text-eyebrow text-ink-brand uppercase">{f.position}</p>, "Your department, like Costume & wardrobe")}
              {(!part && f.position && years) && <span aria-hidden="true" className="text-ink-subtle max-sm:hidden">·</span>}
              {P("years", !!f.years, <p className="text-eyebrow text-ink-subtle uppercase">{years}</p>, "Years in the business")}
            </div>
          </Reveal>
          <Reveal effect="fade-up" delay={60}>
            <div className="mt-3">{P("name", !!f.name.trim(), <Name className="font-display text-display-lg text-balance break-words text-ink">{f.name}</Name>, "Your name", "title")}</div>
          </Reveal>
          <Reveal effect="fade-up" delay={120}>
            {(extras?.tagline || offers.length > 0) && <p className="mt-4 max-w-xl text-body-lg text-ink-muted">{extras?.tagline ?? offers.slice(0, 3).join(" · ")}</p>}
            <ul className="mt-6 grid gap-2.5 text-body-md text-ink">
              <li>{P("where", !!where, <span className="flex items-start gap-2.5"><MapPin className="mt-0.5 size-5 shrink-0 text-ink-brand" aria-hidden="true" />{where}</span>, "Where you work")}</li>
              <li className={cx(!part && !aside && "lg:hidden")}>{P("availability", !!f.dates.trim() || !show, <span className="flex items-start gap-2.5"><Calendar className="mt-0.5 size-5 shrink-0 text-ink-brand" aria-hidden="true" />{monthStatusLabel[f.monthStatus]}{f.dates && ` · ${f.dates}`}</span>, "When you're free this month")}</li>
              {(rate || show) && <li className={cx(!part && !aside && "lg:hidden")}>{P("rate", !!rate, <span className="flex items-start gap-2.5"><span aria-hidden="true" className="grid size-5 shrink-0 place-items-center font-display text-label-md text-ink-brand">$</span>From <b className="ml-1">{rate}</b></span>, "Your starting rate (optional)")}</li>}
            </ul>
            {mode === "public" && (
              <div className="mt-6 flex flex-wrap items-center gap-2 lg:hidden">
                <Button variant="secondary" iconStart={<Share2 />} onClick={share}>Share profile</Button>
              </div>
            )}
          </Reveal>
        </div>
      </header>

          <Section title="About" first>
            {P("about", !!f.about.trim(), <p className="max-w-prose font-serif text-editorial-lg whitespace-pre-line text-ink">{f.about}</p>, "A few lines in your own words: your experience, the help you offer and what it's like to work with you.", "block")}
          </Section>

          <Section title="Services" meta={rate ? `From ${rate}` : undefined}>
            {P("services", services.length > 0 || !!f.other.trim(), (
              <div className="grid gap-5">
                {services.length > 0 && (extras?.helps?.length
                  ? <ul className="flex flex-wrap gap-2">{services.map((s) => <li key={s} className="rounded-full bg-surface-selected px-3 py-1.5 text-label-md text-ink-brand">{s}</li>)}</ul>
                  : <ul className="grid gap-3 sm:grid-cols-2">{services.map((s) => (
                      <li key={s} className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-5">
                        <span className="font-display text-heading-md text-ink">{s}</span>
                        {rate && <span className="shrink-0 text-body-sm text-ink-muted">From <b className="text-ink">{rate}</b></span>}
                      </li>
                    ))}</ul>)}
                {editing && f.other.trim() && <p className="text-body-sm text-ink-muted">Something else, in private review: {f.other}</p>}
                {offers.length > 0 && !!extras?.helps?.length && (
                  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {offers.map((h, i) => (
                      <li key={h}>
                        <Reveal effect="fade-up" delay={i * 40} className="group h-full overflow-hidden rounded-2xl border border-line bg-surface">
                          {portfolio.length > 0 && <div className="aspect-4/3 overflow-hidden"><img src={asset(portfolio[i % portfolio.length].src)} alt="" loading="lazy" className="size-full object-cover transition-transform duration-slow group-hover:scale-105" /></div>}
                          <p className="p-3 text-label-md text-ink">{h}</p>
                        </Reveal>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ), "The services you'd offer clients between gigs", "block")}
          </Section>

          {portfolio.length > 0 && (
            <Section title="Work" meta={`${portfolio.length} images`}>
              <ul className="grid grid-cols-2 gap-3 md:grid-cols-4 md:grid-rows-2">
                {portfolio.map((it, i) => (
                  <li key={it.src} className={cx(i === 0 ? "col-span-2 aspect-video md:row-span-2 md:aspect-auto" : "aspect-square md:aspect-auto", portfolio.length === 4 && i === 1 && "md:col-span-2", portfolio.length % 2 === 0 && i === portfolio.length - 1 && "max-md:col-span-2 max-md:aspect-video")}>
                    <button type="button" onClick={() => setLightbox(i)} aria-label={`Open image: ${it.caption}`} className="group relative block size-full min-h-40 overflow-hidden rounded-2xl">
                      <img src={asset(it.src)} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-slow group-hover:scale-105" />
                      <span data-theme="dark" className="absolute inset-x-0 bottom-0 bg-linear-to-t from-surface-brand to-transparent p-3 pt-10 text-left text-label-md text-ink opacity-0 transition duration-base group-hover:opacity-100 group-focus-visible:opacity-100">{it.caption}</span>
                    </button>
                  </li>
                ))}
              </ul>
              {sample && <p className="mt-3 text-body-sm text-ink-subtle">Concept images showing the kind of work to discuss, not completed client projects.</p>}
            </Section>
          )}

          <Section title="On set">
            <div className="grid gap-6">
              {P("skills", f.skills.length > 0, (
                <ul className="flex flex-wrap gap-2">{f.skills.map((s) => <li key={s} className="rounded-full border border-line px-3 py-1.5 text-label-md text-ink">{s}</li>)}</ul>
              ), "Your on-set skills", "block")}
              {P("credits", credits.length > 0, (
                <ol className="divide-y divide-line border-y border-line">
                  {credits.map((c) => { const { title, role } = splitCredit(c); return (
                    <li key={c} className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5 py-3.5">
                      <Clapperboard className="size-4 shrink-0 translate-y-0.5 text-ink-subtle" aria-hidden="true" />
                      <span className="font-display text-heading-md text-ink">{title}</span>
                      {role && <span className="text-body-md text-ink-muted">{role}</span>}
                    </li>
                  ); })}
                </ol>
              ), "Your notable credits, best first", "block")}
              {mode !== "public" && P("imdb", !!f.imdb, (
                <p className="text-body-sm text-ink-muted"><a className="inline-flex min-h-11 items-center text-link underline underline-offset-2" href={f.imdb} target="_blank" rel="noreferrer">IMDb page<span className="sr-only"> (opens in a new tab)</span></a> · only the Between Gigs team sees this</p>
              ), "Your IMDb link (optional, only the team sees it)")}
            </div>
          </Section>

          {(details.length > 0 || show) && (
            <Section title="Details">
              <div className="grid gap-4">
                {P("languages", !!f.languages.trim(), <p className="text-body-md text-ink"><span className="text-ink-subtle">Speaks</span> {f.languages}</p>, "Languages you speak (optional)")}
                {P("details", !!(f.tools.trim() || f.transport.trim()), (
                  <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                    {details.filter(([k]) => k !== "Languages").map(([k, v]) => (
                      <div key={k} className="grid gap-0.5"><dt className="text-label-sm text-ink-subtle">{k}</dt><dd className="text-body-md text-ink">{v}</dd></div>
                    ))}
                  </dl>
                ), "Tools, transport, insurance and how you work (optional)", "block")}
              </div>
            </Section>
          )}

          {!editing && (
            <Section title="Questions">
              <Accordion variant="flush" items={faqs(first).map((x, i) => ({ id: `${person.id}-faq-${i}`, title: x.q, content: x.a }))} />
            </Section>
          )}
          {sample && !editing && <p className="mt-10 text-body-sm text-ink-subtle">This is a fictional sample profile: the person, biography and credits are made up for the preview.</p>}
        </div>

        <aside aria-label={aside ? "Editor" : `Book ${first}`} className="lg:col-span-4">
          <div className="grid gap-5 lg:sticky lg:top-24 embedded:lg:top-6">{aside ?? <div className="max-lg:hidden">{booking}</div>}</div>
        </aside>
      </div>

      {similar.length > 0 && (
        <section aria-labelledby="similar-h" className="relative mt-20 border-t border-line pt-12">
          <h2 id="similar-h" className="font-display text-display-sm text-ink">More Gigsters like {first}</h2>
          <ul className="mt-6 grid gap-5 sm:grid-cols-3">
            {similar.map(({ person: o, profile }) => (
              <li key={o.id}>
                <Link href={`/p/${o.slug}/`} className="group block">
                  <div className="aspect-4/5 overflow-hidden rounded-2xl"><PersonPhoto id={o.id} name={o.name} src={profile.fields.photo || undefined} alt="" className="size-full transition-transform duration-slow group-hover:scale-105" /></div>
                  <div className="mt-3 flex items-start justify-between gap-2">
                    <span className="min-w-0"><b className="block truncate font-display text-heading-md text-ink group-hover:underline group-hover:underline-offset-4">{o.name}</b><span className="text-body-md text-ink-muted">{profile.fields.position || profile.fields.services[0]}</span></span>
                    <ArrowUpRight className="mt-1 size-5 shrink-0 text-ink-brand" aria-hidden="true" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Phones and tablets: the booking card becomes a bar that stays in reach. */}
      {mode === "public" && !aside && (
        <div className="fixed inset-x-0 bottom-0 z-sticky border-t border-line bg-bg/95 px-4 py-3 shadow-lg backdrop-blur-md lg:hidden">
          <div className="mx-auto flex max-w-xl items-center justify-between gap-4">
            <p className="grid">
              <span className="text-label-md text-ink">{rate ? <>From {rate}</> : "Rate on request"}</span>
              <span className="flex items-center gap-1.5 text-body-sm text-ink-muted"><span aria-hidden="true" className={cx("size-1.5 rounded-full", dot[f.monthStatus])} />{monthStatusLabel[f.monthStatus]}</span>
            </p>
            <Button variant="primary" iconEnd={<ArrowRight />} onClick={() => setRequest(true)}>Request {first}</Button>
          </div>
        </div>
      )}
      {mode !== "public" && !aside && <div className="mt-10 lg:hidden">{booking}</div>}
      {mode === "public" && !aside && <div aria-hidden="true" className="h-20 lg:hidden" />}

      <Lightbox name={f.name} items={portfolio} index={lightbox} onIndex={setLightbox} />
      <RequestModal first={first} open={request} onClose={() => setRequest(false)} />
    </div>
  );
}

/** Where a part of a draft will go, in the preview. */
function Placeholder({ children, block = false }: { children: React.ReactNode; block?: boolean }) {
  return block
    ? <p className="rounded-2xl bg-surface-sunken p-5 text-body-md text-ink-subtle">{children}</p>
    : <span className="text-body-md text-ink-subtle">{children}</span>;
}

function Section({ title, meta, first = false, children }: { title: string; meta?: string; first?: boolean; children: React.ReactNode }) {
  const id = React.useId();
  return (
    <section aria-labelledby={id} className={cx("pb-12", first ? "mt-16" : "border-t border-line pt-8")}>
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id={id} className="font-display text-heading-lg text-ink">{title}</h2>
        {meta && <span className="text-body-sm text-ink-subtle">{meta}</span>}
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

/** Booking requests aren't open yet; the modal shows the proposed shape and sends nothing. */
function RequestModal({ first, open, onClose }: { first: string; open: boolean; onClose: () => void }) {
  const [sent, setSent] = React.useState(false);
  const [what, setWhat] = React.useState("");
  const [err, setErr] = React.useState<string>();
  React.useEffect(() => { if (!open) { setSent(false); setErr(undefined); } }, [open]); // eslint-disable-line react-hooks/set-state-in-effect
  return (
    <Modal open={open} onClose={onClose} title={sent ? "Request drafted" : `Request ${first}`} description={sent ? undefined : "Preview only. Requests aren't sent yet."}
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
