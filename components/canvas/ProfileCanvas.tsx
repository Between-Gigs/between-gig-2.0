"use client";
import { Badge, Button, Field, Input, RadioGroup, Skeleton, Slider, Textarea, cx, useToast } from "@ds/components";
import { Reveal, startPageTransition } from "@ds/motion";
import { ArrowDown, ArrowRight, Check, ChevronUp, Copy, Link2, MapPin, MessageSquareWarning, PartyPopper, Pencil, Plus, Share2, WandSparkles, X } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { createPortal } from "react-dom";
import { data, type Person, type ProfileFields, type ProfileSection } from "@/lib/data";
import { basisLabel, laServiceAreas, monthStatusLabel, offSetServices, onSetSkills } from "@/lib/data/taxonomy";
import { useRequireRole } from "@/lib/guard";
import { absoluteUrl, asset } from "@/lib/site";
import { ABOUT_MAX, DATES_MAX, DEPARTMENT_MAX, NAME_MAX, REQUIRED_PARTS, contentChanged, isPartFilled, pinnedCredits, readNotes, sectionLabel, validateAll, type FieldErrors } from "@/lib/profile/validate";
import { sendNow } from "@/lib/data/api";
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
const REQUIRED: SpotId[] = REQUIRED_PARTS;
const LABEL: Record<SpotId, string> = {
  photo: "Your photo", name: "Your name", position: "Your department", years: "Years in the business", services: "Services you offer",
  skills: "On-set skills", where: "Where you work", availability: "This month", rate: "Starting rate", about: "About me",
  credits: "Notable credits", imdb: "IMDb link", languages: "Languages", details: "Work details",
};
/** The parts listed beside the page, in order: their place in this list is the number they carry ("02 Your department"). */
const PARTS: SpotId[] = ORDER.filter((id) => REQUIRED.includes(id) || id === "rate" || id === "languages");
/** The verb on the Next block's button: what the one tap does. */
const VERB: Partial<Record<SpotId, string>> = {
  name: "Type", photo: "Add", position: "Choose", years: "Set", services: "Choose", skills: "Choose", where: "Choose",
  availability: "Set", about: "Write", credits: "Add",
};
/** Which spot shows each field's submit error. */
const FIELD_SPOT: Partial<Record<keyof ProfileFields, SpotId>> = {
  photo: "photo", name: "name", years: "years", position: "position", imdb: "imdb", credits: "credits", skills: "skills",
  services: "services", other: "services", market: "where", otherCity: "where", zip: "where", areas: "where", dates: "availability", about: "about",
};
/** The team's review notes are per questionnaire section; this is where each lands on the page. */
const SECTION_SPOT: Record<ProfileSection, SpotId> = { about: "position", skills: "services", where: "where", story: "about", photo: "photo" };
/** The sample keeps a draft beside the version the team (or the public) has; live keeps one record (N-09). */
const KEEPS_DRAFT = data.kind !== "live";
/** "Oct 21": when it went to the team. */
const dayOf = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "");
const pick = (f: ProfileFields, keys: Iterable<keyof ProfileFields>) => Object.fromEntries([...keys].map((k) => [k, f[k]])) as Partial<ProfileFields>;

const isFilled = isPartFilled;

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
  /** After Send with parts missing: how many things are left, said inside the open part (not in a toast over it). */
  missing: number;
}
const CanvasCtx = React.createContext<Ctx | null>(null);
const useCanvas = () => React.useContext(CanvasCtx)!;

export function ProfileCanvas() {
  const session = useRequireRole("gigster");
  return session?.personId ? <Canvas personId={session.personId} /> : <Page bare><Band /><CanvasSkeleton /></Page>;
}

