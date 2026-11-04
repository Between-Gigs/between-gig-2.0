"use client";
import { Badge, Banner, Button, Field, Input, Modal, RadioGroup, SegmentedControl, Skeleton, Slider, Textarea, cx, useToast } from "@ds/components";
import { Reveal, startPageTransition } from "@ds/motion";
import { ArrowRight, Check, Copy, Eye, Link2, ListChecks, MapPin, MessageSquareWarning, PartyPopper, PenLine, Pencil, Plus, Share2, Sparkles, UserRound, WandSparkles } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { data, type Person, type ProfileFields, type ProfileSection } from "@/lib/data";
import { basisLabel, laServiceAreas, monthStatusLabel, offSetServices, onSetSkills } from "@/lib/data/taxonomy";
import { useRequireRole } from "@/lib/guard";
import { absoluteUrl, asset } from "@/lib/site";
import { ABOUT_MAX, completeness, pinnedCredits, sectionLabel, validateAll, type FieldErrors } from "@/lib/profile/validate";
import { Credits, SaveIndicator, type SaveState } from "@/components/builder/ProfileBuilder";
import { ChipPicker } from "@/components/profile/ChipPicker";
import { PhotoPicker } from "@/components/profile/PhotoPicker";
import { ProfilePreviewCard } from "@/components/profile/ProfilePreviewCard";
import { ProfileView, type PartKind, type ProfilePart } from "@/components/profile/ProfileView";
import { useLiveEditWarning } from "@/components/profile/LiveEditWarning";
import { Page } from "@/components/site/Page";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { markArea } from "@/lib/split-area";

markArea("bg-split:dashboard");

/*
 * /profile/canvas/: onboarding as editing. The Gigster lands on their own profile, blank, in the layout clients will
 * see, and fills it in place. Every part is a "spot": dashed while empty, one tap to edit right where it sits. The next
 * spot to fill glows, "Next" carries them through the rest, and a client view shows the finished page at any time.
 * Same draft, autosave and submit checks as the questionnaire (/profile/edit/), so people can switch between the two.
 */

type SpotId = ProfilePart;

const AUTOSAVE_MS = 700;
const thisMonth = () => new Date().toLocaleString("en-US", { month: "long", year: "numeric" });

/** The order the page leads them through. Required spots first; optional ones only when tapped or reached by Next. */
// Quick wins first; the photo comes last, once the page around it has taken shape.
const ORDER: SpotId[] = ["name", "position", "years", "services", "skills", "where", "availability", "rate", "about", "credits", "photo", "imdb", "languages", "details"];
const REQUIRED: SpotId[] = ["name", "position", "years", "services", "skills", "where", "availability", "about", "credits", "photo"];
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

/** The first required part still empty, in the order the page leads them, other than `except`. */
const firstEmpty = (d: ProfileFields, except?: SpotId): SpotId | null => ORDER.find((id) => id !== except && REQUIRED.includes(id) && !isFilled(id, d)) ?? null;

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
  /** The photo just went in: play the reveal. */
  portrait: boolean;
  /** The page just opened for the first time: the spots light up in turn. */
  rise: boolean;
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

