"use client";
import { Banner, Button, Checkbox, Field, IconButton, Kbd, Modal, Popover, Tag, Textarea, Tooltip, cx, useToast } from "@ds/components";
import { ArrowRight, ChevronDown, ChevronLeft, ChevronRight, CircleCheck, CircleDashed, Keyboard, ListChecks, MessageSquareWarning, PencilLine } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { data, type Person, type ProfileFields, type ProfileSection } from "@/lib/data";
import { SECTIONS, fieldLabel, sectionLabel, validateAll } from "@/lib/profile/validate";
import { typingOrDialog } from "./format";
import { ordinal, type ReviewHistory } from "./history";
import { HOLD_MS, holdDecision, type Hold } from "./hold";
import { Panel } from "./kit";
import { PersonPhoto } from "@/components/people/PersonPhoto";
import { markArea } from "@/lib/split-area";

markArea("bg-split:dashboard");

const checks = [
  { id: "photo", label: "The photo shows their face clearly", hint: "Friendly, well lit, no group shots." },
  { id: "credits", label: "Credits and IMDb page match", hint: "Open the IMDb link in Experience." },
  { id: "services", label: "Services fit what they did on set", hint: "Nothing regulated without the right license." },
  { id: "story", label: "“About me” reads well for clients", hint: "Clear, warm, no contact details." },
];

/** A queued person, enough to move between them. */
export interface QueueItem { id: string; name: string }

export const reviewHref = (id: string) => `/owners/people/${id}/?from=review`;

/** Every required answer that's missing, as [field, label] pairs with the profile section it belongs to. */
export function missingFields(fields: ProfileFields) {
  return Object.entries(validateAll(fields)).flatMap(([step, errors]) =>
    Object.keys(errors).map((k) => ({ field: k as keyof ProfileFields, label: fieldLabel[k as keyof ProfileFields] ?? k, section: SECTIONS[Number(step)] })));
}

/** The next person to open after deciding on this one: the one after it, else the first one still waiting. */
function nextAfter(queue: QueueItem[], id: string) {
  const i = queue.findIndex((q) => q.id === id);
  return queue.slice(i + 1).find((q) => q.id !== id) ?? queue.find((q) => q.id !== id);
}

/**
 * Reviewing a submitted profile, one after another. A sticky bar keeps the place in the queue ("2 of 4"),
 * previous and next, Suggest edits and Approve & next in reach while reading the profile below it; J/K, A
 * and E do the same from the keyboard. Each decision moves straight on, with Undo in the toast (live, the
 * decision is held until the toast goes: hold.ts).
 * The checklist sits under the person's header: a guide, not a gate.
 */
