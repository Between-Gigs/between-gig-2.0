"use client";
import { Banner, Button, Checkbox, Field, IconButton, Kbd, Modal, Tag, Textarea, Tooltip, cx, useToast } from "@ds/components";
import { ArrowRight, ChevronLeft, ChevronRight, CircleCheck, Keyboard, MessageSquareWarning } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { data, type Person, type ProfileFields, type ProfileSection } from "@/lib/data";
import { SECTIONS, fieldLabel, sectionLabel, validateAll } from "@/lib/profile/validate";
import { typingOrDialog } from "./format";
import { Panel } from "./kit";

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
function missingFields(fields: ProfileFields) {
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
 * and E do the same from the keyboard. Each decision moves straight on, with Undo in the toast.
 * The checklist sits under the person's header: a guide, not a gate.
 */
export function ReviewWorkspace({ person, fields, queue, header, children }: {
  person: Person; fields: ProfileFields; queue: QueueItem[]; header: React.ReactNode; children: React.ReactNode;
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
  const decided = React.useCallback((message: string) => {
    toast({
      message, tone: "success",
      action: {
        label: "Undo",
        onClick: () => {
          void data.owners.undoReview(person.id)
            .then(() => { toast({ message: `Undone. ${person.name} is back in the queue.` }); router.push(reviewHref(person.id)); })
            .catch(() => toast({ message: "Couldn't undo that. It may have changed already.", tone: "danger" }));
        },
      },
    });
    router.push(after ? reviewHref(after.id) : "/owners/review/");
  }, [after, person.id, person.name, router, toast]);

  const approve = React.useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      await data.owners.approve(person.id);
      decided(`${person.name} approved · now live`);
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

  return (
    <>
      <div className="sticky top-0 z-sticky -mx-4 mt-2 flex h-16 items-center gap-2 border-b border-line bg-bg/90 px-4 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <nav aria-label="Review queue" className="flex min-w-0 items-center gap-1">
          <IconButton variant="ghost" size="sm" label={prev ? `Previous in queue: ${prev.name} (K)` : "Previous in queue"} icon={<ChevronLeft />} disabled={!prev} onClick={() => go(prev)} />
          <p className="px-1 text-label-md whitespace-nowrap text-ink tabular-nums">
            {index >= 0 ? <>{index + 1} of {queue.length}<span className="max-sm:sr-only"> in queue</span></> : "Review"}
          </p>
          <IconButton variant="ghost" size="sm" label={next ? `Next in queue: ${next.name} (J)` : "Next in queue"} icon={<ChevronRight />} disabled={!next} onClick={() => go(next)} />
        </nav>
        <span className="ml-1 hidden md:inline-flex">
          <Tooltip side="bottom" content={<span className="inline-flex items-center gap-3"><span className="inline-flex items-center gap-1"><Kbd keys={["J"]} /><Kbd keys={["K"]} />next / previous</span><span className="inline-flex items-center gap-1"><Kbd keys={["A"]} />approve</span><span className="inline-flex items-center gap-1"><Kbd keys={["E"]} />edits</span></span>}>
            <IconButton variant="ghost" size="sm" label="Keyboard shortcuts" icon={<Keyboard />} />
          </Tooltip>
        </span>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Button variant="secondary" size="sm" iconStart={<MessageSquareWarning />} onClick={() => setSuggest(true)} aria-keyshortcuts="E">
            <span className="max-sm:sr-only">Suggest edits</span>
          </Button>
          <Button variant="primary" size="sm" iconStart={<CircleCheck />} loading={busy} onClick={() => void approve()} aria-keyshortcuts="A">
            <span>Approve{after && <span className="max-sm:sr-only"> &amp; next</span>}</span>
          </Button>
        </div>
      </div>

      {header}

      <Panel className="mt-6" id="review-h" title="Review checklist"
        aside={<span className="tabular-nums">{ticked.length} of {checks.length} checked · a guide, nothing is saved until you decide</span>}>
        <p className={cx("flex items-start gap-2 rounded-md p-3 text-body-sm text-ink", missing.length ? "bg-warning-soft" : "bg-success-soft")}>
          {missing.length ? <MessageSquareWarning className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" /> : <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />}
          <span>{missing.length ? <>Missing: {missing.map((m) => m.label).join(", ")}. Suggest edits to ask {first} for it; the note is filled in for you.</> : "Every required answer is filled in."}</span>
        </p>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {checks.map((c) => (
            <li key={c.id}>
              <Checkbox label={c.label} description={c.hint} checked={ticked.includes(c.id)}
                onChange={(e) => setTicked((t) => (e.target.checked ? [...t, c.id] : t.filter((x) => x !== c.id)))} />
            </li>
          ))}
        </ul>
      </Panel>

      {children}

      <SuggestEdits open={suggest} person={person} fields={fields} onClose={() => setSuggest(false)}
        onSent={() => { setSuggest(false); decided(`Edits sent to ${first}`); }} />
    </>
  );
}

type NoteKey = "photo" | ProfileSection;
const NOTE_KEYS: NoteKey[] = ["photo", ...SECTIONS];
const noteLabel: Record<NoteKey, string> = { photo: "Photo", ...sectionLabel };

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

function SuggestEdits({ open, person, fields, onClose, onSent }: { open: boolean; person: Person; fields: ProfileFields; onClose: () => void; onSent: (p: Person) => void }) {
  const toast = useToast();
  const [notes, setNotes] = React.useState<Record<NoteKey, string>>(() => prefill(fields));
  const [error, setError] = React.useState<string>();
  const [busy, setBusy] = React.useState(false);
  const first = person.name.split(" ")[0] || "them";

  // Each time it opens, start again from the missing answers.
  React.useEffect(() => { if (open) { setNotes(prefill(fields)); setError(undefined); } }, [open, fields]); // eslint-disable-line react-hooks/set-state-in-effect

  const toggle = (key: NoteKey, reason: string) => {
    setError(undefined);
    setNotes((n) => {
      const has = n[key].includes(reason);
      const v = has ? n[key].replace(reason, "").replace(/\s{2,}/g, " ").trim() : [n[key].trim(), reason].filter(Boolean).join(" ");
      return { ...n, [key]: v.slice(0, 300) };
    });
  };

  const send = async () => {
    // The photo is part of "About you" in the questionnaire, so its note travels with that section.
    const about = [notes.photo.trim() && `Photo: ${notes.photo.trim()}`, notes.about.trim()].filter(Boolean).join(" ");
    const list = SECTIONS.map((section) => ({ section, note: section === "about" ? about : notes[section] })).filter((n) => n.note.trim());
    if (!list.length) { setError("Add a note to at least one section."); return; }
    setBusy(true);
    try {
      const p = await data.owners.requestChanges(person.id, list);
      onSent(p);
    } catch { toast({ message: "Couldn't send. Try again.", tone: "danger" }); }
    finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} size="lg" title={`Suggest edits to ${person.name}`}
      description={`One short note per section; anything missing is already noted. Leave a section empty if it's fine. We email ${first} your notes and they show on their profile and in the questionnaire.`}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} iconEnd={<ArrowRight />} onClick={send}>Send to {first}</Button></>}>
      <div className="grid gap-5">
        {error && <Banner tone="danger" title="Nothing to send yet">{error}</Banner>}
        {NOTE_KEYS.map((key) => (
          <div key={key} className="grid gap-2">
            <Field label={noteLabel[key]} optional>
              <Textarea rows={2} maxLength={300} showCount value={notes[key]} placeholder={placeholders[key]}
                onChange={(e) => { setNotes((n) => ({ ...n, [key]: e.target.value })); setError(undefined); }} />
            </Field>
            <div role="group" aria-label={`Quick notes for ${noteLabel[key]}`} className="flex flex-wrap gap-1.5">
              {reasons[key].map((r) => (
                <Tag key={r} selected={notes[key].includes(r)} onSelect={() => toggle(key, r)}>{r}</Tag>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
