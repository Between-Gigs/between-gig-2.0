"use client";
/*
 * The Gigster editor as Justin designed it (Figma "Wireframe flows", Flow p3): the profile itself is the form. A dashed
 * photo box beside the name, written large and edited in place; "How I can help" beside Rates; work samples; then
 * Skills & experience, Credits and the personality question in three ruled columns; the private booking contact last.
 * Rules divide the page instead of boxes, headings are serif, and anything not filled in yet is a quiet "+ Add …" that
 * opens its field. Patti's and Peter's corrections to that mockup are applied: "Your name" (not "public name"), up to
 * five services with their standard description, the film and TV questions, 1 of 4 personality questions, and no "0%".
 */
import { Button, Field, Input, RadioGroup, Select, Switch, Textarea } from "@ds/components";
import { cx } from "@ds/components/cx";
import { Camera, Lock, MapPin, Pencil, Plus, Trash2, X } from "lucide-react";
import * as React from "react";
import { data } from "@/lib/data";
import { laServiceAreas, onSetSkills, serviceChoices } from "@/lib/data/taxonomy";
import { personalityQuestions } from "@/lib/profile/personality";
import { serviceDescription } from "@/lib/profile/service-descriptions";
import { stageTwoLimits } from "@/lib/profile/stage-two";
import { ABOUT_MAX, DATES_MAX, DEPARTMENT_MAX, MAX_SERVICES, NAME_MAX, SERVICE_LINE_MAX, TITLE_MAX, hasRate } from "@/lib/profile/validate";
import { Credits } from "@/components/builder/ProfileBuilder";
import { PhotoPicker } from "@/components/profile/PhotoPicker";
import { DateField } from "@/components/ui/DateField";
import { GroupError, Pills, type SectionProps } from "./ui";
import { takeHome } from "./sections";

const quickDates = ["Weekday mornings", "Weekday evenings", "Weekends", "Most days", "Between shoots, ask me"];
/** Up to five work samples; three slots show at first and another appears as each fills. */
const MAX_SAMPLES = 5;
const FIRST_SLOTS = 3;

/** A serif section heading, large like the mockup's, with an optional quiet tag ("· Optional"). */
function H({ id, children, tag, size = "lg" }: { id: string; children: React.ReactNode; tag?: string; size?: "lg" | "md" }) {
  return (
    <h2 id={id} className={cx("font-display text-ink", size === "lg" ? "text-display-sm sm:text-display-md" : "text-heading-lg")}>
      {children}{tag && <span className="ml-2 align-middle font-sans text-heading-sm font-normal text-ink-muted">· {tag}</span>}
    </h2>
  );
}

/** "+ Add …": a quiet link-style button that opens a field. */
function AddLink({ children, onClick, id }: { children: React.ReactNode; onClick: () => void; id?: string }) {
  return (
    <button id={id} type="button" onClick={onClick}
      className="inline-flex min-h-11 w-fit items-center gap-2 rounded-md text-left text-body-md text-ink-brand transition-colors duration-fast hover:text-ink hover:underline hover:underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
      <Plus aria-hidden="true" className="size-4 shrink-0" />{children}
    </button>
  );
}

/** Opens once something is there (or an error points at it), or when its "+ Add" is pressed. */
function useOpen(filled: boolean) {
  const [open, setOpen] = React.useState(filled);
  React.useEffect(() => { if (filled) setOpen(true); }, [filled]); // eslint-disable-line react-hooks/set-state-in-effect
  return [open, () => setOpen(true)] as const;
}

/** Text that is the field: no box, a rule under it, a pencil beside it. */
function InPlace({ id, label, value, placeholder, onChange, maxLength, size, error, autoComplete }: {
  id: string; label: string; value: string; placeholder: string; onChange: (v: string) => void; maxLength: number;
  size: "name" | "title"; error?: string; autoComplete?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="sr-only">{label}</label>
      <div className={cx("flex items-end gap-3 rounded-sm focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-focus",
        size === "name" ? "border-b-2 pb-2" : "border-b pb-1.5", error ? "border-danger" : size === "name" ? "border-ink-brand" : "border-transparent hover:border-line focus-within:border-line")}>
        <input id={id} value={value} maxLength={maxLength} placeholder={placeholder} autoComplete={autoComplete}
          aria-invalid={!!error || undefined} aria-describedby={error ? `${id}-error` : undefined}
          onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
          className={cx("min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-ink-subtle",
            size === "name" ? "font-display text-display-md sm:text-display-lg" : "text-heading-md")} />
        <Pencil aria-hidden="true" className={cx("shrink-0 text-ink-muted", size === "name" ? "mb-3 size-5" : "mb-1.5 size-4")} />
      </div>
      {error && <p id={`${id}-error`} className="text-body-sm text-danger">{error}</p>}
    </div>
  );
}