/** Wide screens edit in the column beside the page; narrower ones in a sheet from the bottom. */
function useWide() {
  const [wide, setWide] = React.useState(true);
  React.useEffect(() => {
    const mq = window.matchMedia("(min-width: 64rem)");
    const on = () => setWide(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return wide;
}

function Canvas({ personId }: { personId: string }) {
  const toast = useToast();
  const [person, setPerson] = React.useState<Person | null>(null);
  const [d, setD] = React.useState<ProfileFields | null>(null);
  const [editing, setEditing] = React.useState<SpotId | null>(null);
  const [fresh, setFresh] = React.useState<SpotId | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [save, setSave] = React.useState<SaveState>({ status: "idle" });
  const live = useLiveEditWarning(person?.status);
  const [view, setView] = React.useState<"edit" | "client">("edit");
  const [submitting, setSubmitting] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [party, setParty] = React.useState(0);
  const [intro, setIntro] = React.useState(false);
  const [rise, setRise] = React.useState(false);
  const [portrait, setPortrait] = React.useState(false);
  const wide = useWide();
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

  // The opening moment, once per person: a short welcome, then the blank page lights up spot by spot.
  const INTRO = `bg-canvas-intro-${personId}`;
  const loaded = !!d;
  React.useEffect(() => {
    if (!loaded) return;
    let seen = true;
    try { seen = localStorage.getItem(INTRO) === "1"; } catch { /* storage blocked: skip the intro */ }
    if (!seen && latest.current && REQUIRED.filter((id) => isFilled(id, latest.current!)).length <= 1) setIntro(true);  
  }, [loaded, INTRO]);
  const endIntro = () => {
    try { localStorage.setItem(INTRO, "1"); } catch { /* ignore */ }
    setIntro(false);
    setRise(true);
    window.setTimeout(() => setRise(false), 2200);
  };

  // The portrait reveal: the moment a photo goes in, it opens like an iris, here and on the search card.
  const hadPhoto = React.useRef<boolean | null>(null);
  React.useEffect(() => {
    if (!d) return;
    const has = !!d.photo;
    if (hadPhoto.current === false && has) { setPortrait(true); toast({ message: "Looking good. That's the first thing clients see.", tone: "success" }); window.setTimeout(() => setPortrait(false), 2400); }  
    hadPhoto.current = has;
  }, [d, toast]);

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

  // A click outside the open spot (and outside the search card) closes it; a click on another spot opens that one.
  React.useEffect(() => {
    if (!editing) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest(`[data-spot], [data-editor], aside, [role=dialog], header, [data-stage]`)) return;
      setEditing(null);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [editing]);
  if (!person || !d) return <Page bare><Band /><CanvasSkeleton /></Page>;

  const set = <K extends keyof ProfileFields>(k: K) => (v: ProfileFields[K]) => live.guard(k, () => {
    dirty.current = true;
    setD((x) => (x ? { ...x, [k]: v } : x));
    setFieldErrors((e) => { if (!e[k]) return e; const n = { ...e }; delete n[k]; return n; });
  });

  // Always the first required part still empty, so nothing earlier gets skipped.
  const nextOf = (from?: SpotId): SpotId | null => firstEmpty(d, from);
  const next = nextOf();

  // Bring the part into view: centred beside the panel on wide screens, near the top above the sheet on phones.
  const reveal = (id: SpotId) => requestAnimationFrame(() => {
    const el = document.querySelector<HTMLElement>(`[data-spot="${id}"]`);
    if (!el) return;
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    if (wide) el.scrollIntoView({ block: "center", behavior });
    else window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 140, behavior });
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
  // Live, the profile is one record: one that's with the team or live has nothing to send (an edit sends it back itself).
  const nothingToSend = data.kind === "live" && (person.status === "submitted" || person.status === "approved");
  const first = d.name.split(" ")[0] || "there";
  const ctx: Ctx = { d, editing, next, fresh, errors, noted, open, close, advance, portrait, rise };

  return (
    <Page bare>
      {live.dialog}
      <EditorBar done={done} total={REQUIRED.length} ready={ready} missing={Object.keys(fieldErrors).length} save={save} view={view} editing={!!editing} sent={sent} submitting={submitting} resubmit={resubmit} canSend={!nothingToSend}
        onRetry={() => { dirty.current = true; void flush(); }} onView={switchView} onSubmit={submit} />

      <div ref={stage} className="vt-page relative mx-auto max-w-7xl px-4 pt-10 pb-40 sm:px-6 sm:pb-24">
        {party > 0 && <Confetti key={party} />}
        {view === "client" ? (
          <div className="grid gap-8">
            {sent
              ? <ReadyCard first={first} slug={person.slug} d={d} personId={personId} />
              : <Banner tone="info" title="Preview">This is exactly what clients will see. Switch back to Edit to change anything.</Banner>}
            <ProfileView person={person} fields={d} mode="own" draft={!sent} />
          </div>
        ) : (
          <CanvasCtx.Provider value={ctx}>
            {notes.length > 0 && (
              <Banner tone="warning" className="mb-8" title="Changes requested">
                The Between Gigs team left {notes.length === 1 ? "a note" : `${notes.length} notes`}. Each one is pinned to the part it's about.
                <ul className="mt-2 flex flex-wrap gap-2">
                  {notes.map((n) => <li key={n.note}><Button size="sm" variant="secondary" iconStart={<MessageSquareWarning />} onClick={() => open(SECTION_SPOT[n.section])}>{sectionLabel[n.section]}</Button></li>)}
                </ul>
              </Banner>
            )}
            <div className={cx(rise && "canvas-rise")}>
              <ProfileView person={person} fields={d} mode="own"
                part={(id, p) => <Spot id={id} kind={p.kind} hint={p.hint}>{p.content}</Spot>}
                aside={<Rail first={first} personId={personId} panel={editing && wide ? <EditorPanel id={editing} body={editorFor(editing, d, set, personId, (go) => live.guard("photo", go))} /> : null} />} />
            </div>
            {editing && !wide && (
              <div data-editor="" className="fixed inset-x-0 bottom-0 z-overlay max-h-3/4 overflow-y-auto rounded-t-2xl border-t border-line bg-surface-raised shadow-lg">
                <EditorPanel id={editing} sheet body={editorFor(editing, d, set, personId, (go) => live.guard("photo", go))} />
              </div>
            )}
          </CanvasCtx.Provider>
        )}
      </div>
      <Modal open={intro} onClose={endIntro} size="md" title={`Welcome, ${first}. This is your page.`}
        description="It's what clients will see, blank for now. Fill it in right where it sits: about ten minutes, and it saves as you go."
        footer={<><Button variant="ghost" onClick={endIntro}>Look around first</Button><Button variant="primary" iconEnd={<ArrowRight />} onClick={() => { endIntro(); if (next) window.setTimeout(() => open(next), 700); }}>{next ? `Start with ${LABEL[next].toLowerCase()}` : "Start"}</Button></>}>
        <ol className="grid gap-3">
          {([[Plus, "Tap any part of the page to fill it in"], [Sparkles, "The highlighted part is next; Next carries you through"], [Eye, "Preview shows exactly what clients will see"]] as const).map(([Icon, text], i) => (
            <li key={text} className="flex items-center gap-3 text-body-md text-ink">
              <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-selected text-ink-brand"><Icon className="size-4" /></span>
              <span><span className="sr-only">{i + 1}. </span>{text}</span>
            </li>
          ))}
        </ol>
      </Modal>
      {!sent && !editing && view === "edit" && (
        <Dock done={done} total={REQUIRED.length} next={next} ready={ready} resubmit={resubmit} canSend={!nothingToSend} submitting={submitting} onNext={() => next && open(next)} onSubmit={submit} />
      )}
    </Page>
  );
}

/** Phones: the progress and the one next step stay in reach at the bottom of the screen. */
function Dock({ done, total, next, ready, resubmit, canSend, submitting, onNext, onSubmit }: {
  done: number; total: number; next: SpotId | null; ready: boolean; resubmit: boolean; canSend: boolean; submitting: boolean; onNext: () => void; onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-sticky border-t border-line bg-bg/95 px-4 py-3 shadow-lg backdrop-blur-md lg:hidden">
      <div className="mx-auto flex max-w-xl items-center gap-3">
        <span role="img" aria-label={`${done} of ${total} required parts filled`} style={{ "--p": Math.round((done / total) * 100) } as React.CSSProperties}
          className="progress-ring grid size-10 shrink-0 place-items-center rounded-full">
          <span className="grid size-8 place-items-center rounded-full bg-bg text-caption text-ink tabular-nums">{done}/{total}</span>
        </span>
        {ready || !next
          ? canSend && <Button variant="primary" fullWidth className="glow-hover" loading={submitting} iconEnd={<ArrowRight />} onClick={onSubmit}>{resubmit ? "Send again" : "Send for review"}</Button>
          : <Button variant="primary" fullWidth iconEnd={<ArrowRight />} onClick={onNext}>Next: {LABEL[next]}</Button>}
      </div>
    </div>
  );
}

/** The slim bar above the page: progress, saving, Edit or Preview, and Send. */
function EditorBar({ done, total, ready, missing, save, view, editing, sent, submitting, resubmit, canSend, onRetry, onView, onSubmit }: {
  done: number; total: number; ready: boolean; missing: number; save: SaveState; view: "edit" | "client"; editing: boolean; sent: boolean; submitting: boolean; resubmit: boolean; canSend: boolean;
  onRetry: () => void; onView: (v: string) => void; onSubmit: () => void;
}) {
  const pct = Math.round((done / total) * 100);
  const line = sent ? "Sent for review" : missing ? `${missing} ${missing === 1 ? "thing" : "things"} to finish` : ready ? "Ready to send" : `${done} of ${total} done`;
  return (
    <div data-stage="" className="z-sticky border-b border-line bg-bg/90 backdrop-blur-md sm:sticky sm:top-16 embedded:sm:top-0">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
        <div className="grid min-w-0 flex-1 gap-1.5 sm:max-w-80">
          <div className="flex items-baseline justify-between gap-3">
            <b className={cx("text-label-md", missing && !sent ? "text-danger" : "text-ink")}>{line}</b>
            <SaveIndicator state={save} onRetry={onRetry} />
          </div>
          <span role="progressbar" aria-label="Profile progress" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} className="h-1.5 overflow-hidden rounded-full bg-surface-sunken">
            <span className="block h-full rounded-full bg-action transition-all duration-slow" style={{ width: `${sent ? 100 : pct}%` }} />
          </span>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <SegmentedControl label="View" size="sm" value={view} onChange={onView}
            options={[{ value: "edit", label: "Edit", icon: <PenLine /> }, { value: "client", label: "Preview", icon: <Eye /> }]} />
          {!sent && canSend && <Button size="sm" variant={ready && !editing ? "primary" : "secondary"} className={cx("max-lg:hidden", ready && "glow-hover")} loading={submitting} iconEnd={<ArrowRight />} onClick={onSubmit}>
            {resubmit ? "Send again" : "Send for review"}
          </Button>}
        </div>
      </div>
    </div>
  );
}

/** The column beside the page while editing: the open part's controls, or the progress and the search card. */
function Rail({ first, personId, panel }: { first: string; personId: string; panel: React.ReactNode }) {
  const { d, next, open, editing } = useCanvas();
  const done = REQUIRED.filter((id) => isFilled(id, d)).length;
  if (panel) return <>{panel}</>;
  return (
    <>
      <section aria-labelledby="rail-h" className="rounded-2xl border border-line bg-surface p-6 shadow-lg max-lg:hidden">
        <h2 id="rail-h" className="font-display text-heading-lg text-ink">{done <= 1 ? `Make it yours, ${first}` : next ? "Keep going" : "Ready when you are"}</h2>
        <p className="mt-2 text-body-md text-ink-muted">{next
          ? "This is the page clients will see. Tap any part to fill it in where it sits; it saves as you go."
          : "Everything clients need is in. Preview it, then send it to the Between Gigs team."}</p>
        {next && <Button variant="primary" fullWidth className="mt-5" iconEnd={<ArrowRight />} onClick={() => open(next)}>Next: {LABEL[next]}</Button>}
        <ol className="mt-5 flex flex-wrap gap-1.5" aria-label="Parts of your profile">
          {REQUIRED.map((id) => {
            const ok = isFilled(id, d);
            return (
              <li key={id}>
                <button type="button" onClick={() => open(id)} aria-label={`${LABEL[id]}${ok ? ", done" : ", to fill in"}`}
                  className={cx("inline-flex min-h-8 items-center gap-1.5 rounded-full px-2.5 text-label-sm transition-colors duration-fast",
                    ok ? "bg-surface-selected text-ink-brand" : id === next ? "bg-surface text-ink ring-2 ring-ink-brand" : "bg-surface-sunken text-ink-muted hover:text-ink")}>
                  {ok && <Check className="size-3.5" aria-hidden="true" />}{LABEL[id].replace(/^Your /, "").replace(/^\w/, (c) => c.toUpperCase())}
                </button>
              </li>
            );
          })}
        </ol>
      </section>
      {!editing && (
        <section aria-labelledby="canvas-card-h" className="grid gap-3 max-lg:hidden">
          <h2 id="canvas-card-h" className="text-label-md text-ink-subtle">How you'll appear in search</h2>
          <ProfilePreviewCard fields={d} personId={personId} badge={completeness(d) === 1 ? "Ready" : "Live preview"} />
        </section>
      )}
      <Link href="/profile/edit/" className="inline-flex min-h-11 items-center gap-1.5 text-body-sm text-ink-muted underline underline-offset-2 hover:text-ink">
        <ListChecks className="size-4" aria-hidden="true" />Prefer questions, step by step?
      </Link>
    </>
  );
}

/** The controls for the open part: in the column beside the page on wide screens, a sheet from the bottom on phones. */
function EditorPanel({ id, body, sheet = false }: { id: SpotId; body: React.ReactNode; sheet?: boolean }) {
  const { d, errors, noted, close, advance } = useCanvas();
  const after = firstEmpty(d, id);
  const err = errors[id];
  const note = noted[id];
  const ref = React.useRef<HTMLDivElement>(null);
  // Focus the first control as the part opens, so typing starts right away.
  React.useEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>("input:not([type=hidden]):not([type=file]), textarea, [role=radio], button[aria-pressed]");
    el?.focus({ preventScroll: true });
  }, [id]);
  return (
    <div ref={ref} data-editor="" role="group" aria-label={`Editing: ${LABEL[id]}`} onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); close(); } }}
      style={sheet ? undefined : { maxHeight: "calc(100dvh - 8rem)" }}
      className={cx("grid gap-5", sheet ? "p-5 pb-6" : "overflow-y-auto rounded-2xl border border-ink-brand bg-surface-raised p-6 shadow-lg")}>
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 font-display text-heading-md text-ink"><Pencil className="size-4 text-ink-brand" aria-hidden="true" />{LABEL[id]}</p>
        <Button size="sm" variant="ghost" onClick={close}>Done</Button>
      </div>
      {note && <p className="flex gap-2 rounded-md bg-warning-soft p-3 text-body-sm text-ink"><MessageSquareWarning className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" /><span><b>Team note:</b> {note}</span></p>}
      {body}
      {err && <ul className="grid gap-1 text-body-sm text-danger">{err.map((m) => <li key={m}>{m}</li>)}</ul>}
      <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
        <Button variant="primary" iconEnd={<ArrowRight />} onClick={() => advance(id)}>{after ? `Next: ${LABEL[after]}` : "Done"}</Button>
      </div>
    </div>
  );
}

