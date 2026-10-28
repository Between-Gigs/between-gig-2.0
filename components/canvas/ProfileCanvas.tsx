"use client";
import { Badge, Banner, Button, Field, Input, RadioGroup, SegmentedControl, Skeleton, Slider, Textarea, cx, useToast } from "@ds/components";
import { Reveal, startPageTransition } from "@ds/motion";
import { ArrowRight, Calendar, Check, Eye, ListChecks, MapPin, MessageSquareWarning, PartyPopper, PenLine, Pencil, Plus, Sparkles, Wallet, WandSparkles } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { data, type Person, type ProfileFields, type ProfileSection } from "@/lib/data";
import { basisLabel, basisShort, insuranceLabel, laServiceAreas, modeLabel, monthStatusLabel, offSetServices, onSetSkills } from "@/lib/data/taxonomy";
import { useRequireRole } from "@/lib/guard";
import { ABOUT_MAX, completeness, pinnedCredits, sectionLabel, validateAll, type FieldErrors } from "@/lib/profile/validate";
import { Credits, SaveIndicator, type SaveState } from "@/components/builder/ProfileBuilder";
import { PersonPhoto } from "@/components/people/PersonPhoto";
import { ChipPicker } from "@/components/profile/ChipPicker";
import { PhotoPicker } from "@/components/profile/PhotoPicker";
import { ProfilePreviewCard } from "@/components/profile/ProfilePreviewCard";
import { ProfileView } from "@/components/profile/ProfileView";
import { Page } from "@/components/site/Page";
import { ButtonLink } from "@/components/ui/ButtonLink";

/*
 * /profile/canvas/: onboarding as editing. The Gigster lands on their own profile, blank, in the layout clients will
 * see, and fills it in place. Every part is a "spot": dashed while empty, one tap to edit right where it sits. The next
 * spot to fill glows, "Next" carries them through the rest, and a client view shows the finished page at any time.
 * Same draft, autosave and submit checks as the questionnaire (/profile/edit/), so people can switch between the two.
 */

type SpotId = "photo" | "name" | "position" | "years" | "services" | "skills" | "where" | "availability" | "rate" | "about" | "credits" | "imdb" | "languages" | "details";

const AUTOSAVE_MS = 700;
const thisMonth = () => new Date().toLocaleString("en-US", { month: "long", year: "numeric" });

/** The order the page leads them through. Required spots first; optional ones only when tapped or reached by Next. */
const ORDER: SpotId[] = ["photo", "name", "position", "years", "services", "skills", "where", "availability", "rate", "about", "credits", "imdb", "languages", "details"];
const REQUIRED: SpotId[] = ["photo", "name", "position", "years", "services", "skills", "where", "availability", "about", "credits"];
const LABEL: Record<SpotId, string> = {
  photo: "Your photo", name: "Your name", position: "Your department", years: "Years in the business", services: "Services you offer",
  skills: "On-set skills", where: "Where you work", availability: "This month", rate: "Starting rate", about: "About me",
  credits: "Notable credits", imdb: "IMDb link", languages: "Languages", details: "Work details",
};
/** Which spot shows each field's submit error. */
const FIELD_SPOT: Partial<Record<keyof ProfileFields, SpotId>> = {
  photo: "photo", name: "name", years: "years", position: "position", imdb: "imdb", credits: "credits", skills: "skills",
  services: "services", other: "services", market: "where", otherCity: "where", zip: "where", areas: "where", dates: "availability", about: "about",
};
/** The team's review notes are per questionnaire section; this is where each lands on the page. */
const SECTION_SPOT: Record<ProfileSection, SpotId> = { about: "position", skills: "services", where: "where", story: "about" };

function isFilled(id: SpotId, d: ProfileFields): boolean {
  switch (id) {
    case "photo": return !!d.photo;
    case "name": return !!d.name.trim();
    case "position": return !!d.position.trim();
    case "years": return d.years !== "";
    case "services": return d.services.length > 0 || !!d.other.trim();
    case "skills": return d.skills.length > 0;
    case "where": return /^\d{5}$/.test(d.zip) && (d.market === "other" ? !!d.otherCity.trim() : d.areas.length > 0);
    case "availability": return !!d.dates.trim();
    case "rate": return !!d.rate;
    case "about": return !!d.about.trim();
    case "credits": return d.credits.some((c) => c.trim());
    case "imdb": return !!d.imdb.trim();
    case "languages": return !!d.languages.trim();
    case "details": return !!(d.tools.trim() || d.transport.trim());
  }
}

/** A first About me written from their own answers, offered when the box is empty. They edit it from there. */
function starterAbout(d: ProfileFields): string {
  const role = (d.position || d.skills[0] || "film and TV").toLowerCase();
  const credit = pinnedCredits(d)[0]?.split("·")[0]?.trim();
  const services = d.services.slice(0, 2).map((s) => s.toLowerCase()).join(" and ");
  const where = d.market === "la" && d.areas.length ? ` around ${d.areas.slice(0, 2).join(" and ")}` : "";
  return [
    `I've spent ${d.years ? `${d.years} years` : "years"} in ${role}${credit ? `, on productions like ${credit}` : ""}.`,
    services ? `Between gigs, I help with ${services}${where}.` : `Between gigs, I bring the same care to projects${where}.`,
    "On set you learn to work fast, stay calm and leave every space better than you found it. That's how I work with clients, too.",
  ].join("\n\n");
}