/** Photo, name, title and where: the top of the page, as clients will see it. */
export function CanvasIdentity({ d, set, errors, personId, confirmPhoto, required }: SectionProps & {
  personId: string; required: (field: string) => boolean; confirmPhoto: (go: () => void) => void;
}) {
  const [whereOpen, openWhere] = useOpen(!!(d.zip || d.travel || d.areas.length || d.market === "other" || errors.zip || errors.areas || errors.otherCity || errors.travel));
  return (
    <section id="sec-identity" aria-label="About you" className="grid scroll-mt-40 gap-8 md:grid-cols-12 md:gap-10">
      <div className="min-w-0 md:col-span-4">
        <PhotoPicker canvas id="f-photo" value={d.photo} name={d.name} personId={personId} error={errors.photo} confirm={confirmPhoto} onChange={set("photo")} />
      </div>
      <div className="grid min-w-0 content-start gap-4 md:col-span-8 md:pt-4">
        <InPlace id="f-name" label="Your name" size="name" value={d.name} placeholder="Your name" maxLength={NAME_MAX} autoComplete="name" error={errors.name} onChange={set("name")} />
        <InPlace id="f-title" label="Your professional title (optional)" size="title" value={d.title ?? ""} placeholder="Add your professional title" maxLength={TITLE_MAX} error={errors.title} onChange={set("title")} />
        <div id="sec-where" className="grid scroll-mt-40 gap-3">
          {whereOpen ? (
            <div className="grid gap-4 rounded-lg border border-line bg-surface p-4 sm:p-5">
              <RadioGroup name="f-market" label="Where you're based" orientation="horizontal" value={d.market} onChange={(v) => set("market")(v as typeof d.market)}
                options={[{ value: "la", label: "Los Angeles" }, { value: "other", label: "Somewhere else" }]} />
              <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
                <Field label="ZIP or postal code" optional={!required("zip")} error={errors.zip}>
                  <Input id="f-zip" inputMode="numeric" autoComplete="postal-code" value={d.zip} start={<MapPin />} placeholder="90026"
                    onChange={(e) => set("zip")(e.target.value.replace(/\D/g, "").slice(0, 5))} />
                </Field>
                <Field label="Travel radius" optional={!required("travel")} error={errors.travel}>
                  <Input id="f-travel" value={d.travel} placeholder="e.g. Up to 15 miles" onChange={(e) => set("travel")(e.target.value.slice(0, 80))} />
                </Field>
              </div>
              {d.market === "other"
                ? <Field label="City / region and country" optional={!required("location")} error={errors.otherCity} hint="Los Angeles is the launch market. Your profile is held for a future market.">
                    <Input id="f-otherCity" value={d.otherCity} onChange={(e) => set("otherCity")(e.target.value)} />
                  </Field>
                : <div className="grid gap-2">
                    <p className="text-label-md text-ink">Areas you serve{!required("location") && <span className="ml-2 text-body-sm font-normal text-ink-subtle">Optional</span>}</p>
                    <Pills label="Areas you serve" options={laServiceAreas} isOn={(o) => d.areas.includes(o)}
                      onToggle={(o) => set("areas")(d.areas.includes(o) ? d.areas.filter((a) => a !== o) : [...d.areas, o])} />
                    <GroupError id="f-areas-error">{errors.areas}</GroupError>
                  </div>}
            </div>
          ) : <AddLink onClick={openWhere}>ZIP or postal code &amp; travel radius</AddLink>}
          <p className="text-body-sm text-ink-muted italic">Your home address stays private.</p>
        </div>
      </div>
    </section>
  );
}