/** The editor for each part. */
function editorFor(id: SpotId, d: ProfileFields, set: <K extends keyof ProfileFields>(k: K) => (v: ProfileFields[K]) => void, personId: string, confirm: (go: () => void) => void): React.ReactNode {
  switch (id) {
    case "photo": return <PhotoEditor d={d} personId={personId} onChange={set("photo")} confirm={confirm} />;
    case "name": return <Field label="Full name"><Input id="f-name" size="lg" autoComplete="name" value={d.name} onChange={(e) => set("name")(e.target.value)} /></Field>;
    case "position": return <>
      <Field label="Industry position / department" hint="Type your own, or tap one to start from."><Input id="f-position" value={d.position} placeholder="e.g. Costume & wardrobe" onChange={(e) => set("position")(e.target.value)} /></Field>
      <Quick options={onSetSkills} onPick={set("position")} current={d.position} />
    </>;
    case "years": return <YearsEditor value={d.years} onChange={set("years")} />;
    case "where": return <WhereEditor d={d} set={set} />;
    case "rate": return <div className="grid gap-4">
      <Field label="Starting rate" optional hint="Final scope and rate are agreed with each client."><Input id="f-rate" inputMode="numeric" value={d.rate} start={<span className="text-label-md">$</span>} end={<span className="text-label-sm text-ink-subtle">USD</span>} onChange={(e) => set("rate")(e.target.value.replace(/\D/g, "").slice(0, 4))} /></Field>
      <RadioGroup name="f-basis" label="Rate basis" orientation="horizontal" value={d.basis} onChange={(v) => set("basis")(v as ProfileFields["basis"])} options={Object.entries(basisLabel).map(([value, label]) => ({ value, label }))} />
    </div>;
    case "availability": return <div className="grid gap-4">
      <RadioGroup name="f-monthStatus" label={`This month · ${d.month}`} value={d.monthStatus} onChange={(v) => set("monthStatus")(v as ProfileFields["monthStatus"])} options={Object.entries(monthStatusLabel).map(([value, label]) => ({ value, label }))} />
      <Field label="Dates or times this month" hint="Exact project dates are agreed with each client."><Input id="f-dates" value={d.dates} placeholder="e.g. Weekday mornings" onChange={(e) => set("dates")(e.target.value)} /></Field>
      <Quick options={["Weekday mornings", "Weekday evenings", "Weekends", "Most days", "Between shoots, ask me"]} onPick={set("dates")} current={d.dates} />
    </div>;
    case "about": return <AboutEditor d={d} onChange={set("about")} />;
    case "languages": return <Field label="Languages" optional><Input id="f-languages" value={d.languages} placeholder="e.g. English, Spanish" onChange={(e) => set("languages")(e.target.value)} /></Field>;
    case "services": return <>
      <ChipPicker id="f-services" label="Off-set services" options={offSetServices} value={d.services} onChange={set("services")} />
      <Field label="Something else?" optional hint="Other services go to a private review. They don't appear on your profile automatically."><Textarea id="f-other" rows={2} value={d.other} onChange={(e) => set("other")(e.target.value)} /></Field>
    </>;
    case "skills": return <ChipPicker id="f-skills" label="On-set skills" options={onSetSkills} value={d.skills} onChange={set("skills")} />;
    case "credits": return <Credits credits={d.credits} pins={d.creditPins ?? []} onChange={(c, p) => { set("credits")(c); set("creditPins")(p); }} />;
    case "imdb": return <Field label="IMDb profile link" optional hint="Your IMDb name page. It helps us confirm credits; clients don't see it."><Input id="f-imdb" type="url" inputMode="url" value={d.imdb} placeholder="https://www.imdb.com/name/nm1234567/" onChange={(e) => set("imdb")(e.target.value)} /></Field>;
    case "details": return <div className="grid gap-4">
      <RadioGroup name="f-mode" label="Work mode" value={d.mode} onChange={(v) => set("mode")(v as ProfileFields["mode"])} options={[{ value: "on-site", label: "On site" }, { value: "studio", label: "At my studio" }, { value: "both", label: "Both" }]} />
      <RadioGroup name="f-insurance" label="Insurance · self-reported" value={d.insurance} onChange={(v) => set("insurance")(v as ProfileFields["insurance"])} options={[{ value: "private", label: "Prefer to discuss privately" }, { value: "yes", label: "I have liability insurance" }, { value: "no", label: "No insurance" }]} />
      <Field label="Tools / equipment" optional><Input id="f-tools" value={d.tools} onChange={(e) => set("tools")(e.target.value)} /></Field>
      <Field label="Transport" optional><Input id="f-transport" value={d.transport} onChange={(e) => set("transport")(e.target.value)} /></Field>
    </div>;
  }
}