interface Ctx {
  d: ProfileFields;
  editing: SpotId | null;
  next: SpotId | null;
  fresh: SpotId | null;
  errors: Partial<Record<SpotId, string[]>>;
  noted: Partial<Record<SpotId, string>>;
  open: (id: SpotId) => void;
  close: () => void;
  advance: (from: SpotId) => void;
}
const CanvasCtx = React.createContext<Ctx | null>(null);
const useCanvas = () => React.useContext(CanvasCtx)!;

export function ProfileCanvas() {
  const session = useRequireRole("gigster");
  return session?.personId ? <Canvas personId={session.personId} /> : <Page bare><Band /><CanvasSkeleton /></Page>;
}

function Band({ children }: { children?: React.ReactNode }) {
  return (
    <section data-theme="dark" className="relative isolate overflow-hidden bg-surface-brand phosphor-dots">
      <span aria-hidden="true" className="glow-horizon opacity-40" />
      <div className="relative z-raised mx-auto max-w-7xl px-4 py-5 sm:px-6">
        {children ?? <h1 className="font-display text-heading-lg text-ink">Your profile</h1>}
      </div>
    </section>
  );
}

function CanvasSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your profile" className="mx-auto mt-8 grid max-w-7xl gap-8 px-4 pb-20 sm:px-6 lg:grid-cols-12">
      <div className="grid gap-6 lg:col-span-8 sm:grid-cols-12">
        <Skeleton shape="block" className="aspect-square sm:col-span-5" />
        <div className="grid content-end gap-3 sm:col-span-7"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-12 w-3/4" /><Skeleton /><Skeleton /></div>
      </div>
      <Skeleton shape="block" className="h-80 lg:col-span-4" />
    </div>
  );
}

