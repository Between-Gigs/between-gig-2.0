"use client";
import { PublicBookingDetails } from "./PublicBookingDetails";
import { data } from "@/lib/data";
import { Accordion, Button, cx } from "@ds/components";
import { ArrowRight, Check, Heart, Info, Share } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { PersonPhoto } from "@/components/people/PersonPhoto";
import { Icon3D } from "@/components/ui/Icon3D";
import { basisShort, insuranceLabel, modeLabel, monthStatusLabel } from "@/lib/data/taxonomy";
import { craftIcon, iconTint, type Icon3DName } from "@/lib/icons3d";
import { hasRate } from "@/lib/profile/validate";
import { asset } from "@/lib/site";
import type { ProfileLayoutProps } from "./ProfileView";

/** A small pill on the identity panel. */
function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cx("inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-label-sm text-ink shadow-xs", className)}>{children}</span>;
}

/** Original v4 presentation. All modes use the same data, edit spots, permissions and actions as the Swiss layout. */
export function WarmProfile({ person, fields: f, mode, embedded, similar = [], draft = false, part, aside, first, callName,
  pageLabel, services, helps, portfolio, sample, editing, show, priced, rate, where, credits, unseen, reviewed, P,
  creditRows, questions, sections, saved, onSave, onShare, onPhoto, onRequest, ids }: ProfileLayoutProps) {
  const Name = embedded || mode === "owner" ? "h2" : "h1";
  const craft = craftIcon(f.position || services[0] || f.skills[0] || "", services[0]);
  // Only the numbers that say something: a zero reads as a weakness, so it's left out (the editor shows years to fill).
  const offered = helps.length || services.length;
  const stats: [string, string, boolean][] = ([
    [f.years || "", f.years === "1" ? "Year in the business" : "Years in the business", !!f.years || editing],
    [String(offered), offered === 1 ? "Service" : "Services", offered > 0],
    [String(credits.length), credits.length === 1 ? "Credit" : "Credits", credits.length > 0],
  ] as [string, string, boolean][]).filter(([, , keep]) => keep);

  const identity = (
    <section data-call-sheet-stage="profile" aria-label={`About ${first}`} className="relative isolate overflow-hidden rounded-2xl bg-tint-mint-soft p-6 text-tint-ink sm:p-10">
      {/* A soft disc with the craft's object, top right, like a sticker on the panel. */}
      <span aria-hidden="true" className="absolute -top-20 -right-20 -z-10 grid size-80 place-items-center rounded-full bg-surface/40 max-lg:hidden">
        <Icon3D name={craft} className="mt-12 mr-12 size-24 -rotate-6" />
      </span>
      <div className="flex flex-col items-center gap-6 text-center md:flex-row md:items-center md:gap-10 md:text-left">
        <div className="relative size-44 shrink-0 sm:size-48">
          {P("photo", !!f.photo || !show, (
            <PersonPhoto id={person.id} morph={!editing} name={f.name} src={f.photo || undefined} fallback="brand" department={f.position} skills={f.skills} alt={f.photo ? `Portrait of ${f.name}${sample ? " (fictional)" : ""}` : undefined}
              className="size-full rounded-t-full rounded-b-2xl object-cover shadow-md ring-4 ring-surface md:rounded-2xl" textClass="text-display-md" />
          ), "Add photo", "photo")}
          {!editing && f.photo && (
            <span aria-hidden="true" className="absolute -right-2 -bottom-2 grid size-14 place-items-center rounded-full bg-surface shadow-md">
              <Icon3D name={craft} className="size-9" />
            </span>
          )}
        </div>
        <div className="grid min-w-0 flex-1 justify-items-center gap-4 md:justify-items-start lg:pr-44">
          {(reviewed || editing) && (
            <div className="flex flex-wrap justify-center gap-2 md:justify-start">
              {reviewed && <Pill><Check className="size-3.5 text-ink-brand" strokeWidth={3} aria-hidden="true" />Reviewed by Between Gigs</Pill>}
              {reviewed && f.monthStatus !== "away" && <Pill><span aria-hidden="true" className="size-2.5 rounded-full bg-success ring-4 ring-success-soft" />{monthStatusLabel[f.monthStatus]}</Pill>}
              {editing && <Pill>{pageLabel}</Pill>}
            </div>
          )}
          <div className="grid w-full justify-items-center gap-1.5 md:justify-items-start">
            {P("name", !!f.name.trim(), <Name className="font-display text-display-md text-balance wrap-anywhere text-tint-ink sm:text-display-lg">{f.name}</Name>, "Your name", "title")}
            {P("position", !!f.position, <p className="text-body-lg text-tint-ink">{f.position}</p>, "Department")}
          </div>
          {stats.length > 0 && (
            <dl className="grid w-full grid-cols-3 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:justify-center sm:gap-3 md:justify-start">
              {stats.map(([v, k]) => (
                <div key={k} className="grid content-start gap-0.5 rounded-lg bg-surface px-3 py-3 text-center shadow-xs sm:min-w-28 sm:px-4 sm:text-left">
                  <dt className="order-2 text-caption text-ink-muted">{k}</dt>
                  <dd className="order-1 font-display text-heading-lg text-ink tabular-nums">{k.startsWith("Year") && part ? part("years", { content: v ? <span>{v}</span> : null, hint: "Add", kind: "line" }) : v}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </section>
  );

  const booking = (
    <section aria-label={`Book ${first}`} className="grid gap-5 rounded-xl border border-line bg-surface p-6 shadow-md">
      <p className="grid gap-0.5">
        {priced
          ? <><span><span className="font-display text-display-sm text-ink">${f.rate}</span><span className="text-body-md font-semibold text-ink"> / {basisShort[f.basis]}</span></span><span className="text-body-sm text-ink-muted">starting rate</span></>
          : <span className="font-display text-heading-lg text-ink">Rate on request</span>}
      </p>
      <p className="flex items-start gap-3 rounded-lg bg-tint-mint-soft p-4 text-tint-ink">
        <span aria-hidden="true" className={cx("mt-1.5 size-2.5 shrink-0 rounded-full ring-4", f.monthStatus === "away" ? "bg-ink-subtle ring-surface" : "bg-success ring-success-soft")} />
        <span className="grid gap-0.5"><b className="text-label-md">{monthStatusLabel[f.monthStatus]}</b>{f.dates && <span className="text-body-sm">{f.dates}</span>}</span>
      </p>
      <Button variant="primary" size="lg" fullWidth disabled={mode !== "public"} aria-describedby={`${person.id}-request-note`} onClick={onRequest}>
        Request {callName}
      </Button>
      <p id={`${person.id}-request-note`} className="text-center text-body-sm text-ink-muted">
        {mode === "public" ? "You won't be charged. Scope and rate are agreed first." : mode === "own" ? "Clients see this card on your profile." : "Owner view: requests are off here."}
      </p>
    </section>
  );

  const checked = (
    <section aria-labelledby={`${person.id}-checked`} className="rounded-xl bg-tint-sage p-6 text-tint-ink">
      <h2 id={`${person.id}-checked`} className="flex items-center gap-2 font-display text-heading-md text-tint-ink"><Icon3D name="shield" className="size-7" />What we&apos;ve checked</h2>
      <ul className="mt-4 grid gap-3 text-body-sm text-tint-ink">
        <li className="flex items-start gap-3"><Icon3D name={reviewed ? "check_mark_button" : "memo"} className="size-6 shrink-0" /><span>{reviewed ? <><b>Profile reviewed</b> by the Between Gigs team</> : <><b>Reviewed by the Between Gigs team</b> before it goes public</>}</span></li>
        <li className="flex items-start gap-3"><span aria-hidden="true" className="grid size-6 shrink-0 place-items-center rounded-full bg-surface text-ink"><Info className="size-3.5" /></span><span>Credits and details are shared by {first}, not independently verified</span></li>
      </ul>
    </section>
  );

  // How they work: mode and travel, transport, tools and (when shared) insurance, in one line.
  const how = [
    `${modeLabel[f.mode]}${f.travel ? ` · ${f.travel}` : ""}`,
    f.transport,
    f.tools,
    !unseen && f.insurance === "yes" ? insuranceLabel[f.insurance] : "",
  ].filter(Boolean);

  const body = {
    about: (show || !!f.about.trim() || mode === "public") && (
      <>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <h2 className="flex items-center gap-3 font-display text-heading-lg text-ink"><Icon3D name="waving_hand" className="size-8" />About {first}</h2>
          {mode === "public" && !editing && (
            <div className="-mr-3 flex gap-1">
              <Button variant="ghost" size="sm" iconStart={<Share />} className="underline underline-offset-4" onClick={onShare}>Share</Button>
              <Button variant="ghost" size="sm" iconStart={<Heart className={cx(saved && "fill-current text-danger")} />} aria-pressed={saved} className="underline underline-offset-4" onClick={onSave}>{saved ? "Saved" : "Save"}</Button>
            </div>
          )}
        </div>
        <div className="mt-4">{P("about", !!f.about.trim(), <p className="max-w-2xl text-body-lg whitespace-pre-line text-ink">{f.about}</p>, "A few lines in your own words: your experience, the help you offer and what it's like to work with you.", "block")}</div>
      </>
    ),
    details: (
      <section aria-label="Details">
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {(where || show) && <li>{P("where", !!where, <Fact icon="round_pushpin" tint="bg-tint-peach" label="Works in">{where}</Fact>, "Where you work", "block")}</li>}
          <li>{P("availability", !!f.dates.trim() || !show, <Fact icon="spiral_calendar" tint="bg-tint-mint-soft" label={f.dates ? monthStatusLabel[f.monthStatus] : "This month"}>{f.dates || monthStatusLabel[f.monthStatus]}</Fact>, "When you're free this month", "block")}</li>
          {(rate || show) && <li>{P("rate", !!rate, <Fact icon="money_bag" tint="bg-tint-butter" label="Rate">From {rate}</Fact>, "Your starting rate", "block")}</li>}
          {(f.languages || show) && <li>{P("languages", !!f.languages.trim(), <Fact icon="world_map" tint="bg-tint-sky" label="Speaks">{f.languages}</Fact>, "Languages", "block")}</li>}
          {!editing && <li className="sm:col-span-2"><Fact icon="briefcase" tint="bg-tint-sage" label={`How ${first} works`}>{how.join(" · ")}</Fact></li>}
          {editing && <li className="sm:col-span-2">{P("details", !!(f.tools.trim() || f.transport.trim()), (
            <Fact icon="briefcase" tint="bg-tint-sage" label="How you work">{[modeLabel[f.mode], f.transport, f.tools, insuranceLabel[f.insurance]].filter(Boolean).join(" · ")}</Fact>
          ), "Tools, transport, insurance and how you work", "block")}</li>}
        </ul>
        {data.kind === "sample" && <PublicBookingDetails earliestStart={f.earliestStart} bookingMinimum={f.bookingMinimum} personality={f.personality} />}
      </section>
    ),
    services: (show || services.length > 0 || helps.length > 0 || !!f.hireableJobs?.trim()) && (
      <Section title={`What ${first} offers`} icon="sparkles" count={(helps.length || services.length) || undefined}>
        {P("services", services.length > 0 || !!f.other.trim() || !!f.hireableJobs?.trim(), (
          <div className="grid gap-4">
            {data.kind === "sample" && f.hireableJobs?.trim() && <p className="max-w-2xl break-words text-body-lg text-ink">{f.hireableJobs}</p>}
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {(helps.length ? helps : services).map((s, i) => (
                <li key={s} className="grid content-start gap-3 rounded-lg border border-line bg-surface p-4 shadow-xs">
                  <span aria-hidden="true" className={cx("grid size-11 place-items-center rounded-md", iconTint(i))}><Icon3D name={craftIcon(s, services[0])} className="size-7" /></span>
                  <span className="grid"><span className="text-label-md text-ink">{s}</span>{rate && !helps.length && <span className="text-body-sm text-ink-muted">From {rate}</span>}</span>
                </li>
              ))}
            </ul>
            {editing && f.other.trim() && <p className="text-body-sm text-ink-muted">Something else, in private review: {f.other}</p>}
          </div>
        ), "The services you'd offer clients between gigs", "block")}
      </Section>
    ),
    work: portfolio.length > 0 && (
      <Section title="Work" icon="framed_picture" meta={`${portfolio.length} photos`}>
        <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0">
          {portfolio.slice(0, 4).map((it, i) => (
            <li key={it.src} className="w-4/5 shrink-0 snap-start sm:w-auto">
              <button type="button" onClick={() => onPhoto(i)} aria-label={`Open image: ${it.caption}`} className="group relative block aspect-video w-full overflow-hidden rounded-lg">
                <img src={asset(it.src)} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition duration-base group-hover:scale-105" />
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button variant="secondary" size="sm" onClick={() => onPhoto(0)}>Show all {portfolio.length} photos</Button>
          {sample && <p className="inline-flex items-start gap-2 rounded-lg bg-tint-sand px-3 py-2 text-body-sm text-tint-ink"><Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />Concept images showing the kind of work to discuss, not completed client projects.</p>}
        </div>
      </Section>
    ),
    credits: (show || credits.length > 0 || f.skills.length > 0 || (mode === "owner" && !!f.imdb)) && (
      <Section title="On set" icon="clapper_board">
        <div className="grid gap-3 sm:grid-cols-5">
          <div className="sm:col-span-2">{P("skills", f.skills.length > 0, (
            <div className="h-full rounded-lg bg-tint-peach p-5 text-tint-ink">
              <p className="text-eyebrow text-tint-ink uppercase">{f.skills.length === 1 ? "Skill" : "Skills"}</p>
              <ul className="mt-3 flex flex-wrap gap-2">{f.skills.map((s) => <li key={s} className="flex items-center gap-2 rounded-full bg-surface py-1.5 pr-4 pl-2 text-label-md text-ink shadow-xs"><Icon3D name={craftIcon(s)} className="size-6" />{s}</li>)}</ul>
            </div>
          ), "Your on-set skills", "block")}</div>
          <div className="sm:col-span-3">{P("credits", credits.length > 0, (
            <div className="h-full rounded-lg bg-tint-sand p-5 text-tint-ink">
              <p className="text-eyebrow text-tint-ink uppercase">{credits.length === 1 ? "Credit" : "Credits"}</p>
              <ol className="mt-3 grid gap-4">
                {creditRows.map(({ title, role }, i) => { return (
                  <li key={credits[i]} className="flex items-center gap-3">
                    <Icon3D name="film_frames" className="size-9" />
                    <span className="grid"><span className="text-label-md text-tint-ink">{title}</span>{role && <span className="text-body-sm text-tint-ink">{role}</span>}</span>
                  </li>
                ); })}
              </ol>
            </div>
          ), "Your notable credits, best first", "block")}</div>
          {(mode === "owner" || editing || draft) && <div className="sm:col-span-5">{P("imdb", !!f.imdb, (
            <p className="text-body-sm text-ink-muted"><a className="inline-flex min-h-11 items-center text-link underline underline-offset-2" href={f.imdb} target="_blank" rel="noreferrer">IMDb page<span className="sr-only"> (opens in a new tab)</span></a> · only the Between Gigs team sees this</p>
          ), "Your IMDb link. Only the team sees it.", "block")}</div>}
        </div>
      </Section>
    ),
    questions: !editing && (
      <Section title="Questions" icon="speech_balloon">
        <Accordion variant="flush" items={questions} />
      </Section>
    ),
  };

  return (
    <div className="relative">
      {identity}

      <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-x-10 xl:gap-x-14">
        <div className="min-w-0 lg:col-span-7 xl:col-span-8">
          {sections.map((key) => body[key] && <div key={key} data-profile-section={key}>{body[key]}</div>)}
          {mode !== "public" && !aside && <div className="mt-10 grid gap-6 lg:hidden">{booking}{checked}</div>}
          {mode === "public" && !aside && <div className="mt-10 lg:hidden">{checked}</div>}
          {sample && !editing && <p className="mt-10 text-body-sm text-ink-subtle">This is a fictional sample profile: the person, biography and credits are made up for the preview.</p>}
        </div>

        <aside aria-label={aside ? "Editor" : `${first} at a glance`} className={cx("lg:col-span-5 xl:col-span-4", !aside && "max-lg:hidden")}>
          <div className="grid gap-5 lg:sticky lg:top-28 embedded:lg:top-6">
            {aside ?? <>{booking}{checked}</>}
          </div>
        </aside>
      </div>

      {similar.length > 0 && (
        <section aria-labelledby={`${ids}-similar`} className="mt-16 rounded-2xl bg-tint-sand p-6 text-tint-ink sm:p-8">
          <h2 id={`${ids}-similar`} className="font-display text-heading-lg text-tint-ink">More Gigsters like {first}</h2>
          <Link href="/p/" className="mt-2 inline-flex min-h-11 items-center text-label-md text-link underline">Browse all Gigsters</Link>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {similar.slice(0, 3).map(({ person: o, profile }) => (
              <li key={o.id}>
                <Link href={`/p/${o.slug}/`} className="group flex items-center gap-4 rounded-lg bg-surface p-3 shadow-xs transition duration-base hover:shadow-md">
                  <div className="size-16 shrink-0 overflow-hidden rounded-md"><PersonPhoto id={o.id} name={o.name} src={profile.fields.photo || undefined} alt="" className="size-full transition-transform duration-slow group-hover:scale-105" /></div>
                  <span className="grid min-w-0 flex-1 justify-items-start gap-0.5">
                    <span className="truncate text-label-md text-ink">{o.name}</span>
                    <span className="truncate text-body-sm text-ink-muted">{profile.fields.position || profile.fields.services[0]}</span>
                    {hasRate(profile.fields.rate) && <span className="mt-1 rounded-full bg-tint-butter px-2.5 py-0.5 text-label-sm text-tint-ink">${profile.fields.rate}/{basisShort[profile.fields.basis]}</span>}
                  </span>
                  <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-tint-mint-soft text-tint-ink transition-transform duration-base group-hover:translate-x-0.5"><ArrowRight className="size-4" /></span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Phones and tablets: the booking card becomes a bar that stays in reach. */}
      {mode === "public" && !aside && (
        <div className="fixed inset-x-0 bottom-0 z-sticky border-t border-line bg-surface px-4 py-3 shadow-lg lg:hidden">
          <div className="mx-auto flex max-w-xl items-center justify-between gap-4">
            <p className="grid">
              <span className="text-body-md text-ink">{rate ? <><b className="font-display text-heading-md">${f.rate}</b> / {basisShort[f.basis]}</> : <b>Rate on request</b>}</span>
              <span className="text-body-sm text-ink-muted">{monthStatusLabel[f.monthStatus]}</span>
            </p>
            <Button variant="primary" size="lg" onClick={onRequest}>Request {callName}</Button>
          </div>
        </div>
      )}
      {mode === "public" && !aside && <div aria-hidden="true" className="h-24 lg:hidden" />}

    </div>
  );
}

/** One fact about the Gigster, on a pastel block: a 3D icon, a small label and the line. */
function Fact({ icon, tint, label, children }: { icon: Icon3DName; tint: string; label: string; children: React.ReactNode }) {
  return (
    <span className={cx("flex h-full items-start gap-3 rounded-lg p-4 text-tint-ink", tint)}>
      <Icon3D name={icon} className="size-8 shrink-0" />
      <span className="grid min-w-0 gap-0.5">
        <span className="text-eyebrow text-tint-ink uppercase">{label}</span>
        <span className="text-body-md font-semibold text-tint-ink">{children}</span>
      </span>
    </span>
  );
}

function Section({ title, icon, meta, count, children }: { title: string; icon?: Icon3DName; meta?: string; count?: number; children: React.ReactNode }) {
  const id = React.useId();
  return (
    <section aria-labelledby={id} className="mt-12">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h2 id={id} className="flex items-center gap-3 font-display text-heading-lg text-ink">
          {icon && <Icon3D name={icon} className="size-8" />}{title}
          {count !== undefined && <span aria-hidden="true" className="rounded-full bg-tint-mint-soft px-2.5 py-0.5 text-label-sm text-tint-ink">{count}</span>}
        </h2>
        {meta && <span className="text-body-sm text-ink-muted">{meta}</span>}
      </div>
      {children}
    </section>
  );
}
