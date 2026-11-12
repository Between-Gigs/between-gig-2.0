"use client";
import { Accordion, Button, Field, Input, Modal, Select, Textarea, cx, useToast } from "@ds/components";
import { ArrowRight, Check, ChevronLeft, ChevronRight, CircleDashed, Heart, Info, MapPin, MessageSquare, Share } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { data, type Person, type Profile, type ProfileFields } from "@/lib/data";
import { basisShort, insuranceLabel, modeLabel, monthStatusLabel } from "@/lib/data/taxonomy";
import { locationLabel } from "@/lib/profile/location";
import { absoluteUrl, asset } from "@/lib/site";
import { PersonPhoto } from "@/components/people/PersonPhoto";
import { hasRate, pinnedCredits } from "@/lib/profile/validate";
import { useLook } from "@/components/site/LookSync";
import type { ProfileSectionId } from "@/lib/profile/template";
import { useProfileTemplate } from "@/lib/profile/use-profile-template";
import { PublicBookingDetails } from "./PublicBookingDetails";
import { ModernProfile } from "./ModernProfile";
import { WarmProfile } from "./WarmProfile";
import { craftHref } from "@/lib/profile/browse";

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
  /** The profile name is a secondary heading when this view sits inside another page. */
  embedded?: boolean;
  similar?: { person: Person; profile: Profile }[];
  /** A draft being previewed: empty parts show where they'll go instead of disappearing. */
  draft?: boolean;
  /** Editing in place: every part is handed to this, filled or not, to wrap with its edit controls. */
  part?: PartRenderer;
  /** Replaces the booking card in the column beside the story (the editor puts its panel there). */
  aside?: React.ReactNode;
}

const faqs = (first: string) => [
  { q: "How do I get started?", a: `Send a request with what you need, where and roughly when. ${first} replies to agree the scope, timing and final rate before anything starts.` },
  { q: "What does the rate cover?", a: "The rate is a starting point for time on your project. Materials, travel and the final scope are agreed together before you book." },
  { q: "Where can we work together?", a: "In your home or space across the Los Angeles area. Travel and work mode are agreed for each project." },
];

/** "Production · Role" → the title and the role, as a film credit reads. */
const splitCredit = (c: string) => { const [title, ...rest] = c.split("·").map((s) => s.trim()); return { title, role: rest.join(" · ") }; };

/** Shared UI state, privacy rules, and content for all profile layouts and preview roles. */
export type ProfileLayoutProps = Props & ReturnType<typeof profileContent> & {
  sections: readonly ProfileSectionId[];
  saved: boolean;
  onSave: () => void;
  onShare: () => void;
  onPhoto: (index: number) => void;
  onRequest: () => void;
  ids: string;
};

function profileContent({ person, fields: f, extras, mode, draft = false, part }: Props) {
  const first = f.name.trim().split(/\s+/)[0] || "this Gigster";
  const services = f.services, credits = pinnedCredits(f);
  const editing = !!part, show = draft || editing;
  const priced = hasRate(f.rate);
  const P = (id: ProfilePart, filled: boolean, content: React.ReactNode, hint: string, kind: PartKind = "line") =>
    part ? <React.Fragment key={id}>{part(id, { content, hint, kind })}</React.Fragment>
      : filled ? content : draft ? <Placeholder key={id} kind={kind}>{hint}</Placeholder> : null;
  return {
    first, callName: shortName(first), services, credits, editing, show, priced, P,
    pageLabel: person.status === "approved" ? "Live" : "Your page · private",
    reviewed: !editing && (mode === "public" || person.status === "approved"),
    unseen: mode === "public" && data.kind === "live",
    sample: !!person.sample, helps: extras?.helps ?? [], portfolio: extras?.portfolio ?? [],
    rate: priced ? `$${f.rate}/${basisShort[f.basis]}` : null,
    where: f.market === "la" ? (f.areas.length ? locationLabel(f) : "") : locationLabel(f),
    creditRows: credits.map(splitCredit),
    questions: faqs(first).map((item, i) => ({ id: `${person.id}-faq-${i}`, title: item.q, content: item.a })),
  };
}