function Canvas({ personId }: { personId: string }) {
  const toast = useToast();
  const [person, setPerson] = React.useState<Person | null>(null);
  const [d, setD] = React.useState<ProfileFields | null>(null);
  const [editing, setEditing] = React.useState<SpotId | null>(null);
  const [fresh, setFresh] = React.useState<SpotId | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [save, setSave] = React.useState<SaveState>({ status: "idle" });
  const [view, setView] = React.useState<"edit" | "client">("edit");
  const [submitting, setSubmitting] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [party, setParty] = React.useState(0);
  const stage = React.useRef<HTMLDivElement>(null);
  const dirty = React.useRef(false);
  const step = React.useRef(0);
  const latest = React.useRef<ProfileFields | null>(null);
  React.useEffect(() => { latest.current = d; }, [d]);

  React.useEffect(() => {
    let live = true;
    void Promise.all([data.people.get(personId), data.profiles.getDraft(personId)]).then(([s, draft]) => {
      if (!live || !s || !draft) return;
      setPerson(s.person);
      step.current = draft.step;
      setD({ ...draft.fields, name: draft.fields.name || s.person.name, month: draft.fields.month || thisMonth() });
      if (draft.savedAt) setSave({ status: "saved", at: draft.savedAt });
    });
    return () => { live = false; };
  }, [personId]);

  const flush = React.useCallback(async () => {
    const fields = latest.current;
    if (!fields || !dirty.current) return;
    dirty.current = false;
    setSave({ status: "saving" });
    try {
      const saved = await data.profiles.saveDraft(personId, fields, step.current);
      setSave({ status: "saved", at: saved.savedAt });
    } catch {
      dirty.current = true;
      setSave({ status: "error" });
    }
  }, [personId]);
  React.useEffect(() => {
    if (!dirty.current) return;
    const t = window.setTimeout(() => void flush(), AUTOSAVE_MS);
    return () => window.clearTimeout(t);
  }, [d, flush]);
  React.useEffect(() => () => { void flush(); }, [flush]);

  const done = d ? REQUIRED.filter((id) => isFilled(id, d)).length : 0;
  const ready = done === REQUIRED.length;

  // Milestones: a word of encouragement halfway, and a small celebration when every required spot is in.
  const lastDone = React.useRef<number | null>(null);
  React.useEffect(() => {
    if (!d) return;
    const before = lastDone.current;
    lastDone.current = done;
    if (before === null || done <= before) return;
    if (done === REQUIRED.length) { setParty((n) => n + 1); toast({ message: "Everything's in. Look at it as a client sees it, then send it.", tone: "success" }); } // eslint-disable-line react-hooks/set-state-in-effect
    else if (before < REQUIRED.length / 2 && done >= REQUIRED.length / 2) toast({ message: "Halfway there. Your profile is taking shape.", tone: "success" });
  }, [done, d, toast]);

  if (!person || !d) return <Page bare><Band /><CanvasSkeleton /></Page>;

  const set = <K extends keyof ProfileFields>(k: K) => (v: ProfileFields[K]) => {
    dirty.current = true;
    setD((x) => (x ? { ...x, [k]: v } : x));
    setFieldErrors((e) => { if (!e[k]) return e; const n = { ...e }; delete n[k]; return n; });
  };

  const nextOf = (from?: SpotId): SpotId | null => {
    const start = from ? ORDER.indexOf(from) + 1 : 0;
    const rest = [...ORDER.slice(start), ...ORDER.slice(0, start)].filter((id) => id !== from);
    return rest.find((id) => REQUIRED.includes(id) && !isFilled(id, d)) ?? null;
  };
  const next = nextOf();

  const reveal = (id: SpotId) => requestAnimationFrame(() => {
    const el = document.querySelector<HTMLElement>(`[data-spot="${id}"]`);
    el?.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    el?.querySelector<HTMLElement>("input:not([type=hidden]), textarea, button[aria-pressed], [role=radio], button")?.focus({ preventScroll: true });
  });
  const open = (id: SpotId) => {
    if (view !== "edit") setView("edit");
    setEditing(id);
    reveal(id);
  };
  const close = () => {
    const was = editing;
    setEditing(null);
    void flush();
    if (was && isFilled(was, d)) setFresh(was);
    if (was) requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-spot="${was}"] [data-spot-edit]`)?.focus({ preventScroll: true }));
  };
  const advance = (from: SpotId) => {
    if (isFilled(from, d)) setFresh(from);
    void flush();
    const to = nextOf(from);
    if (to) open(to); else { setEditing(null); toast({ message: "That's every spot. Look it over, then send it.", tone: "success" }); }
  };

  // Field errors from Submit, gathered on the spot that holds the field.
  const errors: Partial<Record<SpotId, string[]>> = {};
  for (const [k, m] of Object.entries(fieldErrors) as [keyof ProfileFields, string][]) {
    const s = FIELD_SPOT[k];
    if (s && m) (errors[s] ??= []).push(m);
  }
  const notes = person.status === "changes_requested" ? person.reviewNotes ?? [] : [];
  const noted: Partial<Record<SpotId, string>> = {};
  for (const n of notes) noted[SECTION_SPOT[n.section]] = n.note;

  const switchView = (v: string) => {
    setEditing(null);
    startPageTransition(() => { setView(v as "edit" | "client"); window.scrollTo({ top: 0 }); }, { effect: "flip", target: stage.current });
  };

  const submit = async () => {
    const all = validateAll(d);
    const merged = Object.assign({}, ...Object.values(all)) as FieldErrors;
    if (Object.keys(merged).length) {
      setFieldErrors(merged);
      const first = ORDER.find((id) => Object.entries(merged).some(([k]) => FIELD_SPOT[k as keyof ProfileFields] === id));
      const n = Object.keys(merged).length;
      toast({ message: `${n === 1 ? "One thing" : `${n} things`} to finish first. We've opened the first one.`, tone: "neutral" });
      if (first) open(first);
      return;
    }
    setSubmitting(true);
    setEditing(null);
    dirty.current = true;
    await flush();
    try {
      const r = await data.profiles.submit(personId);
      setPerson(r.person);
      setParty((n) => n + 1);
      startPageTransition(() => { setSent(true); setView("client"); window.scrollTo({ top: 0 }); }, { effect: "zoom", target: stage.current });
    } catch {
      toast({ message: "We couldn't send your profile. Try again.", tone: "danger" });
    } finally {
      setSubmitting(false);
    }
  };

  const resubmit = person.status === "submitted" || person.status === "approved" || notes.length > 0;
  const first = d.name.split(" ")[0] || "there";
  const ctx: Ctx = { d, editing, next, fresh, errors, noted, open, close, advance };

  return (
    <Page bare>
      <Band>
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="grid gap-1">
            <p className="text-eyebrow text-ink-brand uppercase">New editor</p>
            <h1 className="font-display text-heading-lg text-ink sm:text-display-sm">{done <= 1 && !sent ? `This is your profile, ${first}. Make it yours.` : sent ? "Sent to the Between Gigs team" : `Your profile, ${first}`}</h1>
            <p className="max-w-2xl text-body-md text-ink-muted">{sent
              ? "We review every profile before it goes live and email you when it's approved or if we suggest a change."
              : "It's the page clients will see. Tap any dashed spot to fill it in right where it sits; the glowing one is next. It saves as you go."}</p>
          </div>
          {!sent && <Link href="/profile/edit/" className="inline-flex min-h-11 items-center gap-1.5 text-body-sm text-ink-muted underline underline-offset-2 hover:text-ink">
            <ListChecks className="size-4" aria-hidden="true" />Prefer questions, step by step?
          </Link>}
        </div>
      </Band>

      <StageBar done={done} total={REQUIRED.length} ready={ready} save={save} view={view} editing={!!editing} sent={sent} submitting={submitting} resubmit={resubmit}
        onRetry={() => { dirty.current = true; void flush(); }} onView={switchView} onNext={() => next && open(next)} onSubmit={submit} />

      <div ref={stage} className="vt-page relative mx-auto max-w-7xl px-4 pt-8 pb-24 sm:px-6">
        {party > 0 && <Confetti key={party} />}
        {view === "client" ? (
          <div className="grid gap-6">
            {sent ? (
              <Reveal effect="scale-in" className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface p-5 shadow-lg">
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-action text-on-action"><PartyPopper className="size-6" aria-hidden="true" /></span>
                <div className="min-w-0 flex-1">
                  <h2 tabIndex={-1} className="font-display text-heading-lg text-ink outline-none">You're in the queue, {first}.</h2>
                  <p className="text-body-md text-ink-muted">This is the page clients will see once it's approved. You can still edit it; changes save as a draft until you send them again.</p>
                </div>
                <ButtonLink href="/profile/" iconEnd={<ArrowRight />}>Go to My profile</ButtonLink>
              </Reveal>
            ) : (
              <Banner tone="info" title="Client view">This is exactly what clients will see. Switch back to Edit to change anything.</Banner>
            )}
            <ProfileView person={person} fields={d} mode="own" />
          </div>
        ) : (
          <CanvasCtx.Provider value={ctx}>
            {notes.length > 0 && (
              <Banner tone="warning" className="mb-6" title="Changes requested">
                The Between Gigs team left {notes.length === 1 ? "a note" : `${notes.length} notes`}. Each one is pinned to the part it's about.
                <ul className="mt-2 flex flex-wrap gap-2">
                  {notes.map((n) => <li key={n.note}><Button size="sm" variant="secondary" iconStart={<MessageSquareWarning />} onClick={() => open(SECTION_SPOT[n.section])}>{sectionLabel[n.section]}</Button></li>)}
                </ul>
              </Banner>
            )}
            <EditView d={d} set={set} personId={personId} />
          </CanvasCtx.Provider>
        )}
      </div>
    </Page>
  );
}

