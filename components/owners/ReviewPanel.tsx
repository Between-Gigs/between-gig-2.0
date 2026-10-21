"use client";
import { Banner, Button, Checkbox, ConfirmDialog, Field, Modal, Textarea, cx, useToast } from "@ds/components";
import { ArrowRight, CircleCheck, ClipboardCheck, MessageSquareWarning } from "lucide-react";
import * as React from "react";
import { data, type Person, type ProfileFields, type ProfileSection } from "@/lib/data";
import { SECTIONS, sectionLabel } from "@/lib/profile/validate";
import { fieldLabel, validateAll } from "@/lib/profile/validate";
import { ButtonLink } from "@/components/ui/ButtonLink";

const checks = [
  { id: "photo", label: "The photo shows their face clearly", hint: "Friendly, well lit, no group shots." },
  { id: "credits", label: "Credits and IMDb page match", hint: "Open the IMDb link in Experience." },
  { id: "services", label: "Services fit what they did on set", hint: "Nothing regulated without the right license." },
  { id: "story", label: "“About me” reads well for clients", hint: "Clear, warm, no contact details." },
];

/**
 * The review rail on a submitted profile: a short checklist (a guide, not a gate), then Approve profile or
 * Suggest edits with one short note per section. No threads, no annotation: the owners asked for simple.
 */
export function ReviewPanel({ person, fields, onDone }: { person: Person; fields: ProfileFields; onDone: (p: Person) => void }) {
  const toast = useToast();
  const [ticked, setTicked] = React.useState<string[]>([]);
  const [confirm, setConfirm] = React.useState(false);
  const [suggest, setSuggest] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const missing = validateAll(fields);
  const complete = Object.keys(missing).length === 0;
  const first = person.name.split(" ")[0] || "them";

  const approve = async () => {
    setBusy(true);
    try {
      const p = await data.owners.approve(person.id);
      toast({ message: "Profile approved", tone: "success" });
      setConfirm(false);
      onDone(p);
    } catch { toast({ message: "Couldn't approve. Try again.", tone: "danger" }); }
    finally { setBusy(false); }
  };

  return (
    <section aria-labelledby="review-h" className="rounded-2xl border border-line bg-surface p-5 shadow-md">
      <div className="flex items-center gap-2">
        <ClipboardCheck className="size-5 text-ink-brand" aria-hidden="true" />
        <h2 id="review-h" className="font-display text-heading-lg text-ink">Review</h2>
      </div>
      <p className="mt-1 text-body-sm text-ink-muted">Read the profile as clients will see it, then approve it or suggest edits.</p>

      <ul className="mt-4 grid gap-3">
        <li className={cx("flex items-start gap-2 rounded-md p-2.5 text-body-sm", complete ? "bg-success-soft text-ink" : "bg-warning-soft text-ink")}>
          {complete ? <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" /> : <MessageSquareWarning className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />}
          <span>{complete ? "Every required answer is filled in." : `Missing: ${Object.values(missing).flatMap((e) => Object.keys(e)).map((k) => fieldLabel[k as keyof ProfileFields] ?? k).join(", ")}. Suggest edits to ask for it.`}</span>
        </li>
        {checks.map((c) => (
          <li key={c.id}>
            <Checkbox label={c.label} description={c.hint} checked={ticked.includes(c.id)}
              onChange={(e) => setTicked((t) => (e.target.checked ? [...t, c.id] : t.filter((x) => x !== c.id)))} />
          </li>
        ))}
      </ul>
      <p className="mt-3 font-mono text-data-sm text-ink-subtle">{ticked.length} of {checks.length} checked</p>

      <div className="mt-4 grid gap-2">
        <Button variant="strong" size="lg" fullWidth iconStart={<CircleCheck />} onClick={() => setConfirm(true)}>Approve profile</Button>
        <Button variant="secondary" size="lg" fullWidth iconStart={<MessageSquareWarning />} onClick={() => setSuggest(true)}>Suggest edits</Button>
      </div>
      <p className="mt-3 text-caption text-ink-subtle">The checklist is a guide; nothing is saved until you approve or send notes.</p>

      <ConfirmDialog open={confirm} busy={busy} onCancel={() => setConfirm(false)} onConfirm={approve}
        title={`Approve ${person.name}'s profile?`} confirmLabel="Approve profile"
        description={<>It goes live at <b>/p/{person.slug}</b> and we email {first} that it's approved.{ticked.length < checks.length && " Some checklist items aren't ticked yet."}</>} />
      <SuggestEdits open={suggest} person={person} onClose={() => setSuggest(false)} onSent={(p) => { setSuggest(false); onDone(p); }} />
    </section>
  );
}

function SuggestEdits({ open, person, onClose, onSent }: { open: boolean; person: Person; onClose: () => void; onSent: (p: Person) => void }) {
  const toast = useToast();
  const [notes, setNotes] = React.useState<Record<ProfileSection, string>>({ about: "", skills: "", where: "", story: "" });
  const [error, setError] = React.useState<string>();
  const [busy, setBusy] = React.useState(false);
  const first = person.name.split(" ")[0] || "them";
  const send = async () => {
    const list = SECTIONS.map((section) => ({ section, note: notes[section] })).filter((n) => n.note.trim());
    if (!list.length) { setError("Add a note to at least one section."); return; }
    setBusy(true);
    try {
      const p = await data.owners.requestChanges(person.id, list);
      toast({ message: "Edits sent", tone: "success" });
      onSent(p);
    } catch { toast({ message: "Couldn't send. Try again.", tone: "danger" }); }
    finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={onClose} size="lg" title={`Suggest edits to ${person.name}`}
      description={`One short note per section. Leave a section empty if it's fine. We email ${first} your notes and they show on their profile and in the questionnaire.`}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} iconEnd={<ArrowRight />} onClick={send}>Send to {first}</Button></>}>
      <div className="grid gap-4">
        {error && <Banner tone="danger" title="Nothing to send yet">{error}</Banner>}
        {SECTIONS.map((section) => (
          <Field key={section} label={sectionLabel[section]} optional>
            <Textarea rows={2} maxLength={300} showCount value={notes[section]}
              placeholder={{ about: "e.g. Please add a photo that shows your face clearly.", skills: "e.g. Add the services you'd offer between gigs.", where: "e.g. Add the dates you're free this month.", story: "e.g. Tell clients what a session with you looks like." }[section]}
              onChange={(e) => { setNotes((n) => ({ ...n, [section]: e.target.value })); setError(undefined); }} />
          </Field>
        ))}
      </div>
    </Modal>
  );
}

/** After a decision: what happened, and the next profile in the queue. */
export function ReviewDone({ person, next }: { person: Person; next?: { id: string; name: string } }) {
  const approved = person.status === "approved";
  return (
    <Banner tone={approved ? "success" : "warning"} title={approved ? "Approved · now live" : "Edits sent"}
      action={next ? <ButtonLink href={`/owners/people/${next.id}/`} size="sm" variant="primary" iconEnd={<ArrowRight />}>Next: {next.name}</ButtonLink> : <ButtonLink href="/owners/" size="sm">Back to dashboard</ButtonLink>}>
      {approved ? `${person.name}'s profile is public and they've been emailed.` : `${person.name.split(" ")[0]} has your notes by email and on their profile.`}{!next && " That was the last one in the queue."}
    </Banner>
  );
}