export function ProfileView(props: Props) {
  const { person, fields, mode, part } = props;
  const model = profileContent(props);
  const look = useLook();
  const { sections } = useProfileTemplate();
  const ids = React.useId();
  const toast = useToast();
  const [lightbox, setLightbox] = React.useState<number | null>(null);
  const [request, setRequest] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const share = async () => {
    const url = absoluteUrl(`/p/${person.slug}/`);
    try {
      if (typeof navigator.share === "function") await navigator.share({ title: `${fields.name} · Between Gigs`, url });
      else { await navigator.clipboard.writeText(url); toast({ message: "Link copied", tone: "success" }); }
    } catch { /* closed the share sheet */ }
  };
  const Layout = look === "modern" ? ModernProfile : look === "swiss" ? SwissProfile : WarmProfile;
  const craft = fields.position || model.services[0];
  return (
    <div className="relative">
      {mode === "public" && !part && (
        <nav aria-label="Breadcrumb" className="mb-3 lg:mb-7">
          <ol className="flex flex-wrap items-center gap-x-2 font-display text-label-md text-ink-muted">
            <li><Link href="/p/" className="inline-flex min-h-11 items-center underline-offset-4 hover:text-ink hover:underline">Gigsters</Link></li>
            {craft && <><li aria-hidden="true">/</li><li><Link href={craftHref(fields.position, fields.skills)} className="inline-flex min-h-11 items-center underline-offset-4 hover:text-ink hover:underline">{craft}</Link></li></>}
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="min-w-0 break-words text-ink">{fields.name}</li>
          </ol>
        </nav>
      )}

      <Layout {...props} {...model} sections={sections} ids={ids} saved={saved} onSave={() => setSaved(!saved)}
        onShare={share} onPhoto={setLightbox} onRequest={() => setRequest(true)} />
      <Lightbox name={fields.name} items={model.portfolio} index={lightbox} onIndex={setLightbox} />
      <RequestModal first={model.callName} open={request} onClose={() => setRequest(false)} />
    </div>
  );
}