function StageBar({ done, total, ready, save, view, editing, sent, submitting, resubmit, onRetry, onView, onNext, onSubmit }: {
  done: number; total: number; ready: boolean; save: SaveState; view: "edit" | "client"; editing: boolean; sent: boolean; submitting: boolean; resubmit: boolean;
  onRetry: () => void; onView: (v: string) => void; onNext: () => void; onSubmit: () => void;
}) {
  const pct = Math.round((done / total) * 100);
  const line = ready ? "Ready to send" : done === 0 ? "Start anywhere" : done < total / 2 ? "Taking shape" : "Nearly there";
  return (
    <div className="z-sticky border-b border-line bg-bg/90 backdrop-blur-md sm:sticky sm:top-16">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span role="img" aria-label={`${done} of ${total} required parts filled`} style={{ "--p": pct } as React.CSSProperties}
            className="progress-ring grid size-11 shrink-0 place-items-center rounded-full">
            <span className="grid size-9 place-items-center rounded-full bg-bg text-label-sm text-ink tabular-nums">{ready ? <Check className="size-4 text-ink-brand" aria-hidden="true" /> : `${done}/${total}`}</span>
          </span>
          <span className="grid">
            <b className="text-label-md text-ink">{sent ? "Sent for review" : line}</b>
            <SaveIndicator state={save} onRetry={onRetry} />
          </span>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <SegmentedControl label="View" size="sm" value={view} onChange={onView}
            options={[{ value: "edit", label: "Edit", icon: <PenLine /> }, { value: "client", label: "Client view", icon: <Eye /> }]} />
          {!ready && !sent && <Button size="sm" variant="secondary" iconStart={<Sparkles />} onClick={onNext}>Next spot</Button>}
          {!sent && <Button size="sm" variant={ready && !editing ? "primary" : "secondary"} className={cx(ready && "glow-hover")} loading={submitting} iconEnd={<ArrowRight />} onClick={onSubmit}>
            {resubmit ? "Send again" : "Send for review"}
          </Button>}
        </div>
      </div>
    </div>
  );
}

