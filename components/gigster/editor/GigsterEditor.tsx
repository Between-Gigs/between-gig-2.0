"use client";
/*
 * /profile/canvas/: the Gigster profile editor (rebuilt 13 Nov 2026, Flow p3). One clean page in the Green Room look:
 * what's needed to submit and what can come later, then the profile's parts in the order clients read them, with
 * "How I can help" as the most important. It saves as you go; Preview shows exactly what clients will see; Submit for
 * review checks everything once and lands on "Profile submitted" (/profile/submitted/). The earlier edit-on-page
 * editor is kept as a Hub draft (/preview/drafts/profile-editor-v1/).
 */
import { Button, Skeleton, useToast } from "@ds/components";
import { cx } from "@ds/components/cx";
import { ArrowLeft, ArrowRight, Eye, FileText, MessageSquareWarning, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { data, type Person, type ProfileFields, type ProfileSection } from "@/lib/data";
import { DataError, sendNow } from "@/lib/data/api";
import { useRequireRole } from "@/lib/guard";
import { useProfileTemplate } from "@/lib/profile/use-profile-template";
import { contentChanged, fieldLabel, gigsterChecklist, gigsterFieldLabel, gigsterItemOf, gigsterItems, readNotes, sectionLabel, validateGigster, type FieldErrors, type GigsterItemId } from "@/lib/profile/validate";
import { SaveIndicator, type SaveState } from "@/components/builder/ProfileBuilder";
import { Alert } from "@/components/ds/molecules";
import { Heading, Text } from "@/components/ds/atoms";
import { ExampleReference } from "@/components/journey/ExampleReference";
import { useLiveEditWarning } from "@/components/profile/LiveEditWarning";
import { ProfileView } from "@/components/profile/ProfileView";
import { Page } from "@/components/site/Page";
import { markArea } from "@/lib/split-area";
import { Checklist } from "./Checklist";
import { ContactSection, CreditsSection, FilmSection, HelpSection, IdentitySection, PersonalitySection, RatesSection, WhereSection } from "./sections";
import type { Setter } from "./ui";

markArea("bg-split:dashboard");

const AUTOSAVE_MS = 700;
/** The sample keeps a draft beside the version the team (or the public) has; live keeps one record (N-09). */
const KEEPS_DRAFT = data.kind !== "live";
const thisMonth = () => new Date().toLocaleString("en-US", { month: "long", year: "numeric" });
const pick = (f: ProfileFields, keys: Iterable<keyof ProfileFields>) => Object.fromEntries([...keys].map((k) => [k, f[k]])) as Partial<ProfileFields>;
const dayOf = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "");

/** Where each checklist item lives on the page: the field to focus. */
const ITEM_TARGET: Record<GigsterItemId, string> = {
  photo: "sec-identity", name: "f-name", title: "f-title", where: "sec-where", services: "sec-help", rate: "f-rate", availability: "f-dates",
  film: "f-position", experience: "f-about", credits: "f-credits", personality: "sec-personality", contact: "f-mobile",
};
/** The team's review notes are per questionnaire section; this is where each one is answered here. */
/** The team picks a section of the old builder; name it as this editor does. */
const NOTE_LABEL: Partial<Record<ProfileSection, string>> = { about: "Your name and photo", photo: "Profile photo", skills: "How I can help", where: "Where you work and when", story: "Your film and TV experience" };
const NOTE_TARGET: Record<ProfileSection, string> = { about: "sec-identity", photo: "sec-identity", skills: "sec-help", where: "sec-where", story: "f-about" };

/** Scroll to a field or section and put focus there (the field itself, or the section's first control). */
function goTo(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
  const target = el.matches("input, textarea, button, select, [tabindex]") ? el : el.querySelector<HTMLElement>("input:not([type=file]), textarea, button");
  window.setTimeout(() => target?.focus({ preventScroll: true }), reduce ? 0 : 300);
}

export function GigsterEditor() {
  const session = useRequireRole("gigster");
  return session?.personId ? <Editor personId={session.personId} /> : <EditorSkeleton />;
}

function EditorSkeleton() {
  return (
    <Page>
      <div aria-busy="true" aria-label="Loading your profile" className="grid gap-8">
        <Skeleton className="h-10 w-1/2" /><Skeleton shape="block" className="h-40" />
        <div className="grid gap-6 md:grid-cols-12"><Skeleton shape="block" className="h-64 md:col-span-5" /><div className="grid gap-4 md:col-span-7"><Skeleton className="h-12" /><Skeleton /><Skeleton /></div></div>
      </div>
    </Page>
  );
}

