"use client";
import { Badge, Banner, Button, Drawer, Field, IconButton, Input, RadioGroup, Skeleton, Stepper, Textarea, cx, useToast } from "@ds/components";
import { Reveal, startPageTransition } from "@ds/motion";
import { AlertCircle, ArrowLeft, ArrowRight, Check, ChevronDown, ChevronsDownUp, ChevronsUpDown, CloudCheck, Eye, Film, GripVertical, Inbox, Link2, LoaderCircle, MapPin, MessageSquareWarning, Pencil, Pin, PinOff, Plus, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import * as React from "react";
import { data, type Person, type ProfileFields, type ProfileSection } from "@/lib/data";
import { basisLabel, insuranceLabel, laServiceAreas, modeLabel, monthStatusLabel, offSetServices, onSetSkills } from "@/lib/data/taxonomy";
import { useRequireRole } from "@/lib/guard";
import { ABOUT_MAX, SECTIONS, STEPS, fieldLabel, pinnedCredits, sectionLabel, validateAll, type FieldErrors } from "@/lib/profile/validate";
import { ChipPicker } from "@/components/profile/ChipPicker";
import { PhotoPicker } from "@/components/profile/PhotoPicker";
import { ProfilePreviewCard } from "@/components/profile/ProfilePreviewCard";
import { useLiveEditWarning } from "@/components/profile/LiveEditWarning";
import { Page } from "@/components/site/Page";
import { ButtonLink } from "@/components/ui/ButtonLink";

const HEADS: [string, string][] = [
  ["Meet your Gigster", "Start with the experience that makes you, you."],
  ["Your skills & services", "Pick everything that fits. Tap again to remove."],
  ["Where & when", "Where you work, and when you're free this month."],
  ["A little more about you", "One About Me tells your story. A few optional details set expectations."],
  ["Review your profile", "Check it top to bottom. You can jump back to any step."],
];

const AUTOSAVE_MS = 700;
const thisMonth = () => new Date().toLocaleString("en-US", { month: "long", year: "numeric" });
const timeOf = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

export type SaveState = { status: "idle" | "saving" | "saved" | "error"; at?: string };

/** /profile/edit: the questionnaire. Five steps, autosaved, resumable, checked once on Submit, with a live preview. */
export function ProfileBuilder() {
  const session = useRequireRole("gigster");
  return session?.personId ? <Builder personId={session.personId} /> : <Page bare><Intro /><BuilderSkeleton /></Page>;
}

/** A slim band above the builder. The big welcome headline lives on My profile, where they start. */
function Intro() {
  return (
    <section data-theme="dark" className="relative isolate overflow-hidden bg-surface-brand phosphor-dots">
      <div className="relative z-raised mx-auto flex max-w-7xl flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-4 py-5 sm:px-6">
        <h1 className="font-display text-heading-lg text-ink">Build your profile</h1>
        <p className="text-body-sm text-ink-muted">It saves as you go. Come back any time. <Link href="/profile/canvas/" className="ml-1 inline-flex min-h-11 items-center underline underline-offset-2 hover:text-ink sm:min-h-6">Try editing right on your profile</Link></p>
      </div>
    </section>
  );
}

function BuilderSkeleton() {
  return (
    <div className="relative z-raised mx-auto mt-6 grid max-w-7xl gap-8 px-4 pb-20 sm:px-6 lg:grid-cols-12">
      <div aria-busy="true" aria-label="Loading your profile" className="grid gap-4 rounded-2xl border border-line bg-surface p-8 shadow-lg lg:col-span-7">
        <Skeleton className="h-8 w-1/2" /><Skeleton /><Skeleton shape="block" className="h-24" /><Skeleton shape="block" className="h-40" />
      </div>
    </div>
  );
}

function Builder({ personId }: { personId: string }) {
  const startAtReview = useSearchParams().get("step") === "review";
  const toast = useToast();
  const [person, setPerson] = React.useState<Person | null>(null);
  const [d, setD] = React.useState<ProfileFields | null>(null);
  const [step, setStep] = React.useState(0);
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [save, setSave] = React.useState<SaveState>({ status: "idle" });
  const live = useLiveEditWarning(person?.status);
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState<{ outboxId?: string } | null>(null);
  const [preview, setPreview] = React.useState(false);
  const top = React.useRef<HTMLDivElement>(null);
  const stage = React.useRef<HTMLDivElement>(null);
  const dirty = React.useRef(false);
  const latest = React.useRef<{ d: ProfileFields | null; step: number }>({ d: null, step: 0 });
  React.useEffect(() => { latest.current = { d, step }; }, [d, step]);

  // Load the draft and resume where they left off (or jump to review with ?step=review).
  React.useEffect(() => {
    let live = true;
    void Promise.all([data.people.get(personId), data.profiles.getDraft(personId)]).then(([s, draft]) => {
      if (!live || !s || !draft) return;
      setPerson(s.person);
      setD({ ...draft.fields, name: draft.fields.name || s.person.name, month: draft.fields.month || thisMonth() });
      setStep(startAtReview ? 4 : Math.min(Math.max(draft.step, 0), 4));
      if (draft.savedAt) setSave({ status: "saved", at: draft.savedAt });
    });
    return () => { live = false; };
  }, [personId, startAtReview]);

  const flush = React.useCallback(async () => {
    const { d: fields, step: s } = latest.current;
    if (!fields || !dirty.current) return;
    dirty.current = false;
    setSave({ status: "saving" });
    try {
      const saved = await data.profiles.saveDraft(personId, fields, s);
      setSave({ status: "saved", at: saved.savedAt });
    } catch {
      dirty.current = true;
      setSave({ status: "error" });
    }
  }, [personId]);

  // Autosave a moment after the last change.
  React.useEffect(() => {
    if (!dirty.current) return;
    const t = window.setTimeout(() => void flush(), AUTOSAVE_MS);
    return () => window.clearTimeout(t);
  }, [d, flush]);
  // Save on the way out, too.
  React.useEffect(() => () => { void flush(); }, [flush]);

  if (!person || !d) return <Page bare><Intro /><BuilderSkeleton /></Page>;

  const set = <K extends keyof ProfileFields>(k: K) => (v: ProfileFields[K]) => live.guard(k, () => {
    dirty.current = true;
    setD((x) => (x ? { ...x, [k]: v } : x));
    setErrors((e) => { if (!e[k]) return e; const n = { ...e }; delete n[k]; return n; });
  });
  const err = (k: keyof ProfileFields) => errors[k];

  // Bring the card's top into view instantly (no smooth scroll racing the transition).
  const toTop = () => { const r = top.current?.getBoundingClientRect(); if (r && r.top < 0) top.current?.scrollIntoView({ block: "start" }); };
  const go = (to: number, origin?: Element | null) => {
    dirty.current = true;
    startPageTransition(() => { setStep(to); setErrors({}); toTop(); }, { effect: "shift", direction: to < step ? "back" : "forward", origin, target: stage.current });
    window.setTimeout(() => void flush(), 0);
    requestAnimationFrame(() => stage.current?.querySelector<HTMLElement>("h2")?.focus());
  };
  const focusField = (k: keyof ProfileFields) => {
    const el = document.getElementById(`f-${k}`);
    el?.focus();
    el?.scrollIntoView({ block: "center" });
  };

  const next = async (e: React.MouseEvent) => {
    // Steps never block: required answers are checked once, on Submit.
    if (step < 4) { go(step + 1, e.currentTarget); return; }
    const all = validateAll(d);
    const first = Object.keys(all).map(Number).sort()[0];
    if (first !== undefined) {
      startPageTransition(() => { setStep(first); setErrors(all[first]); toTop(); }, { effect: "shift", direction: "back", target: stage.current });
      requestAnimationFrame(() => document.getElementById("error-summary")?.focus());
      return;
    }
    setSubmitting(true);
    await flush();
    try {
      const r = await data.profiles.submit(personId);
      const outbox = await data.emails.outbox();
      setPerson(r.person);
      startPageTransition(() => { setDone({ outboxId: outbox.find((m) => m.template === "profile-submitted" && m.to === r.person.email)?.id }); toTop(); }, { effect: "shift", target: stage.current });
      toast({ message: "Profile submitted", tone: "success" });
    } catch {
      toast({ message: "We couldn't submit your profile. Try again.", tone: "danger" });
    } finally {
      setSubmitting(false);
    }
  };

  const notes = person.status === "changes_requested" ? person.reviewNotes ?? [] : [];
  const noteFor = (section: ProfileSection) => notes.filter((n) => n.section === section);
  const errorCount = Object.keys(errors).length;
  const resubmitting = person.status === "submitted" || person.status === "approved";

  return (
    <Page bare>
      <Intro />
      <div ref={top} className="scroll-mt-20" />
      <div className="relative z-raised mx-auto mt-6 grid max-w-7xl gap-8 px-4 pb-20 sm:px-6 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-7">
          {!done && step < 4 && notes.length > 0 && (
            <Banner tone="warning" className="mb-4 shadow-md" title="Changes requested">
              The Between Gigs team left {notes.length === 1 ? "a note" : `${notes.length} notes`} on your profile. You'll see each one on its step. Update those parts, then submit again.
            </Banner>
          )}
          {!done && resubmitting && (
            <Banner tone="info" className="mb-4 shadow-md" title={person.status === "approved" ? "Your profile is live" : "Your profile is with our team"}>
              {person.status === "approved" ? "Changes to your answers take your profile off the site until we review them; availability updates stay live." : "Changes save here as a draft. Submit again to send the latest version for review."}
            </Banner>
          )}
          {live.dialog}
          <div className="rounded-2xl border border-line bg-surface shadow-lg">
            {!done && (
              <div className="border-b border-line px-5 pt-5 pb-4 sm:px-8">
                <Stepper steps={[...STEPS]} current={step} onStepClick={(i) => i !== step && go(i)} />
                <div className="mt-4 flex min-h-8 items-center justify-between gap-4">
                  <SaveIndicator state={save} onRetry={() => { dirty.current = true; void flush(); }} />
                  <Button size="sm" variant="secondary" iconStart={<Eye />} className="lg:hidden" onClick={() => setPreview(true)}>Preview</Button>
                </div>
              </div>
            )}
            <div ref={stage} data-step={done ? "done" : step} className="vt-page overflow-hidden rounded-b-2xl bg-surface px-5 py-7 sm:px-8">
              {done ? (
                <Finished first={d.name.split(" ")[0] || "there"} outboxId={done.outboxId} />
              ) : (
                <>
                  <div className="mb-6">
                    <h2 tabIndex={-1} className="font-display text-display-sm text-ink outline-none">{HEADS[step][0]}<span className="sr-only">, step {step + 1} of 5</span></h2>
                    <p className="mt-1 text-body-md text-ink-muted">{HEADS[step][1]}</p>
                  </div>

                  {errorCount > 0 && (
                    <div id="error-summary" tabIndex={-1} className="mb-6 outline-none">
                      <Banner tone="danger" title={`Fix ${errorCount === 1 ? "one thing" : `${errorCount} things`} before you submit`}>
                        <ul className="mt-1 grid gap-1">
                          {(Object.entries(errors) as [keyof ProfileFields, string][]).map(([k, m]) => (
                            <li key={k}><button type="button" onClick={() => focusField(k)} className="inline-flex min-h-6 items-center text-left underline underline-offset-2 hover:text-danger">{fieldLabel[k] ?? k}: {m}</button></li>
                          ))}
                        </ul>
                      </Banner>
                    </div>
                  )}

                  {step < 4 && noteFor(SECTIONS[step]).map((n) => (
                    <Banner key={n.note} tone="warning" className="mb-6" title="Note from the Between Gigs team">{n.note}</Banner>
                  ))}

                  {step === 0 && (
                    <div className="grid gap-5">
                      <PhotoPicker id="f-photo" value={d.photo} name={d.name} onChange={set("photo")} error={err("photo")} personId={personId} confirm={(go) => live.guard("photo", go)} />
                      <div className="grid gap-5 sm:grid-cols-2 sm:items-start">
                        <Field label="Full name" error={err("name")}><Input id="f-name" autoComplete="name" value={d.name} onChange={(e) => set("name")(e.target.value)} /></Field>
                        <Field label="Years in the business" error={err("years")}><Input id="f-years" inputMode="numeric" value={d.years} placeholder="e.g. 6" onChange={(e) => set("years")(e.target.value.replace(/\D/g, "").slice(0, 2))} /></Field>
                      </div>
                      <Field label="Industry position / department" error={err("position")}><Input id="f-position" value={d.position} start={<Film />} placeholder="e.g. Costume & wardrobe" onChange={(e) => set("position")(e.target.value)} /></Field>
                      <Field label="IMDb profile link" optional error={err("imdb")} hint="Your IMDb name page, if you have one. It helps us confirm credits."><Input id="f-imdb" type="url" inputMode="url" value={d.imdb} start={<Link2 />} placeholder="https://www.imdb.com/name/nm1234567/" onChange={(e) => set("imdb")(e.target.value)} /></Field>
                      <Credits credits={d.credits} pins={d.creditPins ?? []} error={err("credits")}
                        onChange={(credits, pins) => { set("credits")(credits); set("creditPins")(pins); }} />
                    </div>
                  )}

                  {step === 1 && (
                    <div className="grid gap-7">
                      <div className="grid gap-3">
                        <p className="text-label-md text-ink">On-set skills <span className="font-normal text-ink-subtle">· your professional background</span></p>
                        <ChipPicker id="f-skills" label="On-set skills" options={onSetSkills} value={d.skills} onChange={set("skills")} invalid={!!err("skills")} describedBy={err("skills") ? "skills-error" : undefined} />
                        {err("skills") && <p id="skills-error" className="text-body-sm text-danger">{err("skills")}</p>}
                      </div>
                      <div className="grid gap-3">
                        <p className="text-label-md text-ink">Off-set services <span className="font-normal text-ink-subtle">· what you'd offer between gigs</span></p>
                        <ChipPicker id="f-services" label="Off-set services" options={offSetServices} value={d.services} onChange={set("services")} invalid={!!err("services")} describedBy={err("services") ? "services-error" : undefined} />
                        {err("services") && <p id="services-error" className="text-body-sm text-danger">{err("services")}</p>}
                      </div>
                      <Field label="Something else?" optional hint="Other services go to a private review. They don't appear on your profile or become bookable automatically.">
                        <Textarea id="f-other" rows={2} value={d.other} placeholder="Describe a service that isn't listed" onChange={(e) => set("other")(e.target.value)} />
                      </Field>
                      <Banner tone="info">Specialist production selections describe your background only. They don't establish qualifications or make regulated work bookable.</Banner>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="grid gap-5">
                      <div className="grid gap-5 sm:grid-cols-2 sm:items-start">
                        <RadioGroup name="f-market" label="Home market" orientation="horizontal" value={d.market} onChange={(v) => set("market")(v as ProfileFields["market"])} options={[{ value: "la", label: "Los Angeles" }, { value: "other", label: "Another market" }]} />
                        <Field label="Home ZIP code" error={err("zip")}><Input id="f-zip" inputMode="numeric" autoComplete="postal-code" value={d.zip} start={<MapPin />} placeholder="90026" onChange={(e) => set("zip")(e.target.value.replace(/\D/g, "").slice(0, 5))} /></Field>
                      </div>
                      {d.market === "other" ? (
                        <div className="grid gap-3">
                          <Field label="City / region and country" error={err("otherCity")}><Input id="f-otherCity" value={d.otherCity} onChange={(e) => set("otherCity")(e.target.value)} /></Field>
                          <Banner tone="info">Los Angeles is the launch market. Your profile would be held for a future market.</Banner>
                        </div>
                      ) : (
                        <div className="grid gap-3">
                          <p className="text-label-md text-ink">Los Angeles service areas <span className="font-normal text-ink-subtle">· you'll only appear in these</span></p>
                          <ChipPicker id="f-areas" label="Service areas" options={laServiceAreas} value={d.areas} onChange={set("areas")} invalid={!!err("areas")} describedBy={err("areas") ? "areas-error" : undefined} />
                          {err("areas") && <p id="areas-error" className="text-body-sm text-danger">{err("areas")}</p>}
                        </div>
                      )}
                      <Field label="Travel notes" optional hint="Only a limit or exception. No need to repeat the areas above."><Input id="f-travel" value={d.travel} onChange={(e) => set("travel")(e.target.value)} /></Field>
                      <div className="grid gap-5 sm:grid-cols-2 sm:items-start">
                        <Field label="Availability month"><Input id="f-month" value={d.month} readOnly /></Field>
                        <RadioGroup name="f-monthStatus" label="This month" value={d.monthStatus} onChange={(v) => set("monthStatus")(v as ProfileFields["monthStatus"])} options={Object.entries(monthStatusLabel).map(([value, label]) => ({ value, label }))} />
                      </div>
                      <Field label="Dates or times this month" error={err("dates")} hint="Exact project dates are agreed with each client."><Input id="f-dates" value={d.dates} placeholder="e.g. Weekday mornings" onChange={(e) => set("dates")(e.target.value)} /></Field>
                      <Banner tone="success" title="Keep availability fresh">Confirm it each month. Production comes first: pause it when the call comes.</Banner>
                      <div className="grid gap-5 sm:grid-cols-2 sm:items-start">
                        <Field label="Rate" optional hint="Final scope and rate are agreed with the client."><Input id="f-rate" inputMode="numeric" value={d.rate} start={<span className="text-label-md">$</span>} end={<span className="text-label-sm text-ink-subtle">USD</span>} onChange={(e) => set("rate")(e.target.value.replace(/\D/g, "").slice(0, 4))} /></Field>
                        <RadioGroup name="f-basis" label="Rate basis" orientation="horizontal" value={d.basis} onChange={(v) => set("basis")(v as ProfileFields["basis"])} options={Object.entries(basisLabel).map(([value, label]) => ({ value, label }))} />
                      </div>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="grid gap-5">
                      <Field label="About me" error={err("about")} hint="In your own words: your experience, the help you offer and what it's like to work with you. Line breaks show on your profile.">
                        <Textarea id="f-about" rows={6} showCount maxLength={ABOUT_MAX} value={d.about} onChange={(e) => set("about")(e.target.value)} />
                      </Field>
                      <Field label="Languages" optional><Input id="f-languages" value={d.languages} placeholder="e.g. English, Spanish" onChange={(e) => set("languages")(e.target.value)} /></Field>
                      <div className="grid gap-5 sm:grid-cols-2 sm:items-start">
                        <RadioGroup name="f-insurance" label={<>Insurance <span className="font-normal text-ink-subtle">· optional, self-reported</span></>} value={d.insurance} onChange={(v) => set("insurance")(v as ProfileFields["insurance"])} options={[{ value: "private", label: "Prefer to discuss privately" }, { value: "yes", label: "I have liability insurance" }, { value: "no", label: "No insurance" }]} />
                        <RadioGroup name="f-mode" label="Work mode" value={d.mode} onChange={(v) => set("mode")(v as ProfileFields["mode"])} options={[{ value: "on-site", label: "On site" }, { value: "studio", label: "At my studio" }, { value: "both", label: "Both" }]} />
                      </div>
                      <Field label="Tools / equipment" optional><Input id="f-tools" value={d.tools} onChange={(e) => set("tools")(e.target.value)} /></Field>
                      <Field label="Transport" optional><Input id="f-transport" value={d.transport} onChange={(e) => set("transport")(e.target.value)} /></Field>
                    </div>
                  )}

                  {step === 4 && <Review d={d} notes={notes} onEdit={go} />}

                  <div className="mt-8 flex items-center justify-between gap-3 border-t border-line pt-5">
                    {step > 0 ? <Button variant="secondary" iconStart={<ArrowLeft />} onClick={(e) => go(step - 1, e.currentTarget)}>Back<span className="max-sm:sr-only">: {STEPS[step - 1]}</span></Button> : <span />}
                    <Button variant="primary" className="glow-hover" loading={submitting} iconEnd={step === 4 ? <Sparkles /> : <ArrowRight />} onClick={next}>
                      {/* Says where it goes next, not just "Continue". */}
                      {step === 4 ? (resubmitting || notes.length ? "Submit again" : "Submit for review") : <>Next<span className="max-sm:sr-only">: {STEPS[step + 1]}</span></>}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <aside aria-label="Preview" className="hidden lg:col-span-5 lg:block">
          <div className="grid gap-4 lg:sticky lg:top-24">
            <ProfilePreviewCard fields={d} personId={personId} step={done ? undefined : step} />
            <p className="text-body-sm text-ink-subtle">This is your card as clients will see it in search. It updates as you type; the marked parts come from this step.</p>
          </div>
        </aside>
      </div>
      <Drawer open={preview} onClose={() => setPreview(false)} title="Your card" description="How clients will see you in search. It updates as you type." size="md">
        <div className="grid gap-4">
          <ProfilePreviewCard fields={d} personId={personId} step={done ? undefined : step} />
        </div>
      </Drawer>
    </Page>
  );
}

/**
 * Notable credits: up to five, in the order the Gigster wants, each pinned (shown to clients) or not.
 * Reorder by dragging the grip at the left (mouse or touch), or focus it and use the arrow keys. Pins run
 * parallel to the credits, so moving or removing a credit carries its pin with it.
 */
export function Credits({ credits, pins, error, onChange }: { credits: string[]; pins: boolean[]; error?: string; onChange: (credits: string[], pins: boolean[]) => void }) {
  const pinned = (i: number) => pins[i] !== false;
  const all = credits.map((_, i) => pinned(i));
  const rows = React.useRef<(HTMLLIElement | null)[]>([]);
  const [dragging, setDragging] = React.useState<number | null>(null);
  const [said, setSaid] = React.useState("");
  const swap = (i: number, j: number) => {
    const c = [...credits], p = [...all];
    [c[i], c[j]] = [c[j], c[i]]; [p[i], p[j]] = [p[j], p[i]];
    onChange(c, p);
  };
  // While dragging, the credit swaps with a neighbour once the pointer passes that row's middle.
  const drag = (e: React.PointerEvent) => {
    if (dragging === null) return;
    const up = rows.current[dragging - 1]?.getBoundingClientRect(), down = rows.current[dragging + 1]?.getBoundingClientRect();
    if (up && e.clientY < up.top + up.height / 2) { swap(dragging, dragging - 1); setDragging(dragging - 1); }
    else if (down && e.clientY > down.top + down.height / 2) { swap(dragging, dragging + 1); setDragging(dragging + 1); }
  };
  const drop = () => { if (dragging !== null) setSaid(`Moved to position ${dragging + 1} of ${credits.length}.`); setDragging(null); };
  const key = (e: React.KeyboardEvent, i: number) => {
    const j = e.key === "ArrowUp" ? i - 1 : e.key === "ArrowDown" ? i + 1 : -1;
    if (j < 0 || j >= credits.length) return;
    e.preventDefault();
    swap(i, j);
    setSaid(`Moved to position ${j + 1} of ${credits.length}.`);
    requestAnimationFrame(() => document.getElementById(`credit-grip-${j}`)?.focus());
  };
  const filled = credits.filter((c) => c.trim()).length;
  const shown = credits.filter((c, i) => c.trim() && pinned(i)).length;
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 text-label-md text-ink">Notable credits <span className="font-normal text-ink-subtle">· at least one, up to five</span></legend>
      <p id="credits-hint" className="mb-1 text-body-sm text-ink-muted">Put your best first: drag the grip to reorder. Only pinned credits show on your profile{filled > 1 ? ` (${shown} of ${filled} now)` : ""}.</p>
      <ol className="grid gap-2">
        {credits.map((c, i) => (
          <li key={i} ref={(el) => { rows.current[i] = el; }}
            className={cx("flex items-center gap-1.5 rounded-lg border p-1.5 transition-colors", pinned(i) ? "border-line bg-surface" : "border-dashed border-line bg-surface-sunken",
              dragging === i && "border-ink-brand bg-surface-selected shadow-md")}>
            {credits.length > 1
              ? <button type="button" id={`credit-grip-${i}`} aria-label={`Move credit ${i + 1} of ${credits.length}`} aria-describedby="credits-hint"
                  title="Drag to reorder, or use the arrow keys"
                  className={cx("grid size-10 shrink-0 touch-none place-items-center rounded-md text-ink-subtle transition-colors hover:bg-surface-hover hover:text-ink focus-visible:outline-2 focus-visible:outline-ink-brand",
                    dragging === i ? "cursor-grabbing text-ink-brand" : "cursor-grab")}
                  onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setDragging(i); }}
                  onPointerMove={drag} onPointerUp={drop} onPointerCancel={drop} onKeyDown={(e) => key(e, i)}>
                  <GripVertical className="size-5" aria-hidden="true" />
                </button>
              : <span aria-hidden="true" className="size-10 shrink-0" />}
            <Input id={i === 0 ? "f-credits" : `credit-${i}`} aria-label={`Credit ${i + 1}`} value={c} placeholder="Production · Role" className="min-w-0 flex-1" invalid={!!error && i === 0}
              aria-describedby={error && i === 0 ? "credits-error" : undefined}
              onChange={(e) => onChange(credits.map((x, j) => (j === i ? e.target.value : x)), all)} />
            <IconButton label={pinned(i) ? `Unpin credit ${i + 1}: hide it from your profile` : `Pin credit ${i + 1}: show it on your profile`} aria-pressed={pinned(i)}
              variant="ghost" className={pinned(i) ? "text-ink-brand" : "text-ink-subtle"} icon={pinned(i) ? <Pin /> : <PinOff />}
              onClick={() => onChange(credits, all.map((p, j) => (j === i ? !p : p)))} />
            {credits.length > 1 && <IconButton label={`Remove credit ${i + 1}`} variant="ghost" icon={<Trash2 />} onClick={() => onChange(credits.filter((_, j) => j !== i), all.filter((_, j) => j !== i))} />}
          </li>
        ))}
      </ol>
      <p role="status" aria-live="polite" className="sr-only">{said}</p>
      {error && <p id="credits-error" className="text-body-sm text-danger">{error}</p>}
      {credits.length < 5 && <div><Button size="sm" variant="ghost" iconStart={<Plus />} onClick={() => onChange([...credits, ""], [...all, true])}>Add a credit</Button></div>}
    </fieldset>
  );
}