/** The profile, laid out like the public page (ProfileView), with every part a spot. */
function EditView({ d, set, personId }: { d: ProfileFields; set: <K extends keyof ProfileFields>(k: K) => (v: ProfileFields[K]) => void; personId: string }) {
  const { open, next, editing, close } = useCanvas();
  const rate = d.rate ? `$${d.rate}/${basisShort[d.basis]}` : null;
  const where = d.market === "la" ? (d.areas.length ? `${d.areas.join(" · ")}, Los Angeles area` : "") : d.otherCity;
  const credits = pinnedCredits(d);
  const done = REQUIRED.filter((id) => isFilled(id, d)).length;

  return (
    <div data-client-locked="" className="approved-type relative grid gap-10 lg:grid-cols-12">
      {/* Spotlight: while a spot is open the rest of the page steps back, except the search card, which updates as they type. */}
      {editing && <div aria-hidden="true" onClick={close} className="fixed inset-0 z-raised bg-bg/60 backdrop-blur-xs" />}
      <div className="min-w-0 lg:col-span-8">
        <section aria-label="Introduction" className="grid gap-6 sm:grid-cols-12 sm:items-end">
          <Spot id="photo" className="max-w-72 sm:col-span-5 sm:max-w-none" round="rounded-2xl"
            empty={<span className="relative block aspect-square overflow-hidden rounded-2xl">
              <PersonPhoto id={personId} name={d.name} fallback="brand" department={d.position} skills={d.skills} alt="" className="size-full" />
              <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-surface-brand/80 p-3 text-label-md text-ink-on-brand backdrop-blur-sm"><Plus className="size-4" aria-hidden="true" />Add your photo</span>
            </span>}
            editor={<PhotoPicker id="f-photo" value={d.photo} name={d.name} onChange={set("photo")} />}>
            <span className="relative block">
              <PersonPhoto id={personId} name={d.name} src={d.photo} alt="" className="aspect-square w-full rounded-2xl shadow-lg ring-1 ring-line" />
              <Badge tone={d.monthStatus === "available" ? "success" : d.monthStatus === "limited" ? "info" : "neutral"} className="absolute top-3 left-3 shadow-sm">{monthStatusLabel[d.monthStatus]}</Badge>
            </span>
          </Spot>
          <div className="grid min-w-0 gap-2 sm:col-span-7">
            <Spot id="position" inline empty="Your department, like Costume & wardrobe"
              editor={<>
                <Field label="Industry position / department" hint="Type your own, or tap one to start from."><Input id="f-position" value={d.position} placeholder="e.g. Costume & wardrobe" onChange={(e) => set("position")(e.target.value)} /></Field>
                <Quick options={onSetSkills} onPick={set("position")} current={d.position} />
              </>}>
              <p className="text-eyebrow text-ink-brand uppercase">{d.position}</p>
            </Spot>
            <Spot id="name" inline empty={<span className="font-display text-display-sm">Your name</span>}
              editor={<Field label="Full name"><Input id="f-name" size="lg" autoComplete="name" value={d.name} onChange={(e) => set("name")(e.target.value)} /></Field>}>
              <h2 className="font-display text-display-md break-words text-ink sm:text-display-lg">{d.name}</h2>
            </Spot>
            <p className={cx("text-body-lg", d.services.length ? "text-ink-muted" : "text-ink-subtle italic")}>{d.services.length ? d.services.slice(0, 3).join(" · ") : "Your services will show here"}</p>
            <ul className="mt-2 grid gap-1.5 text-body-md text-ink">
              <li><Spot id="where" inline icon={<MapPin />} empty="Where you work"
                editor={<WhereEditor d={d} set={set} />}>
                <span className="flex items-start gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-ink-brand" aria-hidden="true" />{where}</span>
              </Spot></li>
              <li><Spot id="rate" inline icon={<Wallet />} empty="Your starting rate (optional)"
                editor={<div className="grid gap-4 sm:grid-cols-2 sm:items-start">
                  <Field label="Rate" optional hint="Final scope and rate are agreed with each client."><Input id="f-rate" inputMode="numeric" value={d.rate} start={<span className="text-label-md">$</span>} end={<span className="text-label-sm text-ink-subtle">USD</span>} onChange={(e) => set("rate")(e.target.value.replace(/\D/g, "").slice(0, 4))} /></Field>
                  <RadioGroup name="f-basis" label="Rate basis" value={d.basis} onChange={(v) => set("basis")(v as ProfileFields["basis"])} options={Object.entries(basisLabel).map(([value, label]) => ({ value, label }))} />
                </div>}>
                <span className="flex items-start gap-2"><Wallet className="mt-0.5 size-4 shrink-0 text-ink-brand" aria-hidden="true" />{rate && <span>From <b>{rate}</b> · scope agreed together</span>}</span>
              </Spot></li>
              <li><Spot id="availability" inline icon={<Calendar />} empty="When you're free this month"
                editor={<div className="grid gap-4">
                  <RadioGroup name="f-monthStatus" label={`This month · ${d.month}`} value={d.monthStatus} onChange={(v) => set("monthStatus")(v as ProfileFields["monthStatus"])} options={Object.entries(monthStatusLabel).map(([value, label]) => ({ value, label }))} />
                  <Field label="Dates or times this month" hint="Exact project dates are agreed with each client."><Input id="f-dates" value={d.dates} placeholder="e.g. Weekday mornings" onChange={(e) => set("dates")(e.target.value)} /></Field>
                  <Quick options={["Weekday mornings", "Weekday evenings", "Weekends", "Most days", "Between shoots, ask me"]} onPick={set("dates")} current={d.dates} />
                </div>}>
                <span className="flex items-start gap-2"><Calendar className="mt-0.5 size-4 shrink-0 text-ink-brand" aria-hidden="true" />{monthStatusLabel[d.monthStatus]}{d.dates && ` · ${d.dates}`}</span>
              </Spot></li>
            </ul>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Spot id="years" inline empty="Years in the business"
                editor={<YearsEditor value={d.years} onChange={set("years")} />}>
                <Badge tone="neutral" size="sm">{d.position || "In the business"} · {d.years} {d.years === "1" ? "year" : "years"}</Badge>
              </Spot>
              <Badge tone="warning" size="sm">Credits not verified</Badge>
            </div>
          </div>
        </section>

        <Block title="About me" hint="In your own words: your experience, the help you offer and what it's like to work with you.">
          <Spot id="about" empty="Write a few lines about you. We can start you off with a first draft from your answers."
            editor={<AboutEditor d={d} onChange={set("about")} />}>
            <p className="font-serif text-editorial-lg whitespace-pre-line text-ink">{d.about}</p>
          </Spot>
          <div className="mt-4">
            <Spot id="languages" inline empty="Languages you speak (optional)"
              editor={<Field label="Languages" optional><Input id="f-languages" value={d.languages} placeholder="e.g. English, Spanish" onChange={(e) => set("languages")(e.target.value)} /></Field>}>
              <p className="text-body-md text-ink-muted"><b className="text-ink">Languages</b> · {d.languages}</p>
            </Spot>
          </div>
        </Block>

        <Block title="Services" hint="What you'd offer clients between gigs. Tap everything that fits.">
          <Spot id="services" empty="Pick the services you'd offer"
            editor={<>
              <ChipPicker id="f-services" label="Off-set services" options={offSetServices} value={d.services} onChange={set("services")} />
              <Field label="Something else?" optional hint="Other services go to a private review. They don't appear on your profile automatically."><Textarea id="f-other" rows={2} value={d.other} onChange={(e) => set("other")(e.target.value)} /></Field>
            </>}>
            <ul className="grid gap-3 sm:grid-cols-2">
              {d.services.map((s) => (
                <li key={s} className="rounded-2xl border border-line bg-surface p-4">
                  <h3 className="font-display text-heading-md text-ink">{s}</h3>
                  <p className="text-body-sm text-ink-muted">{rate ? <>From <b className="text-ink">{rate}</b> · </> : null}Discuss scope and details</p>
                </li>
              ))}
              {d.other.trim() && <li className="rounded-2xl border border-dashed border-line bg-surface-sunken p-4 text-body-sm text-ink-muted">Something else, in private review: {d.other}</li>}
            </ul>
          </Spot>
        </Block>

        <Block title="Professional experience" hint="Your background on set. It tells clients why your work is good.">
          <div className="grid gap-4 md:grid-cols-2">
            <Spot id="skills" empty="Your on-set skills"
              editor={<ChipPicker id="f-skills" label="On-set skills" options={onSetSkills} value={d.skills} onChange={set("skills")} />}>
              <div className="rounded-2xl border border-line bg-surface p-5">
                <h3 className="text-label-md text-ink">On set</h3>
                <p className="mt-1 text-body-md text-ink-muted">{d.skills.join(" · ")}{d.years && ` · ${d.years} years in the business`}</p>
              </div>
            </Spot>
            <Spot id="credits" empty="Your notable credits, best first"
              editor={<Credits credits={d.credits} pins={d.creditPins ?? []} onChange={(c, p) => { set("credits")(c); set("creditPins")(p); }} />}>
              <div className="rounded-2xl border border-line bg-surface p-5">
                <h3 className="text-label-md text-ink">Selected credits</h3>
                <ul className="mt-1 grid gap-1 text-body-sm text-ink-muted">{credits.map((c) => <li key={c}>{c}</li>)}</ul>
              </div>
            </Spot>
          </div>
          <div className="mt-4">
            <Spot id="imdb" inline empty="Your IMDb link (optional, only the team sees it)"
              editor={<Field label="IMDb profile link" optional hint="Your IMDb name page. It helps us confirm credits; clients don't see it."><Input id="f-imdb" type="url" inputMode="url" value={d.imdb} placeholder="https://www.imdb.com/name/nm1234567/" onChange={(e) => set("imdb")(e.target.value)} /></Field>}>
              <p className="text-body-sm text-ink-muted"><b className="text-ink">IMDb</b> · {d.imdb} <span className="text-ink-subtle">(only the team sees this)</span></p>
            </Spot>
          </div>
        </Block>

        <Block title="Work details" hint="Optional. They set expectations before anyone books.">
          <Spot id="details" empty="Tools, transport, insurance and how you work (optional)"
            editor={<div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
                <RadioGroup name="f-mode" label="Work mode" value={d.mode} onChange={(v) => set("mode")(v as ProfileFields["mode"])} options={[{ value: "on-site", label: "On site" }, { value: "studio", label: "At my studio" }, { value: "both", label: "Both" }]} />
                <RadioGroup name="f-insurance" label="Insurance · self-reported" value={d.insurance} onChange={(v) => set("insurance")(v as ProfileFields["insurance"])} options={[{ value: "private", label: "Prefer to discuss privately" }, { value: "yes", label: "I have liability insurance" }, { value: "no", label: "No insurance" }]} />
              </div>
              <Field label="Tools / equipment" optional><Input id="f-tools" value={d.tools} onChange={(e) => set("tools")(e.target.value)} /></Field>
              <Field label="Transport" optional><Input id="f-transport" value={d.transport} onChange={(e) => set("transport")(e.target.value)} /></Field>
            </div>}>
            <dl className="grid gap-3 rounded-2xl border border-line bg-surface p-5 sm:grid-cols-2">
              {([["Work mode", modeLabel[d.mode]], ["Insurance", insuranceLabel[d.insurance]], ["Tools & equipment", d.tools], ["Transport", d.transport]] as [string, string][]).filter(([, v]) => v).map(([k, v]) => (
                <div key={k}><dt className="text-label-sm text-ink-subtle">{k}</dt><dd className="text-body-md text-ink-muted">{v}</dd></div>
              ))}
            </dl>
          </Spot>
        </Block>
      </div>

      <aside aria-label="Checklist and search card" className="relative lg:col-span-4" style={editing ? { zIndex: 20 } : undefined}>
        <div className="grid gap-5 lg:sticky lg:top-36">
          <section aria-labelledby="canvas-list-h" className="rounded-2xl border border-line bg-surface p-5 shadow-lg">
            <div className="flex items-baseline justify-between gap-2">
              <h2 id="canvas-list-h" className="font-display text-heading-lg text-ink">Your profile</h2>
              <span className="text-label-md text-ink-subtle tabular-nums">{done} of {REQUIRED.length}</span>
            </div>
            <ol className="mt-3 grid gap-0.5">
              {REQUIRED.map((id) => {
                const ok = isFilled(id, d);
                return (
                  <li key={id}>
                    <button type="button" onClick={() => open(id)} className={cx("flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2 text-left text-body-md transition-colors duration-fast hover:bg-surface-hover",
                      id === next ? "text-ink" : ok ? "text-ink-muted" : "text-ink-muted")}>
                      <span aria-hidden="true" className={cx("grid size-6 shrink-0 place-items-center rounded-full border", ok ? "border-ink-brand bg-ink-brand text-bg" : id === next ? "border-ink-brand text-ink-brand" : "border-line-strong")}>
                        {ok ? <Check className="size-3.5" /> : id === next ? <ArrowRight className="size-3.5" /> : null}
                      </span>
                      <span className="flex-1">{LABEL[id]}</span>
                      <span className="sr-only">{ok ? ", done" : ", to fill in"}</span>
                      {id === next && <Badge tone="success" size="sm">Next</Badge>}
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>
          <section aria-labelledby="canvas-card-h" className="grid gap-3">
            <h2 id="canvas-card-h" className="text-label-md text-ink-subtle">How you'll appear in search</h2>
            <ProfilePreviewCard fields={d} personId={personId} badge={completeness(d) === 1 ? "Ready" : "Live preview"} />
          </section>
        </div>
      </aside>
    </div>
  );
}

function Block({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <section className="pt-14">
      <div className="mb-5 grid gap-1">
        <h2 className="font-display text-display-sm text-ink">{title}</h2>
        <p className="text-body-sm text-ink-subtle">{hint}</p>
      </div>
      {children}
    </section>
  );
}

/**
 * One editable part of the profile. Empty: a dashed spot that says what goes there. Filled: the content as clients see
 * it, outlined with an Edit tag on hover. Editing: the controls open in place, with Next to carry on.
 */
function Spot({ id, children, empty, editor, inline = false, className, round = inline ? "rounded-lg" : "rounded-2xl" }: {
  id: SpotId; children: React.ReactNode; empty: React.ReactNode; editor: React.ReactNode; inline?: boolean; className?: string; round?: string; icon?: React.ReactNode;
}) {
  const { d, editing, next, fresh, errors, noted, open, close, advance } = useCanvas();
  const filled = isFilled(id, d);
  const err = errors[id];
  const note = noted[id];
  const required = REQUIRED.includes(id);

  if (editing === id) {
    const after = ORDER.slice(ORDER.indexOf(id) + 1).find((x) => REQUIRED.includes(x) && !isFilled(x, d));
    return (
      <div data-spot={id} role="group" aria-label={`Editing: ${LABEL[id]}`} onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); close(); } }}
        style={{ zIndex: 20 }} className={cx("relative grid gap-4 rounded-2xl border border-ink-brand bg-surface-raised p-4 shadow-lg sm:p-5", className)}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="flex items-center gap-2 text-label-md text-ink-brand"><Pencil className="size-4" aria-hidden="true" />{LABEL[id]}{!required && <span className="font-normal text-ink-subtle">· optional</span>}</p>
          <span className="text-caption text-ink-subtle max-sm:hidden">Esc to close</span>
        </div>
        {note && <p className="flex gap-2 rounded-md bg-warning-soft p-2.5 text-body-sm text-ink"><MessageSquareWarning className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" /><span><b>Team note:</b> {note}</span></p>}
        {editor}
        {err && <ul className="grid gap-1 text-body-sm text-danger">{err.map((m) => <li key={m}>{m}</li>)}</ul>}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-3">
          <Button size="sm" variant="ghost" onClick={close}>Close</Button>
          <Button size="sm" variant="primary" iconEnd={<ArrowRight />} onClick={() => advance(id)}>{after ? `Next: ${LABEL[after]}` : "Done"}</Button>
        </div>
      </div>
    );
  }

  const glow = id === next && !editing;
  const flag = err ? "Needs a fix" : note ? "Team note" : null;
  if (!filled) {
    return (
      <div data-spot={id} className={cx("relative", className)}>
        <button type="button" data-spot-edit="" onClick={() => open(id)} aria-label={`Add ${LABEL[id].toLowerCase()}${required ? "" : " (optional)"}`}
          className={cx("group block w-full border-2 border-dashed text-left transition duration-base hover:border-ink-brand hover:bg-surface-selected focus-visible:border-ink-brand",
            round, err ? "border-danger" : note ? "border-warning" : glow ? "border-ink-brand" : "border-line-strong",
            glow && "spot-next", inline ? "px-3 py-2" : typeof empty === "string" ? "p-6" : "overflow-hidden")}>
          {typeof empty === "string"
            ? <span className={cx("flex items-center gap-2 text-ink-muted group-hover:text-ink", inline ? "text-body-md" : "text-body-lg")}>
                <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-selected text-ink-brand"><Plus className="size-4" /></span>{empty}
              </span>
            : empty}
        </button>
        {flag && <Badge tone={err ? "danger" : "warning"} size="sm" className="absolute -top-3 right-3 shadow-sm">{flag}</Badge>}
      </div>
    );
  }
  return (
    <div data-spot={id} className={cx("group relative", inline && "w-fit max-w-full", className)}>
      <div className={cx("transition duration-base", round, fresh === id && "spot-filled")}>{children}</div>
      <button type="button" data-spot-edit="" onClick={() => open(id)} aria-label={`Edit ${LABEL[id].toLowerCase()}`}
        className={cx("absolute -inset-1.5 outline-2 outline-transparent transition duration-fast hover:outline-dashed hover:outline-ink-brand focus-visible:outline-solid focus-visible:outline-focus", round,
          (err || note) && "outline-dashed outline-warning")}>
        <span className="absolute -top-3 right-2 inline-flex items-center gap-1 rounded-full bg-action px-2 py-0.5 text-label-sm text-on-action opacity-0 shadow-sm transition-opacity duration-fast group-hover:opacity-100 group-focus-within:opacity-100">
          <Pencil className="size-3" aria-hidden="true" />{flag ?? "Edit"}
        </span>
      </button>
    </div>
  );
}

/** One-tap answers under a text field: they fill it, and stay editable. */
function Quick({ options, onPick, current }: { options: string[]; onPick: (v: string) => void; current: string }) {
  return (
    <div role="group" aria-label="Quick picks" className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={o} type="button" aria-pressed={current === o} onClick={() => onPick(o)}
          className={cx("inline-flex min-h-9 items-center rounded-full border px-3 text-label-md transition-colors duration-fast",
            current === o ? "border-ink-brand bg-surface-selected text-ink-brand" : "border-line-strong text-ink-muted hover:border-ink hover:text-ink")}>{o}</button>
      ))}
    </div>
  );
}

function YearsEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const n = value === "" ? 0 : Number(value);
  return (
    <div className="grid gap-4">
      <Slider label="Years in the business" min={0} max={40} value={n} onChange={(v) => onChange(String(v))} format={(v) => (v >= 40 ? "40+ years" : v === 1 ? "1 year" : `${v} years`)} />
      <Field label="Or type it"><Input id="f-years" inputMode="numeric" value={value} placeholder="e.g. 6" className="max-w-32" onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 2))} /></Field>
    </div>
  );
}

function WhereEditor({ d, set }: { d: ProfileFields; set: <K extends keyof ProfileFields>(k: K) => (v: ProfileFields[K]) => void }) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
        <RadioGroup name="f-market" label="Home market" orientation="horizontal" value={d.market} onChange={(v) => set("market")(v as ProfileFields["market"])} options={[{ value: "la", label: "Los Angeles" }, { value: "other", label: "Another market" }]} />
        <Field label="Home ZIP code"><Input id="f-zip" inputMode="numeric" autoComplete="postal-code" value={d.zip} start={<MapPin />} placeholder="90026" onChange={(e) => set("zip")(e.target.value.replace(/\D/g, "").slice(0, 5))} /></Field>
      </div>
      {d.market === "other"
        ? <Field label="City / region and country" hint="Los Angeles is the launch market. Your profile would be held for a future market."><Input id="f-otherCity" value={d.otherCity} onChange={(e) => set("otherCity")(e.target.value)} /></Field>
        : <div className="grid gap-2">
            <p className="text-label-md text-ink">Los Angeles service areas <span className="font-normal text-ink-subtle">· you'll only appear in these</span></p>
            <ChipPicker id="f-areas" label="Service areas" options={laServiceAreas} value={d.areas} onChange={set("areas")} />
          </div>}
      <Field label="Travel notes" optional hint="Only a limit or exception."><Input id="f-travel" value={d.travel} onChange={(e) => set("travel")(e.target.value)} /></Field>
    </div>
  );
}

