"use client";
/*
 * The Gigster editor's sections, top to bottom as the mockup (Flow p3) lays them out: who you are (photo, name, title,
 * where), How I can help (the most important part), rates and availability, your film and TV work and how it helps,
 * credits, the personality question, and the private booking contact. Each takes the answers, the setter and the
 * errors from the last Submit; nothing is checked while the Gigster types.
 */
import { Button, Field, Input, RadioGroup, Select, Textarea } from "@ds/components";
import { cx } from "@ds/components/cx";
import { Lock, MapPin, Plus, Trash2 } from "lucide-react";
import * as React from "react";
import { data } from "@/lib/data";
import { laServiceAreas, monthStatusLabel, onSetSkills, serviceChoices } from "@/lib/data/taxonomy";
import { personalityQuestions } from "@/lib/profile/personality";
import { serviceDescription } from "@/lib/profile/service-descriptions";
import { stageTwoLimits } from "@/lib/profile/stage-two";
import { ABOUT_MAX, DATES_MAX, DEPARTMENT_MAX, MAX_SERVICES, NAME_MAX, SERVICE_LINE_MAX, TITLE_MAX, hasRate } from "@/lib/profile/validate";
import { Credits } from "@/components/builder/ProfileBuilder";
import { PhotoPicker } from "@/components/profile/PhotoPicker";
import { Text } from "@/components/ds/atoms";
import { EditorSection, GroupError, Pills, type SectionProps } from "./ui";
import { DateField } from "@/components/ui/DateField";

