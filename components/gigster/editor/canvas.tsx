"use client";
/*
 * The Gigster editor as Justin designed it (Figma "Wireframe flows", Flow p3): the profile itself is the form. A dashed
 * photo box beside the name, written large and edited in place; "How I can help" beside Rates; work samples; then
 * Skills & experience, Credits and the personality question in three ruled columns; the private booking contact last.
 * Rules divide the page instead of boxes, headings are serif, and anything not filled in yet is a quiet "+ Add …" that
 * opens its field. Patti's and Peter's corrections to that mockup are applied: "Your name" (not "public name"), up to
 * five services with their standard description, the film and TV questions, 1 of 4 personality questions, and no "0%".
 */
import { Button, Checkbox, Field, Input, RadioGroup, Select, Switch, Textarea } from "@ds/components";
import { cx } from "@ds/components/cx";
import { GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import * as React from "react";
import { data } from "@/lib/data";
import { serviceChoices } from "@/lib/data/taxonomy";
import { personalityQuestions } from "@/lib/profile/personality";
import { serviceDescription } from "@/lib/profile/service-descriptions";
import { stageTwoLimits } from "@/lib/profile/stage-two";
import { ABOUT_MAX, DATES_MAX, MAX_SERVICES, NAME_MAX, SERVICE_LINE_MAX, TITLE_MAX } from "@/lib/profile/validate";
import { Credits } from "@/components/builder/ProfileBuilder";
import { PhotoPicker } from "@/components/profile/PhotoPicker";
import { DateField } from "@/components/ui/DateField";
import { GroupError, Pills, type SectionProps } from "./ui";
import { ReviewLocation, RateFields, SkillTags, ContactFields } from "./ReviewControls";
import { ShowcaseEditor } from "./ShowcaseEditor";

const quickDates = ["Weekday mornings", "Weekday evenings", "Weekends", "Most days", "Between shoots, ask me"];
/** Up to five work samples; three slots show at first and another appears as each fills. */

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
      {/* Focus reads as the page, not a form box: the underline turns forest and thickens, on a soft surface. */}
      <div className={cx("group -mx-2 flex items-end gap-3 rounded-t-md border-b-2 px-2 transition-colors duration-fast focus-within:bg-surface",
        size === "name" ? "pb-2" : "pt-1 pb-1.5",
        error ? "border-danger" : size === "name" ? "border-ink-brand" : "border-transparent hover:border-line focus-within:border-ink-brand")}>
        <input id={id} value={value} maxLength={maxLength} placeholder={placeholder} autoComplete={autoComplete}
          aria-invalid={!!error || undefined} aria-describedby={error ? `${id}-error` : undefined}
          onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
          className={cx("min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-ink-subtle",
            size === "name" ? "font-display text-display-md sm:text-display-lg" : "text-heading-md")} />
        <Pencil aria-hidden="true" className={cx("shrink-0 text-ink-muted transition-colors group-focus-within:text-ink-brand", size === "name" ? "mb-3 size-5" : "mb-1.5 size-4")} />
      </div>
      {error && <p id={`${id}-error`} className="text-body-sm text-danger">{error}</p>}
    </div>
  );
}