function AboutEditor({ d, onChange }: { d: ProfileFields; onChange: (v: string) => void }) {
  const [drafted, setDrafted] = React.useState(false);
  return (
    <div className="grid gap-3">
      {!d.about.trim() && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-ink-brand bg-surface-selected p-3">
          <WandSparkles className="size-5 shrink-0 text-ink-brand" aria-hidden="true" />
          <p className="min-w-0 flex-1 text-body-sm text-ink">Not sure where to start? We'll write a first draft from your answers so far. Then make it sound like you.</p>
          <Button size="sm" variant="secondary" onClick={() => { onChange(starterAbout(d)); setDrafted(true); }}>Start me off</Button>
        </div>
      )}
      <Field label="About me" hint={drafted ? "A first draft from your answers. Change anything; it's yours." : "Line breaks show on your profile."}>
        <Textarea key={drafted ? "drafted" : "own"} id="f-about" rows={7} showCount maxLength={ABOUT_MAX} value={d.about} onChange={(e) => onChange(e.target.value)} />
      </Field>
    </div>
  );
}

/** A short burst of confetti in the brand's category colours. Hidden for reduced motion. */
function Confetti() {
  const bits = React.useMemo(() => Array.from({ length: 36 }, (_, i) => ({
    x: `${(i * 37) % 100}%`, dx: `${((i * 53) % 120) - 60}px`, r: `${360 + ((i * 97) % 540)}deg`, d: `${1.8 + ((i * 13) % 12) / 10}s`, delay: `${((i * 7) % 10) / 20}s`, c: (i % 8) + 1,
  })), []);
  const tone = ["bg-cat-1", "bg-cat-2", "bg-cat-3", "bg-cat-4", "bg-cat-5", "bg-cat-6", "bg-cat-7", "bg-cat-8"];
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-toast overflow-hidden">
      {bits.map((b, i) => (
        <span key={i} className={cx("confetti-bit", tone[b.c - 1])} style={{ "--x": b.x, "--dx": b.dx, "--r": b.r, "--d": b.d, "--delay": b.delay } as React.CSSProperties} />
      ))}
    </div>
  );
}