/** "How I can help": up to five services, each with its standard description and the Gigster's own line. */
export function CanvasHelp({ d, set, errors }: SectionProps) {
  const choices = serviceChoices(data.kind);
  const [adding, setAdding] = React.useState(false);
  const lines = d.serviceLines ?? {};
  const rows = d.services;
  const showBlank = rows.length === 0 || (adding && rows.length < MAX_SERVICES);
  const setLine = (service: string, text: string) => set("serviceLines")({ ...lines, [service]: text.slice(0, SERVICE_LINE_MAX) });
  const replace = (i: number, next: string) => {
    const prev = rows[i];
    const nextLines = { ...lines };
    if (prev && nextLines[prev] !== undefined && nextLines[next] === undefined) { nextLines[next] = nextLines[prev]; delete nextLines[prev]; }
    set("services")(rows.map((s, j) => (j === i ? next : s)));
    set("serviceLines")(nextLines);
  };
  const add = (next: string) => { set("services")([...rows, next]); setAdding(false); };
  const remove = (i: number) => {
    const nextLines = { ...lines };
    delete nextLines[rows[i]];
    set("services")(rows.filter((_, j) => j !== i));
    set("serviceLines")(nextLines);
  };
  const optionsFor = (current?: string) => choices.filter((c) => c === current || !rows.includes(c)).map((c) => ({ value: c, label: c }));
  const missingLine = !!errors.serviceLines;

  return (
    <section id="sec-help" aria-labelledby="sec-help-h" className="grid min-w-0 scroll-mt-40 content-start gap-5">
      <div className="grid gap-2">
        <H id="sec-help-h">How I can help</H>
        <p className="max-w-xl text-body-md text-ink-muted">The most important part of your profile. Name a service, then say in one line what a customer can hire you to do. One clear service is enough to start.</p>
      </div>
      <ol className="grid gap-5">
        {rows.map((s, i) => {
          const standard = serviceDescription(s);
          const line = lines[s] ?? "";
          const lineError = missingLine && !line.trim() ? "Add one line about what you'll do." : undefined;
          return (
            <li key={i} className="grid gap-3 border-b border-line pb-5 last:border-b-0">
              <div className="grid gap-4 sm:grid-cols-12 sm:gap-0">
                <div className="flex items-start gap-1 sm:col-span-5 sm:pr-5">
                  <div className="min-w-0 flex-1">
                    <label htmlFor={`f-service-${i}`} className="sr-only">Service {i + 1}</label>
                    <Select id={`f-service-${i}`} options={optionsFor(s)} value={s} onValueChange={(v) => replace(i, v)} />
                  </div>
                  <button type="button" aria-label={`Remove ${s}`} onClick={() => remove(i)}
                    className="grid size-10 shrink-0 place-items-center rounded-md text-ink-muted hover:bg-surface-hover hover:text-ink focus-visible:outline-2 focus-visible:outline-focus"><Trash2 aria-hidden="true" className="size-4" /></button>
                </div>
                <div className="grid min-w-0 gap-1.5 sm:col-span-7 sm:border-l sm:border-line-strong sm:pl-5">
                  <label htmlFor={`f-line-${i}`} className="text-body-md text-ink">What can a customer hire you to do?</label>
                  <Textarea id={`f-line-${i}`} rows={2} showCount maxLength={SERVICE_LINE_MAX} value={line} invalid={!!lineError}
                    placeholder="I'll sort your wardrobe and set up a closet you can keep organized."
                    onChange={(e) => setLine(s, e.target.value)} />
                  {lineError ? <p className="text-body-sm text-danger">{lineError}</p>
                    : <p className="text-body-sm text-ink-muted italic">Example: Hang artwork and style a room for a party.</p>}
                </div>
              </div>
              {standard && <p className="text-body-sm text-ink-muted"><span className="font-semibold text-ink">Standard description</span> · the same for everyone who offers it: {standard}</p>}
            </li>
          );
        })}
        {showBlank && (
          <li key="blank" className="grid gap-2 sm:grid-cols-12 sm:items-start sm:gap-0">
            <div className="grid gap-1 sm:col-span-5 sm:pr-5">
              <label htmlFor={`f-service-${rows.length}`} className="sr-only">{rows.length ? `Service ${rows.length + 1}` : "Your first service"}</label>
              <Select id={`f-service-${rows.length}`} options={optionsFor()} placeholder="Choose a service" invalid={!rows.length && !!errors.services} onValueChange={add} />
              {!rows.length && errors.services && <p className="text-body-sm text-danger">{errors.services}</p>}
            </div>
            <div className="grid gap-1 sm:col-span-7 sm:border-l sm:border-line-strong sm:pl-5">
              <p className="text-body-md text-ink-muted">What can a customer hire you to do?</p>
              <p className="text-body-sm text-ink-muted italic">Example: I&apos;ll sort your wardrobe and set up a closet you can keep organized.</p>
              {rows.length > 0 && <div><Button variant="ghost" size="sm" onClick={() => setAdding(false)}>Cancel</Button></div>}
            </div>
          </li>
        )}
      </ol>
      <GroupError id="f-services-error">{rows.length ? errors.services : undefined}</GroupError>
      {!showBlank && (rows.length < MAX_SERVICES
        ? <div><Button variant="secondary" iconStart={<Plus />} onClick={() => setAdding(true)}>Add another service <span className="text-ink-muted">· {rows.length} of {MAX_SERVICES}</span></Button></div>
        : <p className="text-body-sm text-ink-muted">That&apos;s the most: {MAX_SERVICES} services. Remove one to add another.</p>)}
      {d.other.trim() && (
        <Field label="Something else you offer" optional hint="Goes to a private review. It isn't on your profile automatically.">
          <Textarea id="f-other" rows={2} value={d.other} onChange={(e) => set("other")(e.target.value)} />
        </Field>
      )}
    </section>
  );
}