/** The Between Gigs fee, taken from what the client pays. */
export const PLATFORM_FEE = 0.1;
const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`;
/** What the Gigster takes home from a rate, after the fee: "$40.50". */
export const takeHome = (rate: string) => money(Math.round(Number(rate) * (1 - PLATFORM_FEE) * 100) / 100);

/** Photo, name, title and where: the top of the page, as clients will see it. */
export function IdentitySection({ d, set, errors, personId, confirmPhoto }: SectionProps & {
  personId: string; required: (field: string) => boolean; confirmPhoto: (go: () => void) => void;
}) {
  return (
    <section id="sec-identity" aria-label="About you" className="grid scroll-mt-40 gap-8 lg:grid-cols-12 lg:gap-10">
      <div className="min-w-0 lg:col-span-5">
        <PhotoPicker id="f-photo" value={d.photo} name={d.name} personId={personId} error={errors.photo} confirm={confirmPhoto} onChange={set("photo")} />
      </div>
      <div className="grid min-w-0 content-start gap-5 lg:col-span-7">
        <Field label="Your name" error={errors.name} hint="Your first and last name, as clients will see it.">
          <Input id="f-name" size="lg" autoComplete="name" maxLength={NAME_MAX} value={d.name} className="font-display text-heading-lg"
            onChange={(e) => set("name")(e.target.value.slice(0, NAME_MAX))} />
        </Field>
        <Field label="Your professional title" optional error={errors.title} hint="A few words under your name, like “Wardrobe stylist & closet organizer”.">
          <Input id="f-title" maxLength={TITLE_MAX} value={d.title ?? ""} placeholder="What clients would call you"
            onChange={(e) => set("title")(e.target.value.slice(0, TITLE_MAX))} />
        </Field>
      </div>
    </section>
  );
}

/** Where they work: market, ZIP (private), travel and the areas they serve. Sits with availability ("where & when"). */
export function WhereSection({ d, set, errors, required }: SectionProps & { required: (field: string) => boolean }) {
  return (
    <EditorSection id="sec-where" title="Where you work" size="h2" need={required("location") || required("zip")} lead="Clients only see your areas and travel. Your ZIP code stays private.">
      <div className="grid gap-6 lg:grid-cols-2 lg:gap-10">
        <div className="grid content-start gap-4">
          <RadioGroup name="f-market" label="Where you're based" orientation="horizontal" value={d.market} onChange={(v) => set("market")(v as typeof d.market)}
            options={[{ value: "la", label: "Los Angeles" }, { value: "other", label: "Somewhere else" }]} />
          <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
            <Field label="ZIP code" optional={!required("zip")} error={errors.zip} hint="Your home address stays private.">
              <Input id="f-zip" inputMode="numeric" autoComplete="postal-code" value={d.zip} start={<MapPin />} placeholder="90026"
                onChange={(e) => set("zip")(e.target.value.replace(/\D/g, "").slice(0, 5))} />
            </Field>
            <Field label="How far you'll travel" optional={!required("travel")} error={errors.travel}>
              <Input id="f-travel" value={d.travel} placeholder="e.g. Up to 15 miles" onChange={(e) => set("travel")(e.target.value.slice(0, 80))} />
            </Field>
          </div>
        </div>
          {d.market === "other"
            ? <Field label="City / region and country" optional={!required("location")} error={errors.otherCity} hint="Los Angeles is the launch market. Your profile is held for a future market.">
                <Input id="f-otherCity" value={d.otherCity} onChange={(e) => set("otherCity")(e.target.value)} />
              </Field>
            : <div className="grid gap-2">
                <p id="f-areas-label" className="text-label-md text-ink">Areas you serve{!required("location") && <span className="ml-2 text-body-sm font-normal text-ink-subtle">Optional</span>}</p>
                <Pills label="Areas you serve" options={laServiceAreas} isOn={(o) => d.areas.includes(o)}
                  onToggle={(o) => set("areas")(d.areas.includes(o) ? d.areas.filter((a) => a !== o) : [...d.areas, o])} />
                <GroupError id="f-areas-error">{errors.areas}</GroupError>
              </div>}
              </div>
    </EditorSection>
  );
}

/** The worked example right next to the field (Peter): Maya's first service. */
function HelpExample() {
  return (
    <div role="note" aria-label="Example" className="grid content-start gap-3 rounded-lg border border-line bg-surface-sunken p-5">
      <p className="text-eyebrow tracking-widest text-ink-muted uppercase">Example</p>
      <p className="grid gap-1">
        <span className="text-label-md font-semibold text-ink">Closet organization</span>
        <span className="text-body-md text-ink">I&apos;ll sort your wardrobe and set up a closet you can keep organized.</span>
      </p>
      <Text size="sm" muted>Name the service, then say what you&apos;ll do in the words a customer would use. One clearly described service is enough to start.</Text>
    </div>
  );
}

/** "How I can help": up to five services, each with its standard description and the Gigster's own line. */
export function HelpSection({ d, set, errors }: SectionProps) {
  const choices = serviceChoices(data.kind);
  const [adding, setAdding] = React.useState(false);
  const lines = d.serviceLines ?? {};
  const rows = d.services;
  const showBlank = rows.length === 0 || (adding && rows.length < MAX_SERVICES);
  const setLine = (service: string, text: string) => set("serviceLines")({ ...lines, [service]: text.slice(0, SERVICE_LINE_MAX) });
  const replace = (i: number, next: string) => {
    const prev = rows[i];
    const nextLines = { ...lines };
    // The line already written follows the service when its category changes.
    if (prev && nextLines[prev] !== undefined && nextLines[next] === undefined) { nextLines[next] = nextLines[prev]; delete nextLines[prev]; }
    set("services")(rows.map((s, j) => (j === i ? next : s)));
    set("serviceLines")(nextLines);
  };
  const add = (next: string) => { set("services")([...rows, next]); setAdding(false); };
  const remove = (i: number) => {
    const gone = rows[i];
    const nextLines = { ...lines };
    delete nextLines[gone];
    set("services")(rows.filter((_, j) => j !== i));
    set("serviceLines")(nextLines);
  };
  const optionsFor = (current?: string) => choices.filter((c) => c === current || !rows.includes(c)).map((c) => ({ value: c, label: c }));
  const missingLine = !!errors.serviceLines;

  return (
    <EditorSection id="sec-help" title="How I can help" size="h1" need
      lead="The most important part of your profile. Pick a service, then tell clients in one line what you'll do.">
      <div className="grid gap-6 lg:grid-cols-12 lg:gap-10">
        <div className="order-2 grid min-w-0 gap-4 lg:order-1 lg:col-span-8">
          <ol className="grid gap-4">
            {rows.map((s, i) => {
              const standard = serviceDescription(s);
              const line = lines[s] ?? "";
              const lineError = missingLine && !line.trim() ? "Add one line about what you'll do." : undefined;
              return (
                <li key={i} className="grid gap-4 rounded-lg border border-line bg-surface p-4 sm:p-5">
                  <div className="flex items-end gap-2">
                    <Field label={`Service ${i + 1}`} className="min-w-0 flex-1">
                      <Select id={`f-service-${i}`} options={optionsFor(s)} value={s} onValueChange={(v) => replace(i, v)} />
                    </Field>
                    <Button variant="ghost" className="min-h-11" iconStart={<Trash2 />} aria-label={`Remove ${s}`} onClick={() => remove(i)}>
                      <span className="max-sm:sr-only">Remove</span>
                    </Button>
                  </div>
                  {standard && (
                    <div className="grid gap-1 border-l-2 border-line-strong pl-4">
                      <p className="text-body-sm text-ink-muted">Standard description · the same for everyone who offers this</p>
                      <p className="text-body-md text-ink">{standard}</p>
                    </div>
                  )}
                  <Field label="What you'll do" error={lineError} hint="One line, in a customer's words.">
                    <Textarea id={`f-line-${i}`} rows={2} showCount maxLength={SERVICE_LINE_MAX} value={line}
                      placeholder="e.g. I'll sort your wardrobe and set up a closet you can keep organized."
                      onChange={(e) => setLine(s, e.target.value)} />
                  </Field>
                </li>
              );
            })}
            {showBlank && (
              <li key="blank" className="grid gap-2 rounded-lg border-2 border-dashed border-line-dashed bg-surface p-4 sm:p-5">
                <Field label={rows.length ? `Service ${rows.length + 1}` : "Your first service"} error={rows.length ? undefined : errors.services}>
                  <Select id={`f-service-${rows.length}`} options={optionsFor()} placeholder="Choose a service" onValueChange={add} />
                </Field>
                {rows.length > 0 && <div><Button variant="ghost" size="sm" onClick={() => setAdding(false)}>Cancel</Button></div>}
              </li>
            )}
          </ol>
          <GroupError id="f-services-error">{rows.length ? errors.services : undefined}</GroupError>
          {!showBlank && (rows.length < MAX_SERVICES
            ? <div><Button variant="secondary" iconStart={<Plus />} onClick={() => setAdding(true)}>Add another service <span className="text-ink-muted">· {rows.length} of {MAX_SERVICES}</span></Button></div>
            : <Text size="sm" muted>That&apos;s the most: {MAX_SERVICES} services. Remove one to add another.</Text>)}
          {d.other.trim() && (
            <Field label="Something else you offer" optional hint="Goes to a private review. It isn't on your profile automatically.">
              <Textarea id="f-other" rows={2} value={d.other} onChange={(e) => set("other")(e.target.value)} />
            </Field>
          )}
        </div>
        <div className="order-1 min-w-0 lg:order-2 lg:col-span-4"><HelpExample /></div>
      </div>
    </EditorSection>
  );
}

const quickDates = ["Weekday mornings", "Weekday evenings", "Weekends", "Most days", "Between shoots, ask me"];

/** Rates (what the rate applies to, hourly or a project price, and the take-home after the fee) and availability. */
export function RatesSection({ d, set, errors, required }: SectionProps & { required: (field: string) => boolean }) {
  const priced = hasRate(d.rate);
  const basis = d.basis === "day" ? "day" : d.basis;
  return (
    <div className="grid gap-12 md:grid-cols-2 md:gap-10">
      <EditorSection id="sec-rates" title="Rates" size="h2" need={required("rate")}
        lead="Your rate is for your time and skills on a client's project. Materials, travel and extras are agreed with the client first.">
        <RadioGroup name="f-basis" label="How you charge" value={basis} onChange={(v) => set("basis")(v as typeof d.basis)}
          options={[
            { value: "hourly", label: "Hourly rate", description: "For the time you spend on a client's project." },
            { value: "project", label: "Starting project price", description: "A flat fee per project. You quote each project's final price before it's booked." },
            ...(d.basis === "day" ? [{ value: "day", label: "Day rate", description: "For a full day on a client's project." }] : []),
          ]} />
        <Field label={basis === "hourly" ? "Amount per hour" : basis === "day" ? "Amount per day" : "Starting price per project"} optional={!required("rate")} error={errors.rate}
          hint={priced ? undefined : "Leave it empty to show “Rate on request”."}>
          <Input id="f-rate" inputMode="numeric" value={d.rate} start={<span className="text-label-md">$</span>} end={<span className="text-label-sm text-ink-subtle">USD</span>}
            onChange={(e) => set("rate")(e.target.value.replace(/\D/g, "").replace(/^0+/, "").slice(0, 4))} />
        </Field>
        <p role="status" aria-live="polite" className={cx("rounded-md px-4 py-3 text-body-md", priced ? "bg-success-soft text-ink" : "bg-surface-sunken text-ink-muted")}>
          {priced
            ? <>You&apos;d receive <b className="font-semibold">{takeHome(d.rate)}</b> {basis === "hourly" ? "an hour" : basis === "day" ? "a day" : "for a project at this price"} after the 10% Between Gigs fee.</>
            : "Add an amount to see what you'd receive after the 10% Between Gigs fee."}
        </p>
        <Field label="Minimum booking" optional error={errors.bookingMinimum} hint="If you have one, like “2 hours” or “One consultation”.">
          <Input id="f-minimum" maxLength={stageTwoLimits.bookingMinimum} value={d.bookingMinimum ?? ""} placeholder="e.g. 2 hours"
            onChange={(e) => set("bookingMinimum")(e.target.value.slice(0, stageTwoLimits.bookingMinimum))} />
        </Field>
      </EditorSection>

      <EditorSection id="sec-availability" title="Availability" size="h2" need={required("dates")}
        lead="Clients see when you're usually free. Exact dates are agreed with each client.">
        <RadioGroup name="f-monthStatus" label={`This month${d.month ? ` · ${d.month}` : ""}`} value={d.monthStatus} onChange={(v) => set("monthStatus")(v as typeof d.monthStatus)}
          options={Object.entries(monthStatusLabel).map(([value, label]) => ({ value, label: value === "available" ? "Available for work" : label }))} />
        <Field label="General availability" optional={!required("dates")} error={errors.dates}>
          <Input id="f-dates" maxLength={DATES_MAX} value={d.dates} placeholder="e.g. Weekday mornings" onChange={(e) => set("dates")(e.target.value.slice(0, DATES_MAX))} />
        </Field>
        <Pills label="Quick picks for general availability" options={quickDates} isOn={(o) => d.dates === o} onToggle={(o) => set("dates")(o)} />
        <Field label="Earliest start date" optional error={errors.earliestStart}>
          <DateField id="f-start" value={d.earliestStart ?? ""} className="max-w-64" invalid={!!errors.earliestStart} onChange={set("earliestStart")} />
        </Field>
      </EditorSection>
    </div>
  );
}

/** "What kind of work do you do in film and television?", then "How does that experience help you deliver this service?" */
export function FilmSection({ d, set, errors, required }: SectionProps & { required: (field: string) => boolean }) {
  const need = required("position") || required("skills") || required("years") || required("about");
  return (
    <EditorSection id="sec-film" title="Your film and TV experience" size="h2" need={need}>
      <div className="grid gap-10 lg:grid-cols-2">
        <fieldset className="grid min-w-0 content-start gap-5">
          <legend className="mb-4 font-display text-heading-md text-ink">What kind of work do you do in film and television?</legend>
          <Field label="Department or role" optional={!required("position")} error={errors.position} hint="Type your own, or tap a department below.">
            <Input id="f-position" maxLength={DEPARTMENT_MAX} value={d.position} placeholder="e.g. Costume & wardrobe" onChange={(e) => set("position")(e.target.value.slice(0, DEPARTMENT_MAX))} />
          </Field>
          <div className="grid gap-2">
            <p className="text-label-md text-ink">On-set skills{!required("skills") && <span className="ml-2 text-body-sm font-normal text-ink-subtle">Optional</span>}</p>
            <Pills label="On-set skills" options={onSetSkills} isOn={(o) => d.skills.includes(o)}
              onToggle={(o) => {
                set("skills")(d.skills.includes(o) ? d.skills.filter((s) => s !== o) : [...d.skills, o]);
                if (!d.position.trim()) set("position")(o);
              }} />
            <GroupError id="f-skills-error">{errors.skills}</GroupError>
          </div>
          <Field label="Years in film and TV" optional={!required("years")} error={errors.years}>
            <Input id="f-years" inputMode="numeric" value={d.years} placeholder="e.g. 9" className="max-w-32" onChange={(e) => set("years")(e.target.value.replace(/\D/g, "").slice(0, 2))} />
          </Field>
        </fieldset>
        <div className="grid min-w-0 content-start gap-4">
          <p className="font-display text-heading-md text-ink">How does that experience help you deliver this service?</p>
          <Field label="In your own words" optional={!required("about")} error={errors.about}
            hint="For example: “Nine years in film and TV wardrobe taught me how to pull a look together on a deadline.”">
            <Textarea id="f-about" rows={6} showCount maxLength={ABOUT_MAX} value={d.about} onChange={(e) => set("about")(e.target.value)} />
          </Field>
        </div>
      </div>
    </EditorSection>
  );
}

/** Credits (pin to show, drag to reorder) and the optional IMDb link. */
export function CreditsSection({ d, set, errors, required }: SectionProps & { required: (field: string) => boolean }) {
  return (
    <EditorSection id="sec-credits" title="Credits" size="h2" need={required("credits")} lead="Productions you worked on, and your role on each.">
      <Credits credits={d.credits} pins={d.creditPins ?? []} error={errors.credits} onChange={(c, p) => { set("credits")(c); set("creditPins")(p); }} />
      <Field label="IMDb profile link" optional={!required("imdb")} error={errors.imdb} hint="Helps the team confirm your credits. Clients don't see it.">
        <Input id="f-imdb" type="url" inputMode="url" value={d.imdb} placeholder="https://www.imdb.com/name/nm1234567/" onChange={(e) => set("imdb")(e.target.value)} />
      </Field>
    </EditorSection>
  );
}

/** Pick one of the four questions and answer it. */
export function PersonalitySection({ d, set, errors }: SectionProps) {
  return (
    <EditorSection id="sec-personality" title="A little about you" size="h2" need={false} lead="Pick one question and answer it. It shows at the end of your profile.">
      <div className="grid gap-6">
        <div className="grid gap-2">
          <RadioGroup name="f-personality-q" label="Your question" value={d.personalityQuestion ?? ""} onChange={(v) => set("personalityQuestion")(v)}
            options={personalityQuestions.map((q) => ({ value: q.id, label: q.text }))} />
          <GroupError id="f-personality-q-error">{errors.personalityQuestion}</GroupError>
        </div>
        <Field label="Your answer" optional={!d.personalityQuestion} error={errors.personality} hint="A sentence or two. It's shown in your own words.">
          <Textarea id="f-personality" rows={3} showCount maxLength={stageTwoLimits.personality} value={d.personality ?? ""}
            onChange={(e) => set("personality")(e.target.value.slice(0, stageTwoLimits.personality))} />
        </Field>
      </div>
    </EditorSection>
  );
}

/** Private booking contact: used for booking notifications, never shown on the profile. */
export function ContactSection({ d, set, errors, email }: SectionProps & { email: string }) {
  return (
    <section id="sec-contact" aria-labelledby="sec-contact-h" className="grid scroll-mt-40 gap-4 rounded-lg border border-line bg-surface-sunken p-5 sm:p-6 md:grid-cols-12 md:items-start md:gap-6">
      <div className="grid gap-2 md:col-span-5">
        <h2 id="sec-contact-h" className="flex items-center gap-2 font-display text-heading-md text-ink"><Lock aria-hidden="true" className="size-5 shrink-0" />Private booking contact</h2>
        <Text size="sm" muted>Used for booking notifications. Hidden from your public profile.</Text>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 md:col-span-7">
        <Field label="Mobile number" optional error={errors.bookingMobile}>
          <Input id="f-mobile" type="tel" inputMode="tel" autoComplete="tel" maxLength={stageTwoLimits.bookingMobile} value={d.bookingMobile ?? ""}
            placeholder="+1 213 555 0123" onChange={(e) => set("bookingMobile")(e.target.value.slice(0, stageTwoLimits.bookingMobile))} />
        </Field>
        <div className="grid content-start gap-1.5">
          <p className="text-label-md text-ink">Email</p>
          <p className="flex min-h-10 items-center break-all text-body-md text-ink-muted">{email || "Your account email"}</p>
        </div>
      </div>
    </section>
  );
}
