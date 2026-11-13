"use client";
/*
 * Template · Public profile (Figma: DS · Patterns → Public profile; mockup Flow p4). The Green Room presentation of a
 * Gigster's page: the portrait, serif name, title, area and years; then "How I can help" (each service with its
 * standard description and the Gigster's own line) beside the rate column (price and what it applies to, minimum,
 * "Available for work", availability and earliest start); then work samples, and Experience, Selected credits and the
 * chosen personality question with its answer in italic serif. It takes exactly the props WarmProfile gets
 * (components/profile/ProfileView picks it for the editorial look), so every edit spot, permission and action is the
 * same: only the presentation changes.
 */
import { Accordion, Button, cx } from "@ds/components";
import { BadgeCheck, BriefcaseBusiness, Clapperboard, Heart, Info, Languages, MapPin, Share } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { PersonPhoto } from "@/components/people/PersonPhoto";
import type { ProfileLayoutProps } from "@/components/profile/ProfileView";
import { basisShort, insuranceLabel, modeLabel, monthStatusLabel } from "@/lib/data/taxonomy";
import { personalityQuestionText } from "@/lib/profile/personality";
import { serviceDescription } from "@/lib/profile/service-descriptions";
import { startDateLabel } from "@/lib/profile/stage-two";
import { hasRate } from "@/lib/profile/validate";
import { asset } from "@/lib/site";
import type { ProfileSectionId } from "@/lib/profile/template";
import { Divider, Heading, Quote, Status, Text } from "../atoms";
import { RateBlock, SectionHeading, ServiceRow } from "../molecules";
import { ProfileResultCard } from "../organisms";

/** One line of the identity meta: a lucide icon and the words. */
function Meta({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>; children: React.ReactNode }) {
  return (
    <li className="flex min-w-0 items-start gap-2 text-body-md text-ink-muted">
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-ink" />
      <span className="min-w-0 break-words">{children}</span>
    </li>
  );
}

