"use client";
import { Button, Drawer, Input, SegmentedControl, Select, cx } from "@ds/components";
import { ArrowRight, LayoutGrid, List, Mail, MapPin, Search, SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import * as React from "react";
import { data, personStatuses, type PeopleQuery, type PeopleSort, type PersonStatus, type PersonSummary, type ProfileFilter } from "@/lib/data";
import { crafts } from "@/lib/profile/department";
import { laServiceAreas, monthStatusLabel, offSetServices } from "@/lib/data/taxonomy";
import { PersonStatusBadge, personStatusMeta } from "@/components/people/PersonStatusBadge";
import { AgoPill, EmptyNote, Meter, OwnerAvatar, OwnerPage, Panel, Row, RowSkeletons } from "./kit";
import { OwnerShell } from "./OwnerShell";
import { OwnerGate } from "./OwnerGate";
import { markArea } from "@/lib/split-area";

markArea("bg-split:dashboard");

const VIEW_KEY = "bg2-people-view";
const blank: Required<PeopleQuery> = { text: "", status: "all", service: "all", area: "all", availability: "all", craft: "all", profile: "all", sort: "updated" };
const profileFilterLabel: Record<Exclude<ProfileFilter, "all">, string> = { complete: "Profile complete", missing: "Something missing", "no-photo": "No photo yet" };

const ago = (iso: string) => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return days <= 0 ? "Today" : days === 1 ? "Yesterday" : days < 30 ? `${days} days ago` : new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

/** /owners/people: search everyone from the waitlist on, filter, sort, open a profile. */
export function OwnerPeople() {
  return <OwnerGate>{() => <People />}</OwnerGate>;
}

function People() {
  const [query, setQuery] = React.useState(blank);
  const [text, setText] = React.useState("");
  const [rows, setRows] = React.useState<PersonSummary[] | null>(null);
  const [counts, setCounts] = React.useState<Record<PersonStatus, number> | null>(null);
  const [view, setView] = React.useState("list");
  const [filters, setFilters] = React.useState(false);
  const params = useSearchParams();
  const q = params.get("q");
  const status = params.get("status");

  // "Find a person" in the sidebar lands here with ?q=; the dashboard funnel with ?status=.
  React.useEffect(() => { if (q !== null) setText(q); }, [q]); // eslint-disable-line react-hooks/set-state-in-effect
  React.useEffect(() => {
    if (status && (personStatuses as string[]).includes(status)) setQuery((x) => ({ ...x, status: status as PersonStatus })); // eslint-disable-line react-hooks/set-state-in-effect
  }, [status]);

  React.useEffect(() => {
    try { const v = localStorage.getItem(VIEW_KEY); if (v === "grid" || v === "list") setView(v); } catch { /* ignore */ } // eslint-disable-line react-hooks/set-state-in-effect
    void data.people.list().then((all) => setCounts(Object.fromEntries(personStatuses.map((s) => [s, all.filter((r) => r.person.status === s).length])) as Record<PersonStatus, number>));
  }, []);

  // Search as you type, a beat after the last key.
  React.useEffect(() => {
    const t = window.setTimeout(() => setQuery((q) => (q.text === text ? q : { ...q, text })), 250);
    return () => window.clearTimeout(t);
  }, [text]);

  React.useEffect(() => {
    let live = true;
    void data.people.list(query).then((r) => {
      if (!live) return;
      // Results swap in place: no re-flow animation, so the list stays predictable while filtering.
      setRows(r);
    });
    return () => { live = false; };
  }, [query]);

  const set = <K extends keyof PeopleQuery>(k: K) => (v: string) => setQuery((q) => ({ ...q, [k]: v }));
  const filtered = query.status !== "all" || query.service !== "all" || query.area !== "all" || query.availability !== "all" || query.craft !== "all" || query.profile !== "all" || !!query.text;
  // The filters besides status, with how each reads as a chip.
  const extra = ([
    ["craft", query.craft, query.craft],
    ["service", query.service, query.service],
    ["area", query.area, query.area],
    ["availability", query.availability, monthStatusLabel[query.availability as keyof typeof monthStatusLabel]],
    ["profile", query.profile, profileFilterLabel[query.profile as keyof typeof profileFilterLabel]],
  ] as const).filter(([, v]) => v !== "all");
  const active = extra.length;
  const clearExtra = () => setQuery((q) => ({ ...blank, text: q.text, status: q.status, sort: q.sort }));
  const selects = (inline: boolean) => {
    // Inline (md+): equal widths that fill the row, flush with the search above.
    const w = inline ? "min-w-0 flex-1 basis-0" : undefined;
    return (
      <>
        <Select aria-label="Craft" size={inline ? "sm" : undefined} className={w} value={query.craft} onValueChange={set("craft")}
          options={[{ value: "all", label: "Any craft" }, ...crafts.map((c) => ({ value: c.label, label: c.label }))]} />
        <Select aria-label="Service" size={inline ? "sm" : undefined} className={w} value={query.service} onValueChange={set("service")}
          options={[{ value: "all", label: "Any service" }, ...offSetServices.map((x) => ({ value: x, label: x }))]} />
        <Select aria-label="Area" size={inline ? "sm" : undefined} className={w} value={query.area} onValueChange={set("area")}
          options={[{ value: "all", label: "Any area" }, ...laServiceAreas.map((x) => ({ value: x, label: x }))]} />
        <Select aria-label="Availability" size={inline ? "sm" : undefined} className={w} value={query.availability} onValueChange={set("availability")}
          options={[{ value: "all", label: "Any availability" }, ...Object.entries(monthStatusLabel).map(([value, label]) => ({ value, label }))]} />
        <Select aria-label="Profile" size={inline ? "sm" : undefined} className={w} value={query.profile} onValueChange={set("profile")}
          options={[{ value: "all", label: "Any profile" }, ...Object.entries(profileFilterLabel).map(([value, label]) => ({ value, label }))]} />
      </>
    );
  };
  const reset = () => { setText(""); setQuery(blank); };
  const changeView = (v: string) => { setView(v); try { localStorage.setItem(VIEW_KEY, v); } catch { /* ignore */ } };
  const total = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : 0;

  return (
    <OwnerShell>
      <OwnerPage title="People" kicker="Everyone invited" meta={counts ? total : "–"}
        description="Everyone from the waitlist on: who has joined, how far along their profile is, and who is waiting for review.">
        {/* Search and status on one line; from md the other filters sit in a row beneath, on phones behind Filters. */}
        <div className="grid gap-3">
          <form role="search" onSubmit={(e) => { e.preventDefault(); setQuery((q) => ({ ...q, text })); }} className="flex flex-wrap items-center gap-2">
            <div className="min-w-0 flex-1 basis-60">
              <Input aria-label="Search people" type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Name, email, ZIP, craft or service" start={<Search />} />
            </div>
            <Select aria-label="Status" value={query.status} onValueChange={set("status")} className="min-w-0 flex-1 basis-40 sm:w-60 sm:flex-none"
              options={[{ value: "all", label: `Everyone${counts ? ` · ${total}` : ""}` }, ...personStatuses.map((st) => ({ value: st, label: `${personStatusMeta[st].label}${counts ? ` · ${counts[st]}` : ""}` }))]} />
            <Button type="button" variant="secondary" className="shrink-0 md:hidden" iconStart={<SlidersHorizontal />} onClick={() => setFilters(true)}
              aria-label={active ? `More filters, ${active} on` : "More filters"}>
              Filters{active > 0 && <span aria-hidden="true" className="ml-1 inline-grid size-5 place-items-center bg-ink text-label-sm text-bg tabular-nums">{active}</span>}
            </Button>
          </form>
          <div role="group" aria-label="Filters" className="hidden items-center gap-2 md:flex">
            {selects(true)}
            {active > 0 && <Button size="sm" variant="ghost" iconStart={<X />} className="shrink-0" onClick={clearExtra}>Clear {active} {active === 1 ? "filter" : "filters"}</Button>}
          </div>
          {active > 0 && (
            <ul aria-label="Active filters" className="flex flex-wrap gap-2 md:hidden">
              {extra.map(([k, , label]) => (
                <li key={k}>
                  <button type="button" onClick={() => set(k)("all")} aria-label={`Remove filter: ${label}`}
                    className="inline-flex min-h-11 items-center gap-1.5 border-2 border-line-strong pr-2 pl-3 text-label-sm font-bold text-ink hover:bg-surface-hover">
                    {label}<X className="size-3.5" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Drawer open={filters} onClose={() => setFilters(false)} title="More filters" side="right"
          footer={<><Button variant="ghost" onClick={clearExtra}>Clear</Button><Button variant="primary" onClick={() => setFilters(false)}>Show {rows?.length ?? 0} {rows?.length === 1 ? "person" : "people"}</Button></>}>
          <div className="grid gap-3">{selects(false)}</div>
        </Drawer>

        <Panel flush number="01" title={<span aria-live="polite">{rows ? <><span className="tabular-nums">{rows.length}</span> {rows.length === 1 ? "person" : "people"}{filtered && " match"}</> : "People"}</span>}
          aside={
            <>
              {/* With no results the empty state carries the one Reset filters. */}
              {filtered && rows?.length !== 0 && <Button size="sm" variant="ghost" onClick={reset}>Reset filters</Button>}
              <Select aria-label="Sort" size="sm" value={query.sort} onValueChange={(v) => setQuery((q) => ({ ...q, sort: v as PeopleSort }))} className="w-40 xs:w-44"
                options={[{ value: "updated", label: "Recently active" }, { value: "status", label: "Furthest along" }, { value: "name", label: "Name, A to Z" }]} />
              <SegmentedControl label="View" size="sm" value={view} onChange={changeView}
                options={[{ value: "list", label: "List", icon: <List /> }, { value: "grid", label: "Grid", icon: <LayoutGrid /> }]} />
            </>
          }>
          <section aria-label="Results" data-results={rows ? "" : undefined}>
            {!rows ? <RowSkeletons count={6} /> : rows.length === 0 ? (
              <EmptyNote title="No one matches all of that" action={<Button variant="secondary" size="lg" iconStart={<X />} className="border-2" onClick={reset}>Reset filters</Button>}>
                Try fewer filters, or search for part of a name or email.
              </EmptyNote>
            ) : view === "grid" ? (
              <ul className="grid grid-cols-1 gap-x-6 gap-y-8 pt-4 sm:grid-cols-2 xl:grid-cols-3">
                {rows.map((r) => <li key={r.person.id}><PersonCard row={r} /></li>)}
              </ul>
            ) : (
              <ul className="@container border-t-2 border-line-strong">{rows.map((r) => <PersonRow key={r.person.id} row={r} />)}</ul>
            )}
          </section>
        </Panel>
      </OwnerPage>
    </OwnerShell>
  );
}

/** Someone invited who hasn't joined: no name or photo yet, so an envelope instead of a "?". */
function Avatar({ row: { person: p, fields: f }, className }: { row: PersonSummary; className: string }) {
  if (!p.name) return <span className={cx("grid place-items-center bg-surface-sunken text-ink", className)}><Mail className="size-5" strokeWidth={1.75} aria-hidden="true" /></span>;
  return <OwnerAvatar id={p.id} name={p.name} src={f?.photo || undefined} className={className} textClass="text-heading-sm" />;
}

function progress({ person: p, completeness, fromDraft }: PersonSummary) {
  // One width for every state, wide enough that "Hasn't joined yet" stays on one line.
  if (p.status === "invited") return <span className="w-32 whitespace-nowrap text-ink-muted">Hasn&apos;t joined yet</span>;
  if (p.status === "registered") return <span className="w-32 whitespace-nowrap text-ink-muted">Not started</span>;
  return <span className="w-32"><Meter value={completeness * 100} label={fromDraft ? "Draft complete" : "Profile complete"} /></span>;
}

function PersonRow({ row }: { row: PersonSummary }) {
  const { person: p, fields: f } = row;
  return (
    <Row href={`/owners/people/${p.id}/`} title={p.name || p.email}
      leading={<Avatar row={row} className="size-12 @md:size-16" />}
      badge={<PersonStatusBadge status={p.status} size="sm" />}
      subtitle={f?.position ? [f.position, f.areas.join(" · ")].filter(Boolean).join(" · ") : p.name ? p.email : `Waitlist · ZIP ${p.waitlistZip}`}
      meta={<>{progress(row)}<AgoPill className="min-w-36">Active {ago(p.updatedAt).toLowerCase()}</AgoPill></>} />
  );
}

function PersonCard({ row }: { row: PersonSummary }) {
  const { person: p, fields: f } = row;
  return (
    <article className="group relative flex h-full min-w-0 flex-col gap-4 border-t-4 border-line-strong pt-4 transition-colors duration-fast hover:bg-surface-hover">
      <div className="flex min-w-0 items-center gap-3 pr-14">
        <Avatar row={row} className="size-16 shrink-0" />
        <div className="grid min-w-0 gap-0.5">
          <h2 className="truncate font-display text-heading-sm font-extrabold text-ink">
            <Link href={`/owners/people/${p.id}/`} className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-focus">{p.name || p.email}</Link>
          </h2>
          <p className="truncate text-body-sm text-ink-muted">{f?.position || (p.name ? p.email : `ZIP ${p.waitlistZip}`)}</p>
        </div>
      </div>
      {f?.areas.length ? <p className="flex min-w-0 items-center gap-1 text-body-sm text-ink-muted"><MapPin className="size-3.5 shrink-0" aria-hidden="true" /><span className="truncate">{f.areas.join(" · ")}</span></p> : null}
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-3 text-body-sm">
        <PersonStatusBadge status={p.status} size="sm" />
        {progress(row)}
      </div>
      {p.sample && <span className="sr-only">(fictional sample)</span>}
      <span aria-hidden="true" className="absolute top-4 right-0 grid size-11 place-items-center border-2 border-line-strong text-ink group-hover:bg-ink group-hover:text-bg"><ArrowRight className="size-4" /></span>
    </article>
  );
}