export function ReviewWorkspace({ person, fields, queue, header, history, scrolled = false, children }: {
  person: Person; fields: ProfileFields; queue: QueueItem[]; header: React.ReactNode;
  /** The review round, last round's notes and an unsent draft, when the data layer reports them. */ history?: ReviewHistory;
  /** The person's header has scrolled away: the bar then names who you're deciding on. */ scrolled?: boolean; children: React.ReactNode;
}) {
  const toast = useToast();
  const router = useRouter();
  const [ticked, setTicked] = React.useState<string[]>([]);
  const [suggest, setSuggest] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const missing = missingFields(fields);
  const first = person.name.split(" ")[0] || "them";

  const index = queue.findIndex((q) => q.id === person.id);
  const prev = index > 0 ? queue[index - 1] : undefined;
  const next = index >= 0 && index < queue.length - 1 ? queue[index + 1] : undefined;
  const after = nextAfter(queue, person.id);

  const go = React.useCallback((q?: QueueItem) => { if (q) router.push(reviewHref(q.id)); }, [router]);

  /** Moves on after a decision, and offers Undo, which puts them back in the queue and reopens them. */
  const decided = React.useCallback((message: string, hold: Hold) => {
    toast({
      message, tone: "success", duration: HOLD_MS,
      action: {
        label: "Undo",
        onClick: () => {
          void hold.cancel().then((undone) => undone
            ? (toast({ message: `Undone. ${person.name} is back in the queue.` }), router.push(reviewHref(person.id)))
            : toast({ message: "Couldn't undo that. It may have changed already.", tone: "danger" }));
        },
      },
    });
    router.push(after ? reviewHref(after.id) : "/owners/review/");
  }, [after, person.id, person.name, router, toast]);

  const approve = React.useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      decided(`${person.name} approved · now live`, await holdDecision(person.id, () => data.owners.approve(person.id), { onError: () => toast({ message: `Couldn't approve ${person.name}. Try again.`, tone: "danger" }) }));
    } catch { toast({ message: "Couldn't approve. Try again.", tone: "danger" }); setBusy(false); }
  }, [busy, decided, person.id, person.name, toast]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (typingOrDialog(e) || busy) return;
      const k = e.key.toLowerCase();
      if (k === "j" && next) { e.preventDefault(); go(next); }
      else if (k === "k" && prev) { e.preventDefault(); go(prev); }
      else if (k === "a") { e.preventDefault(); void approve(); }
      else if (k === "e") { e.preventDefault(); setSuggest(true); }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [approve, busy, go, next, prev]);

  // The same checklist in two places: the panel on the page, and a popover from the pinned bar, so it's in
  // reach wherever you've scrolled to. Both share one set of ticks.
  const checklist = (where: "page" | "bar") => (
    <>
      <p className={cx("flex items-start gap-3 border-l-4 p-4 text-body-md text-ink", missing.length ? "border-warning bg-warning-soft" : "border-line-strong bg-surface-sunken")}>
        {missing.length ? <CircleDashed aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-warning" /> : <CircleCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-ink" />}
        <span>{missing.length ? <>Missing: {missing.map((m) => m.label).join(", ")}. Suggest edits to ask {first} for it; the note is filled in for you.</> : "Every required answer is filled in."}</span>
      </p>
      <ul className={cx("mt-4 grid gap-4", where === "page" && "sm:grid-cols-2 xl:grid-cols-4")}>
        {checks.map((c) => (
          <li key={c.id}>
            <Checkbox id={`${where}-${c.id}`} label={c.label} description={c.hint} checked={ticked.includes(c.id)}
              onChange={(e) => setTicked((t) => (e.target.checked ? [...t, c.id] : t.filter((x) => x !== c.id)))} />
          </li>
        ))}
      </ul>
    </>
  );

  return (
    <>
      <div className="sticky top-0 z-sticky -mx-4 mt-2 flex h-16 items-center gap-2 border-b-4 border-line-strong bg-bg px-4 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <nav aria-label="Review queue" className="flex min-w-0 items-center gap-1">
          <IconButton variant="ghost" size="sm" label={prev ? `Previous in queue: ${prev.name} (K)` : "Previous in queue"} icon={<ChevronLeft />} disabled={!prev} onClick={() => go(prev)} />
          <p className="px-1 font-display text-label-md font-extrabold whitespace-nowrap text-ink tabular-nums">
            {index >= 0 ? <>{index + 1} of {queue.length}<span className="max-sm:sr-only"> in queue</span></> : "Review"}
          </p>
          <IconButton variant="ghost" size="sm" label={next ? `Next in queue: ${next.name} (J)` : "Next in queue"} icon={<ChevronRight />} disabled={!next} onClick={() => go(next)} />
        </nav>
        {/* Once their header scrolls away, the bar says who this is (from md; phones keep the room for the buttons). */}
        <span className={cx("hidden min-w-0 items-center gap-2 border-l border-line pl-3", scrolled && "md:flex")}>
          <PersonPhoto id={person.id} name={person.name || "?"} src={fields.photo || undefined} alt="" className="size-9 shrink-0" textClass="text-label-sm" />
          <span className="truncate font-display text-label-md font-extrabold text-ink">{person.name}</span>
        </span>
        <span className="ml-1 hidden md:inline-flex">
          <Tooltip side="bottom" content={<span className="inline-flex items-center gap-3"><span className="inline-flex items-center gap-1"><Kbd keys={["J"]} /><Kbd keys={["K"]} />next / previous</span><span className="inline-flex items-center gap-1"><Kbd keys={["A"]} />approve</span><span className="inline-flex items-center gap-1"><Kbd keys={["E"]} />edits</span></span>}>
            <IconButton variant="ghost" size="sm" label="Keyboard shortcuts" icon={<Keyboard />} />
          </Tooltip>
        </span>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Popover label="Review checklist" title="Review checklist" align="end" width="lg"
            trigger={
              <Button variant="ghost" size="sm" iconStart={<ListChecks />} aria-label={`Review checklist, ${ticked.length} of ${checks.length} checked`}>
                <span className="max-sm:sr-only">Checklist</span><span className="tabular-nums text-ink-muted">{ticked.length}/{checks.length}</span>
              </Button>
            }>
            {checklist("bar")}
          </Popover>
          <Button variant="secondary" size="sm" iconStart={<MessageSquareWarning />} onClick={() => setSuggest(true)} aria-keyshortcuts="E">
            <span className="max-sm:sr-only">Suggest edits</span>
          </Button>
          <Button variant="primary" size="sm" iconStart={<CircleCheck />} loading={busy} onClick={() => void approve()} aria-keyshortcuts="A">
            <span>Approve{after && <span className="max-sm:sr-only"> &amp; next</span>}</span>
          </Button>
        </div>
      </div>

      {header}
      {history?.unsentDraft && <UnsentDraftFlag className="mt-4" />}
      {history && <PreviousNotes history={history} className="mt-8" />}

      <Panel className="mt-8" id="review-h" number="01" title="Review checklist" collapsible="review-checklist"
        aside={<span className="tabular-nums">{ticked.length} of {checks.length} checked · a guide, nothing is saved until you decide</span>}>
        {checklist("page")}
      </Panel>

      {children}

      <SuggestEdits open={suggest} person={person} fields={fields} onClose={() => setSuggest(false)}
        onSent={(hold) => { setSuggest(false); decided(`Edits sent to ${first}`, hold); }} />
    </>
  );
}


