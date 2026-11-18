"use client";

import * as React from "react";
import { Button, Drawer, cx } from "@ds/components";
import { ArrowRight, CalendarDays, Check, ChevronRight, CircleAlert, ExternalLink, Layers, ListChecks, Plus, RefreshCw, Search, ShieldCheck, Users } from "lucide-react";
import { productDevelopment } from "@/lib/product-development/selected";
import { markArea } from "@/lib/split-area";
import { progress } from "@/lib/product-development/progress";
import { CATEGORIES, JOURNEYS, KINDS, STATUSES, type Evidence, type Phase, type WorkFields, type WorkItem, type WorkspaceSnapshot } from "@/lib/product-development/types";
import { OwnerGate } from "./OwnerGate";
import { OwnerShell } from "./OwnerShell";

markArea("bg-split:dashboard");

const control = "min-h-11 w-full min-w-0 rounded-md border border-line bg-surface px-3 py-2 text-body-sm text-ink focus-visible:outline-2 focus-visible:outline-focus";
const panel = "rounded-lg border border-line bg-surface";
const label = (value: string) => value === "ui" ? "UI" : value.replaceAll("_", " ").replace(/^./, character => character.toUpperCase());
const dateLabel = (value: string) => value ? new Date(`${value.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : "Not scheduled";
const statusTone: Record<WorkItem["status"], string> = {
  unreconciled: "bg-surface-sunken text-ink-muted", not_started: "bg-surface-sunken text-ink-muted", in_progress: "bg-tint-mint-soft text-tint-ink", blocked: "bg-tint-peach text-tint-ink",
  in_review: "bg-tint-sand text-tint-ink", done: "bg-tint-mint-soft text-tint-ink", archived: "bg-surface-sunken text-ink-muted",
};

function safeLink(url: string) {
  try { const parsed = new URL(url); return parsed.protocol === "https:" && !parsed.username && !parsed.password ? parsed.href : null; } catch { return null; }
}

export function ProductDevelopment() {
  return <OwnerGate>{() => <OwnerShell><Workspace /></OwnerShell>}</OwnerGate>;
}

function Workspace() {
  const [snapshot, setSnapshot] = React.useState<WorkspaceSnapshot | null>(null);
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [phaseId, setPhaseId] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState("all");
  const [status, setStatus] = React.useState("active");
  const [view, setView] = React.useState<"Overview" | "List" | "Board" | "Timeline">("Overview");
  const [editor, setEditor] = React.useState<WorkItem | "new" | null>(null);
  const [phaseEditor, setPhaseEditor] = React.useState<Phase | "new" | null>(null);
  const apply = React.useCallback((next: WorkspaceSnapshot) => {
    setSnapshot(next);
    setPhaseId(current => next.phases.some(phase => phase.id === current) ? current : (next.phases.find(phase => phase.state === "active") ?? next.phases[0])?.id ?? "");
  }, []);
  const refresh = React.useCallback(async () => {
    setBusy(true); setError("");
    try { apply(await productDevelopment.snapshot()); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load the workspace. Try again."); }
    finally { setBusy(false); }
  }, [apply]);
  React.useEffect(() => {
    let active = true;
    productDevelopment.snapshot().then(next => { if (active) apply(next); }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : "Could not load the workspace."); });
    return () => { active = false; };
  }, [apply]);
  const initialize = async () => {
    setBusy(true); setError("");
    try { const next = await productDevelopment.initialize(); apply(next); setNotice(next.mode === "sample" ? "Initialized for this sample session." : "Workspace initialized in the database."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not initialize the workspace."); }
    finally { setBusy(false); }
  };
  const save = async (fields: WorkFields, archived = false, requestId?: string) => {
    const next = typeof editor === "object" && editor ? await productDevelopment.update({ id: editor.id, revision: editor.revision, fields }) : await productDevelopment.create(fields, requestId!);
    apply(next); setEditor(null);
    const action = archived ? "Archived" : editor === "new" ? "Created" : "Saved";
    setNotice(`${action}${next.mode === "sample" ? " in this sample session." : " to the database."}`);
  };
  const phase = snapshot?.phases.find(value => value.id === phaseId);
  const phaseItems = snapshot?.items.filter(item => item.phase === phaseId) ?? [];
  const activeItems = phaseItems.filter(item => item.status !== "archived");
  const filtered = phaseItems.filter(item => (category === "all" || item.category === category)
    && (status === "all" || (status === "active" ? item.status !== "archived" : item.status === status))
    && `${item.title} ${item.description} ${item.owner} ${item.kind}`.toLowerCase().includes(query.toLowerCase().trim()));

  return <div className="grid gap-6 pb-4" data-product-workspace="">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="grid gap-2"><p className="text-label-sm font-bold uppercase tracking-widest text-ink-muted">Studio / Build together</p>
        <h1 className="font-display text-display-sm text-ink">Product Development</h1>
        <p className="max-w-2xl text-body-md text-ink-muted">A shared view of what we’re building, what’s ready, and what needs a hand.</p></div>
      <div className="flex gap-2"><Button className="min-h-11" iconStart={<RefreshCw />} onClick={() => void refresh()} loading={busy}>Refresh</Button>
        <Button className="min-h-11" variant="primary" iconStart={<Plus />} disabled={!snapshot?.ready} onClick={() => { setNotice(""); setEditor("new"); }}>New item</Button></div>
    </header>
    <div role="status" aria-live="polite" className={notice ? "flex items-center gap-2 rounded-md bg-tint-mint-soft px-4 py-3 text-body-sm text-tint-ink" : "sr-only"}>{notice && <Check className="size-4" aria-hidden="true" />}{notice}</div>
    {error && <div role="alert" className="rounded-lg border border-line bg-tint-peach p-4 text-tint-ink"><p>{error}</p><p className="mt-1 text-body-sm">Your work is not saved until the server confirms it. Refresh to check the latest records.</p></div>}
    {!snapshot ? <div className={cx(panel, "p-8 text-ink-muted")} aria-busy={!error}>{error ? "The workspace is unavailable." : "Loading the product workspace…"}</div> : <>
      <div className="flex flex-wrap items-center justify-between gap-2 text-caption text-ink-muted">
        <span className="inline-flex items-center gap-2"><ShieldCheck className="size-4" aria-hidden="true" />{snapshot.mode === "sample" ? "Fictional sample · changes last for this page session only." : "Private workspace · database backed · superadmin access required"}</span>
        {snapshot.observedAt && <span>Snapshot: <time dateTime={snapshot.observedAt}>{new Date(snapshot.observedAt).toLocaleString("en-US", { timeZoneName: "short" })}</time></span>}
      </div>
      {!snapshot.ready ? <section className={cx(panel, "grid justify-items-start gap-3 p-6")}><Layers className="size-8 text-ink-muted" aria-hidden="true" /><h2 className="font-display text-heading-md">Start the product workspace</h2><p className="max-w-2xl text-body-md text-ink-muted">Initialize the workspace to load its sourced starting records. Reported phase status and task progress are tracked separately.</p><Button className="min-h-11" variant="primary" loading={busy} onClick={() => void initialize()}>Initialize workspace</Button></section> : <>
        <div className="flex flex-wrap items-end justify-between gap-3"><div className="flex min-w-0 flex-wrap items-end gap-2"><Field title="Phase"><select className={control} value={phaseId} onChange={event => { setPhaseId(event.target.value); setQuery(""); }} aria-label="Phase">{[...snapshot.phases].sort((a, b) => a.order - b.order).map(value => <option key={value.id} value={value.id}>{value.title}</option>)}</select></Field><Button className="min-h-11" variant="ghost" disabled={!phase} onClick={() => { if (phase) setPhaseEditor(phase); }}>Edit phase</Button><Button className="min-h-11" variant="ghost" iconStart={<Plus />} onClick={() => setPhaseEditor("new")}>New phase</Button></div><span className="text-body-sm text-ink-muted">{activeItems.length} active records · {activeItems.filter(item => item.status === "blocked").length} blocked</span></div>
        {phase && <PhaseSummary phase={phase} items={activeItems} />}
        <section className="grid gap-4 md:grid-cols-2" aria-label="Product journeys">
          <JourneyCard title="Gigster onboarding" description="From invitation to a profile ready to share." icon={<Users className="size-5" />} graph={activeItems} items={activeItems.filter(item => item.journey === "gigster" || item.journey === "shared")} />
          <JourneyCard title="Owner review" description="From submitted profile to an informed decision." icon={<ListChecks className="size-5" />} graph={activeItems} items={activeItems.filter(item => item.journey === "owner" || item.journey === "shared")} />
        </section>
        <section className={cx(panel, "min-w-0 overflow-hidden")} aria-label="Work items">
          <div className="grid gap-4 border-b border-line p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-heading-md">The work <span className="text-body-sm font-normal text-ink-muted">{filtered.length} shown</span></h2><div className="flex max-w-full flex-wrap gap-1 rounded-md bg-surface-sunken p-1" role="group" aria-label="Work view">{(["Overview", "List", "Board", "Timeline"] as const).map(value => <button type="button" key={value} aria-pressed={view === value} onClick={() => setView(value)} className={cx("min-h-11 rounded-md px-3 text-label-sm focus-visible:outline-2 focus-visible:outline-focus", view === value ? "bg-surface text-ink shadow-xs" : "text-ink-muted hover:bg-surface-hover")}>{value}</button>)}</div></div>
            <div className="grid gap-3 sm:grid-cols-3"><label className="relative block"><span className="sr-only">Search work items</span><Search className="pointer-events-none absolute top-3 left-3 size-5 text-ink-muted" aria-hidden="true" /><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search the work…" className={cx(control, "pl-10")} /></label>
              <select className={control} aria-label="Filter category" value={category} onChange={event => setCategory(event.target.value)}><option value="all">All categories</option>{CATEGORIES.map(value => <option key={value} value={value}>{label(value)}</option>)}</select>
              <select className={control} aria-label="Filter status" value={status} onChange={event => setStatus(event.target.value)}><option value="active">Active records</option><option value="all">All statuses, including archived</option>{STATUSES.map(value => <option key={value} value={value}>{label(value)}</option>)}</select></div>
          </div>
          {!filtered.length ? <div className="grid gap-2 p-8 text-center"><p className="font-display text-heading-sm">No items in this view</p><p className="text-body-sm text-ink-muted">Change the filters or add a work item to this phase.</p></div>
            : view === "Board" ? <Board items={filtered} onOpen={setEditor} />
            : view === "Timeline" ? <Timeline items={filtered} onOpen={setEditor} />
            : view === "List" ? <WorkList items={filtered} onOpen={setEditor} />
            : <Overview items={filtered} allItems={snapshot.items} onOpen={setEditor} />}
        </section>
        <p className="text-caption text-ink-muted">Progress counts evidence-backed done records among tracked leaf tasks, checklists, requests and deliverables. Projects, milestones, communications and archived records do not inflate the denominator. Shared items appear in both journeys. “Done” and “in production” are separate facts.</p>
      </>}
      {editor !== null && <WorkEditor key={editor === "new" ? `new-${phaseId}` : `${editor.id}-${editor.revision}`} item={editor === "new" ? null : editor} phaseId={phaseId} snapshot={snapshot} onClose={() => setEditor(null)} onSave={save} />}
      {phaseEditor !== null && <PhaseEditor phase={phaseEditor === "new" ? null : phaseEditor} nextOrder={Math.max(-1, ...snapshot.phases.map(value => value.order)) + 1} onClose={() => setPhaseEditor(null)} onSave={async (fields, requestId) => {
        const next = await productDevelopment.savePhase({ ...(phaseEditor === "new" ? {} : { id: phaseEditor.id, revision: phaseEditor.revision ?? 0 }), fields, requestId });
        apply(next); setPhaseEditor(null); setNotice(next.mode === "sample" ? "Phase saved in this sample session." : "Phase saved to the database.");
      }} />}
    </>}
  </div>;
}

function Meter({ items, name, graph }: { items: WorkItem[]; name: string; graph?: WorkItem[] }) {
  const result = progress(items, graph);
  return <div className="grid gap-2"><div className="flex flex-wrap items-baseline justify-between gap-2"><span className="text-body-sm text-ink-muted">{result.done} of {result.total} tracked work items done</span><strong className="font-display text-heading-sm tabular-nums">{result.percent === null ? "Not measured" : `${result.percent}%`}</strong></div>
    {result.percent !== null && <div role="progressbar" aria-label={name} aria-valuemin={0} aria-valuemax={100} aria-valuenow={result.percent} aria-valuetext={`${result.done} of ${result.total} tracked work items done`} className="h-2 overflow-hidden rounded-full bg-surface-sunken"><div className="h-full rounded-full bg-ink" style={{ width: `${result.percent}%` }} /></div>}
    <p className="text-caption text-ink-muted">{result.blocked ? `${result.blocked} blocked · ` : ""}Based on recorded work, not an estimate of the whole phase.</p></div>;
}

function PhaseSummary({ phase, items }: { phase: Phase; items: WorkItem[] }) {
  return <section className="grid gap-5 rounded-lg border border-line bg-tint-sand p-5 text-tint-ink sm:p-6 lg:grid-cols-2" aria-label="Phase summary"><div className="grid content-start gap-2"><div className="flex flex-wrap items-center gap-2"><h2 className="font-display text-heading-lg">{phase.title}</h2><span className="rounded-full border border-line-strong px-2.5 py-1 text-caption">Reported: {label(phase.state)}</span></div><p className="text-body-md">{phase.summary}</p><p className="text-caption">Source: {phase.sourceNote || "Source not recorded"}</p></div><div className="grid content-start gap-4 rounded-md bg-surface p-4 text-ink"><Meter items={items} name={`${phase.title} tracked progress`} /><div className="border-t border-line pt-3"><h3 className="text-label-sm font-bold">Done looks like</h3><p className="mt-1 text-body-sm text-ink-muted">{phase.doneLooksLike || "Acceptance criteria not yet recorded."}</p></div></div></section>;
}

function JourneyCard({ title, description, icon, items, graph }: { title: string; description: string; icon: React.ReactNode; items: WorkItem[]; graph: WorkItem[] }) {
  return <article className={cx(panel, "grid gap-4 p-5")}><div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-md bg-tint-mint-soft text-tint-ink" aria-hidden="true">{icon}</span><div><h2 className="font-display text-heading-sm">{title}</h2><p className="mt-1 text-body-sm text-ink-muted">{description}</p></div></div><Meter items={items} graph={graph} name={`${title} tracked progress`} /></article>;
}

function Status({ status }: { status: WorkItem["status"] }) {
  return <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-caption font-bold", statusTone[status])}>{status === "blocked" && <CircleAlert className="size-3" aria-hidden="true" />}{label(status)}</span>;
}

function WorkCard({ item, onOpen }: { item: WorkItem; onOpen: (item: WorkItem) => void }) {
  return <button type="button" onClick={() => onOpen(item)} aria-label={`Open ${item.title}`} className="grid w-full min-w-0 gap-3 rounded-md border border-line bg-surface p-4 text-left hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-focus"><span className="flex flex-wrap items-center justify-between gap-2"><span className="text-caption text-ink-muted">{label(item.kind)} · {label(item.category)}</span><Status status={item.status} /></span><span className="text-body-md font-bold wrap-anywhere">{item.title}</span>{item.blocker && <span className="text-body-sm text-ink-muted wrap-anywhere">Blocker: {item.blocker}</span>}<span className="flex flex-wrap justify-between gap-2 text-caption text-ink-muted"><span>{item.owner || "Unassigned"}</span><span>Deployment: {label(item.deployment)}</span></span>{item.dueDate && <span className="text-caption text-ink-muted">Due {dateLabel(item.dueDate)}</span>}</button>;
}

function WorkList({ items, onOpen }: { items: WorkItem[]; onOpen: (item: WorkItem) => void }) {
  return <ul className="divide-y divide-line">{items.map(item => <li key={item.id}><button type="button" onClick={() => onOpen(item)} aria-label={`Open ${item.title}`} className="flex min-h-20 w-full items-center gap-3 px-4 py-4 text-left hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-focus sm:px-5"><span className="min-w-0 flex-1"><span className="block text-caption text-ink-muted">{label(item.kind)} · {label(item.category)} · {item.owner || "Unassigned"}</span><span className="mt-1 block text-body-md font-bold wrap-anywhere">{item.title}</span><span className="mt-1 block text-caption text-ink-muted">Deployment: {label(item.deployment)}{item.dueDate ? ` · Due ${dateLabel(item.dueDate)}` : ""}</span></span><Status status={item.status} /><ChevronRight className="hidden size-4 shrink-0 text-ink-muted sm:block" aria-hidden="true" /></button></li>)}</ul>;
}

function Board({ items, onOpen }: { items: WorkItem[]; onOpen: (item: WorkItem) => void }) {
  return <div className="grid gap-4 bg-surface-sunken p-4 sm:grid-cols-2 xl:grid-cols-3">{STATUSES.filter(status => status !== "archived" || items.some(item => item.status === "archived")).map(status => <section key={status} className="grid content-start gap-3" aria-label={`${label(status)} work`}><h3 className="flex items-center justify-between px-1 text-label-sm font-bold">{label(status)}<span className="text-ink-muted">{items.filter(item => item.status === status).length}</span></h3>{items.filter(item => item.status === status).map(item => <WorkCard key={item.id} item={item} onOpen={onOpen} />)}{!items.some(item => item.status === status) && <p className="rounded-md border border-dashed border-line p-4 text-caption text-ink-muted">No items</p>}</section>)}</div>;
}

function Timeline({ items, onOpen }: { items: WorkItem[]; onOpen: (item: WorkItem) => void }) {
  const dated = items.filter(item => item.startDate || item.dueDate).sort((a, b) => (a.startDate || a.dueDate).localeCompare(b.startDate || b.dueDate));
  const undated = items.filter(item => !item.startDate && !item.dueDate);
  return <div className="grid gap-6 p-4 sm:p-5"><p className="text-body-sm text-ink-muted">Dates are recorded plans. Missing dates remain unscheduled.</p>{dated.map(item => <div key={item.id} className="grid gap-2 border-l-2 border-line pl-4 sm:grid-cols-3"><span className="flex items-center gap-2 text-body-sm text-ink-muted"><CalendarDays className="size-4 shrink-0" aria-hidden="true" />{item.startDate && item.dueDate ? `${dateLabel(item.startDate)} → ${dateLabel(item.dueDate)}` : `${item.startDate ? "Starts" : "Due"} ${dateLabel(item.startDate || item.dueDate)}`}</span><div className="sm:col-span-2"><WorkCard item={item} onOpen={onOpen} /></div></div>)}{!!undated.length && <section className="grid gap-3"><h3 className="text-label-md font-bold">Not scheduled</h3><div className="grid gap-3 md:grid-cols-2">{undated.map(item => <WorkCard key={item.id} item={item} onOpen={onOpen} />)}</div></section>}</div>;
}

function Overview({ items, allItems, onOpen }: { items: WorkItem[]; allItems: WorkItem[]; onOpen: (item: WorkItem) => void }) {
  const groups = [
    { title: "Needs a hand", note: "Blockers and outstanding requests", items: items.filter(item => item.status === "blocked" || (item.kind === "request" && item.status !== "done" && item.status !== "archived")) },
    { title: "Projects & milestones", note: "The bigger picture, linked to the work", items: items.filter(item => item.kind === "project" || item.kind === "milestone") },
    { title: "Tasks & deliverables", note: "The next concrete steps", items: items.filter(item => !["project", "milestone", "communication"].includes(item.kind) && item.status !== "blocked" && !(item.kind === "request" && item.status !== "done" && item.status !== "archived")) },
    { title: "Related communications", note: "Owner-appropriate summaries and source references", items: items.filter(item => item.kind === "communication") },
  ];
  return <div className="grid gap-6 p-4 sm:p-5">{groups.filter(group => group.items.length).map(group => <section key={group.title} className="grid gap-3"><div><h3 className="font-display text-heading-sm">{group.title}</h3><p className="mt-1 text-body-sm text-ink-muted">{group.note}</p></div><div className="grid gap-3 md:grid-cols-2">{group.items.map(item => <div key={item.id} className="grid content-start gap-2"><WorkCard item={item} onOpen={onOpen} />{["project", "milestone"].includes(item.kind) && <div className="px-2"><Meter items={descendants(item.id, allItems)} name={`${item.title} tracked progress`} /></div>}</div>)}</div></section>)}</div>;
}

function descendants(id: string, items: WorkItem[]): WorkItem[] {
  const found = new Set<string>([id]);
  let changed = true;
  while (changed) { changed = false; for (const item of items) if (found.has(item.parent) && !found.has(item.id)) { found.add(item.id); changed = true; } }
  return items.filter(item => item.id !== id && found.has(item.id));
}

function Field({ title, children, hint }: { title: string; children: React.ReactNode; hint?: string }) {
  const id = React.useId();
  return <div className="grid min-w-0 content-start gap-1.5 text-label-sm font-bold"><label htmlFor={id}>{title}</label>{React.isValidElement(children) ? React.cloneElement(children as React.ReactElement<{ id: string; "aria-describedby"?: string }>, { id, "aria-describedby": hint ? `${id}-hint` : undefined }) : children}{hint && <span id={`${id}-hint`} className="text-caption font-normal text-ink-muted">{hint}</span>}</div>;
}

function PhaseEditor({ phase, nextOrder, onClose, onSave }: { phase: Phase | null; nextOrder: number; onClose: () => void; onSave: (fields: Omit<Phase, "id" | "revision">, requestId: string) => Promise<void> }) {
  const [requestId] = React.useState(() => crypto.randomUUID());
  const [fields, setFields] = React.useState<Omit<Phase, "id" | "revision">>(() => ({ title: phase?.title ?? "", order: phase?.order ?? nextOrder, state: phase?.state ?? "planned", summary: phase?.summary ?? "", doneLooksLike: phase?.doneLooksLike ?? "", sourceNote: phase?.sourceNote ?? "" }));
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const submit = async () => {
    setError("");
    if (!fields.title.trim()) { setError("Add a phase title."); return; }
    if (fields.state === "complete" && !fields.sourceNote.trim()) { setError("Record the source for a reported complete phase."); return; }
    setSaving(true);
    try { await onSave(fields, requestId); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save the phase. Your edits remain here."); } finally { setSaving(false); }
  };
  return <Drawer open size="md" title={phase ? "Edit phase" : "New phase"} description="Reported phase status is separate from calculated task progress." onClose={() => { if (!saving) onClose(); }} footer={<div className="flex justify-end gap-2"><Button disabled={saving} className="min-h-11" onClick={onClose}>Cancel</Button><Button className="min-h-11" form="product-phase-form" type="submit" variant="primary" loading={saving}>Save phase</Button></div>}><form id="product-phase-form" className="grid gap-4" onSubmit={event => { event.preventDefault(); void submit(); }}>{error && <p role="alert" className="rounded-md bg-tint-peach p-3 text-body-sm text-tint-ink">{error}</p>}<fieldset disabled={saving} className="grid gap-4">
    <Field title="Phase title"><input required maxLength={200} className={control} value={fields.title} onChange={event => setFields(current => ({ ...current, title: event.target.value }))} /></Field>
    <div className="grid gap-4 sm:grid-cols-2"><Field title="Display order"><input type="number" min={0} max={10000} step={1} required className={control} value={fields.order} onChange={event => setFields(current => ({ ...current, order: Number(event.target.value) }))} /></Field><Field title="Reported state"><select className={control} value={fields.state} onChange={event => setFields(current => ({ ...current, state: event.target.value as Phase["state"] }))}>{["planned", "active", "complete"].map(value => <option key={value} value={value}>{label(value)}</option>)}</select></Field></div>
    <Field title="Phase summary" hint="Describe status in the source’s own terms. Do not estimate an unsupported percentage."><textarea className={control} rows={3} maxLength={4000} value={fields.summary} onChange={event => setFields(current => ({ ...current, summary: event.target.value }))} /></Field>
    <Field title="Done looks like"><textarea required className={control} rows={3} maxLength={4000} value={fields.doneLooksLike} onChange={event => setFields(current => ({ ...current, doneLooksLike: event.target.value }))} /></Field>
    <Field title="Status source" hint="Record who reported this status and when; include only owner-appropriate information."><textarea className={control} rows={3} maxLength={2000} required={fields.state === "complete"} value={fields.sourceNote} onChange={event => setFields(current => ({ ...current, sourceNote: event.target.value }))} /></Field>
  </fieldset></form></Drawer>;
}

function WorkEditor({ item, phaseId, snapshot, onClose, onSave }: { item: WorkItem | null; phaseId: string; snapshot: WorkspaceSnapshot; onClose: () => void; onSave: (fields: WorkFields, archived?: boolean, requestId?: string) => Promise<void> }) {
  const [requestId] = React.useState(() => crypto.randomUUID());
  const [fields, setFields] = React.useState<WorkFields>(() => item ? {
    title: item.title, phase: item.phase, kind: item.kind, parent: item.parent, category: item.category, journey: item.journey,
    status: item.status, owner: item.owner, description: item.description, acceptance: item.acceptance, blocker: item.blocker,
    startDate: item.startDate, dueDate: item.dueDate, deployment: item.deployment,
    evidence: item.evidence.map(value => ({ ...value })), dependsOn: [...item.dependsOn],
  } : {
    title: "", phase: phaseId, kind: "task", parent: "", category: "other", journey: "shared", status: "not_started", owner: "", description: "", acceptance: "", blocker: "", startDate: "", dueDate: "", evidence: [], dependsOn: [], deployment: "unknown",
  });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const update = <Key extends keyof WorkFields>(key: Key, value: WorkFields[Key]) => setFields(current => ({ ...current, [key]: value }));
  const submit = async (archived = false) => {
    setError("");
    if (!fields.title.trim()) { setError("Add a title before saving."); return; }
    if (fields.startDate && fields.dueDate && fields.startDate > fields.dueDate) { setError("The due date must be on or after the start date."); return; }
    if (fields.evidence.some(evidence => evidence.url && !safeLink(evidence.url))) { setError("Evidence links must use HTTPS and cannot include credentials."); return; }
    setSaving(true);
    try { await onSave({ ...fields, title: fields.title.trim(), status: archived ? "archived" : fields.status }, archived, requestId); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save the item. Your edits remain here."); }
    finally { setSaving(false); }
  };
  const candidates = snapshot.items.filter(value => value.id !== item?.id && value.status !== "archived" && value.phase === fields.phase);
  const excludedParents = new Set(item ? [item.id, ...descendants(item.id, snapshot.items).map(value => value.id)] : []);
  const evidenceChange = (index: number, key: keyof Evidence, value: string) => update("evidence", fields.evidence.map((evidence, position) => position === index ? { ...evidence, [key]: value } : evidence));
  return <Drawer open onClose={() => { if (!saving) onClose(); }} size="lg" title={item ? "Work item details" : "New work item"} description={item ? `Revision ${item.revision} · Updated ${new Date(item.updatedAt).toLocaleString()}` : "Create a linked record in this phase."} footer={<div className="flex flex-wrap justify-between gap-2">{item && item.status !== "archived" ? <Button disabled={saving} className="min-h-11" onClick={() => void submit(true)}>Archive item</Button> : <span />}<div className="flex gap-2"><Button disabled={saving} className="min-h-11" onClick={onClose}>Cancel</Button><Button form="product-work-form" type="submit" variant="primary" className="min-h-11" loading={saving} iconEnd={<ArrowRight />}>{item ? "Save changes" : "Create item"}</Button></div></div>}>
    <form id="product-work-form" className="grid gap-5" onSubmit={event => { event.preventDefault(); void submit(); }}>
      {error && <div role="alert" className="rounded-md bg-tint-peach p-3 text-body-sm text-tint-ink">{error}</div>}
      <fieldset disabled={saving} className="grid min-w-0 gap-5">
        <Field title="Title"><input required maxLength={200} className={control} value={fields.title} onChange={event => update("title", event.target.value)} /></Field>
        <div className="grid gap-4 sm:grid-cols-2"><Field title="Phase"><select className={control} value={fields.phase} onChange={event => setFields(current => ({ ...current, phase: event.target.value, parent: "", dependsOn: [] }))}>{snapshot.phases.map(phase => <option key={phase.id} value={phase.id}>{phase.title}</option>)}</select></Field><Field title="Type"><select className={control} value={fields.kind} onChange={event => update("kind", event.target.value as WorkFields["kind"])}>{KINDS.map(value => <option key={value} value={value}>{label(value)}</option>)}</select></Field>
          <Field title="Category"><select className={control} value={fields.category} onChange={event => update("category", event.target.value as WorkFields["category"])}>{CATEGORIES.map(value => <option key={value} value={value}>{label(value)}</option>)}</select></Field><Field title="Journey"><select className={control} value={fields.journey} onChange={event => update("journey", event.target.value as WorkFields["journey"])}>{JOURNEYS.map(value => <option key={value} value={value}>{label(value)}</option>)}</select></Field>
          <Field title="Status"><select className={control} value={fields.status} onChange={event => update("status", event.target.value as WorkFields["status"])}>{STATUSES.map(value => <option key={value} value={value}>{label(value)}</option>)}</select></Field><Field title="Deployment" hint="Delivery evidence is separate from work status."><select className={control} value={fields.deployment} onChange={event => update("deployment", event.target.value as WorkFields["deployment"])}>{["unknown", "not_applicable", "local", "test", "production"].map(value => <option key={value} value={value}>{label(value)}</option>)}</select></Field>
          <Field title="Owner"><input className={control} value={fields.owner} onChange={event => update("owner", event.target.value)} placeholder="Unassigned" maxLength={160} /></Field><Field title="Parent record"><select className={control} value={fields.parent} onChange={event => update("parent", event.target.value)}><option value="">No parent</option>{candidates.filter(value => value.phase === fields.phase && value.kind !== "communication" && !excludedParents.has(value.id)).map(value => <option key={value.id} value={value.id}>{label(value.kind)}: {value.title}</option>)}</select></Field>
        </div>
        <Field title="Description"><textarea maxLength={8000} rows={3} className={control} value={fields.description} onChange={event => update("description", event.target.value)} /></Field>
        <Field title="Acceptance criteria" hint="Describe the observable result that makes this item done."><textarea maxLength={4000} rows={3} className={control} value={fields.acceptance} onChange={event => update("acceptance", event.target.value)} /></Field>
        <Field title="Blocker"><textarea maxLength={2000} rows={2} className={control} value={fields.blocker} onChange={event => update("blocker", event.target.value)} /></Field>
        <div className="grid gap-4 sm:grid-cols-2"><Field title="Start date"><input type="date" className={control} value={fields.startDate} onChange={event => update("startDate", event.target.value)} /></Field><Field title="Due date"><input type="date" min={fields.startDate || undefined} className={control} value={fields.dueDate} onChange={event => update("dueDate", event.target.value)} /></Field></div>
        <fieldset className="grid gap-2"><legend className="mb-2 text-label-sm font-bold">Dependencies</legend><p className="text-caption text-ink-muted">Select the records this work depends on.</p><div className="grid max-h-48 gap-2 overflow-y-auto rounded-md border border-line p-3">{candidates.length ? candidates.map(value => <label key={value.id} className="flex min-h-11 items-start gap-2 text-body-sm"><input className="mt-1 size-4 shrink-0 accent-ink" type="checkbox" checked={fields.dependsOn.includes(value.id)} onChange={event => update("dependsOn", event.target.checked ? [...fields.dependsOn, value.id] : fields.dependsOn.filter(id => id !== value.id))} /><span className="wrap-anywhere">{value.title}<span className="block text-caption text-ink-muted">{label(value.kind)} · {label(value.status)}</span></span></label>) : <p className="text-body-sm text-ink-muted">No other work items yet.</p>}</div></fieldset>
        <section className="grid gap-3" aria-label="Evidence"><div><h3 className="text-label-md font-bold">Evidence & source references</h3><p className="mt-1 text-caption text-ink-muted">Use appropriate summaries and source links. Private correspondence stays in its original system; access is not expanded here.</p></div>{fields.evidence.map((evidence, index) => <fieldset key={index} className="grid min-w-0 gap-3 rounded-md border border-line p-3"><legend className="px-1 text-label-sm">Source {index + 1}</legend><Field title="Source label"><input required maxLength={200} className={control} value={evidence.label} onChange={event => evidenceChange(index, "label", event.target.value)} /></Field><Field title="Source URL"><input maxLength={2000} type="url" className={control} value={evidence.url} onChange={event => evidenceChange(index, "url", event.target.value)} placeholder="https://" /></Field>{safeLink(evidence.url) && <a href={safeLink(evidence.url)!} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 text-body-sm underline">Open source<ExternalLink className="size-4" aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></a>}<Field title="Source note"><textarea maxLength={2000} rows={2} className={control} value={evidence.note} onChange={event => evidenceChange(index, "note", event.target.value)} /></Field><Field title="Checked on" hint="The date this evidence was actually checked; leave blank if unknown."><input type="date" className={control} value={evidence.checkedAt.slice(0, 10)} onChange={event => evidenceChange(index, "checkedAt", event.target.value)} /></Field><Button className="min-h-11 justify-self-start" onClick={() => update("evidence", fields.evidence.filter((_, position) => position !== index))}>Remove source {index + 1}</Button></fieldset>)}<Button iconStart={<Plus />} className="min-h-11 justify-self-start" onClick={() => update("evidence", [...fields.evidence, { label: "", url: "", note: "", checkedAt: "" }])}>Add source</Button></section>
      </fieldset>
    </form>
  </Drawer>;
}