/** A body section: the serif heading with a rule above it, then its content. */
function Block({ id, title, meta, children }: { id: ProfileSectionId; title: string; meta?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section aria-label={title} data-profile-section={id} className="grid gap-5 border-t border-line pt-8">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <SectionHeading title={title} level="h2" />
        {meta && <Text size="sm" muted>{meta}</Text>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

/** One of the three short columns under the work samples: a smaller serif heading over its content. */
function Column({ title, label, children }: { title: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <section aria-label={label} className="grid min-w-0 content-start gap-3 md:border-l md:border-line md:pl-6 md:first:border-l-0 md:first:pl-0 lg:pl-8">
      <Heading level="h3" as="h3" className="break-words">{title}</Heading>
      <div className="grid min-w-0 gap-3">{children}</div>
    </section>
  );
}

/** "9 years in costume & wardrobe." from the years and the department. */
function yearsLine(years: string, position: string) {
  const n = years === "1" ? "One year" : `${years} years`;
  return position ? `${n} in ${position.toLowerCase()}.` : `${n} in film and TV.`;
}

export function ProfileTemplate({ person, fields: f, mode, embedded, similar = [], draft = false, part, aside, first, callName,
  pageLabel, services, helps, portfolio, sample, editing, show, priced, rate, where, credits, unseen, reviewed, P,
  creditRows, questions, sections, saved, onSave, onShare, onPhoto, onRequest }: ProfileLayoutProps) {
  const Name = embedded || mode === "owner" ? "h2" : "h1";
  const craft = f.position || services[0] || f.skills[0] || "";
  const title = f.title?.trim() || "";
  // Booking answers (earliest start, minimum, personality) show when the profile has them; a public read on live has none yet.
  const start = startDateLabel(f.earliestStart);
  const minimum = f.bookingMinimum?.trim() ?? "";
  const personality = f.personality?.trim() ?? "";
  const question = personalityQuestionText(f.personalityQuestion);
  const available = f.monthStatus === "available";
  const publicActions = mode === "public" && !editing;
  const lineOf = (s: string) => f.serviceLines?.[s]?.trim() ?? "";

  const years = (f.years || editing) && (part
    ? part("years", { content: f.years ? <span>{yearsLine(f.years, f.position)}</span> : null, hint: "Years in the business", kind: "line" })
    : <>{yearsLine(f.years, f.position)}</>);

  const rateBlock = P("rate", priced || !show, (
    <RateBlock
      price={priced ? <>${f.rate}<span className="text-display-sm"> / {basisShort[f.basis]}</span></> : <span className="text-heading-lg">Rate on request</span>}
      minimum={priced ? <>{f.basis === "hourly" ? "Hourly rate" : f.basis === "day" ? "Day rate" : "Starting price per project"}{minimum ? ` · ${minimum} minimum` : ""}</> : minimum ? `${minimum} minimum` : undefined}
      available={available}
      availability={!available ? <Status tone={f.monthStatus === "away" ? "neutral" : "gold"}>{monthStatusLabel[f.monthStatus]}</Status> : undefined}
      earliest={undefined} />
  ), "Your starting rate", "block");

  const identity = (
    <section aria-label={`About ${first}`} className="grid gap-6 md:grid-cols-12 md:items-center md:gap-8 lg:gap-12">
      <div className="min-w-0 md:col-span-5">
        {P("photo", !!f.photo || !show, (
          <PersonPhoto id={person.id} morph={!editing} name={f.name} src={f.photo || undefined} fallback="brand" department={f.position} skills={f.skills}
            alt={f.photo ? `Portrait of ${f.name}${sample ? " (fictional)" : ""}` : undefined}
            className="aspect-4/3 w-full rounded-lg object-cover" textClass="text-display-md" />
        ), "Add photo", "photo")}
      </div>

      <div className="grid min-w-0 content-start gap-4 md:col-span-7">
        {editing && <Status tone="neutral" dot={false}>{pageLabel}</Status>}
        {P("name", !!f.name.trim(), <Heading level="display-l" as={Name} className="wrap-anywhere max-sm:text-display-md">{f.name}</Heading>, "Your name", "title")}
        {(title || (!show && craft)) && <p className="text-heading-md break-words text-ink">{title || craft}</p>}
        {reviewed && <p className="inline-flex items-center gap-1.5 text-label-md text-ink-brand"><BadgeCheck aria-hidden="true" className="size-4" />Reviewed by Between Gigs</p>}
        <ul className="grid gap-2">
          {(where || show) && <Meta icon={MapPin}>{P("where", !!where, <span>{where}{f.travel.trim() ? ` · ${f.travel.trim()}` : ""}</span>, "Where you work")}</Meta>}
          {years && <Meta icon={BriefcaseBusiness}>{years}</Meta>}
          {editing && <Meta icon={Clapperboard}>{P("position", !!f.position, <span>{f.position}</span>, "Department")}</Meta>}
        </ul>
        {publicActions && (
          <div className="-ml-3 flex flex-wrap gap-1">
            <Button variant="ghost" size="sm" iconStart={<Share />} onClick={onShare}>Share</Button>
            <Button variant="ghost" size="sm" iconStart={<Heart className={cx(saved && "fill-current text-danger")} />} aria-pressed={saved} onClick={onSave}>{saved ? "Saved" : "Save"}</Button>
          </div>
        )}
      </div>
    </section>
  );

  // "How I can help": each service, its standard description, and the Gigster's own line.
  const help = (show || services.length > 0 || helps.length > 0 || !!f.hireableJobs?.trim()) && (
    <section aria-label="How I can help" data-profile-section="services" className="grid min-w-0 content-start gap-5">
      <SectionHeading title="How I can help" level="h1" />
      {P("services", services.length > 0 || !!f.other.trim(), (
        <div className="grid gap-5">
          {services.length > 0 && (
            <ul className="border-t border-line">
              {services.map((s) => {
                const line = lineOf(s), standard = serviceDescription(s);
                return (
                  <li key={s}>
                    <ServiceRow
                      name={<span className="grid gap-1"><span className="text-heading-md">{s}</span>{standard && <span className="text-body-sm font-normal text-ink-muted">{standard}</span>}</span>}
                      description={line || (services.length === 1 && f.hireableJobs?.trim()) || (standard ? "" : rate ? `From ${rate}` : "Rate agreed first")} />
                  </li>
                );
              })}
            </ul>
          )}
          {helps.length > 0 && (
            <div className="grid gap-3">
              <Text size="sm" muted>{first} can also help with</Text>
              <ul className="flex flex-wrap gap-2">
                {helps.map((h) => <li key={h}><Status tone="neutral" dot={false} className="text-ink">{h}</Status></li>)}
              </ul>
            </div>
          )}
          <Text size="sm" muted>Scope, timing and the final price are agreed with {first} before anything is booked.</Text>
          {editing && f.other.trim() && <Text size="sm" muted>Something else, in private review: {f.other}</Text>}
        </div>
      ), "The services you'd offer clients between gigs", "block")}
    </section>
  );

  const rateColumn = (
    <div className="grid min-w-0 content-start gap-5 rounded-lg border border-line bg-surface p-5 lg:rounded-none lg:border-0 lg:border-l lg:bg-transparent lg:p-0 lg:pl-10">
      {rateBlock}
      {P("availability", !!f.dates.trim() || !show, <Text>{f.dates || monthStatusLabel[f.monthStatus]}</Text>, "When you're usually free")}
      {start && <Text muted>Earliest start · {start}</Text>}
      {!editing && (
        // Phones and tablets get the request in the bar at the foot of the screen instead.
        <div className={cx("grid gap-2", publicActions && !aside && "max-lg:hidden")}>
          <Button variant="primary" size="lg" fullWidth disabled={mode !== "public"} aria-describedby={`${person.id}-request-note`} onClick={onRequest}>
            Request {callName}
          </Button>
          <p id={`${person.id}-request-note`} className="text-body-sm text-ink-muted">
            {mode === "public" ? "You won't be charged. Scope and rate are agreed first." : mode === "own" ? "Clients see this on your profile." : "Owner view: requests are off here."}
          </p>
        </div>
      )}
    </div>
  );

  const checked = (
    <section aria-labelledby={`${person.id}-checked`} className="grid gap-4 rounded-lg border border-line bg-surface p-5">
      <Heading level="h4" as="h2" id={`${person.id}-checked`}>What we&apos;ve checked</Heading>
      <ul className="grid gap-3">
        <li className="flex items-start gap-3"><BadgeCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-ink-brand" />
          <Text size="sm" as="span">{reviewed ? "Profile reviewed by the Between Gigs team" : "Reviewed by the Between Gigs team before it goes public"}</Text></li>
        <li className="flex items-start gap-3"><Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-ink-muted" />
          <Text size="sm" muted as="span">Credits and details are shared by {first}, not independently verified</Text></li>
      </ul>
    </section>
  );

  // How they work: mode and travel, transport, tools and (when shared) insurance.
  const how = [
    modeLabel[f.mode],
    f.transport,
    f.tools,
    !unseen && f.insurance === "yes" ? insuranceLabel[f.insurance] : "",
  ].filter(Boolean);

  // Experience, Selected credits and the personality question, side by side on wider screens.
  const story = (show || !!f.about.trim() || credits.length > 0 || f.skills.length > 0 || !!personality) && (
    <section aria-label="Experience and credits" data-profile-section="credits" className="grid gap-8 border-t border-line pt-8 md:grid-cols-3 md:gap-6">
      <Column title="Experience" label="Experience">
        {P("about", !!f.about.trim(), <Text className="whitespace-pre-line break-words">{f.about}</Text>, "How your film and TV experience helps you deliver this service.", "block")}
        {P("skills", f.skills.length > 0, (
          <ul aria-label={`On-set ${f.skills.length === 1 ? "skill" : "skills"}`} className="flex flex-wrap gap-2">{f.skills.map((s) => <li key={s}><Status tone="neutral" dot={false} className="text-ink">{s}</Status></li>)}</ul>
        ), "Your on-set skills", "block")}
      </Column>
      <Column title="Selected credits" label="Selected credits">
        {P("credits", credits.length > 0, (
          <ol className="grid gap-3">
            {creditRows.map(({ title: t, role }, i) => (
              <li key={credits[i]} className="flex items-start gap-3">
                <Clapperboard aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-ink" />
                <span className="min-w-0 break-words text-body-md text-ink">{t}{role && <span className="text-ink-muted"> · {role}</span>}</span>
              </li>
            ))}
          </ol>
        ), "Your notable credits, best first", "block")}
        {(mode === "owner" || editing || draft) && P("imdb", !!f.imdb, (
          <Text size="sm" muted><a className="inline-flex min-h-11 items-center text-link underline underline-offset-2" href={f.imdb} target="_blank" rel="noreferrer">IMDb page<span className="sr-only"> (opens in a new tab)</span></a> · only the Between Gigs team sees this</Text>
        ), "Your IMDb link. Only the team sees it.", "block")}
      </Column>
      {(personality || show) && (
        <Column title={question || "A little about me"} label="Personality question">
          {P("details", !!personality, <Quote className="text-pretty break-words">&ldquo;{personality}&rdquo;</Quote>, "Pick a question and answer it", "block")}
        </Column>
      )}
    </section>
  );

  const body: Partial<Record<ProfileSectionId, React.ReactNode>> = {
    work: portfolio.length > 0 && (
      <Block id="work" title="Work samples" meta={`${portfolio.length} photos`}>
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {portfolio.slice(0, 3).map((it, i) => (
            <li key={it.src} className={cx("min-w-0", i === 2 && "max-md:hidden")}>
              <button type="button" onClick={() => onPhoto(i)} aria-label={`Open image: ${it.caption}`} className="group relative block aspect-4/3 w-full overflow-hidden rounded-lg bg-surface-sunken">
                <img src={asset(it.src)} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition duration-base group-hover:scale-105" />
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button variant="secondary" size="sm" onClick={() => onPhoto(0)}>Show all {portfolio.length} photos</Button>
          {sample && <Text size="sm" muted className="inline-flex items-start gap-2"><Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />Concept images showing the kind of work to discuss, not completed client projects.</Text>}
        </div>
      </Block>
    ),
    credits: story,
    details: (
      <Block id="details" title="Details">
        <dl className="grid gap-5 sm:grid-cols-2">
          {(f.languages || show) && (
            <div className="grid content-start gap-1">
              <dt className="flex items-center gap-2 text-label-sm text-ink-muted"><Languages aria-hidden="true" className="size-4" />Speaks</dt>
              <dd className="text-body-md text-ink">{P("languages", !!f.languages.trim(), <span>{f.languages}</span>, "Languages")}</dd>
            </div>
          )}
          <div className="grid content-start gap-1 sm:col-span-2">
            <dt className="flex items-center gap-2 text-label-sm text-ink-muted"><BriefcaseBusiness aria-hidden="true" className="size-4" />{editing ? "How you work" : `How ${first} works`}</dt>
            <dd className="text-body-md text-ink">
              {editing
                ? <span>{[modeLabel[f.mode], f.transport, f.tools, insuranceLabel[f.insurance]].filter(Boolean).join(" · ")}</span>
                : how.join(" · ")}
            </dd>
          </div>
        </dl>
      </Block>
    ),
    questions: !editing && (
      <Block id="questions" title="Questions">
        <Accordion variant="flush" items={questions} />
      </Block>
    ),
  };

  return (
    <div className="relative">
      {identity}

      <div className={cx("mt-12 grid gap-10", !!aside && "lg:grid-cols-12 lg:gap-x-10 xl:gap-x-14")}>
        <div className={cx("grid min-w-0 content-start gap-12", !!aside && "lg:col-span-8")}>
          <div className="grid gap-8 border-t border-line pt-8 lg:grid-cols-12 lg:gap-x-10">
            <div className="min-w-0 lg:col-span-8">{help}</div>
            <div className="min-w-0 lg:col-span-4">{rateColumn}</div>
          </div>
          {sections.map((key) => body[key] && <React.Fragment key={key}>{body[key]}</React.Fragment>)}
          {!aside && <div className="max-w-xl">{checked}</div>}
          {sample && !editing && <Text size="sm" muted>This is a fictional sample profile: the person, biography and credits are made up for the preview.</Text>}
        </div>
        {aside && (
          <aside aria-label="Editor" className="min-w-0 lg:col-span-4">
            <div className="grid gap-5 lg:sticky lg:top-28 embedded:lg:top-6">{aside}</div>
          </aside>
        )}
      </div>

      {similar.length > 0 && (
        <section aria-label={`More Gigsters like ${first}`} className="mt-16 grid gap-6">
          <Divider />
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
            <SectionHeading eyebrow="Keep browsing" title={`More Gigsters like ${first}`} level="h2" />
            <Link href="/p/" className="inline-flex min-h-11 items-center text-label-md font-semibold text-ink underline underline-offset-4">Browse all Gigsters</Link>
          </div>
          <ul className="grid gap-3">
            {similar.slice(0, 3).map(({ person: o, profile }) => (
              <li key={o.id} className="min-w-0">
                <ProfileResultCard href={`/p/${o.slug}/`} name={o.name} service={profile.fields.position || profile.fields.services[0] || ""}
                  line={profile.extras?.tagline} area={profile.fields.areas.join(", ") || undefined} availability={monthStatusLabel[profile.fields.monthStatus]}
                  rate={hasRate(profile.fields.rate) ? `$${profile.fields.rate}/${basisShort[profile.fields.basis]}` : undefined} photo={profile.fields.photo || undefined} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Phones and tablets: the rate and request stay in reach as a bar. */}
      {publicActions && !aside && (
        <div className="fixed inset-x-0 bottom-0 z-sticky border-t border-line bg-surface px-4 py-3 shadow-lg lg:hidden">
          <div className="mx-auto flex max-w-xl items-center justify-between gap-4">
            <p className="grid min-w-0">
              <span className="text-body-md text-ink">{rate ? <><b className="font-display text-heading-md">${f.rate}</b> / {basisShort[f.basis]}</> : <b>Rate on request</b>}</span>
              <span className="truncate text-body-sm text-ink-muted">{monthStatusLabel[f.monthStatus]}</span>
            </p>
            <Button variant="primary" size="lg" onClick={onRequest}>Request {callName}</Button>
          </div>
        </div>
      )}
      {publicActions && !aside && <div aria-hidden="true" className="h-24 lg:hidden" />}
    </div>
  );
}