/**
 * One part of the page. Filled: the content as clients see it, with an Edit tag on hover. Empty: a soft placeholder
 * that says what goes there (the next one highlighted). Open: outlined while its controls are in the panel.
 */
function Spot({ id, kind, hint, children }: { id: SpotId; kind: PartKind; hint: string; children: React.ReactNode }) {
  const { d, editing, next, fresh, errors, noted, open, portrait } = useCanvas();
  const order = { "--i": ORDER.indexOf(id) } as React.CSSProperties;
  const filled = isFilled(id, d);
  const err = errors[id];
  const note = noted[id];
  const active = editing === id;
  const glow = id === next && !editing;
  const ring = active ? "ring-2 ring-ink-brand" : err ? "ring-2 ring-danger" : note ? "ring-2 ring-warning" : glow ? "ring-2 ring-ink-brand" : "";
  const round = kind === "line" || kind === "photo" ? "rounded-full" : kind === "title" ? "rounded-xl" : "rounded-2xl";
  const label = `${filled ? "Edit" : "Add"} ${LABEL[id].toLowerCase()}${REQUIRED.includes(id) ? "" : " (optional)"}`;

  if (!filled) {
    return (
      <div data-spot={id} style={order} className="relative">
        <button type="button" data-spot-edit="" onClick={() => open(id)} aria-label={label} aria-pressed={active}
          className={cx("group text-left transition duration-base", round, ring, glow && "spot-next",
            kind === "photo" ? "block w-full overflow-hidden"
              : kind === "title" ? "flex w-full items-center gap-3 bg-surface-sunken px-4 py-3 hover:bg-surface-selected"
              : kind === "line" ? "inline-flex min-h-10 items-center gap-2 bg-surface-sunken py-1.5 pr-4 pl-2 hover:bg-surface-selected"
              : "flex w-full items-center gap-3 bg-surface-sunken p-5 hover:bg-surface-selected")}>
          {kind === "photo" ? (
            <span className="relative grid aspect-square place-items-center rounded-full bg-surface-sunken text-ink-muted group-hover:bg-surface-selected">
              <UserRound className="absolute size-3/5 text-ink-subtle opacity-40" strokeWidth={1} aria-hidden="true" />
              <span className="relative mt-auto mb-3 inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-label-sm text-ink shadow-sm"><Plus className="size-3.5" aria-hidden="true" />{hint}</span>
            </span>
          ) : <>
            <span aria-hidden="true" className={cx("grid shrink-0 place-items-center rounded-full bg-surface text-ink-brand shadow-xs", kind === "line" ? "size-7" : "size-9")}><Plus className="size-4" /></span>
            <span className={cx("text-ink-muted group-hover:text-ink", kind === "title" ? "font-display text-display-sm" : kind === "line" ? "text-body-md" : "text-body-lg")}>{hint}</span>
          </>}
        </button>
        {note && <Badge tone="warning" size="sm" className="absolute -top-3 right-3 shadow-sm">Team note</Badge>}
      </div>
    );
  }
  return (
    <div data-spot={id} style={order} className={cx("group relative", kind === "line" && "w-fit max-w-full")}>
      <div className={cx("transition duration-base", id === "photo" && portrait ? "portrait-reveal" : fresh === id && "spot-filled")}>{children}</div>
      <button type="button" data-spot-edit="" onClick={() => open(id)} aria-label={label} aria-pressed={active}
        className={cx("absolute -inset-2 transition duration-fast hover:bg-ink-brand/5 hover:ring-2 hover:ring-ink-brand/40 focus-visible:ring-2 focus-visible:ring-focus", kind === "line" ? "rounded-xl" : kind === "photo" ? "rounded-full" : "rounded-2xl", ring)}>
        <span className={cx("absolute inline-flex items-center gap-1 rounded-full bg-action px-2.5 py-1 text-label-sm whitespace-nowrap text-on-action shadow-sm transition-opacity duration-fast",
          active || note ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
          kind === "line" ? "top-1/2 left-full ml-3 -translate-y-1/2 max-sm:top-0 max-sm:right-2 max-sm:left-auto max-sm:-translate-y-1/2" : kind === "photo" ? "-bottom-2 left-1/2 -translate-x-1/2" : "top-3 right-3")}>
          <Pencil className="size-3" aria-hidden="true" />{note ? "Team note" : active ? "Editing" : "Edit"}
        </span>
      </button>
    </div>
  );
}