export function SaveIndicator({ state, onRetry }: { state: SaveState; onRetry: () => void }) {
  return (
    <p role="status" aria-live="polite" className={cx("flex shrink-0 items-center gap-1.5 text-body-sm", state.status === "error" ? "text-danger" : "text-ink-subtle")}>
      {state.status === "saving" && <><LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />Saving…</>}
      {state.status === "saved" && <><CloudCheck className="size-4 text-success" aria-hidden="true" />Saved{state.at && <span className="hidden sm:inline">&nbsp;· {timeOf(state.at)}</span>}</>}
      {state.status === "error" && <><AlertCircle className="size-4" aria-hidden="true" />Not saved. <button type="button" onClick={onRetry} className="inline-flex min-h-6 items-center underline underline-offset-2">Retry</button></>}
      {state.status === "idle" && <span className="sr-only">Changes save automatically</span>}
    </p>
  );
}

function Review({ d, notes, onEdit }: { d: ProfileFields; notes: { section: ProfileSection; note: string }[]; onEdit: (step: number, origin?: Element | null) => void }) {
  const problems = validateAll(d);
  const none = "Not supplied";
  const rows: [string, string][][] = [
    [["Photo", d.photo ? "Added" : none], ["Name", d.name], ["Position", d.position], ["Years", d.years || none], ["IMDb", d.imdb || "Not added (optional)"], ["Credits shown", pinnedCredits(d).join(" · ") || none]],
    [["On set", d.skills.join(" · ") || none], ["Off set", [...d.services, d.other && "Other · private review"].filter(Boolean).join(" · ") || none]],
    [["Market", d.market === "la" ? `Los Angeles · ${d.zip || "no ZIP"}` : `${d.otherCity || "Another market"} · ${d.zip}`], ["Areas", d.market === "la" ? d.areas.join(" · ") || none : "Held for a future market"], ["Availability", `${d.month} · ${monthStatusLabel[d.monthStatus]}${d.dates ? ` · ${d.dates}` : ""}`], ["Rate", d.rate ? `$${d.rate} USD · ${basisLabel[d.basis]}` : none]],
    [["About me", d.about || none], ["Languages", d.languages || none], ["Insurance", insuranceLabel[d.insurance]], ["Work mode", modeLabel[d.mode]], ["Tools", d.tools || none], ["Transport", d.transport || none]],
  ];
  const ready = Object.keys(problems).length === 0;
  // Each section folds away once checked. Sections that need something stay open.
  const [closed, setClosed] = React.useState<Set<number>>(new Set());
  const toggle = (i: number) => setClosed((c) => { const n = new Set(c); if (n.has(i)) n.delete(i); else n.add(i); return n; });
  // Collapse all only folds sections that are done; anything needing changes stays in view.
  const needs = (i: number) => !!problems[i] || notes.some((n) => n.section === SECTIONS[i]);
  const foldable = SECTIONS.map((_, i) => i).filter((i) => !needs(i));
  const allClosed = foldable.length > 0 && foldable.every((i) => closed.has(i));
  return (
    <div className="grid gap-4">
      {notes.length > 0 ? (
        <Banner tone="warning" title="Changes requested">
          The Between Gigs team left {notes.length === 1 ? "a note" : `${notes.length} notes`}. Update the steps marked “Needs changes”, then submit again.{ready ? "" : " A few required details are missing too; each step lists them."}
        </Banner>
      ) : ready
        ? <Banner tone="success" title="Ready for review">Go back and edit anything. When it looks right, submit it to the Between Gigs team.</Banner>
        : <Banner tone="warning" title="A few things to finish">The steps marked below need attention before you can submit.</Banner>}
      {foldable.length > 0 && <div className="flex justify-end">
        <Button size="sm" variant="ghost" iconStart={allClosed ? <ChevronsUpDown /> : <ChevronsDownUp />}
          onClick={() => setClosed(allClosed ? new Set() : new Set(foldable))}>{allClosed ? "Expand all" : foldable.length < SECTIONS.length ? "Collapse finished sections" : "Collapse all"}</Button>
      </div>}
      {SECTIONS.map((section, i) => {
        const missing = problems[i];
        const note = notes.find((n) => n.section === section);
        const open = !closed.has(i);
        const summary = [note && "1 team note", missing && `${Object.keys(missing).length} to finish`].filter(Boolean).join(" · ");
        return (
          <section key={section} aria-labelledby={`review-${section}`} className={cx("rounded-xl border p-4", missing || note ? "border-warning" : "border-line")}>
            <div className={cx("flex flex-wrap items-center justify-between gap-2", open && "mb-2")}>
              <h3 id={`review-${section}`} className="font-display text-heading-md text-ink">
                <button type="button" aria-expanded={open} aria-controls={`review-body-${section}`} onClick={() => toggle(i)}
                  className="-my-1 -ml-1 flex min-h-11 flex-wrap items-center gap-x-2 gap-y-1 rounded-md py-1 pr-2 pl-1 text-left hover:bg-surface-hover">
                  <ChevronDown aria-hidden="true" className={cx("size-5 shrink-0 text-ink-subtle transition-transform duration-fast", !open && "-rotate-90")} />
                  <span className="text-label-md text-ink-subtle tabular-nums">0{i + 1}</span>{sectionLabel[section]}
                  {note
                    ? <Badge tone="warning" size="sm" icon={<MessageSquareWarning />}>Needs changes</Badge>
                    : missing ? <Badge tone="warning" size="sm" icon={<AlertCircle />}>Needs attention</Badge> : <Badge tone="success" size="sm" icon={<Check />}>Complete</Badge>}
                </button>
              </h3>
              {!open && summary && <span className="ml-auto text-body-sm text-warning">{summary}</span>}
              <Button size="sm" variant="ghost" iconStart={<Pencil />} aria-label={`Edit ${sectionLabel[section]}`} onClick={(e) => onEdit(i, e.currentTarget)}>Edit</Button>
            </div>
            <div id={`review-body-${section}`} hidden={!open}>
            {note && <p className="mb-3 flex gap-2 rounded-md bg-warning-soft p-2.5 text-body-sm text-ink"><MessageSquareWarning className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" /><span><b>Team note:</b> {note.note}</span></p>}
            {missing && <ul className="mb-3 grid gap-1 text-body-sm text-warning">{Object.entries(missing).map(([k, m]) => <li key={k}>{fieldLabel[k as keyof ProfileFields]}: {m}</li>)}</ul>}
            <dl className="grid gap-2">
              {rows[i].map(([k, v]) => (
                <div key={k} className="grid gap-1 sm:grid-cols-4"><dt className="text-label-sm text-ink-subtle">{k}</dt><dd className="text-body-md break-words text-ink sm:col-span-3">{v}</dd></div>
              ))}
            </dl>
            </div>
          </section>
        );
      })}
      <p className="text-body-sm text-ink-muted">Going live needs approval from the Between Gigs team, a current available status, an active market and a matching service area.</p>
    </div>
  );
}

function Finished({ first, outboxId }: { first: string; outboxId?: string }) {
  return (
    <div className="grid justify-items-center gap-5 py-10 text-center">
      <Reveal effect="scale-in" className="grid size-20 place-items-center rounded-full bg-action text-on-action shadow-md">
        <Check className="size-10" aria-hidden="true" />
      </Reveal>
      <h2 tabIndex={-1} className="font-display text-display-md text-balance text-ink outline-none">You're in the queue, {first}.</h2>
      <p className="max-w-md text-body-lg text-ink-muted">Thank you. Our team reviews every profile before it goes live, and we'll email you when it's approved or if we suggest a change.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <ButtonLink href="/profile/" variant="primary" iconStart={<Eye />}>See my profile</ButtonLink>
        {outboxId && <ButtonLink href={`/emails/profile-submitted/?outbox=${outboxId}`} iconStart={<Inbox />}>See the confirmation email</ButtonLink>}
      </div>
      {outboxId && <p className="text-body-sm text-ink-subtle">Sample mode: the email is in the <Link href="/emails/" className="text-link underline underline-offset-2">sample outbox</Link>, not your inbox.</p>}
    </div>
  );
}