type View = "edit" | "preview";

function Editor({ personId }: { personId: string }) {
  const toast = useToast();
  const router = useRouter();
  const template = useProfileTemplate();
  const [person, setPerson] = React.useState<Person | null>(null);
  const [d, setD] = React.useState<ProfileFields | null>(null);
  const [sentVersion, setSentVersion] = React.useState<ProfileFields | null>(null);
  const [save, setSave] = React.useState<SaveState>({ status: "idle" });
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [summary, setSummary] = React.useState(false);
  const [view, setView] = React.useState<View>("edit");
  const [submitting, setSubmitting] = React.useState(false);
  const live = useLiveEditWarning(person?.status);
  const dirty = React.useRef(false);
  const step = React.useRef(0);
  const latest = React.useRef<ProfileFields | null>(null);
  /** Fields this tab changed since its last save: they win over another tab's save. */
  const touched = React.useRef(new Set<keyof ProfileFields>());
  const known = React.useRef("");
  const summaryRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => { latest.current = d; }, [d]);

  React.useEffect(() => {
    let current = true;
    void Promise.all([data.people.get(personId), data.profiles.getDraft(personId), data.profiles.getProfile(personId)]).then(([s, draft, sent]) => {
      if (!current || !s || !draft) return;
      setPerson(s.person);
      setSentVersion(sent?.fields ?? null);
      step.current = draft.step;
      known.current = draft.savedAt;
      if (!draft.fields.name) touched.current.add("name");
      if (!draft.fields.month) touched.current.add("month");
      setD({ ...draft.fields, name: draft.fields.name || s.person.name, month: draft.fields.month || thisMonth() });
      if (draft.savedAt) setSave({ status: "saved", at: draft.savedAt });
    });
    return () => { current = false; };
  }, [personId]);

  const refresh = React.useCallback(async () => {
    const [s, sent] = await Promise.all([data.people.get(personId), data.profiles.getProfile(personId)]);
    if (s) setPerson(s.person);
    setSentVersion(sent?.fields ?? null);
  }, [personId]);

  const flush = React.useCallback(async () => {
    const fields = latest.current;
    if (!fields || !dirty.current) return;
    dirty.current = false;
    const keys = [...touched.current];
    touched.current.clear();
    setSave({ status: "saving" });
    try {
      // Another tab may have saved since this one read the draft: lay this tab's own changes over that save.
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
  // Closing the tab or switching away within the autosave pause: save at once (keepalive live).
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

  const checklist = React.useMemo(() => (d ? gigsterChecklist(d, template) : null), [d, template]);
  if (!person || !d || !checklist) return <EditorSkeleton />;

  const set: Setter = (k) => (v) => live.guard(k, () => {
    dirty.current = true;
    touched.current.add(k);
    setSave((x) => (x.status === "saving" ? x : { status: "saving" }));
    setD((x) => (x ? { ...x, [k]: v } : x));
    setErrors((e) => { if (!e[k]) return e; const n = { ...e }; delete n[k]; return n; });
  });
  const required = (field: string) => (template.required as readonly string[]).includes(field);

  const first = d.name.trim().split(/\s+/)[0] || "there";
  const status = person.status;
  const sentAlready = status === "submitted" || status === "approved";
  const unsent = KEEPS_DRAFT && sentAlready && !!sentVersion && contentChanged(d, sentVersion);
  // With the team or live, there's something to send only once something has changed. Live keeps one record, so an
  // edit sends it back by itself and there is never anything to send.
  const nothingToSend = sentAlready && (data.kind === "live" || !unsent);
  const notes = status === "changes_requested" ? readNotes(person.reviewNotes ?? []) : [];
  const resubmit = sentAlready || notes.length > 0;
  const sendLabel = resubmit ? "Send again for review" : "Submit for review";
  const stateLabel = status === "approved" ? (unsent ? "Live · unsent changes" : "Live")
    : status === "submitted" ? (unsent ? "In review · unsent changes" : `In review since ${dayOf(person.submittedAt)}`)
    : status === "changes_requested" ? "Changes requested" : "Private draft";
  // In page order, so the list reads top to bottom like the form.
  const rank = (k: keyof ProfileFields) => { const i = gigsterItems.findIndex((x) => x.id === gigsterItemOf(k)); return i < 0 ? 99 : i; };
  const errorList = (Object.entries(errors).filter(([, m]) => m) as [keyof ProfileFields, string][]).sort((a, b) => rank(a[0]) - rank(b[0]));

  const switchView = (v: View) => { setView(v); window.scrollTo({ top: 0 }); };

  const submit = async () => {
    const found = validateGigster(d, template);
    if (Object.keys(found).length) {
      setErrors(found);
      setSummary(true);
      setView("edit");
      requestAnimationFrame(() => { summaryRef.current?.scrollIntoView({ block: "start" }); summaryRef.current?.focus({ preventScroll: true }); });
      return;
    }
    setSubmitting(true);
    dirty.current = true;
    await flush();
    try {
      await data.profiles.submit(personId);
      router.push("/profile/submitted/");
    } catch (e) {
      const message = e instanceof DataError && e.code === "profile_incomplete" ? "Some answers are still missing. Check each section, then try again." : "We couldn't send your profile. Try again.";
      toast({ message, tone: "danger" });
      setSubmitting(false);
    }
  };

  const sendButton = (size: "md" | "lg", full = false) => nothingToSend
    ? <Link href="/profile/submitted/" className={cx("inline-flex min-h-11 items-center justify-center gap-2 text-label-md font-semibold text-ink underline underline-offset-4", full && "w-full")}>
        {status === "approved" ? "Your page is live" : "Submitted · view status"}
      </Link>
    : <Button variant="primary" size={size} fullWidth={full} loading={submitting} iconEnd={<Send />} onClick={submit}>{sendLabel}</Button>;

  return (
    <Page bare>
      <ExampleReference />
      {live.dialog}
      {/* The bar: where the profile stands, saving, Preview and Submit. */}
      <div className="sticky top-16 z-sticky border-b border-line bg-bg lg:top-20 embedded:top-0">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
          {/* Going back sits where back always is: first, on the left. */}
          {view === "preview" && <Button variant="secondary" iconStart={<ArrowLeft />} className="min-h-11" onClick={() => switchView("edit")}>Back to edit</Button>}
          <p className="flex min-w-0 items-center gap-2 text-label-md font-semibold text-ink"><FileText aria-hidden="true" className="size-4 shrink-0" />{stateLabel}</p>
          <SaveIndicator state={save} onRetry={() => { dirty.current = true; void flush(); }} />
          <div className="ml-auto flex items-center gap-2">
            {view === "edit" && <Button variant="secondary" iconStart={<Eye />} className="min-h-11" onClick={() => switchView("preview")}>Preview</Button>}
            <span className="max-sm:hidden">{sendButton("md")}</span>
          </div>
        </div>
      </div>

      <div data-gigster-editor="" className="mx-auto grid max-w-7xl gap-12 px-4 pt-8 pb-24 sm:px-6 lg:pt-12">
        {view === "preview" ? (
          <div className="grid gap-8">
            {/* "Back to edit" is in the sticky bar above (left), so the banner only says where you are. */}
            <div className="grid gap-4 rounded-lg border border-line bg-surface p-5 sm:p-6">
              <div className="grid gap-1">
                <p className="text-eyebrow tracking-widest text-ink-muted uppercase">Preview</p>
                <Heading level="h3" as="h1">This is how clients will see your profile.</Heading>
                <Text size="sm" muted>Your booking contact and ZIP code stay private. Your profile stays private until the team approves it.</Text>
              </div>
            </div>
            <ProfileView person={person} fields={d} mode="own" />
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
              <Button variant="secondary" size="lg" iconStart={<ArrowLeft />} onClick={() => switchView("edit")}>Back to edit</Button>
              {sendButton("lg")}
            </div>
          </div>
        ) : (<>
          <header className="grid gap-3">
            <p className="text-eyebrow tracking-widest text-ink-muted uppercase">Your Gigster profile</p>
            {status === "registered" || status === "invited" || status === "draft"
              ? <Heading level="h1" as="h1" className="wrap-anywhere">Welcome, {first}. This is your page.</Heading>
              : <Heading level="h1" as="h1" className="wrap-anywhere">Edit your profile</Heading>}
            <Text size="lg" muted className="max-w-2xl text-pretty">
              {status === "approved"
                ? data.kind === "live" ? "Availability changes go live as you save. Other changes take your page off the site until the team approves them." : "Availability changes go live as you save. Other changes wait here until you send them again."
                : "Fill it in once, in your own words. It saves as you go and stays private until the Between Gigs team approves it."}
            </Text>
          </header>

          {notes.length > 0 && (
            <section aria-labelledby="notes-h" className="grid gap-4 rounded-lg bg-warning-soft p-5 sm:p-6">
              <h2 id="notes-h" className="flex items-center gap-2 font-display text-heading-md text-ink"><MessageSquareWarning aria-hidden="true" className="size-5 shrink-0" />{notes.length === 1 ? "1 note" : `${notes.length} notes`} from the team</h2>
              <ul className="grid gap-2">
                {notes.map((n) => (
                  <li key={`${n.section}-${n.note}`}>
                    <button type="button" onClick={() => goTo(NOTE_TARGET[n.section])}
                      className="flex min-h-11 w-full items-start gap-3 rounded-md bg-surface px-4 py-3 text-left text-ink hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-focus">
                      <span className="grid min-w-0 flex-1 gap-0.5"><b className="text-label-md">{NOTE_LABEL[n.section] ?? sectionLabel[n.section]}</b><span className="text-body-sm break-words">{n.note}</span></span>
                      <ArrowRight aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                    </button>
                  </li>
                ))}
              </ul>
              <Text size="sm">Make the changes, then send it again.</Text>
            </section>
          )}

          {summary && errorList.length > 0 && (
            <div ref={summaryRef} tabIndex={-1} className="outline-none">
              <Alert tone="danger" title={`${errorList.length === 1 ? "One thing" : `${errorList.length} things`} to finish before you submit`}>
                <ul className="mt-1 grid gap-1">
                  {errorList.map(([k, m]) => (
                    <li key={k}>
                      <button type="button" className="text-left underline underline-offset-2 hover:no-underline" onClick={() => { const item = gigsterItemOf(k); goTo(item ? ITEM_TARGET[item] : `f-${k}`); }}>
                        {gigsterFieldLabel[k] ?? fieldLabel[k] ?? k}: {m}
                      </button>
                    </li>
                  ))}
                </ul>
              </Alert>
            </div>
          )}

          <Checklist required={checklist.required} optional={checklist.optional} onGo={(id) => goTo(ITEM_TARGET[id])} />

          <IdentitySection d={d} set={set} errors={errors} personId={personId} required={required} confirmPhoto={(go) => live.guard("photo", go)} />
          <div className="border-t border-line pt-10"><HelpSection d={d} set={set} errors={errors} /></div>
          <div className="border-t border-line pt-10"><RatesSection d={d} set={set} errors={errors} required={required} /></div>
          <div className="border-t border-line pt-10"><WhereSection d={d} set={set} errors={errors} required={required} /></div>
          <div className="border-t border-line pt-10"><FilmSection d={d} set={set} errors={errors} required={required} /></div>
          <div className="grid gap-12 border-t border-line pt-10 lg:grid-cols-2 lg:gap-10">
            <CreditsSection d={d} set={set} errors={errors} required={required} />
            <PersonalitySection d={d} set={set} errors={errors} />
          </div>
          <ContactSection d={d} set={set} errors={errors} email={person.email} />

          <section aria-labelledby="next-h" className="grid gap-4 rounded-lg bg-surface-brand p-6 text-ink sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-8" data-theme="dark">
            <div className="grid gap-1">
              <h2 id="next-h" className="font-display text-heading-lg text-ink">{nothingToSend ? (status === "approved" ? "Your page is live" : "Your profile is with the team") : "Ready? Preview it, then submit."}</h2>
              <p className="text-body-md text-ink-muted">{nothingToSend ? (status === "approved" ? "Availability saves as you go. Edit anything else and you can send it for review here." : "Changes you make here save as you go. We'll email you when there's an update.") : "See your page as clients will, then send it to the Between Gigs team. It stays private during review."}</p>
            </div>
            <div className="flex flex-wrap gap-2 sm:shrink-0">
              <Button variant="secondary" size="lg" iconStart={<Eye />} onClick={() => switchView("preview")}>Preview</Button>
              {sendButton("lg")}
            </div>
          </section>
        </>)}
      </div>

      {/* Phones: Submit stays in reach. */}
      <div className="fixed inset-x-0 bottom-0 z-sticky border-t border-line bg-bg px-4 py-3 sm:hidden">
        {sendButton("lg", true)}
      </div>
    </Page>
  );
}
