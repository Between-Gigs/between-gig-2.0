"use client";
import { Accordion, Button, Field, Input, Modal, Select, Textarea, cx, useToast } from "@ds/components";
import { BadgeCheck, ChevronLeft, ChevronRight, Heart, MapPin, MessageSquare, Share } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { data, type Person, type Profile, type ProfileFields } from "@/lib/data";
import { basisShort, insuranceLabel, modeLabel, monthStatusLabel } from "@/lib/data/taxonomy";
import { locationLabel } from "@/lib/profile/location";
import { absoluteUrl, asset } from "@/lib/site";
import { craftIcon, type Icon3DName } from "@/lib/icons3d";
import { PersonPhoto } from "@/components/people/PersonPhoto";
import { Icon3D } from "@/components/ui/Icon3D";
import { pinnedCredits } from "@/lib/profile/validate";

export type ProfileMode = "public" | "own" | "owner";

/** The parts of a profile someone can fill in. The editor (/profile/canvas/) wraps each one to edit it in place. */
export type ProfilePart = "photo" | "name" | "position" | "years" | "services" | "skills" | "where" | "availability" | "rate" | "about" | "credits" | "imdb" | "languages" | "details";
/** How a part looks while empty in the editor: the portrait, the name, a line, or a block in the body. */
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
  /** Replaces the booking card under the identity card (the editor puts its panel there). */
  aside?: React.ReactNode;
}

const faqs = (first: string) => [
  { q: "How do I get started?", a: `Send a request with what you need, where and roughly when. ${first} replies to agree the scope, timing and final rate before anything starts.` },
  { q: "What does the rate cover?", a: "The rate is a starting point for time on your project. Materials, travel and the final scope are agreed together before you book." },
  { q: "Where can we work together?", a: "In your home or space across the Los Angeles area. Travel and work mode are agreed for each project." },
];

/** "Production · Role" → the title and the role, as a film credit reads. */
const splitCredit = (c: string) => { const [title, ...rest] = c.split("·").map((s) => s.trim()); return { title, role: rest.join(" · ") }; };

/**
 * A Gigster's profile, laid out like an Airbnb host profile: an identity card with the portrait and a few numbers, the
 * booking card under it, and their story beside it (facts with 3D icons, about, what they offer, work, credits). One
 * component for the public page, the Gigster's own preview, the owner's view and the editor, so all four match.
 * No reviews section: there are none yet, and we don't invent them.
 */