/** Rates and availability, in the narrow column beside How I can help. */
export function CanvasRates({ d, set, errors, required }: SectionProps & { required: (field: string) => boolean }) {
  const priced = hasRate(d.rate);
  const basis = d.basis === "day" ? "day" : d.basis;
  const [datesOpen, openDates] = useOpen(!!(d.dates || errors.dates));
  const [startOpen, openStart] = useOpen(!!(d.earliestStart || errors.earliestStart));
  const available = d.monthStatus !== "away";
  return (
    <section id="sec-rates" aria-labelledby="sec-rates-h" className="grid min-w-0 scroll-mt-40 content-start gap-4">
      <H id="sec-rates-h">Rates</H>
      <RadioGroup name="f-basis" label="How you charge" value={basis} onChange={(v) => set("basis")(v as typeof d.basis)}
        options={[{ value: "hourly", label: "Hourly rate" }, { value: "project", label: "Starting project price" }, ...(d.basis === "day" ? [{ value: "day", label: "Day rate" }] : [])]} />
      <p className="text-body-sm text-ink-muted">{basis === "project" ? "A flat fee per project; you quote each project's final price before it's booked." : "For your time and skills on a client's project. Materials and travel are agreed first."}</p>
      <div className="grid gap-1.5">
        <label htmlFor="f-rate" className="sr-only">{basis === "hourly" ? "Amount per hour" : basis === "day" ? "Amount per day" : "Starting price per project"}{required("rate") ? "" : " (optional)"}</label>
        <Input id="f-rate" inputMode="numeric" value={d.rate} placeholder="Amount" invalid={!!errors.rate} start={<span className="text-label-md">$</span>} end={<span className="text-label-sm text-ink-subtle">USD</span>}
          onChange={(e) => set("rate")(e.target.value.replace(/\D/g, "").replace(/^0+/, "").slice(0, 4))} />
        {errors.rate && <p className="text-body-sm text-danger">{errors.rate}</p>}
        <p role="status" aria-live="polite" className="text-body-sm text-ink-muted">
          {priced ? <>You&apos;d receive <b className="font-semibold text-ink">{takeHome(d.rate)}</b> {basis === "hourly" ? "an hour" : basis === "day" ? "a day" : "for a project at this price"} after the 10% Between Gigs fee.</>
            : "Leave it empty to show “Rate on request”."}
        </p>
      </div>
      <div className="grid gap-1.5">
        <label htmlFor="f-minimum" className="sr-only">Minimum booking (optional)</label>
        <Input id="f-minimum" maxLength={stageTwoLimits.bookingMinimum} value={d.bookingMinimum ?? ""} placeholder="Minimum booking, if any" invalid={!!errors.bookingMinimum}
          onChange={(e) => set("bookingMinimum")(e.target.value.slice(0, stageTwoLimits.bookingMinimum))} />
      </div>
      <div id="sec-availability" className="grid scroll-mt-40 gap-3 pt-2">
        <Switch id="f-monthStatus" label="Available for work" description={d.month ? `This month · ${d.month}` : undefined} checked={available}
          onChange={(on) => set("monthStatus")(on ? "available" : "away")} />
        {available && (
          <div role="group" aria-label="How available" className="flex flex-wrap gap-2">
            {(["available", "limited"] as const).map((v) => (
              <button key={v} type="button" aria-pressed={d.monthStatus === v} onClick={() => set("monthStatus")(v)}
                className={cx("inline-flex min-h-9 items-center rounded-full border px-3 text-label-sm font-semibold transition-colors duration-fast focus-visible:outline-2 focus-visible:outline-focus",
                  d.monthStatus === v ? "border-action bg-action text-on-action" : "border-line-strong text-ink hover:bg-surface-hover")}>
                {v === "available" ? "Fully available" : "Limited"}
              </button>
            ))}
          </div>
        )}
        {datesOpen ? (
          <div className="grid gap-2">
            <Field label="General availability" optional={!required("dates")} error={errors.dates}>
              <Input id="f-dates" maxLength={DATES_MAX} value={d.dates} placeholder="e.g. Weekday mornings" onChange={(e) => set("dates")(e.target.value.slice(0, DATES_MAX))} />
            </Field>
            <Pills label="Quick picks for general availability" options={quickDates} isOn={(o) => d.dates === o} onToggle={(o) => set("dates")(o)} />
          </div>
        ) : <AddLink id="f-dates" onClick={openDates}>General availability</AddLink>}
        {startOpen ? (
          <Field label="Earliest start date" optional error={errors.earliestStart}>
            <DateField id="f-start" value={d.earliestStart ?? ""} invalid={!!errors.earliestStart} onChange={set("earliestStart")} />
          </Field>
        ) : <AddLink onClick={openStart}>Earliest start date</AddLink>}
      </div>
    </section>
  );
}

