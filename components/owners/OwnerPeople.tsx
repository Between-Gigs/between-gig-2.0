"use client";
import { Badge, Button, Drawer, EmptyState, Input, PageHeader, Progress, SegmentedControl, Select, cx } from "@ds/components";
import { ArrowUpRight, Calendar, ChevronRight, LayoutGrid, List, MapPin, Search, SearchX, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import * as React from "react";
import { flushSync } from "react-dom";
import { data, personStatuses, type PeopleQuery, type PeopleSort, type PersonStatus, type PersonSummary } from "@/lib/data";
import { laServiceAreas, monthStatusLabel, offSetServices } from "@/lib/data/taxonomy";
import { useMorphNavigate } from "@/lib/motion";
import { PersonPhoto } from "@/components/people/PersonPhoto";
import { PersonStatusBadge, personStatusMeta } from "@/components/people/PersonStatusBadge";
import { OwnerShell } from "./OwnerShell";
import { OwnerGate } from "./OwnerGate";

const VIEW_KEY = "bg2-people-view";
const blank: Required<PeopleQuery> = { text: "", status: "all", service: "all", area: "all", availability: "all", sort: "updated" };

/** Animates a list change: each card has its own view-transition name, so cards glide to their new places. */
function reflow(update: () => void) {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  if (!doc.startViewTransition || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { update(); return; }
  doc.startViewTransition(() => flushSync(update));
}

const ago = (iso: string) => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return days <= 0 ? "Today" : days === 1 ? "Yesterday" : days < 30 ? `${days} days ago` : new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

/** /owners/people: search everyone from the waitlist on, filter, sort, open a profile. */
export function OwnerPeople() {
  return <OwnerGate>{() => <People />}</OwnerGate>;
}

function People() {
  const navigate = useMorphNavigate();
  const [query, setQuery] = React.useState(blank);
  const [text, setText] = React.useState("");
  const [rows, setRows] = React.useState<PersonSummary[] | null>(null);
  const [counts, setCounts] = React.useState<Record<PersonStatus, number> | null>(null);
  const [view, setView] = React.useState("list");
  const first = React.useRef(true);
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
      // The first load just appears; later changes re-flow.
      if (first.current) { first.current = false; setRows(r); } else reflow(() => setRows(r));
    });
    return () => { live = false; };
  }, [query]);

  const set = <K extends keyof PeopleQuery>(k: K) => (v: string) => setQuery((q) => ({ ...q, [k]: v }));
  const filtered = query.status !== "all" || query.service !== "all" || query.area !== "all" || query.availability !== "all" || !!query.text;
  const active = [query.status, query.service, query.area, query.availability].filter((v) => v !== "all").length;
  const selects = (
    <>
      <Select aria-label="Status" value={query.status} onValueChange={set("status")}
        options={[{ value: "all", label: "Any status" }, ...personStatuses.map((s) => ({ value: s, label: personStatusMeta[s].label }))]} />
      <Select aria-label="Service" value={query.service} onValueChange={set("service")}
        options={[{ value: "all", label: "Any service" }, ...offSetServices.map((s) => ({ value: s, label: s }))]} />
      <Select aria-label="Area" value={query.area} onValueChange={set("area")}
        options={[{ value: "all", label: "Any area" }, ...laServiceAreas.map((s) => ({ value: s, label: s }))]} />
      <Select aria-label="Availability" value={query.availability} onValueChange={set("availability")}
        options={[{ value: "all", label: "Any availability" }, ...Object.entries(monthStatusLabel).map(([value, label]) => ({ value, label }))]} />
    </>
  );
  const reset = () => { setText(""); setQuery(blank); };
  const changeView = (v: string) => { reflow(() => setView(v)); try { localStorage.setItem(VIEW_KEY, v); } catch { /* ignore */ } };
  const total = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : 0;

  return (
    <OwnerShell>
      <PageHeader eyebrow="Owners" title="People" meta={counts ? String(total) : undefined}
        description="Everyone from the waitlist on: who has joined, how far along their profile is, and who is waiting for review." />

      {/* Status counts double as quick filters: a scrolling chip strip on phones, tiles from tablet up. */}
      <div role="group" aria-label="Filter by status" className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:mt-6 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-6">
        {personStatuses.map((s) => {
          const on = query.status === s;
          const m = personStatusMeta[s];
          return (
            <button key={s} type="button" aria-pressed={on} onClick={() => set("status")(on ? "all" : s)}
              className={cx("flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-left transition duration-base sm:grid sm:gap-1 sm:rounded-xl sm:p-3",
                on ? "border-ink-brand bg-surface-selected shadow-sm" : "border-line bg-surface hover:border-line-strong sm:hover:-translate-y-0.5")}>
              <span className="flex items-center gap-1.5 text-label-sm whitespace-nowrap text-ink-muted"><m.Icon className="size-3.5" aria-hidden="true" />{m.label}</span>
              <span className="text-label-md text-ink tabular-nums sm:font-display sm:text-heading-lg">{counts ? counts[s] : "–"}</span>
            </button>
          );
        })}
      </div>

      <form role="search" onSubmit={(e) => { e.preventDefault(); setQuery((q) => ({ ...q, text })); }}
        className="mt-4 flex gap-2 sm:mt-6 md:grid md:grid-cols-12 md:items-center md:gap-3 md:rounded-2xl md:border md:border-line md:bg-surface md:p-3 md:shadow-sm">
        <div className="min-w-0 flex-1 md:col-span-5">
          <Input aria-label="Search people" type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Name, email, ZIP, craft or service" start={<Search />} />
        </div>
        <div className="hidden grid-cols-4 gap-2 md:col-span-7 md:grid">{selects}</div>
        <Button type="button" variant="secondary" className="shrink-0 md:hidden" iconStart={<SlidersHorizontal />} onClick={() => setFilters(true)}
          aria-label={active ? `Filters, ${active} on` : "Filters"}>
          Filters{active > 0 && <span aria-hidden="true" className="ml-1 inline-grid size-5 place-items-center rounded-full bg-action text-label-sm text-on-action tabular-nums">{active}</span>}
        </Button>
      </form>
      <Drawer open={filters} onClose={() => setFilters(false)} title="Filters" side="right"
        footer={<><Button variant="ghost" onClick={() => { setQuery((q) => ({ ...blank, text: q.text, sort: q.sort })); }}>Clear</Button><Button variant="primary" onClick={() => setFilters(false)}>Show {rows?.length ?? 0} {rows?.length === 1 ? "person" : "people"}</Button></>}>
        <div className="grid gap-3">{selects}</div>
      </Drawer>

      <div className="mt-4 flex flex-wrap items-center gap-3 sm:mt-5">
        <p className="text-body-md text-ink-muted" aria-live="polite">
          {rows && <><b className="font-display text-heading-md text-ink tabular-nums">{rows.length}</b> {rows.length === 1 ? "person" : "people"}{filtered && " match"}</>}
        </p>
        {filtered && <Button size="sm" variant="ghost" onClick={reset}>Reset filters</Button>}
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <Select aria-label="Sort" size="sm" value={query.sort} onValueChange={(v) => setQuery((q) => ({ ...q, sort: v as PeopleSort }))} className="w-44 sm:w-48"
            options={[{ value: "updated", label: "Sort: Recently active" }, { value: "status", label: "Sort: Furthest along" }, { value: "name", label: "Sort: Name, A to Z" }]} />
          <SegmentedControl label="View" size="sm" value={view} onChange={changeView}
            options={[{ value: "list", label: "List", icon: <List /> }, { value: "grid", label: "Grid", icon: <LayoutGrid /> }]} />
        </div>
      </div>

      <section aria-label="Results" data-results={rows ? "" : undefined} className="mt-5">
        {rows && rows.length === 0 ? (
          <EmptyState icon={<SearchX />} title="No one matches all of that" headingLevel={2} action={<Button variant="secondary" onClick={reset}>Reset filters</Button>}>
            Try fewer filters, or search for part of a name or email.
          </EmptyState>
        ) : (
          <ul className={cx("grid grid-cols-1 gap-2 sm:gap-3", view === "grid" && "sm:grid-cols-2 lg:grid-cols-3")}>
            {(rows ?? []).map((r) => (
              <li key={r.person.id} style={{ viewTransitionName: `card-${r.person.id}` }}>
                <PersonCard row={r} grid={view === "grid"} onOpen={() => navigate(`/owners/people/${r.person.id}/`)} />
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="mt-6 text-caption text-ink-subtle">Names shown are illustrative samples for this draft.</p>
    </OwnerShell>
  );
}

function PersonCard({ row: { person: p, fields: f, completeness, fromDraft }, grid, onOpen }: { row: PersonSummary; grid: boolean; onOpen: () => void }) {
  const name = p.name || p.email;
  const href = `/owners/people/${p.id}/`;
  const open = (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    onOpen();
  };
  return (
    <article className={cx("group relative flex min-w-0 items-center gap-3 rounded-xl border border-line bg-surface p-2.5 transition duration-base hover:border-line-strong sm:gap-4 sm:rounded-2xl sm:p-3 sm:hover:-translate-y-0.5 sm:hover:shadow-md",
      grid ? "h-full sm:flex-col sm:items-stretch" : "sm:flex-row")}>
      <div className={cx("flex min-w-0 flex-1 items-center gap-3 sm:gap-4", grid && "sm:flex-none")}>
        <PersonPhoto id={p.id} morph name={p.name || "?"} src={f?.photo || undefined} alt=""
          className="size-11 shrink-0 rounded-lg sm:size-16 sm:rounded-xl" textClass="text-label-md sm:text-heading-lg" />
        <div className="grid min-w-0 flex-1 gap-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <h2 className="min-w-0 truncate text-label-md text-ink sm:font-display sm:text-heading-md">
              <Link href={href} onClick={open} className="rounded-xs after:absolute after:inset-0 after:rounded-2xl hover:text-ink-brand">{name}</Link>
            </h2>
            <PersonStatusBadge status={p.status} size="sm" />
            {p.sample && <span className="sr-only">(fictional sample)</span>}
          </div>
          <p className="truncate text-body-sm text-ink-muted max-sm:hidden">{f?.position ? `${f.position}${f.services.length ? ` · ${f.services.join(", ")}` : ""}` : p.name ? p.email : `Waitlist · ZIP ${p.waitlistZip}`}</p>
          <p className="flex flex-wrap gap-x-3 gap-y-1 text-body-sm text-ink-subtle max-sm:hidden">
            {f?.areas.length ? <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" aria-hidden="true" />{f.areas.join(" · ")}</span> : null}
            {f && f.dates ? <span className="inline-flex items-center gap-1"><Calendar className="size-3.5" aria-hidden="true" />{monthStatusLabel[f.monthStatus]}</span> : null}
            <span>Active {ago(p.updatedAt).toLowerCase()}</span>
          </p>
        </div>
      </div>
      <div className={cx("hidden shrink-0 items-center gap-4 sm:flex", grid ? "mt-auto justify-between" : "sm:w-56 sm:justify-end")}>
        {p.status === "invited" || p.status === "registered"
          ? <Badge tone="neutral" size="sm">{p.status === "invited" ? "Hasn't joined yet" : "Not started"}</Badge>
          : <Progress className="w-36" value={Math.round(completeness * 100)} label={fromDraft ? "Draft" : "Profile"} />}
        <ArrowUpRight className="size-5 shrink-0 text-ink-brand transition-transform duration-base group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
      </div>
      <ChevronRight className="size-5 shrink-0 text-ink-subtle sm:hidden" aria-hidden="true" />
    </article>
  );
}