/** Quiet flag: the Gigster has changed their profile since sending it; the owners are reviewing the sent version. */
export function UnsentDraftFlag({ className }: { className?: string }) {
  return (
    <p className={cx("flex items-center gap-2 text-body-sm text-ink-muted", className)}>
      <PencilLine aria-hidden="true" className="size-4 shrink-0" />
      <span>They&apos;re still editing: newer changes not sent yet</span>
    </p>
  );
}

/** On a profile that came back after Suggest edits: which review this is, and what was asked for last time. */
function PreviousNotes({ history, className }: { history: ReviewHistory; className?: string }) {
  if (history.round < 2 && !history.asked.length) return null;
  return (
    <section aria-labelledby="previous-notes-h" className={cx("border-l-4 border-line-strong bg-surface-sunken p-4", className)}>
      <h2 id="previous-notes-h" className="font-display text-label-md font-extrabold text-ink">{ordinal(Math.max(2, history.round))} review</h2>
      {history.asked.length > 0 && (
        <>
          <p className="mt-1 text-body-sm text-ink-muted">You asked for:</p>
          <ul className="mt-2 grid gap-1">
            {history.asked.map((n) => (
              <li key={`${n.section}-${n.note}`} className="grid gap-x-4 text-body-md text-ink sm:grid-cols-12 sm:items-baseline">
                <b className="text-label-md font-bold sm:col-span-3">{sectionLabel[n.section]}</b>
                <span className="max-w-2xl text-pretty break-words sm:col-span-9">{n.note}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

type NoteKey = ProfileSection;
const NOTE_KEYS: NoteKey[] = ["photo", ...SECTIONS.filter((k) => k !== "photo")];
/**
 * Photo notes are saved under their own "photo" section, so the Gigster's note opens the photo part. The live
 * server (lib/server/gigs.ts) only accepts the four questionnaire sections so far, so live keeps the older form:
 * under "About you", starting "Photo:" (readNotes in lib/profile/validate.ts reads both as photo notes).
 */
const PHOTO_SECTION = data.kind !== "live";
const noteLabel: Record<NoteKey, string> = sectionLabel;

/** One-tap reasons, per section. Tapping adds the sentence to that section's note; tapping again takes it out. */
const reasons: Record<NoteKey, string[]> = {
  photo: ["Add a clear face photo.", "Use a well-lit photo on your own, no group shots."],
  about: ["Add your IMDb profile link.", "List one or two credits.", "Add your years in the business."],
  skills: ["Add the services you'd offer between gigs.", "Tell clients what's included."],
  where: ["Add your rate.", "Add the dates you're free this month.", "Add the areas you cover."],
  story: ["Tell clients what a session with you looks like.", "Take out phone numbers and emails.", "Write a few more lines, about 5 to 7."],
};
const placeholders: Record<NoteKey, string> = {
  photo: "e.g. Please add a photo that shows your face clearly.",
  about: "e.g. Add the IMDb link that matches your credits.",
  skills: "e.g. Add the services you'd offer between gigs.",
  where: "e.g. Add the dates you're free this month.",
  story: "e.g. Tell clients what a session with you looks like.",
};

/** Notes to start from: one line per missing answer, under the section it belongs to (the photo gets its own). */
function prefill(fields: ProfileFields): Record<NoteKey, string> {
  const out: Record<NoteKey, string> = { photo: "", about: "", skills: "", where: "", story: "" };
  for (const m of missingFields(fields)) {
    const key: NoteKey = m.field === "photo" ? "photo" : m.section;
    out[key] = [out[key], m.field === "photo" ? "Missing: Profile photo. Add a clear face photo." : `Missing: ${m.label}.`].filter(Boolean).join(" ");
  }
  return out;
}

const startOpen = (notes: Record<NoteKey, string>) => { const has = NOTE_KEYS.filter((k) => notes[k]); return has.length ? has : NOTE_KEYS.slice(0, 1); };

/** A collapsed row's preview: the note's first few words. */
const firstWords = (note: string, n = 8) => { const w = note.split(/\s+/); return w.length > n ? `${w.slice(0, n).join(" ")}…` : note; };

export function SuggestEdits({ open, person, fields, onClose, onSent }: { open: boolean; person: Person; fields: ProfileFields; onClose: () => void; onSent: (hold: Hold) => void }) {
  const toast = useToast();
  const [notes, setNotes] = React.useState<Record<NoteKey, string>>(() => prefill(fields));
  const [opened, setOpened] = React.useState<NoteKey[]>(() => startOpen(prefill(fields)));
  const [focusKey, setFocusKey] = React.useState<NoteKey>();
  const [error, setError] = React.useState<string>();
  const [busy, setBusy] = React.useState(false);
  const first = person.name.split(" ")[0] || "them";

  // Each time it opens, start again from the missing answers.
  // Sections that already have a note start open (else the first, so there's somewhere to type); the rest are one row each.
  React.useEffect(() => { if (open) { const p = prefill(fields); setNotes(p); setOpened(startOpen(p)); setFocusKey(undefined); setError(undefined); } }, [open, fields]); // eslint-disable-line react-hooks/set-state-in-effect

  const toggle = (key: NoteKey, reason: string) => {
    setError(undefined);
    setNotes((n) => {
      const has = n[key].includes(reason);
      const v = has ? n[key].replace(reason, "").replace(/\s{2,}/g, " ").trim() : [n[key].trim(), reason].filter(Boolean).join(" ");
      return { ...n, [key]: v.slice(0, 300) };
    });
  };

  const send = async () => {
    // The photo has its own section where the data layer has one, so the Gigster's note opens the photo part.
    // Until then it travels with "About you" (where the photo sits in the questionnaire), prefixed "Photo:".
    const about = PHOTO_SECTION ? notes.about.trim() : [notes.photo.trim() && `Photo: ${notes.photo.trim()}`, notes.about.trim()].filter(Boolean).join("\n");
    const photo = PHOTO_SECTION && notes.photo.trim() ? [{ section: "photo" as const, note: notes.photo.trim() }] : [];
    const list = [...photo, ...SECTIONS.filter((k) => k !== "photo").map((section) => ({ section, note: section === "about" ? about : notes[section] }))].filter((n) => n.note.trim());
    // Nothing to send: open every section so there's somewhere to type straight away.
    if (!list.length) { setError("Add a note to at least one section."); setOpened(NOTE_KEYS); return; }
    setBusy(true);
    try {
      onSent(await holdDecision(person.id, () => data.owners.requestChanges(person.id, list), { onError: () => toast({ message: `Couldn't send your notes to ${first}. Try again.`, tone: "danger" }) }));
    } catch { toast({ message: "Couldn't send. Try again.", tone: "danger" }); }
    finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} size="lg" title={`Suggest edits to ${person.name}`}
      description={`One short note per section; anything missing is already noted. Leave a section empty if it's fine. We email ${first} your notes and they show on their profile and in the questionnaire.`}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} iconEnd={<ArrowRight />} onClick={send}>Send to {first}</Button></>}>
      <div className="grid gap-4">
        {error && <Banner tone="danger" title="Nothing to send yet">{error}</Banner>}
        <ul className="border-t-4 border-line-strong">
          {NOTE_KEYS.map((key) => {
            const on = opened.includes(key);
            const note = notes[key].trim();
            return (
              <li key={key} className="border-b border-line">
                <button type="button" aria-expanded={on} aria-controls={`suggest-${key}-row`}
                  onClick={() => { setFocusKey(on ? undefined : key); setOpened((o) => (on ? o.filter((k) => k !== key) : [...o, key])); }}
                  className="flex min-h-11 w-full items-center gap-3 py-2 text-left text-ink transition-colors duration-fast hover:bg-surface-hover">
                  <span className="w-28 shrink-0 text-label-md font-bold">{noteLabel[key]}</span>
                  <span className={cx("min-w-0 flex-1 truncate text-body-sm", note ? "text-ink-muted" : "font-semibold text-ink-brand")}>
                    {on ? null : note ? firstWords(note) : "+ Add a note"}
                  </span>
                  <ChevronDown aria-hidden="true" className={cx("size-4 shrink-0 text-ink-muted transition-transform duration-fast", on && "rotate-180")} />
                </button>
                {on && (
                  <div id={`suggest-${key}-row`} className="grid gap-2 pb-4">
                    <Field label={<span className="sr-only">{noteLabel[key]}</span>}>
                      <Textarea id={`suggest-${key}`} rows={2} maxLength={300} showCount value={notes[key]} placeholder={placeholders[key]}
                        autoFocus={focusKey === key}
                        onChange={(e) => { setNotes((n) => ({ ...n, [key]: e.target.value })); setError(undefined); }} />
                    </Field>
                    <div role="group" aria-label={`Quick notes for ${noteLabel[key]}`} className="flex flex-wrap gap-1.5">
                      {reasons[key].map((r) => (
                        <Tag key={r} selected={notes[key].includes(r)} onSelect={() => toggle(key, r)}>{r}</Tag>
                      ))}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </Modal>
  );
}