/** A photo, made small enough to keep in the browser (the sample) or send with the profile. */
async function resize(file: File, max = 1200): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, fail) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fail; i.src = url; });
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas"); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.82);
  } finally { URL.revokeObjectURL(url); }
}

/** "Work samples · Optional": three slots to start, up to five; the next empty one is labelled. */
export function CanvasSamples({ d, set }: SectionProps) {
  const samples = (d.workSamples ?? []).filter(Boolean);
  const input = React.useRef<HTMLInputElement>(null);
  const [problem, setProblem] = React.useState("");
  const pick = async (files: FileList | null) => {
    const list = [...(files ?? [])].filter((f) => f.type.startsWith("image/")).slice(0, MAX_SAMPLES - samples.length);
    if (!list.length) return;
    try { setProblem(""); set("workSamples")([...samples, ...(await Promise.all(list.map((f) => resize(f))))].slice(0, MAX_SAMPLES)); }
    catch { setProblem("We couldn't read that photo. Try another one."); }
  };
  return (
    <section id="sec-work" aria-labelledby="sec-work-h" className="grid scroll-mt-40 gap-5">
      <H id="sec-work-h" tag={samples.length ? `${samples.length} of ${MAX_SAMPLES}` : `Optional · up to ${MAX_SAMPLES}`}>Work samples</H>
      <input ref={input} type="file" accept="image/*" multiple className="sr-only" tabIndex={-1} aria-label="Add work samples"
        onChange={(e) => { void pick(e.target.files); e.target.value = ""; }} />
      <ul className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: Math.min(MAX_SAMPLES, Math.max(FIRST_SLOTS, samples.length + 1)) }, (_, i) => {
          const src = samples[i];
          return (
            <li key={i} className="min-w-0">
              {src ? (
                <figure className="relative aspect-video overflow-hidden rounded-lg border border-line bg-surface">
                  <img src={src} alt={`Work sample ${i + 1}`} className="size-full object-cover" />
                  <button type="button" aria-label={`Remove work sample ${i + 1}`} onClick={() => set("workSamples")(samples.filter((_, j) => j !== i))}
                    className="absolute top-2 right-2 grid size-9 place-items-center rounded-full bg-surface text-ink shadow-sm hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-focus"><X aria-hidden="true" className="size-4" /></button>
                </figure>
              ) : (
                <button type="button" onClick={() => input.current?.click()} aria-label={i === samples.length ? undefined : "Add a work sample"} disabled={i > samples.length}
                  className="grid aspect-video w-full place-content-center justify-items-center gap-2 rounded-lg border-2 border-dashed border-line-dashed bg-surface/60 text-ink transition-colors duration-fast hover:border-ink-brand hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-default disabled:hover:border-line-dashed disabled:hover:bg-surface/60">
                  <Camera aria-hidden="true" className={cx("size-7", i === samples.length ? "text-ink" : "text-ink-subtle")} strokeWidth={1.5} />
                  {i === samples.length && <span className="flex items-center gap-1.5 text-body-md"><Plus aria-hidden="true" className="size-4" />Add a work sample</span>}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {problem && <p className="text-body-sm text-danger">{problem}</p>}
    </section>
  );
}

/** The three ruled columns: Skills & experience, Credits, and the personality question. */
export function CanvasColumns({ d, set, errors, required }: SectionProps & { required: (field: string) => boolean }) {
  const [expOpen, openExp] = useOpen(!!(d.position || d.years || d.about || d.skills.length || errors.position || errors.about || errors.years || errors.skills));
  const [credOpen, openCred] = useOpen(!!(d.credits.some((c) => c.trim()) || d.imdb || d.resumeUrl || errors.credits || errors.imdb));
  const [qOpen, openQ] = useOpen(!!(d.personalityQuestion || d.personality || errors.personality || errors.personalityQuestion));
  const question = personalityQuestions.find((q) => q.id === d.personalityQuestion)?.text;
  const col = "grid min-w-0 scroll-mt-40 content-start gap-4";
  return (
    <div className="grid gap-10 lg:grid-cols-3 lg:gap-0">
      <section id="sec-film" aria-labelledby="sec-film-h" className={cx(col, "lg:pr-8")}>
        <H id="sec-film-h" size="md">Skills &amp; experience</H>
        <p className="text-body-md text-ink">What kind of work do you do in film and television, and how does that experience help you deliver this service?</p>
        {expOpen ? (
          <div className="grid gap-4">
            <Field label="Department or role" optional={!required("position")} error={errors.position}>
              <Input id="f-position" maxLength={DEPARTMENT_MAX} value={d.position} placeholder="e.g. Costume & wardrobe" onChange={(e) => set("position")(e.target.value.slice(0, DEPARTMENT_MAX))} />
            </Field>
            <div className="grid gap-2">
              <p className="text-label-md text-ink">On-set skills{!required("skills") && <span className="ml-2 text-body-sm font-normal text-ink-subtle">Optional</span>}</p>
              <Pills label="On-set skills" options={onSetSkills} isOn={(o) => d.skills.includes(o)}
                onToggle={(o) => { set("skills")(d.skills.includes(o) ? d.skills.filter((s) => s !== o) : [...d.skills, o]); if (!d.position.trim()) set("position")(o); }} />
              <GroupError id="f-skills-error">{errors.skills}</GroupError>
            </div>
            <Field label="Years in film and TV" optional={!required("years")} error={errors.years}>
              <Input id="f-years" inputMode="numeric" value={d.years} placeholder="e.g. 9" className="max-w-32" onChange={(e) => set("years")(e.target.value.replace(/\D/g, "").slice(0, 2))} />
            </Field>
            <Field label="How that experience helps" optional={!required("about")} error={errors.about}
              hint="e.g. “Nine years in film and TV wardrobe taught me how to pull a look together on a deadline.”">
              <Textarea id="f-about" rows={5} showCount maxLength={ABOUT_MAX} value={d.about} onChange={(e) => set("about")(e.target.value)} />
            </Field>
          </div>
        ) : <AddLink id="f-about" onClick={openExp}>Add experience</AddLink>}
      </section>

      <section id="sec-credits" aria-labelledby="sec-credits-h" className={cx(col, "lg:border-l lg:border-line-strong lg:px-8")}>
        <H id="sec-credits-h" size="md">Credits</H>
        {credOpen ? (
          <div className="grid gap-4">
            <p className="text-body-sm text-ink-muted">Your best first. Only pinned credits show on your profile.</p>
            <Credits credits={d.credits} pins={d.creditPins ?? []} error={errors.credits} onChange={(c, p) => { set("credits")(c); set("creditPins")(p); }} />
            <Field label="IMDb profile link" optional={!required("imdb")} error={errors.imdb} hint="Helps the team confirm your credits. Clients don't see it.">
              <Input id="f-imdb" type="url" inputMode="url" value={d.imdb} placeholder="https://www.imdb.com/name/nm1234567/" onChange={(e) => set("imdb")(e.target.value)} />
            </Field>
            <Field label="Résumé link" optional hint="A website, Google Drive or Dropbox link. Clients see “View résumé”.">
              <Input id="f-resume" type="url" inputMode="url" value={d.resumeUrl ?? ""} placeholder="https://" onChange={(e) => set("resumeUrl")(e.target.value.trim().slice(0, 300))} />
            </Field>
          </div>
        ) : <AddLink id="f-credits" onClick={openCred}>Add IMDb, a résumé, or selected credits</AddLink>}
      </section>

      <section id="sec-personality" aria-labelledby="sec-personality-h" className={cx(col, "lg:border-l lg:border-line-strong lg:pl-8")}>
        <H id="sec-personality-h" size="md">{question ?? "A question about you"}</H>
        {qOpen ? (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <RadioGroup name="f-personality-q" label="Pick one question" value={d.personalityQuestion ?? ""} onChange={(v) => set("personalityQuestion")(v)}
                options={personalityQuestions.map((q) => ({ value: q.id, label: q.text }))} />
              <GroupError id="f-personality-q-error">{errors.personalityQuestion}</GroupError>
            </div>
            <Field label="Your answer" optional={!d.personalityQuestion} error={errors.personality} hint="A sentence or two, in your own words.">
              <Textarea id="f-personality" rows={3} showCount maxLength={stageTwoLimits.personality} value={d.personality ?? ""}
                onChange={(e) => set("personality")(e.target.value.slice(0, stageTwoLimits.personality))} />
            </Field>
          </div>
        ) : (
          <>
            <p className="text-body-md text-ink">Pick one of four questions and answer it. It shows at the end of your profile.</p>
            <AddLink onClick={openQ}>Add your answer</AddLink>
          </>
        )}
      </section>
    </div>
  );
}

/** The private booking contact: one strip, never on the public profile. */
export function CanvasContact({ d, set, errors, email }: SectionProps & { email: string }) {
  const [open, setOpen] = React.useState(!!(d.bookingMobile || errors.bookingMobile));
  return (
    <section id="sec-contact" aria-labelledby="sec-contact-h" className="grid scroll-mt-40 gap-4">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <h2 id="sec-contact-h" className="flex items-center gap-2 text-label-lg font-semibold text-ink"><Lock aria-hidden="true" className="size-5 shrink-0" />Private booking contact</h2>
        <span aria-hidden="true" className="hidden h-6 w-px bg-line-strong sm:block" />
        {!open && <AddLink id="f-mobile" onClick={() => setOpen(true)}>Add email &amp; mobile</AddLink>}
        <span aria-hidden="true" className="hidden h-6 w-px bg-line-strong sm:block" />
        <p className="text-body-sm text-ink-muted">Used for booking notifications. Hidden from your public profile.</p>
      </div>
      {open && (
        <div className="grid gap-4 sm:max-w-2xl sm:grid-cols-2">
          <Field label="Mobile number" optional error={errors.bookingMobile}>
            <Input id="f-mobile" type="tel" inputMode="tel" autoComplete="tel" maxLength={stageTwoLimits.bookingMobile} value={d.bookingMobile ?? ""}
              placeholder="+1 213 555 0123" onChange={(e) => set("bookingMobile")(e.target.value.slice(0, stageTwoLimits.bookingMobile))} />
          </Field>
          <div className="grid content-start gap-1.5">
            <p className="text-label-md text-ink">Email</p>
            <p className="flex min-h-10 items-center break-all text-body-md text-ink-muted">{email || "Your account email"}</p>
          </div>
        </div>
      )}
    </section>
  );
}