export function ProfileView({ person, fields: f, extras, mode, similar = [], draft = false, part, aside }: Props) {
  const toast = useToast();
  const first = f.name.split(" ")[0] || "this Gigster";
  const services = f.services;
  const helps = extras?.helps ?? [];
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
  // Live, the public page reads only what Company OS's public_reader may see: no insurance answer, so it's left out.
  const unseen = mode === "public" && data.kind === "live";

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

  // Only the numbers that say something: a zero reads as a weakness, so it's left out (the editor shows years to fill).
  const offered = helps.length || services.length;
  const stats: [string, string, boolean][] = ([
    [f.years || "", f.years === "1" ? "Year in the business" : "Years in the business", !!f.years || editing],
    [String(offered), offered === 1 ? "Service" : "Services", offered > 0],
    [String(credits.length), credits.length === 1 ? "Credit" : "Credits", credits.length > 0],
  ] as [string, string, boolean][]).filter(([, , keep]) => keep);

  const identity = (
    <section aria-label={`About ${first}`} className="grid grid-cols-12 items-center gap-6 rounded-2xl bg-surface p-6 shadow-md sm:p-8">
      <div className={cx("grid justify-items-center gap-4 text-center", stats.length ? "col-span-7" : "col-span-12")}>
        <div className="relative size-28 sm:size-32">
          {P("photo", !!f.photo || !show, (
            <PersonPhoto id={person.id} morph={!editing} name={f.name} src={f.photo || undefined} alt={`Portrait of ${f.name}${sample ? " (fictional)" : ""}`}
              className="size-full rounded-full object-cover" textClass="text-display-sm" />
          ), "Add photo", "photo")}
          {!editing && (mode !== "own" || person.status === "approved") && f.photo && (
            <span className="absolute right-0 bottom-1 grid size-9 place-items-center rounded-full bg-action text-on-action shadow-md ring-4 ring-surface" title="Reviewed by Between Gigs">
              <BadgeCheck className="size-5" aria-hidden="true" /><span className="sr-only">Reviewed by Between Gigs</span>
            </span>
          )}
        </div>
        <div className="grid w-full justify-items-center gap-1.5">
          {P("name", !!f.name.trim(), <Name className="font-display text-heading-lg text-balance break-words text-ink">{f.name}</Name>, "Your name", "title")}
          {P("position", !!f.position, <p className="text-body-md text-ink-muted">{f.position}</p>, "Department")}
        </div>
      </div>
      {stats.length > 0 && <dl className="col-span-5 grid content-center divide-y divide-line">
        {stats.map(([v, k]) => (
          <div key={k} className="grid gap-0.5 py-3 first:pt-0 last:pb-0">
            <dt className="order-2 text-caption text-ink-muted">{k}</dt>
            <dd className="order-1 font-display text-heading-lg text-ink tabular-nums">{k.startsWith("Year") && part ? part("years", { content: <span>{v}</span>, hint: "Years", kind: "line" }) : v}</dd>
          </div>
        ))}
      </dl>}
    </section>
  );

  const booking = (
    <section aria-label={`Book ${first}`} className="grid gap-4 rounded-lg border border-line bg-surface p-6">
      <p>
        {f.rate
          ? <><span className="font-display text-heading-lg text-ink">${f.rate}</span><span className="text-body-md text-ink-muted"> / {basisShort[f.basis]} · starting rate</span></>
          : <span className="font-display text-heading-lg text-ink">Rate on request</span>}
      </p>
      <Button variant="primary" size="lg" fullWidth disabled={mode !== "public"} aria-describedby={`${person.id}-request-note`} onClick={() => setRequest(true)}>
        Request {first}
      </Button>
      <p id={`${person.id}-request-note`} className="text-center text-body-sm text-ink-muted">
        {mode === "public" ? "You won't be charged. Scope and rate are agreed first." : mode === "own" ? "Clients see this card on your profile." : "Owner view: requests are off here."}
      </p>
    </section>
  );

  const checked = (
    <section aria-labelledby={`${person.id}-checked`} className="px-1">
      <h2 id={`${person.id}-checked`} className="font-display text-heading-md text-ink">What we&apos;ve checked</h2>
      <ul className="mt-4 grid gap-3 text-body-md text-ink">
        <li className="flex items-center gap-3"><Icon3D name="check_mark_button" className="size-7 shrink-0" />Profile reviewed by the Between Gigs team</li>
        <li className="flex items-center gap-3"><Icon3D name="speech_balloon" className="size-7 shrink-0" /><span>Credits and details are shared by {first}, not independently verified</span></li>
      </ul>
    </section>
  );

  return (
    <div className="relative">
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-x-16 xl:gap-x-20">
        <aside aria-label={aside ? "Editor" : `${first} at a glance`} className="lg:col-span-5 xl:col-span-4">
          <div className="grid gap-6 lg:sticky lg:top-28 embedded:lg:top-6">
            {identity}
            {aside ?? <div className="grid gap-6 max-lg:hidden">{booking}{checked}</div>}
          </div>
        </aside>

        <div className="min-w-0 lg:col-span-7 xl:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <h2 className="font-display text-display-sm text-ink">About {first}</h2>
            {mode === "public" && !editing && (
              <div className="-mr-3 flex gap-1">
                <Button variant="ghost" size="sm" iconStart={<Share />} className="underline underline-offset-4" onClick={share}>Share</Button>
                <Button variant="ghost" size="sm" iconStart={<Heart className={cx(saved && "fill-current text-danger")} />} aria-pressed={saved} className="underline underline-offset-4" onClick={() => setSaved(!saved)}>{saved ? "Saved" : "Save"}</Button>
              </div>
            )}
          </div>
          <ul className="mt-8 grid gap-x-10 gap-y-5 sm:grid-cols-2">
            <li>{P("where", !!where, <Fact icon="round_pushpin">Works in {where}</Fact>, "Where you work")}</li>
            <li>{P("availability", !!f.dates.trim() || !show, <Fact icon="spiral_calendar">{monthStatusLabel[f.monthStatus]}{f.dates && <span className="block text-body-md text-ink-muted">{f.dates}</span>}</Fact>, "When you're free this month")}</li>
            {(rate || show) && <li>{P("rate", !!rate, <Fact icon="money_bag">From {rate}</Fact>, "Your starting rate (optional)")}</li>}
            {(f.languages || show) && <li>{P("languages", !!f.languages.trim(), <Fact icon="world_map">Speaks {f.languages}</Fact>, "Languages you speak (optional)")}</li>}
            {!editing && <li><Fact icon="house">{modeLabel[f.mode]}{f.travel && ` · ${f.travel}`}</Fact></li>}
            {!editing && f.transport && <li><Fact icon="automobile">{f.transport}</Fact></li>}
            {!editing && !unseen && f.insurance === "yes" && <li><Fact icon="shield">{insuranceLabel[f.insurance]}</Fact></li>}
            {!editing && f.tools && <li className="sm:col-span-2"><Fact icon="toolbox">{f.tools}</Fact></li>}
          </ul>
          {editing && <div className="mt-5">{P("details", !!(f.tools.trim() || f.transport.trim()), (
            <ul className="grid gap-x-10 gap-y-5 sm:grid-cols-2">
              <li><Fact icon="house">{modeLabel[f.mode]}</Fact></li>
              {f.tools && <li><Fact icon="toolbox">{f.tools}</Fact></li>}
              {f.transport && <li><Fact icon="automobile">{f.transport}</Fact></li>}
              <li><Fact icon="shield">{insuranceLabel[f.insurance]}</Fact></li>
            </ul>
          ), "Tools, transport, insurance and how you work (optional)", "block")}</div>}
          <div className="mt-8">{P("about", !!f.about.trim(), <p className="max-w-2xl text-body-lg whitespace-pre-line text-ink">{f.about}</p>, "A few lines in your own words: your experience, the help you offer and what it's like to work with you.", "block")}</div>

          <Section title={`What ${first} offers`}>
            {P("services", services.length > 0 || !!f.other.trim(), (
              <div className="grid gap-6">
                <ul className="grid gap-x-10 gap-y-5 sm:grid-cols-2">
                  {(helps.length ? helps : services).map((s) => (
                    <li key={s} className="flex items-center gap-4">
                      <Icon3D name={craftIcon(s, services[0])} className="size-9" />
                      <span className="grid"><span className="text-body-lg text-ink">{s}</span>{rate && !helps.length && <span className="text-body-sm text-ink-muted">From {rate}</span>}</span>
                    </li>
                  ))}
                </ul>
                {editing && f.other.trim() && <p className="text-body-sm text-ink-muted">Something else, in private review: {f.other}</p>}
              </div>
            ), "The services you'd offer clients between gigs", "block")}
          </Section>

          {portfolio.length > 0 && (
            <Section title="Work" meta={`${portfolio.length} photos`}>
              <ul className="grid h-72 grid-cols-2 grid-rows-2 gap-2 overflow-hidden rounded-lg sm:h-96 md:grid-cols-4">
                {portfolio.slice(0, 5).map((it, i) => (
                  <li key={it.src} className={cx(i === 0 ? "col-span-2 row-span-2" : "max-md:hidden", portfolio.length === 4 && i === 3 && "md:col-span-2")}>
                    <button type="button" onClick={() => setLightbox(i)} aria-label={`Open image: ${it.caption}`} className="group relative block size-full overflow-hidden">
                      <img src={asset(it.src)} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition duration-base group-hover:brightness-90" />
                    </button>
                  </li>
                ))}
              </ul>
              <Button variant="secondary" size="sm" className="mt-4" onClick={() => setLightbox(0)}>Show all {portfolio.length} photos</Button>
              {sample && <p className="mt-3 text-body-sm text-ink-muted">Concept images showing the kind of work to discuss, not completed client projects.</p>}
            </Section>
          )}

          <Section title="On set">
            <div className="grid gap-6">
              {P("skills", f.skills.length > 0, (
                <ul className="flex flex-wrap gap-2">{f.skills.map((s) => <li key={s} className="flex items-center gap-2 rounded-full border border-line-strong py-1.5 pr-4 pl-2 text-label-md text-ink"><Icon3D name={craftIcon(s)} className="size-6" />{s}</li>)}</ul>
              ), "Your on-set skills", "block")}
              {P("credits", credits.length > 0, (
                <ol className="grid gap-5">
                  {credits.map((c) => { const { title, role } = splitCredit(c); return (
                    <li key={c} className="flex items-center gap-4">
                      <Icon3D name="clapper_board" className="size-9" />
                      <span className="grid"><span className="text-body-lg font-semibold text-ink">{title}</span>{role && <span className="text-body-md text-ink-muted">{role}</span>}</span>
                    </li>
                  ); })}
                </ol>
              ), "Your notable credits, best first", "block")}
              {mode !== "public" && P("imdb", !!f.imdb, (
                <p className="text-body-sm text-ink-muted"><a className="inline-flex min-h-11 items-center text-link underline underline-offset-2" href={f.imdb} target="_blank" rel="noreferrer">IMDb page<span className="sr-only"> (opens in a new tab)</span></a> · only the Between Gigs team sees this</p>
              ), "Your IMDb link (optional, only the team sees it)")}
            </div>
          </Section>

          {!editing && (
            <Section title="Questions">
              <Accordion variant="flush" items={faqs(first).map((x, i) => ({ id: `${person.id}-faq-${i}`, title: x.q, content: x.a }))} />
            </Section>
          )}
          {mode !== "public" && !aside && <div className="mt-10 grid gap-6 lg:hidden">{booking}{checked}</div>}
          {mode === "public" && !aside && <div className="mt-10 lg:hidden">{checked}</div>}
          {sample && !editing && <p className="mt-10 text-body-sm text-ink-subtle">This is a fictional sample profile: the person, biography and credits are made up for the preview.</p>}
        </div>
      </div>

      {similar.length > 0 && (
        <section aria-labelledby="similar-h" className="mt-16 border-t border-line pt-10">
          <h2 id="similar-h" className="font-display text-heading-lg text-ink">More Gigsters like {first}</h2>
          <ul className="mt-6 grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
            {similar.map(({ person: o, profile }) => (
              <li key={o.id}>
                <Link href={`/p/${o.slug}/`} className="group block">
                  <div className="aspect-square overflow-hidden rounded-lg"><PersonPhoto id={o.id} name={o.name} src={profile.fields.photo || undefined} alt="" className="size-full transition-transform duration-slow group-hover:scale-105" /></div>
                  <p className="mt-3 truncate text-label-md text-ink">{o.name}</p>
                  <p className="text-body-sm text-ink-muted">{profile.fields.position || profile.fields.services[0]}</p>
                  {profile.fields.rate && <p className="mt-1 text-body-sm text-ink"><b>${profile.fields.rate}</b> / {basisShort[profile.fields.basis]}</p>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Phones and tablets: the booking card becomes a bar that stays in reach. */}
      {mode === "public" && !aside && (
        <div className="fixed inset-x-0 bottom-0 z-sticky border-t border-line bg-bg px-6 py-4 lg:hidden">
          <div className="mx-auto flex max-w-xl items-center justify-between gap-4">
            <p className="grid">
              <span className="text-body-md text-ink">{rate ? <><b>${f.rate}</b> / {basisShort[f.basis]}</> : <b>Rate on request</b>}</span>
              <span className="text-body-sm text-ink-muted">{monthStatusLabel[f.monthStatus]}</span>
            </p>
            <Button variant="primary" size="lg" onClick={() => setRequest(true)}>Request {first}</Button>
          </div>
        </div>
      )}
      {mode === "public" && !aside && <div aria-hidden="true" className="h-24 lg:hidden" />}

      <Lightbox name={f.name} items={portfolio} index={lightbox} onIndex={setLightbox} />
      <RequestModal first={first} open={request} onClose={() => setRequest(false)} />
    </div>
  );
}

/** One fact about the Gigster, Airbnb style: a 3D icon and a line. */
function Fact({ icon, children }: { icon: Icon3DName; children: React.ReactNode }) {
  return <span className="flex items-center gap-4 text-body-lg text-ink"><Icon3D name={icon} className="size-9 shrink-0" /><span className="min-w-0">{children}</span></span>;
}

/** Where a part of a draft will go, in the preview. */
function Placeholder({ children, block = false }: { children: React.ReactNode; block?: boolean }) {
  return block
    ? <p className="rounded-lg bg-surface-sunken p-5 text-body-md text-ink-subtle">{children}</p>
    : <span className="text-body-md text-ink-subtle">{children}</span>;
}

function Section({ title, meta, children }: { title: string; meta?: string; children: React.ReactNode }) {
  const id = React.useId();
  return (
    <section aria-labelledby={id} className="mt-10 border-t border-line pt-10">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id={id} className="font-display text-heading-lg text-ink">{title}</h2>
        {meta && <span className="text-body-sm text-ink-muted">{meta}</span>}
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
          <img key={it.src} src={asset(it.src)} alt={it.caption} className="aspect-video w-full rounded-lg object-cover" />
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