/** Photo, name, title and where: the top of the page, as clients will see it. */
export function CanvasIdentity({ d, set, errors, personId, confirmPhoto }: SectionProps & {
  personId: string; required: (field: string) => boolean; confirmPhoto: (go: () => void) => void;
}) {
  return (
    <section id="sec-identity" aria-label="About you" className="grid scroll-mt-40 gap-8 md:grid-cols-12 md:gap-10">
      <div className="min-w-0 md:col-span-4">
        <PhotoPicker canvas id="f-photo" value={d.photo} name={d.name} personId={personId} error={errors.photo} confirm={confirmPhoto} onChange={set("photo")} />
      </div>
      <div className="grid min-w-0 content-start gap-4 md:col-span-8 md:pt-4">
        <InPlace id="f-name" label="Your name" size="name" value={d.name} placeholder="Your name" maxLength={NAME_MAX} autoComplete="name" error={errors.name} onChange={set("name")} />
        <InPlace id="f-title" label="Your professional title (optional)" size="title" value={d.title ?? ""} placeholder="Add your professional title" maxLength={TITLE_MAX} error={errors.title} onChange={set("title")} />
        <ReviewLocation d={d} set={set} errors={errors} />
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
  const [otherOpen, setOtherOpen] = React.useState(!!d.other.trim());
  const count = rows.length + (d.other.trim() || otherOpen ? 1 : 0);
  const showBlank = count < MAX_SERVICES && (rows.length === 0 && !otherOpen || adding);
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
  const OTHER = "__other";
  const optionsFor = (current?: string) => [
    ...choices.filter((c) => c === current || !rows.includes(c)).map((c) => ({ value: c, label: c })),
    // Not on the list: the team reviews a new service before it shows (it is stored as "Something else").
    ...(current === undefined && !otherOpen ? [{ value: OTHER, label: "Other — name your service" }] : []),
  ];
  // "Something else" holds the service's name on its first line and what they'd do after it.
  const [otherName = "", ...otherRest] = d.other.split("\n");
  const otherLine = otherRest.join(" ");
  const setOther = (name: string, line: string) => set("other")(line.trim() ? `${name}\n${line.slice(0, SERVICE_LINE_MAX)}` : name);
  const pickNew = (next: string) => {
    if (next !== OTHER) return add(next);
    setOtherOpen(true); setAdding(false);
    requestAnimationFrame(() => document.getElementById("f-other")?.focus());
  };
  // Order: drag the grip, or focus it and use the arrow keys. The first service leads the profile.
  const items = React.useRef<(HTMLLIElement | null)[]>([]);
  const [dragging, setDragging] = React.useState<number | null>(null);
  const [said, setSaid] = React.useState("");
  const swap = (i: number, j: number) => { const next = [...rows]; [next[i], next[j]] = [next[j], next[i]]; set("services")(next); };
  const drag = (e: React.PointerEvent) => {
    if (dragging === null) return;
    const up = items.current[dragging - 1]?.getBoundingClientRect(), down = items.current[dragging + 1]?.getBoundingClientRect();
    if (up && e.clientY < up.top + up.height / 2) { swap(dragging, dragging - 1); setDragging(dragging - 1); }
    else if (down && e.clientY > down.top + down.height / 2) { swap(dragging, dragging + 1); setDragging(dragging + 1); }
  };
  const drop = () => { if (dragging !== null) setSaid(`Moved to position ${dragging + 1} of ${rows.length}.`); setDragging(null); };
  const key = (e: React.KeyboardEvent, i: number) => {
    const j = e.key === "ArrowUp" ? i - 1 : e.key === "ArrowDown" ? i + 1 : -1;
    if (j < 0 || j >= rows.length) return;
    e.preventDefault(); swap(i, j); setSaid(`Moved to position ${j + 1} of ${rows.length}.`);
    requestAnimationFrame(() => document.getElementById(`service-grip-${j}`)?.focus());
  };
  const missingLine = !!errors.serviceLines;

  return (
    <section id="sec-help" aria-labelledby="sec-help-h" className="grid min-w-0 scroll-mt-40 content-start gap-5">
      <div className="grid gap-2">
        <H id="sec-help-h">How I can help</H>
        <p id="services-hint" className="max-w-xl text-body-md text-ink-muted">The most important part of your profile. Choose a service, then say in one line what a customer can hire you to do. One clear service is enough to start. Five is the maximum.{rows.length > 1 && " Drag the grip to put your main service first."}</p>
      </div>
      {!otherOpen && count < MAX_SERVICES && <div><Button variant="secondary" iconStart={<Plus />} onClick={()=>pickNew(OTHER)}>Other — name your service</Button></div>}
      <ol className="grid gap-5">
        {rows.map((s, i) => {
          const standard = serviceDescription(s);
          const line = lines[s] ?? "";
          const lineError = missingLine && !line.trim() ? "Add one line about what you'll do." : undefined;
          return (
            <li key={s} ref={(el) => { items.current[i] = el; }}
              className={cx("grid gap-3 border-b border-line pb-5 transition-colors last:border-b-0", dragging === i && "-mx-3 rounded-lg bg-surface-selected px-3 pt-3 shadow-md")}>
              <div className="grid gap-4 sm:grid-cols-12 sm:gap-0">
                <div className="flex items-start gap-1 sm:col-span-5 sm:pr-5">
                  {rows.length > 1 && (
                    <button type="button" id={`service-grip-${i}`} aria-label={`Move ${s}, service ${i + 1} of ${rows.length}`} aria-describedby="services-hint"
                      title="Drag to reorder, or use the arrow keys"
                      className={cx("grid size-10 shrink-0 touch-none place-items-center rounded-md text-ink-subtle transition-colors hover:bg-surface-hover hover:text-ink focus-visible:outline-2 focus-visible:outline-ink-brand",
                        dragging === i ? "cursor-grabbing text-ink-brand" : "cursor-grab")}
                      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setDragging(i); }}
                      onPointerMove={drag} onPointerUp={drop} onPointerCancel={drop} onKeyDown={(e) => key(e, i)}>
                      <GripVertical aria-hidden="true" className="size-5" />
                    </button>
                  )}
                  <div className="min-w-0 flex-1">
                    <label htmlFor={`f-service-${i}`} className="sr-only">Service {i + 1}</label>
                    <Select id={`f-service-${i}`} options={optionsFor(s)} value={s} onValueChange={(v) => replace(i, v)} />
                  </div>
                  <button type="button" aria-label={`Remove ${s}`} onClick={() => remove(i)}
                    className="grid size-10 shrink-0 place-items-center rounded-md text-ink-muted hover:bg-surface-hover hover:text-ink focus-visible:outline-2 focus-visible:outline-focus"><Trash2 aria-hidden="true" className="size-4" /></button>
                </div>
                <div className="grid min-w-0 gap-1.5 sm:col-span-7 sm:border-l sm:border-line-strong sm:pl-5">
                  <label htmlFor={`f-line-${i}`} className="text-body-md text-ink">What can a customer hire you to do?</label>
                  <p className="text-body-sm text-ink-muted italic">Example: Hang artwork and style a room for a party.</p>
                  <Textarea id={`f-line-${i}`} rows={2} showCount maxLength={SERVICE_LINE_MAX} value={line} invalid={!!lineError}
                    placeholder="Describe what a customer can hire you to do."
                    onChange={(e) => setLine(s, e.target.value)} />
                  {lineError && <p className="text-body-sm text-danger">{lineError}</p>}
                </div>
              </div>
              {standard && <p className="text-body-sm text-ink-muted"><span className="font-semibold text-ink">Standard description</span> · the same for everyone who offers it: {standard}</p>}
            </li>
          );
        })}
        {otherOpen && (
          // Their own service, laid out like the others: its name, then what a customer can hire them to do. Both go
          // in "Something else" (name on the first line), which the team reviews before it shows.
          <li key="other" className="grid gap-3 border-b border-line pb-5">
            <div className="grid gap-4 sm:grid-cols-12 sm:gap-0">
              <div className="flex items-start gap-1 sm:col-span-5 sm:pr-5">
                <div className="grid min-w-0 flex-1 gap-1.5">
                  <label htmlFor="f-other" className="text-body-md text-ink">Name of the Service</label>
                  <Input id="f-other" value={otherName} maxLength={60} placeholder="e.g. Web design"
                    onChange={(e) => setOther(e.target.value.replace(/\n/g, " "), otherLine)} />
                </div>
                <button type="button" aria-label="Remove your own service" onClick={() => { set("other")(""); setOtherOpen(false); }}
                  className="mt-7 grid size-10 shrink-0 place-items-center rounded-md text-ink-muted hover:bg-surface-hover hover:text-ink focus-visible:outline-2 focus-visible:outline-focus"><Trash2 aria-hidden="true" className="size-4" /></button>
              </div>
              <div className="grid min-w-0 gap-1.5 sm:col-span-7 sm:border-l sm:border-line-strong sm:pl-5">
                <label htmlFor="f-other-line" className="text-body-md text-ink">What can a customer hire you to do?</label>
                <Textarea id="f-other-line" rows={2} showCount maxLength={SERVICE_LINE_MAX} value={otherLine}
                  placeholder="Describe what a customer can hire you to do."
                  onChange={(e) => setOther(otherName, e.target.value)} />
                <p className="text-body-sm text-ink-muted italic">Example: Hang artwork and style a room for a party.</p>
              </div>
            </div>
            <p className="text-body-sm text-ink-muted">The Between Gigs team reviews new services before they show on your profile.</p>
            <GroupError id="f-other-error">{errors.other}</GroupError>
          </li>
        )}
        {showBlank && (
          <li key="blank" className="grid gap-2 sm:grid-cols-12 sm:items-start sm:gap-0">
            <div className="grid gap-1 sm:col-span-5 sm:pr-5">
              <label htmlFor={`f-service-${rows.length}`} className="sr-only">{rows.length ? `Service ${rows.length + 1}` : "Your first service"}</label>
              <Select id={`f-service-${rows.length}`} options={optionsFor()} placeholder="Choose a service" invalid={!rows.length && !otherOpen && !!errors.services} onValueChange={pickNew} />
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
      <p role="status" aria-live="polite" className="sr-only">{said}</p>
      <GroupError id="f-services-error">{rows.length ? errors.services : undefined}</GroupError>
      {!showBlank && (count < MAX_SERVICES
        ? <div><Button variant="secondary" iconStart={<Plus />} onClick={() => setAdding(true)}>Add another service <span className="text-ink-muted">· {count} of {MAX_SERVICES}</span></Button></div>
        : <p className="text-body-sm text-ink-muted">That&apos;s the most: {MAX_SERVICES} services. Remove one to add another.</p>)}
    </section>
  );
}

/** Rates and availability, in the narrow column beside How I can help. */
export function CanvasRates({ d, set, errors, required }: SectionProps & { required: (field: string) => boolean }) {
  const [datesOpen, openDates] = useOpen(!!(d.dates || errors.dates));
  const [startOpen, openStart] = useOpen(!!(d.earliestStart || errors.earliestStart));
  const available = d.monthStatus !== "away";
  return (
    <section id="sec-rates" aria-labelledby="sec-rates-h" className="grid min-w-0 scroll-mt-40 content-start gap-4">
      <H id="sec-rates-h">Rates</H>
      <RateFields d={d} set={set} errors={errors} />
      <div id="sec-availability" className="mt-6 grid scroll-mt-40 gap-4 border-t border-line-strong pt-6">
        <Switch id="f-monthStatus" label="Available for work" checked={available}
          onChange={(on) => set("monthStatus")(on ? "available" : "away")} />
        {available && (
          <div role="group" aria-label="How available" className="flex flex-wrap gap-2">
            {(["available", "limited"] as const).map((v) => (
              <button key={v} type="button" aria-pressed={d.monthStatus === v} onClick={() => set("monthStatus")(v)}
                className={cx("inline-flex min-h-9 items-center rounded-full border px-3 text-label-sm font-semibold transition-colors duration-fast focus-visible:outline-2 focus-visible:outline-focus",
                  d.monthStatus === v ? "border-action bg-action text-on-action" : "border-line-strong text-ink hover:bg-surface-hover")}>
                {v === "available" ? "Fully available" : "Limited Availability"}
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

/** "Work samples · Optional": three slots to start, up to five; the next empty one is labelled. */
export const CanvasSamples = ShowcaseEditor;

/** The three ruled columns: Skills & experience, Credits, and the personality question. */
export function CanvasExperience({d,set,errors,required}: SectionProps & {required:(field:string)=>boolean}) {
  return <section id="sec-film" aria-labelledby="sec-film-h" className="grid scroll-mt-40 gap-5"><div className="grid gap-2"><H id="sec-film-h">Skills &amp; experience</H><p className="text-body-md text-ink">What kind of work do you do in the entertainment industry, and how does that experience help you deliver this service?</p></div>
    <div className="grid gap-8 lg:grid-cols-2"><div className="grid content-start gap-5"><SkillTags d={d} set={set} errors={errors}/><Field label="Years in the Entertainment Industry" optional={!required("years")} error={errors.years}><Input id="f-years" inputMode="numeric" value={d.years} className="max-w-32" onChange={e=>set("years")(e.target.value.replace(/\D/g,"").slice(0,2))}/></Field></div>
    <Field label="How can customers benefit from your entertainment industry experience?" optional={!required("about")} error={errors.about} hint="For example: “Building sets for film and television. I bring that same craftsmanship, creativity, and attention to detail to custom furniture, home improvements, and special projects.”"><Textarea id="f-about" rows={5} showCount maxLength={ABOUT_MAX} value={d.about} onChange={e=>set("about")(e.target.value)}/></Field></div>
  </section>;
}

export function CanvasColumns({ d, set, errors, required }: SectionProps & { required: (field: string) => boolean }) {
  const [credOpen, openCred] = useOpen(!!(d.credits.some((c) => c.trim()) || d.imdb || d.resumeUrl || errors.credits || errors.imdb));
  const [qOpen, openQ] = useOpen(!!(d.personalityQuestion || d.personality || errors.personality || errors.personalityQuestion));
  const question = personalityQuestions.find((q) => q.id === d.personalityQuestion)?.text;
  const col = "grid min-w-0 scroll-mt-40 content-start gap-4";
  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:gap-0">


      <section id="sec-credits" aria-labelledby="sec-credits-h" className={cx(col, "lg:border-l lg:border-line-strong lg:px-8")}>
        <H id="sec-credits-h" size="md">Credits</H>
        {credOpen ? (
          <div className="grid gap-4">
            <p className="text-body-sm text-ink-muted">Productions you worked on, and your role on each.</p>
            <Credits credits={d.credits} pins={d.creditPins ?? []} error={errors.credits} onChange={(c, p) => { set("credits")(c); set("creditPins")(p); }} />
            <Field label="IMDb profile link" optional={!required("imdb")} error={errors.imdb} >
              <Input id="f-imdb" type="url" inputMode="url" value={d.imdb} placeholder="https://www.imdb.com/name/nm1234567/" onChange={(e) => set("imdb")(e.target.value)} />
            </Field>
            <Field label="LinkedIn profile" optional error={errors.linkedin}><Input id="f-linkedin" type="url" value={d.linkedin ?? ""} maxLength={500} placeholder="https://www.linkedin.com/in/your-name" onChange={(e) => set("linkedin")(e.target.value)} /></Field>
            <Field label="Résumé link" optional hint="A website, Google Drive or Dropbox link. Clients see “View résumé”.">
              <Input id="f-resume" type="url" inputMode="url" value={d.resumeUrl ?? ""} placeholder="https://" onChange={(e) => set("resumeUrl")(e.target.value.trim().slice(0, 300))} />
            </Field>
          </div>
        ) : <AddLink id="f-credits" onClick={openCred}>Add IMDb, a résumé, or selected credits</AddLink>}
      </section>

      <section id="sec-personality" aria-labelledby="sec-personality-h" className={cx(col, "lg:border-l lg:border-line-strong lg:pl-8")}>
        <p className="text-body-sm text-ink-muted">Let your potential clients get to know you better.</p>
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
            <p className="text-body-md text-ink">Pick one of four questions and answer it.</p>
            <AddLink onClick={openQ}>Add your answer</AddLink>
          </>
        )}
      </section>
    </div>
  );
}

/** "Details · Optional": what the profile's Details block shows (languages and how they work), asked right here. */
export function CanvasDetails({d,set,errors}:SectionProps){
  const atClient=d.mode==="on-site"||d.mode==="both", atBusiness=d.mode==="studio"||d.mode==="both";
  const choose=(client:boolean,business:boolean)=>set("mode")(client&&business?"both":business?"studio":"on-site");
  return <section id="sec-details" aria-labelledby="sec-details-h" className="grid scroll-mt-40 gap-5"><H id="sec-details-h" size="md" tag="Optional">Details</H>
    <div className="grid gap-x-10 gap-y-6 md:grid-cols-2"><Field label="Languages" optional><Input id="f-languages" value={d.languages} maxLength={120} placeholder="e.g. English, Spanish" onChange={e=>set("languages")(e.target.value)}/></Field>
    <fieldset className="grid gap-3"><legend className="mb-3 text-label-md text-ink">Where you work · select all that apply</legend><Checkbox label="On Site, at the client’s location." checked={atClient} onChange={e=>choose(e.target.checked,atBusiness)}/><Checkbox label="At my office, studio or other place of business" checked={atBusiness} onChange={e=>choose(atClient,e.target.checked)}/></fieldset>
    <Field label="Tools and equipment" optional error={errors.tools} hint="For example: Special Cameras, Lighting Kit, Box Truck, Makeup kit, etc. Up to five lines."><Textarea id="f-tools" rows={4} maxLength={600} value={d.tools} onChange={e=>set("tools")(e.target.value.split(/\r?\n/).slice(0,5).join("\n"))}/></Field>
    <div className="grid content-start gap-4"><RadioGroup name="f-insurance" label="Insurance · optional, self-reported" value={d.insurance} onChange={v=>set("insurance")(v as typeof d.insurance)} options={[{value:"private",label:"Prefer to discuss privately"},{value:"yes",label:"I have liability insurance"},{value:"no",label:"No insurance yet"}]}/>{d.insurance==="yes"&&<Field label="Describe your liability insurance" optional hint="Describe the type of coverage. Please don’t include policy numbers or other sensitive details."><Textarea id="f-insuranceNotes" rows={3} maxLength={400} showCount value={d.insuranceNotes??""} onChange={e=>set("insuranceNotes")(e.target.value)}/></Field>}</div>
    </div></section>;
}

/** The private booking contact: one strip, never on the public profile. */
export const CanvasContact = ContactFields;