const SAMPLE_PORTRAITS = ["img/people/priya.jpg", "img/people/sam.jpg", "img/people/morgan.jpg"];

/** The photo picker, plus (in the sample only) a few fictional portraits, so a walkthrough isn't stuck without one. */
function PhotoEditor({ d, personId, onChange, confirm }: { d: ProfileFields; personId: string; onChange: (v: string) => void; confirm: (go: () => void) => void }) {
  return (
    <div className="grid gap-4">
      <PhotoPicker id="f-photo" value={d.photo} name={d.name} onChange={onChange} personId={personId} confirm={confirm} />
      {data.demo && (
        <div className="grid gap-2">
          <p className="text-body-sm text-ink-muted">No photo to hand? Try a sample portrait. They're fictional, for this preview only.</p>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_PORTRAITS.map((src, i) => (
              <button key={src} type="button" aria-pressed={d.photo === src} aria-label={`Use sample portrait ${i + 1}`} onClick={() => onChange(src)}
                className={cx("size-14 overflow-hidden rounded-xl border-2 transition-colors duration-fast", d.photo === src ? "border-ink-brand" : "border-transparent hover:border-line-strong")}>
                <img src={asset(src)} alt="" className="size-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
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
      {/* The system's range input is 20px tall; give it a full touch target here (docs/design-system-requests.md). */}
      <Slider className="[&_input]:h-11" label="Years in the business" min={0} max={40} value={n} onChange={(v) => onChange(String(v))} format={(v) => (v >= 40 ? "40+ years" : v === 1 ? "1 year" : `${v} years`)} />
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

/** After Send: the page is ready. Its future link to copy or share, and the card clients will find in search. */
function ReadyCard({ first, slug, d, personId }: { first: string; slug: string; d: ProfileFields; personId: string }) {
  const toast = useToast();
  const url = absoluteUrl(`/p/${slug}/`);
  const [canShare, setCanShare] = React.useState(false);
  React.useEffect(() => { setCanShare(typeof navigator !== "undefined" && "share" in navigator); }, []); // eslint-disable-line react-hooks/set-state-in-effect
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); toast({ message: "Link copied", tone: "success" }); } catch { toast({ message: "Couldn't copy. Select the link and copy it.", tone: "danger" }); }
  };
  return (
    <Reveal effect="scale-in" className="grid gap-6 overflow-hidden rounded-2xl border border-line bg-surface p-5 shadow-lg sm:p-8 lg:grid-cols-12 lg:items-center">
      <div className="grid gap-4 lg:col-span-7">
        <span className="grid size-12 place-items-center rounded-full bg-action text-on-action"><PartyPopper className="size-6" aria-hidden="true" /></span>
        <h2 tabIndex={-1} className="font-display text-display-sm text-balance text-ink outline-none">Your page is ready, {first}.</h2>
        <p className="max-w-prose text-body-lg text-ink-muted">It's with the Between Gigs team now. Once they approve it, this is where clients will find you. Changes you make from here save as a draft until you send them again.</p>
        <div className="flex min-w-0 items-center gap-2 rounded-xl border border-line bg-surface-sunken p-2 pl-3">
          <Link2 className="size-4 shrink-0 text-ink-subtle" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate font-mono text-data-sm text-ink" title={url}>{url.replace(/^https?:\/\//, "")}</span>
          <Button size="sm" variant="primary" iconStart={<Copy />} onClick={copy}>Copy link</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {canShare && <Button variant="secondary" iconStart={<Share2 />} onClick={() => { void navigator.share({ title: `${d.name} · Between Gigs`, url }).catch(() => {}); }}>Share</Button>}
          <ButtonLink href="/profile/" variant="ghost" iconEnd={<ArrowRight />}>Go to My profile</ButtonLink>
        </div>
      </div>
      <div className="lg:col-span-5">
        <p className="mb-3 text-label-md text-ink-muted">How you'll appear in search</p>
        <ProfilePreviewCard fields={d} personId={personId} badge="Ready" />
      </div>
    </Reveal>
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