function SwissProfile({ person, fields: f, mode, embedded, similar = [], draft = false, part, aside, first, callName, pageLabel,
  services, helps, portfolio, sample, editing, show, priced, rate, where, credits, unseen, reviewed, P, creditRows,
  questions, sections, saved, onSave, onShare, onPhoto, onRequest, ids }: ProfileLayoutProps) {
  const Name = embedded || mode === "owner" ? "h2" : "h1";
  const craft = f.position || services[0] || "";
  // How they work (mode and travel, transport, insurance when shared) and what they bring, as the facts table reads.
  const works = [
    `${modeLabel[f.mode]}${f.travel ? ` · ${f.travel}` : ""}`,
    f.transport,
    !unseen && f.insurance === "yes" ? insuranceLabel[f.insurance] : "",
  ].filter(Boolean).join(" · ");
  const brings = f.tools.trim();
  // "Weekday mornings; exact project dates to confirm" → the headline and the small print.
  const [datesHead, ...datesRest] = f.dates.split(";").map((s) => s.trim());
  const datesNote = datesRest.join("; ");

  // Only the numbers that say something: a zero reads as a weakness, so it's left out. The editor keeps all four cells
  // (years to fill in place, the rest a quiet dash until their parts are in), so the row keeps its shape as it fills.
  const offered = helps.length || services.length;
  const stats: [string, string, boolean][] = ([
    [f.years || "", f.years === "1" ? "Year in the business" : "Years in the business", !!f.years || editing],
    [offered ? String(offered) : "", offered === 1 ? "Service" : "Services", offered > 0 || editing],
    [credits.length ? String(credits.length) : "", credits.length === 1 ? "Credit" : "Credits", credits.length > 0 || editing],
    [priced ? `$${f.rate}` : "", `${basisLong[f.basis]}, from`, priced || editing],
  ] as [string, string, boolean][]).filter(([, , keep]) => keep);

  const tick = <span aria-hidden="true" className="grid size-6 shrink-0 place-items-center bg-ink-brand text-bg"><Check className="size-3.5" strokeWidth={3.5} /></span>;

  const actions = mode === "public" && !editing && (
    <div className="grid grid-cols-2 gap-3">
      <Button variant="secondary" size="lg" iconStart={<Share />} onClick={onShare}>Share</Button>
      <Button variant="secondary" size="lg" iconStart={<Heart className={cx(saved && "fill-current text-danger")} />} aria-pressed={saved} onClick={onSave}>{saved ? "Saved" : "Save"}</Button>
    </div>
  );

  const facts = [
    (f.languages || show) && <Row key="speaks" term="Speaks">{P("languages", !!f.languages.trim(), <span>{f.languages}</span>, "Languages")}</Row>,
    works && <Row key="works" term="Works">{works}</Row>,
    brings && <Row key="brings" term="Brings">{brings}</Row>,
  ].filter(Boolean);

  const identity = (
    // Phones: the square portrait in 9 columns with the craft up its side, the name under it. Tablets and desktop: the
    // square portrait (5 columns, 4 on desktop) beside the name, the availability and facts across the full width under both.
    <section aria-label={`About ${first}`} className="grid grid-cols-12 gap-x-3 sm:gap-x-6">
      <div className="relative col-span-9 md:col-span-5 lg:col-span-4">
        {P("photo", !!f.photo || !show, (
          <PersonPhoto id={person.id} morph={!editing} name={f.name} src={f.photo || undefined} fallback="brand" department={f.position} skills={f.skills}
            alt={f.photo ? `Portrait of ${f.name}${sample ? " (fictional)" : ""}` : undefined}
            className="aspect-square w-full rounded-xl object-cover" textClass="text-display-md" />
        ), "Add photo", "photo")}
      </div>
      {/* Phones: the craft runs up the side of the portrait, with the reviewed mark at its foot. */}
      <div aria-hidden="true" className="relative col-span-3 flex flex-col items-start justify-start md:hidden">
        {reviewed && <span className="grid size-11 place-items-center bg-ink-brand text-bg"><Check className="size-5" strokeWidth={3} /></span>}
        {/* Up the side of the portrait, it can't wrap: a long department is cut to the portrait's height (it's in full under the name). */}
        {craft && <span className="absolute bottom-0 left-0 origin-bottom-left translate-x-4 -rotate-90 text-eyebrow whitespace-nowrap text-ink uppercase">{craft.length > SIDE_MAX ? `${craft.slice(0, SIDE_MAX - 1).trimEnd()}…` : craft}</span>}
      </div>

      <div className="col-span-12 mt-6 min-w-0 md:col-span-7 md:mt-0 lg:col-span-8">
        <p className="flex flex-wrap gap-x-5 gap-y-1 text-eyebrow uppercase max-md:hidden">
          <span className="text-ink">Gigster</span>{craft && <span className="min-w-0 break-words text-ink-muted">{craft}</span>}
          {editing && <span className="text-ink-brand">{pageLabel}</span>}
        </p>
        {editing && <p className="text-eyebrow text-ink-brand uppercase md:hidden">{pageLabel}</p>}
        <div className="mt-2 md:mt-4 lg:mt-5">
          {P("name", !!f.name.trim(), (
            <Name className={cx("font-display break-words text-ink", longestWord(f.name) > 16 ? "text-display-sm md:text-display-sm lg:text-display-md xl:text-display-lg"
              : longestWord(f.name) > 10 ? "text-display-sm sm:text-display-md md:text-display-sm lg:text-display-md xl:text-display-lg"
              : "text-display-md sm:text-display-lg md:text-display-md lg:text-display-lg xl:text-display-xl")}>
              {f.name.trim().includes(" ") ? <><Breakable text={f.name.trim().split(" ")[0]} /> <span className="block"><Breakable text={f.name.trim().split(" ").slice(1).join(" ")} /></span></> : <Breakable text={f.name} />}
            </Name>
          ), "Your name", "title")}
        </div>
        <div className="mt-4 md:mt-5 lg:mt-7">
          {P("position", !!f.position, (
            <p className="max-w-3xl font-display text-editorial-md font-medium text-pretty break-words text-ink lg:text-editorial-lg">{f.position}{where ? `. Works in ${where}.` : ""}</p>
          ), "Department")}
        </div>
        {reviewed && <p className="mt-3 flex items-center gap-2.5 font-display text-label-md text-ink-brand md:mt-5 md:text-ink">{tick}Reviewed by Between Gigs</p>}
      </div>

      <div className="col-span-12 mt-5 min-w-0 md:mt-10">
        <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
          <div>{P("availability", !!f.dates.trim() || !show, (
            <div className="h-full min-w-0 bg-surface-brand p-5 text-ink-on-brand">
              {/* With no dates the heading is the status itself, so the eyebrow doesn't repeat it. */}
              <p className="text-eyebrow text-mint-300 uppercase">{datesHead ? monthStatusLabel[f.monthStatus] : "This month"}</p>
              <p className="mt-2 font-display text-heading-md break-words text-ink-on-brand">{datesHead || monthStatusLabel[f.monthStatus]}</p>
              {datesNote && <p className="mt-1 text-body-md break-words text-forest-100 first-letter:uppercase">{datesNote}</p>}
            </div>
          ), "When you're free this month", "block")}</div>
          {facts.length > 0 && <dl className="self-end border-b border-line text-body-md">{facts}</dl>}
        </div>
        {actions && <div className="mt-5 lg:hidden">{actions}</div>}
      </div>
    </section>
  );

  const statRow = stats.length > 0 && (
    <dl className="mt-12 grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-6 md:grid-cols-4 lg:mt-14">
      {stats.map(([v, k]) => (
        <div key={k} className="@container grid min-w-0 content-start gap-3 border-t-4 border-line-strong pt-3">
          <dt className="order-2 font-display text-label-md text-ink">{k.toLowerCase()}</dt>
          <dd className={cx("order-1 flex min-h-lh items-center font-display text-ink tabular-nums",
            // Set by the cell's own width (the owner view's columns are narrower than the public page's) and the length.
            v.length >= 4 ? "text-display-sm @3xs:text-stat" : "text-display-md @3xs:text-stat")}>
            {/* Empty, the Add sits in a small-type box so the stat font's line box doesn't push its label down. */}
            {k.startsWith("Year") && part ? (v ? part("years", { content: <span>{v}</span>, hint: "Add", kind: "line" })
              : <span className="flex text-body-md">{part("years", { content: <span>{v}</span>, hint: "Add", kind: "line" })}</span>)
              : v || <><span aria-hidden="true" className="text-ink-subtle">–</span><span className="sr-only">None yet</span></>}
          </dd>
        </div>
      ))}
    </dl>
  );

  const booking = (
    <section aria-label={`Book ${first}`} className="@container grid gap-5 rounded-xl bg-tint-mint p-5 text-forest-950">
      {priced
        // The unit wraps under the number when the column is narrow ("/ project" beside "$500" in the 3-column aside).
        // The number sets by the block's own width (a container query) and its length, so it never leaves the block:
        // the owner view's aside is under 150px wide at 1024.
        ? <p className="grid min-w-0 gap-1"><span className="text-eyebrow uppercase">Starting rate</span><span className="flex min-w-0 flex-wrap items-baseline gap-x-1.5">
            <span className={cx("font-display tabular-nums", f.rate.length >= 4 ? "text-heading-md @3xs:text-display-sm" : f.rate.length === 3 ? "text-heading-lg @3xs:text-display-md" : "text-display-sm @3xs:text-stat")}>${f.rate}</span>
            <span className="font-display text-heading-md whitespace-nowrap">/ {basisShort[f.basis]}</span>
          </span></p>
        : <p className="font-display text-heading-lg">Rate on request</p>}
      <Button variant="primary" size="lg" fullWidth disabled={mode !== "public"} aria-describedby={`${person.id}-request-note`} onClick={onRequest}
        iconEnd={<ArrowRight />} className={onMint}>
        <span className="min-w-0 text-left whitespace-normal">Request {callName}</span>
      </Button>
      <p id={`${person.id}-request-note`} className="text-body-sm">
        {mode === "public" ? "You won't be charged. Scope and rate are agreed first." : mode === "own" ? "Clients see this card on your profile." : "Owner view: requests are off here."}
      </p>
    </section>
  );

  const checkedList = (
    <ul className="grid text-body-md text-ink">
      {/* Only an approved profile has been reviewed; before that (owner view, the Gigster's preview) it says what will happen. */}
      {mode === "public" || person.status === "approved"
        ? <li className="flex items-start gap-3 border-t border-line py-3 first:border-t-0 first:pt-0"><Check className="mt-0.5 size-4 shrink-0" strokeWidth={3} aria-hidden="true" /><span><b>Profile reviewed</b> by the Between Gigs team</span></li>
        : <li className="flex items-start gap-3 border-t border-line py-3 first:border-t-0 first:pt-0"><CircleDashed className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><span><b>Reviewed by the Between Gigs team</b> before it goes public</span></li>}
      <li className="flex items-start gap-3 border-t border-line py-3"><Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><span className="min-w-0 break-words">Credits and details are shared by {first}, not independently verified</span></li>
    </ul>
  );
  const checked = (
    <section aria-labelledby={`${person.id}-checked`} className="border-t-4 border-line-strong pt-3">
      <h2 id={`${person.id}-checked`} className="mb-3 font-display text-heading-md text-ink">What we&apos;ve checked</h2>
      {checkedList}
    </section>
  );

  const shownPhotos = portfolio.slice(0, 4);
  const tile = ["col-span-6 aspect-4/3 sm:col-span-4 sm:row-span-2 sm:aspect-auto", "col-span-3 aspect-6/5 sm:col-span-2", "col-span-3 aspect-6/5 sm:col-span-2", "col-span-6 aspect-5/2"];

  const body: Record<ProfileSectionId, false | { title: string; meta?: string; content: React.ReactNode }> = {
    about: (show || !!f.about.trim()) && {
      title: "About",
      content: (
        P("about", !!f.about.trim(), <p className="max-w-2xl font-display text-editorial-md font-medium whitespace-pre-line text-ink lg:text-editorial-lg">{f.about}</p>, "A few lines in your own words: your experience, the help you offer and what it's like to work with you.", "block")
      ),
    },
    services: (show || helps.length > 0 || services.length > 0 || !!f.hireableJobs?.trim()) && {
      title: "Services",
      content: (
        P("services", services.length > 0 || !!f.other.trim() || !!f.hireableJobs?.trim(), (
          <div className="grid gap-4">
            {data.kind === "sample" && f.hireableJobs?.trim() && <p className="max-w-2xl break-words text-body-lg text-ink">{f.hireableJobs}</p>}
            <ol className="grid sm:grid-cols-2 sm:gap-x-6">
              {(helps.length ? helps : services).map((s, i) => (
                <li key={s} className="flex items-baseline gap-4 border-t border-line py-3 first:border-t-0 first:pt-0 sm:border-t-2 sm:border-line-strong sm:pb-5 sm:nth-2:border-t-0 sm:nth-2:pt-0">
                  <span aria-hidden="true" className="w-6 shrink-0 text-label-sm text-ink-muted tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                  <span className="grid"><span className="font-display text-editorial-lg font-bold tracking-tight text-ink">{s}</span>{rate && !helps.length && <span className="text-body-sm text-ink-muted">From {rate}</span>}</span>
                </li>
              ))}
            </ol>
            {editing && f.other.trim() && <p className="text-body-sm text-ink-muted">Something else, in private review: {f.other}</p>}
          </div>
        ), "The services you'd offer clients between gigs", "block")
      ),
    },
    work: portfolio.length > 0 && {
      title: "Work", meta: `${portfolio.length} photos`,
      content: (
        <>
          <ul className="grid grid-cols-6 gap-3 sm:gap-6">
            {shownPhotos.map((it, i) => (
              <li key={it.src} className={cx("relative", shownPhotos.length === 1 ? "col-span-6 aspect-video" : tile[i])}>
                <button type="button" onClick={() => onPhoto(i)} aria-label={`Open image: ${it.caption}`} className="group absolute inset-0 block overflow-hidden">
                  <img src={asset(it.src)} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition duration-base group-hover:scale-105 motion-reduce:transition-none" />
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
            <Button variant="secondary" size="md" onClick={() => onPhoto(0)}>Show all {portfolio.length} photos</Button>
            {sample && <p className="flex items-start gap-2.5 text-body-md text-ink-muted"><b className="font-display text-ink">Note</b>Concept images showing the kind of work to discuss, not completed client projects.</p>}
          </div>
        </>
      ),
    },
    credits: (show || f.skills.length > 0 || credits.length > 0 || (mode === "owner" && !!f.imdb)) && {
      title: "On set",
      content: (
        <div className="grid gap-6 sm:grid-cols-2">
          <div>{P("skills", f.skills.length > 0, (
            <div>
              <p className="text-eyebrow text-ink-muted uppercase">{f.skills.length === 1 ? "Skill" : "Skills"}</p>
              <ul className="mt-2 grid gap-1">{f.skills.map((s) => <li key={s} className="font-display text-editorial-lg font-bold tracking-tight text-ink">{s}</li>)}</ul>
            </div>
          ), "Your on-set skills", "block")}</div>
          <div>{P("credits", credits.length > 0, (
            <div>
              <p className="text-eyebrow text-ink-muted uppercase">{credits.length === 1 ? "Credit" : "Credits"}</p>
              <ol className="mt-2 grid gap-3">
                {creditRows.map(({ title, role }, i) => { return (
                  <li key={credits[i]} className="grid gap-0.5"><span className="font-display text-editorial-lg font-bold tracking-tight text-ink">{title}</span>{role && <span className="text-body-md text-ink-muted">{role}</span>}</li>
                ); })}
              </ol>
            </div>
          ), "Your notable credits, best first", "block")}</div>
          {(mode === "owner" || editing || draft) && <div className="sm:col-span-2">{P("imdb", !!f.imdb, (
            <p className="text-body-sm text-ink-muted"><a className="inline-flex min-h-11 items-center text-link underline underline-offset-2" href={f.imdb} target="_blank" rel="noreferrer">IMDb page<span className="sr-only"> (opens in a new tab)</span></a> · only the Between Gigs team sees this</p>
          ), "Your IMDb link. Only the team sees it.", "block")}</div>}
        </div>
      ),
    },
    details: {
      title: "Details",
      content: (
        <>
          <dl className="text-body-md">
            {(where || show) && <Row term="Works in" wide>{P("where", !!where, <span>{where}</span>, "Where you work", "block")}</Row>}
            {!editing && <Row term="Availability" wide>{monthStatusLabel[f.monthStatus]}{f.dates && <span className="text-ink-muted"> · {f.dates}</span>}</Row>}
            {(rate || show) && <Row term="Rate" wide>{P("rate", !!rate, <span>From {rate}</span>, "Your starting rate", "block")}</Row>}
            {!editing && f.languages && <Row term="Languages" wide>{f.languages}</Row>}
            {!editing && works && <Row term={`How ${first} works`} wide>{works}</Row>}
            {!editing && brings && <Row term="Brings" wide>{brings}</Row>}
            {editing && <Row term="How you work" wide>{P("details", !!(f.tools.trim() || f.transport.trim()), (
              <span>{[modeLabel[f.mode], f.transport, f.tools, insuranceLabel[f.insurance]].filter(Boolean).join(" · ")}</span>
            ), "Tools, transport, insurance and how you work", "block")}</Row>}
          </dl>
          {data.kind === "sample" && <PublicBookingDetails earliestStart={f.earliestStart} bookingMinimum={f.bookingMinimum} personality={f.personality} />}
        </>
      ),
    },
    questions: !editing && {
      title: "Questions",
      content: (
        <Accordion variant="flush" items={questions} />
      ),
    },
  };
  const visible = sections.flatMap((id) => body[id] ? [{ id, ...body[id] }] : []);
  const hasMobileChecks = mode === "public" && !aside;

  return (
    <div className="relative">
      {identity}
      {statRow}

      <div className="mt-14 grid grid-cols-12 items-start gap-x-6 gap-y-14 lg:mt-20">
        <div className="col-span-12 grid min-w-0 gap-14 lg:col-span-9 lg:gap-16">
          {visible.map(({ id, title, meta, content }, i) => (
            <Section key={id} sectionId={id} n={pad(i + 1)} title={title} meta={meta}>{content}</Section>
          ))}
          {hasMobileChecks && <div className="lg:hidden"><Section n={pad(visible.length + 1)} title="What we've checked">{checkedList}</Section></div>}
          {mode !== "public" && !aside && <div className="grid gap-8 lg:hidden">{booking}{checked}</div>}
          {sample && !editing && <p className="text-body-sm text-ink-subtle">This is a fictional sample profile: the person, biography and credits are made up for the preview.</p>}
        </div>

        <aside aria-label={aside ? "Editor" : `${first} at a glance`} className={cx("col-span-12 lg:col-span-3", !aside && "max-lg:hidden")}>
          <div className="grid gap-7 lg:sticky lg:top-28 embedded:lg:top-6">
            {aside ?? <>{booking}{checked}{actions}</>}
          </div>
        </aside>
      </div>

      {similar.length > 0 && (
        <section aria-labelledby={`${ids}-similar`} className="mt-20 grid grid-cols-12 gap-x-6 gap-y-4 lg:mt-28">
          <div className="col-span-12 border-t-4 border-line-strong pt-3 lg:col-span-3">
            <p aria-hidden="true" className="text-label-sm text-ink tabular-nums"><span className="lg:hidden">{pad(visible.length + (hasMobileChecks ? 2 : 1))}</span><span className="max-lg:hidden">{pad(visible.length + 1)}</span></p>
            <h2 id={`${ids}-similar`} className="mt-1 font-display text-heading-lg text-balance break-words text-ink lg:text-display-sm">More Gigsters like {first}</h2>
            <Link href="/p/" className="mt-2 inline-flex min-h-11 items-center gap-2 font-display text-label-md font-bold text-ink underline underline-offset-4 hover:no-underline lg:mt-4">
              Browse all Gigsters<ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
          <ul className="col-span-12 grid gap-x-6 lg:col-span-9 lg:grid-cols-3">
            {similar.slice(0, 3).map(({ person: o, profile }) => (
              <li key={o.id} className="border-t border-line py-3 first:border-t-0 lg:border-t-4 lg:border-line-strong lg:py-0 lg:pt-4 lg:first:border-t-4">
                <Link href={`/p/${o.slug}/`} className="group flex items-center gap-4 lg:block">
                  <div className="size-18 shrink-0 overflow-hidden lg:aspect-square lg:size-auto lg:w-full"><PersonPhoto id={o.id} name={o.name} src={profile.fields.photo || undefined} alt="" className="size-full transition-transform duration-slow group-hover:scale-105 motion-reduce:transition-none" /></div>
                  <span className="flex min-w-0 flex-1 items-end justify-between gap-3 lg:mt-4">
                    <span className="grid min-w-0 gap-1">
                      <span className="truncate font-display text-editorial-lg font-bold tracking-tight text-ink group-hover:underline lg:text-heading-md">{o.name}</span>
                      <span className="truncate text-body-md text-ink-muted">{profile.fields.position || profile.fields.services[0]}</span>
                    </span>
                    {hasRate(profile.fields.rate) && <span className="shrink-0 text-right font-display text-heading-md text-ink tabular-nums lg:text-heading-lg">${profile.fields.rate}<span className="block text-label-sm text-ink-muted">/ {basisShort[profile.fields.basis]}</span></span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Phones and tablets: the booking block becomes a bar that stays in reach. */}
      {mode === "public" && !aside && (
        <div className="fixed inset-x-0 bottom-0 z-sticky border-t-4 border-forest-950 bg-tint-mint px-4 py-3 text-forest-950 sm:px-6 lg:hidden">
          <div className="flex items-center justify-between gap-4">
            <p className="grid shrink-0">
              {rate ? <><b className={cx("font-display tabular-nums", f.rate.length >= 4 ? "text-heading-md" : "text-heading-lg")}>${f.rate}</b><span className="text-label-sm whitespace-nowrap">/ {basisShort[f.basis]} · from</span></> : <b className="font-display text-heading-md">Rate on request</b>}
            </p>
            <Button variant="primary" size="lg" iconEnd={<ArrowRight />} className={cx(onMint, "min-w-0 flex-1 sm:w-80 sm:flex-none")} onClick={onRequest}><span className="min-w-0 truncate">Request {callName}</span></Button>
          </div>
        </div>
      )}
      {mode === "public" && !aside && <div aria-hidden="true" className="h-24 lg:hidden" />}

    </div>
  );
}

/** The main action on the mint block: near-black in both themes (the theme's own primary is mint in the dark). */
const onMint = "justify-between! enabled:bg-forest-950! enabled:text-white! enabled:hover:bg-forest-800!";

const pad = (i: number) => String(i).padStart(2, "0");

/** The department up the portrait's side on phones: what fits its height. */
const SIDE_MAX = 26;
const longestWord = (s: string) => Math.max(0, ...s.trim().split(/\s+/).map((w) => w.length));
/** "Bartholomew-Maximilian" → "Bartholomew"; a long single first name is cut with an ellipsis. */
const shortName = (first: string) => { const part = first.length > 14 ? first.split("-")[0] : first; return part.length > 16 ? `${part.slice(0, 15)}…` : part; };

/** A name that breaks after its hyphens before it breaks anywhere else. */
function Breakable({ text }: { text: string }) {
  const parts = text.split("-");
  return <>{parts.map((p, i) => <React.Fragment key={i}>{p}{i < parts.length - 1 && <>-<wbr /></>}</React.Fragment>)}</>;
}

/** "per hour, from": the rate's unit in words, under the big number. */
const basisLong = { hourly: "Per hour", project: "Per project", day: "Per day" } as const;

/** One row of a facts table: the term in bold on the left, the answer beside it. */
function Row({ term, wide = false, children }: { term: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={cx("grid grid-cols-3 gap-x-6", wide ? "border-b border-line py-3 first:pt-0" : "border-t border-line py-2.5")}>
      <dt className="font-display font-bold text-ink">{term}</dt>
      <dd className="col-span-2 min-w-0 break-words text-ink">{children}</dd>
    </div>
  );
}

/** Where a part of a draft will go, in the preview. */
function Placeholder({ children, kind }: { children: React.ReactNode; kind: PartKind }) {
  if (kind === "photo") return <span className="grid aspect-square w-full place-items-center border-2 border-dashed border-line-strong bg-surface-sunken text-body-md text-ink-subtle">{children}</span>;
  return kind === "block"
    ? <p className="border-2 border-dashed border-line p-5 text-body-md text-ink-subtle">{children}</p>
    : <span className="text-body-md text-ink-subtle">{children}</span>;
}

/** A numbered section: the number and title in the label column, the content beside it (stacked on phones). */
function Section({ n, title, meta, children, sectionId }: { sectionId?: ProfileSectionId; n: string; title: string; meta?: string; children: React.ReactNode }) {
  const id = React.useId();
  return (
    <section data-profile-section={sectionId} aria-labelledby={id} className="grid gap-x-6 gap-y-4 border-t-4 border-line-strong pt-3 lg:grid-cols-9 lg:pt-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 lg:col-span-3 lg:block">
        <span aria-hidden="true" className="text-label-sm text-ink tabular-nums">{n}</span>
        <h2 id={id} className="font-display text-heading-lg text-ink lg:mt-1">{title}</h2>
        {meta && <p className="text-body-sm text-ink-muted max-lg:ml-auto lg:mt-2">{meta}</p>}
      </div>
      <div className="min-w-0 lg:col-span-6">{children}</div>
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
          <img key={it.src} src={asset(it.src)} alt={it.caption} className="aspect-video w-full object-cover" />
          <div className="flex items-center justify-between">
            <Button variant="secondary" size="md" iconStart={<ChevronLeft />} onClick={() => onIndex(((index ?? 0) - 1 + n) % n)}>Previous</Button>
            <span className="text-label-sm text-ink-muted tabular-nums">{(index ?? 0) + 1} / {n}</span>
            <Button variant="secondary" size="md" iconEnd={<ChevronRight />} onClick={() => onIndex(((index ?? 0) + 1) % n)}>Next</Button>
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
        <p className="max-w-prose text-body-md text-pretty text-ink-muted">When requests open, {first} gets your note and replies to agree scope, timing and the final rate. Nothing was sent.</p>
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