/** Loading: the forest band with the dotted phosphor texture, the brand's signature, while the page loads. */
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
    <div aria-busy="true" aria-label="Loading your profile" className="mx-auto mt-10 grid max-w-7xl gap-10 px-4 pb-20 sm:px-6 lg:grid-cols-12 lg:gap-x-16">
      <div className="grid content-start gap-6 lg:col-span-5 xl:col-span-4"><Skeleton shape="block" className="h-64" /><Skeleton shape="block" className="h-40" /></div>
      <div className="grid content-start gap-5 lg:col-span-7 xl:col-span-8"><Skeleton className="h-9 w-1/3" /><Skeleton /><Skeleton /><Skeleton className="w-2/3" /><Skeleton shape="block" className="mt-6 h-40" /></div>
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
  const [rise, setRise] = React.useState(false);
  const [portrait, setPortrait] = React.useState(false);
  const wide = useWide();
  /** The version the team (or the public) has, to tell what's unsent. Null before the first Send. */
  const [sentVersion, setSentVersion] = React.useState<ProfileFields | null>(null);
  const stage = React.useRef<HTMLDivElement>(null);
  const dirty = React.useRef(false);
  const step = React.useRef(0);
  const latest = React.useRef<ProfileFields | null>(null);
  /** Fields this tab changed since its last save: they win over another tab's save (the rest take the other tab's). */
  const touched = React.useRef(new Set<keyof ProfileFields>());
  /** When the draft this tab last read or wrote was saved, to notice another tab's save. */
  const known = React.useRef("");
  React.useEffect(() => { latest.current = d; }, [d]);

  React.useEffect(() => {
    let live = true;
    void Promise.all([data.people.get(personId), data.profiles.getDraft(personId), data.profiles.getProfile(personId)]).then(([s, draft, sentP]) => {
      if (!live || !s || !draft) return;
      setPerson(s.person);
      setSentVersion(sentP?.fields ?? null);
      step.current = draft.step;
      known.current = draft.savedAt;
      // Filled in here, not by the person: kept on this tab's side when merging with another tab's save.
      if (!draft.fields.name) touched.current.add("name");
      if (!draft.fields.month) touched.current.add("month");
      setD({ ...draft.fields, name: draft.fields.name || s.person.name, month: draft.fields.month || thisMonth() });
      if (draft.savedAt) setSave({ status: "saved", at: draft.savedAt });
    });
    return () => { live = false; };
  }, [personId]);

  /** The person and the version the team has, after a save or a change elsewhere (live, an edit can change the status). */
  const refresh = React.useCallback(async () => {
    const [s, sentP] = await Promise.all([data.people.get(personId), data.profiles.getProfile(personId)]);
    if (s) setPerson(s.person);
    setSentVersion(sentP?.fields ?? null);
  }, [personId]);

  const flush = React.useCallback(async () => {
    const fields = latest.current;
    if (!fields || !dirty.current) return;
    dirty.current = false;
    const keys = [...touched.current];
    touched.current.clear();
    setSave({ status: "saving" });
    try {
      // Another tab may have saved since this one read the draft: start from that save and lay this tab's own changes
      // over it, field by field, so neither tab undoes the other. (Live needs a revision check on the server for this.)
      const stored = KEEPS_DRAFT ? await data.profiles.getDraft(personId) : null;
      const theirs = stored?.savedAt && stored.savedAt !== known.current ? stored.fields : null;
      const merged = theirs ? { ...theirs, ...pick(fields, keys) } : fields;
      const saved = await data.profiles.saveDraft(personId, merged, step.current);
      known.current = saved.savedAt;
      if (theirs) setD((cur) => (cur ? { ...merged, ...pick(cur, touched.current) } : cur));
      setSave(dirty.current ? { status: "saving" } : { status: "saved", at: saved.savedAt });
      void refresh();
    } catch {
      dirty.current = true;
      keys.forEach((k) => touched.current.add(k));
      setSave({ status: "error" });
    }
  }, [personId, refresh]);
  React.useEffect(() => {
    if (!dirty.current) return;
    const t = window.setTimeout(() => void flush(), AUTOSAVE_MS);
    return () => window.clearTimeout(t);
  }, [d, flush]);
  React.useEffect(() => () => { void flush(); }, [flush]);
  // Closing the tab, reloading or switching away within the autosave pause: save now, at once (keepalive live).
  React.useEffect(() => {
    const now = () => {
      const fields = latest.current;
      if (!fields || !dirty.current) return;
      dirty.current = false;
      touched.current.clear();
      sendNow(() => { void data.profiles.saveDraft(personId, fields, step.current).then((saved) => { known.current = saved.savedAt; }).catch(() => { dirty.current = true; }); });
    };
    const hidden = () => { if (document.visibilityState === "hidden") now(); };
    window.addEventListener("pagehide", now);
    document.addEventListener("visibilitychange", hidden);
    return () => { window.removeEventListener("pagehide", now); document.removeEventListener("visibilitychange", hidden); };
  }, [personId]);
  // Another tab saved (the sample's store changed): take its fields, keeping the ones changed here and not yet saved.
  React.useEffect(() => {
    if (!KEEPS_DRAFT) return;
    return data.auth.onChange(() => {
      void data.profiles.getDraft(personId).then((stored) => {
        if (!stored?.savedAt || stored.savedAt === known.current) return;
        known.current = stored.savedAt;
        setD((cur) => (cur ? { ...stored.fields, ...pick(cur, touched.current) } : cur));
      });
      void refresh();
    });
  }, [personId, refresh]);

  // The opening moment, once per person: no dialog in the way, the blank page lights up spot by spot.
  const INTRO = `bg-canvas-intro-${personId}`;
  const loaded = !!d;
  React.useEffect(() => {
    if (!loaded) return;
    let seen = true;
    try { seen = localStorage.getItem(INTRO) === "1"; localStorage.setItem(INTRO, "1"); } catch { /* storage blocked: skip it */ }
    if (seen) return;
    setRise(true); // eslint-disable-line react-hooks/set-state-in-effect
    const t = window.setTimeout(() => setRise(false), 2200);
    return () => window.clearTimeout(t);
  }, [loaded, INTRO]);

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

  // The phone sheet's height: lower on short screens (landscape, 320px), so the part it edits stays in view above it.
  const [sheetMax, setSheetMax] = React.useState(0);
  React.useEffect(() => {
    const on = () => { const h = window.innerHeight; setSheetMax(Math.round(h * (h < 520 ? 0.55 : h < 760 ? 0.6 : 0.7))); };
    on();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  // A click outside the open spot (and outside the search card) closes it; a click on another spot opens that one.
  React.useEffect(() => {
    if (!editing) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      // The design system's dialogs are native <dialog>s, with no role attribute: "Keep it live" must not close the part.
      if (t.closest(`[data-spot], [data-editor], aside, dialog, [role=dialog], [role=alertdialog], header, [data-stage]`)) return;
      setEditing(null);
    };
    // Esc closes the open part wherever focus is (unless a dialog is open: Esc is the dialog's then).
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented || document.querySelector("dialog[open]")) return;
      if ((e.target as HTMLElement | null)?.closest?.("[data-editor]")) return;
      // The panel's own Close: it saves, and puts focus back on the part.
      const button = document.querySelector<HTMLElement>("[data-editor] [data-close]");
      if (button) button.click(); else setEditing(null);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); };
  }, [editing]);
  if (!person || !d) return <Page bare><Band /><CanvasSkeleton /></Page>;

  const set = <K extends keyof ProfileFields>(k: K) => (v: ProfileFields[K]) => live.guard(k, () => {
    dirty.current = true;
    touched.current.add(k);
    // Until the pause is over and it's written, the bar says it's saving, not "Saved".
    setSave((x) => (x.status === "saving" ? x : { status: "saving" }));
    setD((x) => (x ? { ...x, [k]: v } : x));
    setFieldErrors((e) => { if (!e[k]) return e; const n = { ...e }; delete n[k]; return n; });
  });

  // Always the first required part still empty, so nothing earlier gets skipped.
  const nextOf = (from?: SpotId): SpotId | null => firstEmpty(d, from);
  const next = nextOf();

  // Bring the part into view. Wide screens: the anchored panel scrolls only as far as it needs to show the part and its
  // controls (see Anchored). Phones and tablets: just under the site's pinned header, so it sits above the sheet.
  const reveal = (id: SpotId) => {
    if (wide) return;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`[data-spot="${id}"]`);
      if (!el) return;
      const header = document.querySelector<HTMLElement>("header")?.getBoundingClientRect().bottom ?? 0;
      const room = window.innerHeight - sheetMax - Math.max(0, header);
      const r = el.getBoundingClientRect();
      // Centred in the room above the sheet when it fits, else its top just under the header.
      const gap = Math.max(12, Math.min(48, (room - r.height) / 2));
      const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
      window.scrollTo({ top: Math.max(0, r.top + window.scrollY - Math.max(0, header) - gap), behavior });
    }));
  };
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
  // A photo note opens the photo, also an older one saved under "About you" as "Photo: …".
  const notes = person.status === "changes_requested" ? readNotes(person.reviewNotes ?? []) : [];
  const noted: Partial<Record<SpotId, string>> = {};
  for (const n of notes) { const spot = SECTION_SPOT[n.section]; noted[spot] = noted[spot] ? `${noted[spot]} ${n.note}` : n.note; }

  const switchView = (v: string) => {
    setEditing(null);
    // Back to Edit after sending: the page is in review now, and the bar offers Send again once something changes.
    if (v === "edit") setSent(false);
    startPageTransition(() => { setView(v as "edit" | "client"); window.scrollTo({ top: 0 }); }, { effect: "flip", target: stage.current });
  };

  const submit = async () => {
    const all = validateAll(d);
    const merged = Object.assign({}, ...Object.values(all)) as FieldErrors;
    if (Object.keys(merged).length) {
      setFieldErrors(merged);
      const first = ORDER.find((id) => Object.entries(merged).some(([k]) => FIELD_SPOT[k as keyof ProfileFields] === id));
      const n = Object.keys(merged).length;
      // Said inside the part it opens, above its controls, so nothing covers the panel's buttons or the part's own error.
      if (first) open(first);
      else toast({ message: `${n === 1 ? "One thing" : `${n} things`} to finish first.`, tone: "neutral" });
      return;
    }
    setSubmitting(true);
    setEditing(null);
    dirty.current = true;
    await flush();
    try {
      const r = await data.profiles.submit(personId);
      setPerson(r.person);
      setSentVersion(r.profile.fields);
      setParty((n) => n + 1);
      startPageTransition(() => { setSent(true); setView("client"); window.scrollTo({ top: 0 }); }, { effect: "zoom", target: stage.current });
    } catch {
      toast({ message: "We couldn't send your profile. Try again.", tone: "danger" });
    } finally {
      setSubmitting(false);
    }
  };

  const resubmit = person.status === "submitted" || person.status === "approved" || notes.length > 0;
  const sentAlready = person.status === "submitted" || person.status === "approved";
  // Changes (other than availability) not yet sent: the team, or the public, still has the version sent before.
  const unsent = KEEPS_DRAFT && sentAlready && !!sentVersion && contentChanged(d, sentVersion);
  // With the team or live, there's something to send only once something has changed. Live keeps one record, so an
  // edit sends it back itself and there is never anything to send.
  const nothingToSend = sentAlready && (data.kind === "live" || !unsent);
  const reviewState: ReviewState | null = person.status === "approved" ? "live" : person.status === "submitted" ? "review" : null;
  const first = d.name.split(" ")[0] || "there";
  const ctx: Ctx = { d, editing, next, fresh, errors, noted, open, close, advance, portrait, rise, missing: Object.keys(fieldErrors).length };
  // The progress line: one segment per required part, in the order the page leads them; the next one is marked.
  const segs = ORDER.filter((id) => REQUIRED.includes(id)).map((id) => (sent || isFilled(id, d) ? "done" : id === next ? "next" : "todo") as Seg);

  return (
    <Page bare>
      {live.dialog}
      <EditorBar segs={segs} done={done} total={REQUIRED.length} ready={ready} missing={Object.keys(fieldErrors).length} save={save} view={view} editing={!!editing} sent={sent} submitting={submitting} resubmit={resubmit} canSend={!nothingToSend}
        state={reviewState} unsent={unsent} pinned={!editing || wide}
        onRetry={() => { dirty.current = true; void flush(); }} onView={switchView} onSubmit={submit} />

      <div ref={stage} className="vt-page relative mx-auto max-w-7xl px-4 pt-6 pb-40 sm:px-6 sm:pb-24">
        {party > 0 && <Confetti key={party} />}
        {view === "client" ? (
          <div className="grid gap-8">
            {sent
              ? <ReadyCard first={first} slug={person.slug} d={d} personId={personId} />
              : <div className="grid gap-1 border-b border-line pb-4 sm:grid-cols-12 sm:gap-x-6">
                  <p className="text-eyebrow text-ink uppercase sm:col-span-3">Preview</p>
                  <p className="text-body-md text-ink-muted sm:col-span-9">This is exactly what clients will see. Switch back to Edit to change anything.</p>
                </div>}
            {/* Exactly the public page for the same answers: no edit spots, empty optional parts left out. */}
            <ProfileView person={person} fields={d} mode="own" />
          </div>
        ) : (
          <CanvasCtx.Provider value={ctx}>
            {done <= 1 && (
              <div className="mb-6 lg:hidden">
                <h2 className="font-display text-heading-lg text-balance break-words text-ink">Welcome, {first}. This is your page.</h2>
                <p className="mt-1 text-body-md text-pretty text-ink-muted">It&apos;s what clients will see. It saves as you go.</p>
              </div>
            )}
            {notes.length > 0 ? (
              // Changes requested: the team's notes are the next step, in the one mint block. Each opens the part it's about.
              <section aria-labelledby="next-h" className="mb-12 grid grid-cols-12 items-start gap-x-6 gap-y-3 bg-tint-mint px-5 py-5 text-forest-950 sm:px-6">
                <p className="col-span-12 text-eyebrow uppercase lg:col-span-2 lg:pt-2">Next step</p>
                <div className="col-span-12 grid gap-1 lg:col-span-4">
                  <h2 id="next-h" className="font-display text-heading-lg text-balance">{notes.length === 1 ? "1 note" : `${notes.length} notes`} from the team</h2>
                  <p className="text-body-sm">Each one is pinned to the part it&apos;s about. Make the change, then send it again.</p>
                </div>
                <ul className="col-span-12 grid gap-2 lg:col-span-6">
                  {notes.map((n) => (
                    <li key={`${n.section}-${n.note}`}>
                      <button type="button" onClick={() => open(SECTION_SPOT[n.section])}
                        className="flex min-h-13 w-full items-center gap-3 border-2 border-forest-950 px-4 py-2.5 text-left transition-colors duration-fast hover:bg-forest-950 hover:text-ink-on-brand focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-forest-950">
                        <MessageSquareWarning className="size-5 shrink-0" aria-hidden="true" />
                        <span className="grid min-w-0 flex-1 gap-0.5"><b className="font-display text-label-md">{sectionLabel[n.section]}</b><span className="text-body-sm break-words">{n.note}</span></span>
                        <ArrowRight className="size-5 shrink-0" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : reviewState ? (
              <ReviewBlock state={reviewState} unsent={unsent} since={dayOf(person.submittedAt)} slug={person.slug} />
            ) : next && (
              // The one mint block on the screen: the part to fill next. Always near-black type on mint, in both themes.
              // It stays while a part is open, so the page under it doesn't move.
              <section aria-labelledby="next-h" className="mb-12 grid grid-cols-12 items-center gap-x-6 gap-y-2 bg-tint-mint px-5 py-5 text-forest-950 sm:px-6">
                <p className="col-span-12 text-eyebrow uppercase lg:col-span-2">Next step</p>
                <h2 id="next-h" className="col-span-12 font-display text-heading-lg text-balance lg:col-span-5">Next: {LABEL[next]}</h2>
                <p className="col-span-12 text-body-sm text-pretty lg:col-span-3">It&apos;s highlighted on your page. Tap it to fill it in where it sits.</p>
                <button type="button" aria-label={`Next: ${LABEL[next]}, ${(VERB[next] ?? "Add").toLowerCase()}`} onClick={() => open(next)}
                  className="col-span-2 inline-flex min-h-13 items-center justify-between gap-3 bg-forest-950 px-5 font-display text-label-md font-bold text-ink-on-brand transition-colors duration-fast hover:bg-forest-900 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-forest-950 max-lg:hidden">
                  {VERB[next] ?? "Add"}<ArrowDown className="size-5" aria-hidden="true" />
                </button>
              </section>
            )}
            <div className={cx(rise && "canvas-rise")}>
              <ProfileView person={person} fields={d} mode="own"
                part={(id, p) => <Spot id={id} kind={p.kind} hint={p.hint}>{p.content}</Spot>}
                aside={<Rail first={first} panel={null} />} />
            </div>
            {editing && wide && (
              <Anchored id={editing}>
                <EditorPanel id={editing} body={editorFor(editing, d, set, personId, (go) => live.guard("photo", go))} />
              </Anchored>
            )}
            {editing && !wide && (
              <div data-editor="" data-dock="" style={sheetMax ? { maxHeight: sheetMax } : undefined} className="fixed inset-x-0 bottom-0 z-overlay max-h-3/4 overflow-y-auto border-t-4 border-line-strong bg-surface-raised">
                <EditorPanel id={editing} sheet body={editorFor(editing, d, set, personId, (go) => live.guard("photo", go))} />
              </div>
            )}
          </CanvasCtx.Provider>
        )}
      </div>
      {!sent && !editing && view === "edit" && (
        <Dock done={done} total={REQUIRED.length} next={next} ready={ready} resubmit={resubmit} canSend={!nothingToSend} submitting={submitting} onNext={() => next && open(next)} onSubmit={submit}
          idle={reviewState === "live" ? "Live" : reviewState === "review" ? `In review since ${dayOf(person.submittedAt)}` : ""}
          left={ORDER.filter((id) => REQUIRED.includes(id) && !isFilled(id, d))} notes={notes.filter((n, i) => notes.findIndex((m) => SECTION_SPOT[m.section] === SECTION_SPOT[n.section]) === i).map((n) => ({ id: SECTION_SPOT[n.section], label: sectionLabel[n.section] }))} onOpen={open} />
      )}
    </Page>
  );
}

/**
 * Phones: what's left and the one next step stay in reach at the bottom of the screen. "3 left" opens a sheet over the
 * bar listing the required parts still empty (and any team notes), each one tap from its part. Once every required
 * part is in, Send for review is the bar's primary.
 */
function Dock({ done, total, next, ready, resubmit, canSend, submitting, idle, left, notes, onNext, onSubmit, onOpen }: {
  done: number; total: number; next: SpotId | null; ready: boolean; resubmit: boolean; canSend: boolean; submitting: boolean;
  /** With the team or live and nothing changed: where it stands, in place of Send. */
  idle: string;
  left: SpotId[]; notes: { id: SpotId; label: string }[]; onNext: () => void; onSubmit: () => void; onOpen: (id: SpotId) => void;
}) {
  const [sheet, setSheet] = React.useState(false);
  const toggle = React.useRef<HTMLButtonElement>(null);
  const list = React.useRef<HTMLDivElement>(null);
  const hide = (back = true) => { setSheet(false); if (back) requestAnimationFrame(() => toggle.current?.focus()); };
  React.useEffect(() => { if (sheet) list.current?.querySelector<HTMLElement>("button")?.focus(); }, [sheet]);
  const items = [...notes.map((n) => ({ id: n.id, label: n.label, note: true })), ...left.filter((id) => !notes.some((n) => n.id === id)).map((id) => ({ id, label: LABEL[id], note: false }))];
  const pick = (id: SpotId) => { hide(false); onOpen(id); };
  const showList = items.length > 0;
  return (
    <div data-dock="" className="fixed inset-x-0 bottom-0 z-sticky lg:hidden" onKeyDown={(e) => { if (e.key === "Escape" && sheet) { e.stopPropagation(); hide(); } }}>
      {sheet && (
        <div ref={list} id="dock-left" role="group" aria-labelledby="dock-left-h" className="max-h-3/4 overflow-y-auto border-t-4 border-line-strong bg-surface-raised px-4 pt-4 pb-3">
          <div className="mx-auto max-w-7xl sm:px-2"><div className="max-w-xl">
            <div className="flex items-center justify-between gap-3 border-b-2 border-line-strong pb-3">
              <h2 id="dock-left-h" className="font-display text-heading-md text-ink">What&apos;s left</h2>
              <button type="button" aria-label="Close what's left" onClick={() => hide()}
                className={cx("grid size-11 place-items-center text-ink hover:bg-surface-hover", focus3)}><X className="size-5" aria-hidden="true" /></button>
            </div>
            <ul>
              {items.map((it) => (
                <li key={`${it.note ? "note" : "part"}-${it.id}`} className="border-b border-line">
                  <button type="button" onClick={() => pick(it.id)}
                    className={cx("flex min-h-12 w-full items-center gap-3 px-1 text-left font-display text-label-md text-ink hover:bg-surface-hover", focus3)}>
                    <span aria-hidden="true" className="grid w-6 shrink-0 place-items-center text-ink-muted">{it.note ? <MessageSquareWarning className="size-4" /> : <span className="size-4 border-2 border-line-strong" />}</span>
                    <span className="min-w-0 flex-1">{it.label}{it.note && <span className="text-ink-muted"> · team note</span>}</span>
                    {it.id === next && !it.note && <span className="text-label-sm text-ink-muted">Next</span>}
                    <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </div></div>
        </div>
      )}
      <div className="border-t-4 border-line-strong bg-bg px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          {showList ? (
            <button ref={toggle} type="button" aria-expanded={sheet} aria-controls="dock-left" onClick={() => (sheet ? hide() : setSheet(true))}
              aria-label={`What's left: ${left.length === 0 ? "no parts" : left.length === 1 ? "1 part" : `${left.length} parts`}${notes.length ? `, ${notes.length === 1 ? "1 team note" : `${notes.length} team notes`}` : ""}`}
              className={cx("inline-flex min-h-12 shrink-0 items-center gap-1.5 border-3 border-line-strong px-3 font-display text-label-md font-bold text-ink tabular-nums hover:bg-surface-hover", focus3)}>
              {left.length ? `${left.length} left` : `${notes.length} ${notes.length === 1 ? "note" : "notes"}`}
              <ChevronUp className={cx("size-4 transition-transform duration-fast", sheet && "rotate-180")} aria-hidden="true" />
            </button>
          ) : (
            <span role="img" aria-label={`${done} of ${total} required parts filled`} className="shrink-0 font-display text-heading-lg text-ink tabular-nums">
              {done}<span className="text-heading-sm text-ink-muted">/{total}</span>
            </span>
          )}
          <div className="min-w-0 flex-1 sm:ml-auto sm:max-w-sm">
            {ready || !next
              ? canSend ? <Button variant="primary" size="lg" fullWidth loading={submitting} iconEnd={<ArrowRight />} onClick={onSubmit}>{resubmit ? "Send again" : "Send for review"}</Button>
                : idle && <p className="text-right font-display text-label-md font-bold text-ink">{idle}</p>
              : <Button variant="primary" size="lg" fullWidth iconEnd={<ArrowRight />} onClick={onNext}>Next: {LABEL[next]}</Button>}
          </div>
        </div>
      </div>
    </div>
  );
}

type Seg = "done" | "next" | "todo";

/** Edit or Preview: two square halves, the chosen one filled. A radio group, like the system's SegmentedControl, at full touch size. */
function ViewToggle({ value, onChange }: { value: "edit" | "client"; onChange: (v: string) => void }) {
  const opts = [{ value: "edit", label: "Edit" }, { value: "client", label: "Preview" }];
  const refs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const move = (from: number, step: number) => {
    const to = (from + step + opts.length) % opts.length;
    onChange(opts[to].value);
    refs.current[to]?.focus();
  };
  return (
    <div role="radiogroup" aria-label="View" className="grid grid-cols-2 border-3 border-line-strong">
      {opts.map((o, i) => {
        const on = o.value === value;
        return (
          <button key={o.value} ref={(el) => { refs.current[i] = el; }} type="button" role="radio" aria-checked={on} tabIndex={on ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); move(i, 1); }
              if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); move(i, -1); }
            }}
            className={cx("inline-flex min-h-12 items-center justify-center px-4 font-display text-label-md font-bold transition-colors duration-fast focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus",
              on ? "bg-ink text-bg" : "text-ink hover:bg-surface-hover")}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

type ReviewState = "review" | "live";

/**
 * With the team, or live: the one mint block says where the page stands and what Send again would do. Live, an
 * availability change goes up as it saves; anything else waits here as a draft (the live page stays as it was) until
 * Send again, which sends it for review and takes the page off the site until it's approved. Live (one record) differs:
 * an edit goes to the team as it saves, so the block says that instead.
 */
function ReviewBlock({ state, unsent, since, slug }: { state: ReviewState; unsent: boolean; since: string; slug: string }) {
  const kept = data.kind !== "live";
  const title = state === "review" ? `In review since ${since}` : "Your page is live";
  const line = state === "review"
    ? kept
      ? unsent
        ? "You've changed your page since you sent it. The team still sees the version you sent. Send again replaces it with this one."
        : "The Between Gigs team has the version you sent. Changes you make now stay here, unsent, until you send them again."
      : "The Between Gigs team has your page. Changes you make now go to them as you save."
    : kept
      ? unsent
        ? "Clients still see your live page as it was. Send again to have the team review these changes; your page comes off the site until they approve them."
        : "Availability changes go live as you save. Anything else stays here as a draft, and your live page stays as it is, until you send it again."
      : "Availability changes go live as you save. Anything else takes your page off the site until the team approves it.";
  return (
    <section aria-labelledby="next-h" className="mb-12 grid grid-cols-12 items-start gap-x-6 gap-y-3 bg-tint-mint px-5 py-5 text-forest-950 sm:px-6">
      <p className="col-span-12 text-eyebrow uppercase lg:col-span-2 lg:pt-2">Status</p>
      <div className="col-span-12 grid gap-2 lg:col-span-5">
        <h2 id="next-h" className="font-display text-heading-lg text-balance">{title}</h2>
        {unsent && <p className="inline-flex w-fit items-center gap-2 border-2 border-forest-950 px-2.5 py-1 font-display text-label-sm font-bold"><span aria-hidden="true" className="size-2 bg-forest-950" />Unsent changes</p>}
      </div>
      <div className="col-span-12 grid gap-2 lg:col-span-5">
        <p className="text-body-sm text-pretty">{line}</p>
        {state === "live" && slug && (
          <Link href={`/p/${slug}/`} className="inline-flex min-h-11 w-fit items-center gap-2 font-display text-label-md font-bold underline underline-offset-4 hover:no-underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-forest-950">
            See your live page<ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        )}
      </div>
    </section>
  );
}

/** The bar above the page: a big count of parts done, the ten-part line, saving, Edit or Preview, and Send. */
function EditorBar({ segs, done, total, ready, missing, save, view, editing, sent, submitting, resubmit, canSend, state, unsent, pinned, onRetry, onView, onSubmit }: {
  segs: Seg[]; done: number; total: number; ready: boolean; missing: number; save: SaveState; view: "edit" | "client"; editing: boolean; sent: boolean; submitting: boolean; resubmit: boolean; canSend: boolean;
  state: ReviewState | null; unsent: boolean;
  /** Pinned under the site header; not while the phone sheet is open, so the part being edited has the room. */
  pinned: boolean;
  onRetry: () => void; onView: (v: string) => void; onSubmit: () => void;
}) {
  const pct = Math.round((done / total) * 100);
  const line = sent ? "Sent for review"
    : missing ? `${missing} ${missing === 1 ? "thing" : "things"} to finish`
    : unsent ? "Unsent changes"
    : state === "live" ? "Live · up to date"
    : state === "review" ? "In review"
    : ready ? "Ready to send" : "Your page · edit on page";
  const primary = ready && !editing;
  return (
    <div data-stage="" className={cx("z-sticky bg-bg", pinned && "sm:sticky sm:top-16 embedded:sm:top-0")}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-12 items-end gap-x-6 gap-y-4 border-b-4 border-line-strong pt-5 pb-4 lg:pt-7 lg:pb-5">
          <p className="col-span-12 flex items-end gap-3 sm:col-span-4 lg:col-span-3">
            <span className="font-display text-display-sm text-ink tabular-nums lg:text-stat">{sent ? total : done}<span className="text-heading-lg text-ink-muted lg:text-display-sm">/{total}</span></span>
            <span className="pb-1 font-display text-label-md font-bold text-ink">parts<br />done</span>
          </p>
          <div className="col-span-12 sm:col-span-8 lg:col-span-5">
            <span role="progressbar" aria-label="Profile progress" aria-valuenow={sent ? 100 : pct} aria-valuemin={0} aria-valuemax={100} className="grid grid-cols-10 gap-1">
              {segs.map((s, i) => <span key={i} className={cx("h-3.5 transition-colors duration-slow", s === "done" ? "bg-ink" : s === "next" ? "bg-tint-mint" : "border-2 border-line bg-surface-sunken")} />)}
            </span>
            <div className="mt-2.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <b className={cx("inline-flex items-center gap-1.5 font-display text-label-sm", missing && !sent ? "text-danger" : unsent && !sent ? "text-ink" : "text-ink-muted")}>
                {unsent && !sent && !missing && <span aria-hidden="true" className="size-2 bg-ink" />}{line}
              </b>
              <SaveIndicator state={save} onRetry={onRetry} />
            </div>
          </div>
          {/* Under the progress line on tablets (the dock carries Send there); at the right edge when there's nothing to send. */}
          <div className={cx("col-span-12 sm:col-span-8 sm:col-start-5 lg:col-span-2", !sent && canSend ? "lg:col-start-9" : "lg:col-start-11")}><ViewToggle value={view} onChange={onView} /></div>
          {!sent && canSend && (
            <div className="col-span-2 max-lg:hidden">
              <Button size="lg" variant={primary ? "primary" : "secondary"} fullWidth loading={submitting} iconEnd={<ArrowRight />} onClick={onSubmit}
                className={cx("min-h-13 justify-between font-display font-bold", !primary && "border-3", ready && "glow-hover")}>
                {resubmit ? "Send again" : "Send for review"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** The column beside the page while editing: the open part's controls, or the numbered list of every part to tap. */
function Rail({ first, panel }: { first: string; panel: React.ReactNode }) {
  const { d, next, editing, open } = useCanvas();
  const done = REQUIRED.filter((id) => isFilled(id, d)).length;
  if (panel) return <>{panel}</>;
  return (
    <section aria-labelledby="rail-h" className="border-t-4 border-line-strong pt-4 max-lg:hidden">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="rail-h" className="font-display text-heading-sm text-ink">{done <= 1 ? `Welcome, ${first}. This is your page.` : next ? "Keep going" : "Ready when you are"}</h2>
        <span role="img" aria-label={`${done} of ${REQUIRED.length} required parts filled`} className="shrink-0 font-display text-label-md font-bold text-ink tabular-nums">{done}/{REQUIRED.length}</span>
      </div>
      <ul className="mt-3">
        {PARTS.map((id) => {
          const filled = isFilled(id, d);
          const isNext = id === next;
          return (
            <li key={id} className="border-t border-line">
              <button type="button" onClick={() => open(id)} aria-current={editing === id ? "step" : undefined}
                className={cx("flex min-h-11 w-full items-center gap-3 px-2 text-left font-display text-label-md transition-colors duration-fast focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-focus",
                  isNext ? "bg-ink text-bg" : editing === id ? "bg-surface-sunken text-ink" : "text-ink hover:bg-surface-hover")}>
                <span aria-hidden="true" className={cx("grid size-4 shrink-0 place-items-center border-2", isNext ? "border-bg" : filled ? "border-ink bg-ink text-bg" : "border-line-strong")}>{filled && !isNext && <Check className="size-3" strokeWidth={3} />}</span>
                <span className={cx("min-w-0 flex-1", filled && !isNext && "text-ink-muted line-through")}>{LABEL[id]}<span className="sr-only">{filled ? " (done)" : " (to do)"}</span></span>
                {isNext ? <span className="text-label-sm">Next</span>
                  : filled ? <span aria-hidden="true" className="inline-flex items-center gap-1 text-label-sm text-ink-muted"><Check className="size-3.5" strokeWidth={3} />Done</span>
                  : !REQUIRED.includes(id) && <span className="text-label-sm text-ink-muted">Optional</span>}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-6 border-t border-line pt-4 text-body-sm text-ink-muted">{next
        ? done <= 1 ? "It's what clients will see. Tap any part to fill it in where it sits; it saves as you go." : "Tap any part to fill it in where it sits; it saves as you go."
        : "Everything clients need is in. Preview it, then send it to the Between Gigs team."}</p>
    </section>
  );
}

/**
 * Wide screens: the open part's controls float right under the part that was clicked, with a small pointer to it, so
 * editing happens where the eye already is. Placed in the page (portal) from the part's position, kept inside the
 * viewport's width, and re-measured as the page reflows; it scrolls into view as it opens.
 */
function Anchored({ id, children }: { id: SpotId; children: React.ReactNode }) {
  const [pos, setPos] = React.useState<{ top: number; left: number; width: number; arrow: number; max: number } | null>(null);
  const box = React.useRef<HTMLDivElement>(null);
  React.useLayoutEffect(() => {
    const spot = document.querySelector<HTMLElement>(`[data-spot="${id}"]`);
    if (!spot) return;
    const place = () => {
      const r = spot.getBoundingClientRect();
      const width = Math.min(640, window.innerWidth - 32);
      const left = Math.max(16, Math.min(r.left + window.scrollX, window.innerWidth - width - 16));
      const arrow = Math.max(24, Math.min(r.left + window.scrollX + Math.min(r.width, 64) / 2 - left, width - 24));
      // Tall enough to keep its Close / Save bar on screen with the part above it, under the pinned bar.
      const bar = 64 + (document.querySelector<HTMLElement>("[data-stage]")?.offsetHeight ?? 0);
      const max = Math.max(360, window.innerHeight - bar - 16 - Math.min(r.height, window.innerHeight * 0.3) - 14 - 16);
      setPos({ top: r.bottom + window.scrollY + 14, left, width, arrow, max });
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(spot); ro.observe(document.body);
    window.addEventListener("resize", place);
    return () => { ro.disconnect(); window.removeEventListener("resize", place); };
  }, [id]);
  // Keep the page steady: scroll only as much as it takes to show the part and its panel together (like
  // scrollIntoView block "nearest" over both), never to the top. When both can't fit, the part's top goes just under the bar.
  React.useEffect(() => {
    const spot = document.querySelector<HTMLElement>(`[data-spot="${id}"]`);
    if (!pos || !spot || !box.current) return;
    const top = (document.querySelector("[data-stage]")?.getBoundingClientRect().bottom ?? 0) + 16;
    const bottom = window.innerHeight - 16;
    const s = spot.getBoundingClientRect().top - 8;
    const e = box.current.getBoundingClientRect().bottom;
    let by = 0;
    if (s < top) by = s - top;
    else if (e > bottom) by = Math.min(e - bottom, s - top);
    if (Math.abs(by) < 2) return;
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    window.scrollBy({ top: by, behavior });
  }, [pos?.top, id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!pos) return null;
  return createPortal(
    <div ref={box} data-anchored="" className="absolute z-overlay" style={{ top: pos.top, left: pos.left, width: pos.width, "--panel-max": `${pos.max}px` } as React.CSSProperties}>
      <span aria-hidden="true" className="absolute -top-2 size-4 rotate-45 border-t-3 border-l-3 border-line-strong bg-surface" style={{ left: pos.arrow - 8 }} />
      {children}
    </div>,
    // Inside <main>, so it stays in the page's main landmark; main isn't positioned, so document coordinates hold.
    document.getElementById("main") ?? document.body,
  );
}

/** The controls for the open part: a square box under the part on wide screens, a sheet from the bottom on phones. */
function EditorPanel({ id, body, sheet = false }: { id: SpotId; body: React.ReactNode; sheet?: boolean }) {
  const { d, errors, noted, close, advance, missing } = useCanvas();
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
    <div ref={ref} data-editor="" role="group" aria-label={`Editing: ${LABEL[id]}`}
      onKeyDown={(e) => {
        if (e.key === "Escape") { e.stopPropagation(); close(); return; }
        // Tab stays with the open part (the panel sits apart from it in the page): past the last control it goes back to
        // the first, and Shift+Tab from the first to the last. Close or Esc leaves it.
        if (e.key !== "Tab" || !ref.current) return;
        const all = [...ref.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input:not([type=hidden]):not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1'])")]
          .filter((el) => el.offsetParent !== null || el === document.activeElement);
        if (!all.length) return;
        const at = all.indexOf(document.activeElement as HTMLElement);
        if (e.shiftKey && at <= 0) { e.preventDefault(); all[all.length - 1].focus(); }
        else if (!e.shiftKey && at === all.length - 1) { e.preventDefault(); all[0].focus(); }
      }}
      style={sheet ? undefined : { maxHeight: "var(--panel-max, calc(100dvh - 10rem))" }}
      className={cx("grid gap-5", sheet ? "px-5 pt-5" : "overflow-y-auto border-3 border-line-strong bg-surface px-6 pt-6")}>
      <div className="flex items-baseline justify-between gap-3 border-b-2 border-line-strong pb-3.5">
        <p className="flex min-w-0 items-baseline gap-3 font-display text-heading-md text-ink">
          {LABEL[id]}
        </p>
        <span className="shrink-0 font-display text-label-sm text-ink-muted">Editing</span>
      </div>
      {note && <p className="flex gap-2 border-l-4 border-line-strong bg-surface-sunken p-3 text-body-sm text-ink"><MessageSquareWarning className="mt-0.5 size-4 shrink-0 text-ink" aria-hidden="true" /><span className="min-w-0 break-words"><b>Team note:</b> {note}</span></p>}
      {/* After Send with parts missing: what's left and this part's own errors, above its controls, in view as it opens. */}
      {err && (
        <div role="alert" className="grid gap-1 border-l-4 border-danger bg-surface-sunken p-3 text-body-sm">
          {missing > 0 && <p className="font-bold text-ink">{missing === 1 ? "One thing" : `${missing} things`} to finish before you send. This is {missing === 1 ? "it" : "the first"}.</p>}
          <ul className="grid gap-1 text-danger">{err.map((m) => <li key={m}>{m}</li>)}</ul>
        </div>
      )}
      {body}
      <div className={cx("sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-line py-4", sheet ? "-mx-5 bg-surface-raised px-5" : "-mx-6 bg-surface px-6")}>
        <p className="text-body-sm text-ink-muted max-sm:hidden">It saves as you go.</p>
        <div className="ml-auto flex gap-3">
          <Button size="lg" variant="secondary" data-close="" className="border-2 font-display font-bold" onClick={close}>Close</Button>
          <Button size="lg" variant="primary" className="font-display font-bold" iconEnd={<ArrowRight />} aria-label={after ? `Next: ${LABEL[after]}, save and continue` : undefined} onClick={() => advance(id)}>
            {after ? "Save and continue" : "Done"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** The editor for each part. */
function editorFor(id: SpotId, d: ProfileFields, set: <K extends keyof ProfileFields>(k: K) => (v: ProfileFields[K]) => void, personId: string, confirm: (go: () => void) => void): React.ReactNode {
  switch (id) {
    case "photo": return <PhotoEditor d={d} personId={personId} onChange={set("photo")} confirm={confirm} />;
    case "name": return <Field label="Full name"><Input id="f-name" size="lg" autoComplete="name" maxLength={NAME_MAX} value={d.name} onChange={(e) => set("name")(e.target.value.slice(0, NAME_MAX))} /></Field>;
    case "position": return <>
      <Field label="Department" hint="Type your own, or tap one to start from."><Input id="f-position" maxLength={DEPARTMENT_MAX} value={d.position} placeholder="e.g. Costume & wardrobe" onChange={(e) => set("position")(e.target.value.slice(0, DEPARTMENT_MAX))} /></Field>
      <Quick options={onSetSkills} onPick={set("position")} current={d.position} />
    </>;
    case "years": return <YearsEditor value={d.years} onChange={set("years")} />;
    case "where": return <WhereEditor d={d} set={set} />;
    case "rate": return <div className="grid gap-4">
      <Field label="Starting rate" optional hint="Leave it empty for “Rate on request”. Final scope and rate are agreed with each client."><Input id="f-rate" inputMode="numeric" value={d.rate} start={<span className="text-label-md">$</span>} end={<span className="text-label-sm text-ink-subtle">USD</span>} onChange={(e) => set("rate")(e.target.value.replace(/\D/g, "").replace(/^0+/, "").slice(0, 4))} /></Field>
      <RadioGroup name="f-basis" label="Rate basis" orientation="horizontal" value={d.basis} onChange={(v) => set("basis")(v as ProfileFields["basis"])} options={Object.entries(basisLabel).map(([value, label]) => ({ value, label }))} />
    </div>;
    case "availability": return <div className="grid gap-4">
      <RadioGroup name="f-monthStatus" label={`This month · ${d.month}`} value={d.monthStatus} onChange={(v) => set("monthStatus")(v as ProfileFields["monthStatus"])} options={Object.entries(monthStatusLabel).map(([value, label]) => ({ value, label }))} />
      <Field label="Dates or times this month" hint="Exact project dates are agreed with each client."><Input id="f-dates" maxLength={DATES_MAX} value={d.dates} placeholder="e.g. Weekday mornings" onChange={(e) => set("dates")(e.target.value.slice(0, DATES_MAX))} /></Field>
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
 * One part of the page. Filled: the content as clients see it, with an Edit tag on hover. Empty: a square hairline box
 * that says what goes there, with "+ Add" (the next one marked). Open: outlined while its controls are in the panel.
 */
function Spot({ id, kind, hint, children }: { id: SpotId; kind: PartKind; hint: string; children: React.ReactNode }) {
  const { d, editing, next, fresh, errors, noted, open, portrait } = useCanvas();
  const order = { "--i": ORDER.indexOf(id) } as React.CSSProperties;
  const filled = isFilled(id, d);
  const err = errors[id];
  const note = noted[id];
  const active = editing === id;
  const glow = id === next && !editing;
  // Outlines, not rings: the Swiss look has no shadows.
  const ring = active ? "outline-3 outline-offset-2 outline-line-strong" : err ? "outline-2 outline-offset-2 outline-danger" : note ? "outline-2 outline-offset-2 outline-dashed outline-line-strong" : "";
  const optional = !REQUIRED.includes(id);
  const label = `${filled ? "Edit" : "Add"} ${LABEL[id].toLowerCase()}${optional ? " (optional)" : ""}`;
  const focus = "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus";

  if (!filled) {
    return (
      <div data-spot={id} style={order} className={cx("relative", kind === "block" && "h-full")}>
        <button type="button" data-spot-edit="" onClick={() => open(id)} aria-label={label} aria-pressed={active}
          className={cx("group text-left transition duration-base", focus, ring, glow && "spot-next",
            kind === "photo" ? "block w-full"
              : kind === "block" ? "flex h-full min-h-20 w-full flex-wrap items-center gap-x-5 gap-y-3 border-2 border-line bg-surface p-5 hover:border-line-strong"
              : cx("inline-flex min-h-11 max-w-full items-center gap-2.5 border-2 border-line bg-surface py-1 pr-4 pl-1 hover:border-line-strong", kind === "title" && "justify-center"))}>
          {kind === "photo" ? (
            <span className="relative grid aspect-square content-end overflow-hidden bg-surface-sunken">
              <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full text-line">
                <path d="M0 0L100 100M100 0L0 100" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
              </svg>
              <span className="absolute top-3 left-3 bg-bg px-2 py-1 font-display text-label-sm font-bold text-ink">Photo</span>
              <span className="relative flex items-center justify-between gap-3 border-3 border-line-strong bg-bg p-3 group-hover:bg-surface-hover">
                <span className="grid min-w-0 gap-0.5">
                  <span className="font-display text-label-md font-bold text-ink">{hint}</span>
                  <span className="text-body-sm text-ink-muted">A friendly face helps</span>
                </span>
                <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center bg-ink text-bg"><Plus className="size-5" strokeWidth={2.5} /></span>
              </span>
            </span>
          ) : kind === "block" ? <>
            {/* Keeps a readable measure in narrow columns: Add wraps under the text instead of crushing it. */}
            <span className="grid min-w-0 flex-1 basis-40 gap-1">
              <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-display text-label-md font-bold text-ink">
                {LABEL[id]}
                {optional && <span className="text-eyebrow text-ink-muted uppercase">Optional</span>}
              </span>
              {hint !== LABEL[id] && <span className="text-body-sm text-ink-muted group-hover:text-ink">{hint}</span>}
            </span>
            <span aria-hidden="true" className="inline-flex min-h-11 shrink-0 items-center gap-2 border-2 border-line-strong px-4 font-display text-label-md font-bold text-ink transition-colors duration-fast group-hover:bg-ink group-hover:text-bg">
              <Plus className="size-4" strokeWidth={2.5} />Add
            </span>
          </> : <>
            <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center bg-ink text-bg"><Plus className="size-4" strokeWidth={2.5} /></span>
            <span className="min-w-0 py-1 font-display text-label-md font-bold text-pretty text-ink">{id === "position" ? LABEL.position : hint}</span>
          </>}
        </button>
        {note && <Badge tone="neutral" size="sm" className="absolute -top-3 right-3 bg-ink text-bg">Team note</Badge>}
      </div>
    );
  }
  return (
    <div data-spot={id} style={order} className={cx("group relative", kind === "line" && "w-fit max-w-full")}>
      <div className={cx("transition duration-base", id === "photo" && portrait ? "portrait-reveal" : fresh === id && "spot-filled")}>{children}</div>
      <button type="button" data-spot-edit="" onClick={() => open(id)} aria-label={label} aria-pressed={active}
        className={cx("absolute -inset-2 transition duration-fast hover:bg-ink-brand/5 hover:outline-2 hover:outline-line-strong", focus, ring)}>
        <span className={cx("absolute inline-flex items-center gap-1 bg-ink px-2.5 py-1 font-display text-label-sm font-bold whitespace-nowrap text-bg transition-opacity duration-fast",
          active || note ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
          kind === "line" ? "top-1/2 left-full ml-3 -translate-y-1/2 max-sm:top-0 max-sm:right-2 max-sm:left-auto max-sm:-translate-y-1/2" : kind === "photo" ? "-bottom-2 left-1/2 -translate-x-1/2" : "-top-3 right-3")}>
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
                className={cx("size-14 overflow-hidden border-3 transition-colors duration-fast", focus3, d.photo === src ? "border-ink-brand" : "border-transparent hover:border-line-strong")}>
                <img src={asset(src)} alt="" className="size-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const focus3 = "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus";

/** One-tap answers under a text field: square tiles in a grid, the picked one filled. They fill it, and stay editable. */
function Quick({ options, onPick, current }: { options: string[]; onPick: (v: string) => void; current: string }) {
  return (
    <div role="group" aria-label="Quick picks" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {options.map((o) => {
        const on = current === o;
        return (
          <button key={o} type="button" aria-pressed={on} onClick={() => onPick(o)}
            className={cx("flex min-h-13 items-center justify-between gap-2 border-2 px-4 py-2 text-left font-display text-label-md font-bold transition-colors duration-fast", focus3,
              on ? "border-ink-brand bg-ink-brand text-bg" : "border-line-strong text-ink hover:bg-surface-hover")}>
            {o}{on && <Check className="size-4 shrink-0" strokeWidth={3} aria-hidden="true" />}
          </button>
        );
      })}
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
        <div className="flex flex-wrap items-center gap-3 border-2 border-line bg-surface-sunken p-4">
          <WandSparkles className="size-5 shrink-0 text-ink-brand" aria-hidden="true" />
          <p className="min-w-0 flex-1 text-body-sm text-ink">Not sure where to start? We'll write a first draft from your answers so far. Then make it sound like you.</p>
          <Button variant="secondary" className="min-h-11 border-2 font-display font-bold" onClick={() => { onChange(starterAbout(d)); setDrafted(true); }}>Start me off</Button>
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
    <Reveal effect="scale-in" className="grid gap-x-6 gap-y-8 border-b border-line pt-2 pb-10 lg:grid-cols-12 lg:items-start">
      <div className="grid gap-5 lg:col-span-7">
        <p className="flex items-center gap-2 text-eyebrow text-ink uppercase"><PartyPopper className="size-4" aria-hidden="true" />Sent for review</p>
        <h2 tabIndex={-1} className="font-display text-display-sm text-balance text-ink outline-none lg:text-display-md">Your page is ready, {first}.</h2>
        <p className="max-w-prose text-body-lg text-ink-muted">It's with the Between Gigs team now. Once they approve it, this is where clients will find you. Changes you make from here save as a draft until you send them again.</p>
        <div className="flex min-w-0 items-center gap-2 border-2 border-line-strong p-2 pl-3">
          <Link2 className="size-4 shrink-0 text-ink-subtle" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate font-mono text-data-sm text-ink" title={url}>{url.replace(/^https?:\/\//, "")}</span>
          <Button variant="primary" className="min-h-11 font-display font-bold" iconStart={<Copy />} onClick={copy}>Copy link</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {canShare && <Button variant="secondary" size="lg" className="border-2" iconStart={<Share2 />} onClick={() => { void navigator.share({ title: `${d.name} · Between Gigs`, url }).catch(() => {}); }}>Share</Button>}
          <ButtonLink href="/profile/" variant="ghost" size="lg" className="underline underline-offset-4" iconEnd={<ArrowRight />}>Go to My profile</ButtonLink>
        </div>
      </div>
      <div className="lg:col-span-5">
        <p className="mb-3 font-display text-label-md font-bold text-ink">How you&apos;ll appear in search</p>
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
