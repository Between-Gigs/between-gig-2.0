"use client";
import { Button, EmptyState, Input, Select, Skeleton } from "@ds/components";
import { Search, SearchX, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { data } from "@/lib/data";
import { basisShort, monthStatusLabel } from "@/lib/data/taxonomy";
import { craftOf } from "@/lib/profile/department";
import {
  areaOptions, availabilityOptions, browseHref, craftOptions, filterGigsters, noFilters, parseBrowse,
  type BrowseFilters, type Listed,
} from "@/lib/profile/browse";
import { useSettleWhen } from "@/lib/motion";
import { Page } from "@/components/site/Page";
import { PersonPhoto } from "./PersonPhoto";

/** As many as the public list can hold: the sample returns every approved Gigster; live caps the call itself. */
const ALL = 1000;

/** /p/: every approved (public) Gigster, filtered by craft, area and availability; filters live in the query string. */
export function GigsterBrowse() {
  return (
    <Page>
      <React.Suspense fallback={<Header count={null} />}>
        <Browse />
      </React.Suspense>
    </Page>
  );
}

function Header({ count }: { count: number | null }) {
  return (
    <header className="grid grid-cols-12 gap-x-6">
      <h1 className="col-span-12 flex flex-wrap items-baseline gap-x-6 font-display text-display-md tracking-tight text-ink sm:text-display-xl">
        Gigsters
        <span aria-hidden={count === null} className="font-display text-display-sm text-ink-muted tabular-nums sm:text-display-md">
          {count === null ? "–" : count}<span className="sr-only"> listed</span>
        </span>
      </h1>
      <p className="col-span-12 mt-6 border-t-4 border-line-strong pt-4 text-body-lg text-ink lg:col-span-8">Film and TV crew, available between productions.</p>
    </header>
  );
}

function Browse() {
  const params = useSearchParams();
  const router = useRouter();
  const filters = React.useMemo(() => parseBrowse(params), [params]);
  const [all, setAll] = React.useState<Listed[] | null>(null);
  const [text, setText] = React.useState(filters.q);

  React.useEffect(() => {
    let live = true;
    // `similar` with no id to leave out is the public read of every approved profile (what /p/<slug>/ shows).
    void data.people.similar("", ALL).then((r) => { if (live) setAll(r); });
    return () => { live = false; };
  }, []);
  useSettleWhen(!!all);

  const go = React.useCallback((next: BrowseFilters) => router.replace(browseHref(next), { scroll: false }), [router]);
  const set = (k: keyof BrowseFilters) => (v: string) => go({ ...filters, [k]: v === "all" ? "" : v });

  // Back and forward, or a breadcrumb link, change ?q= under us.
  React.useEffect(() => { setText(filters.q); }, [filters.q]); // eslint-disable-line react-hooks/set-state-in-effect
  // Search as you type, a beat after the last key.
  React.useEffect(() => {
    if (text.trim() === filters.q.trim()) return;
    const t = window.setTimeout(() => go({ ...filters, q: text }), 250);
    return () => window.clearTimeout(t);
  }, [text, filters, go]);

  const rows = React.useMemo(() => all && filterGigsters(all, filters), [all, filters]);
  const total = all ? filterGigsters(all, noFilters).length : null;
  const chips: [keyof BrowseFilters, string | undefined][] = [
    ["craft", craftOptions.find((o) => o.value === filters.craft)?.label],
    ["area", areaOptions.find((o) => o.value === filters.area)?.label],
    ["availability", availabilityOptions.find((o) => o.value === filters.availability)?.label],
    ["q", filters.q ? `“${filters.q}”` : undefined],
  ];
  const active = chips.filter((x): x is [keyof BrowseFilters, string] => !!x[1]);
  const clear = () => { setText(""); go(noFilters); };

  return (
    <>
      <Header count={total} />

      <form role="search" aria-label="Find a Gigster" onSubmit={(e) => { e.preventDefault(); go({ ...filters, q: text }); }}
        className="mt-10 grid grid-cols-12 gap-x-6 gap-y-3 lg:mt-14">
        <div className="col-span-12 lg:col-span-3">
          <Input aria-label="Search Gigsters" type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Name, craft or service" start={<Search />} />
        </div>
        <Select aria-label="Craft" className="col-span-12 sm:col-span-4 lg:col-span-3" value={filters.craft || "all"} onValueChange={set("craft")}
          options={[{ value: "all", label: "Any craft" }, ...craftOptions]} />
        <Select aria-label="Area" className="col-span-12 sm:col-span-4 lg:col-span-3" value={filters.area || "all"} onValueChange={set("area")}
          options={[{ value: "all", label: "Any area" }, ...areaOptions]} />
        <Select aria-label="Availability" className="col-span-12 sm:col-span-4 lg:col-span-3" value={filters.availability || "all"} onValueChange={set("availability")}
          options={[{ value: "all", label: "Any availability" }, ...availabilityOptions]} />
      </form>

      <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 border-t-4 border-line-strong pt-3">
        <p aria-live="polite" className="font-display text-heading-md text-ink">
          {rows ? <><span className="tabular-nums">{rows.length}</span> {rows.length === 1 ? "Gigster" : "Gigsters"}{active.length > 0 && " match"}</> : "Loading Gigsters"}
        </p>
        {active.length > 0 && (
          <ul aria-label="Active filters" className="flex flex-wrap gap-2">
            {active.map(([k, label]) => (
              <li key={k}>
                <button type="button" aria-label={`Remove filter: ${label}`} onClick={() => { if (k === "q") setText(""); go({ ...filters, [k]: "" }); }}
                  className="inline-flex min-h-11 items-center gap-1.5 border-2 border-line-strong pr-2 pl-3 text-label-sm font-bold text-ink hover:bg-surface-hover">
                  {label}<X className="size-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
            <li><Button variant="ghost" iconStart={<X />} onClick={clear}>Clear filters</Button></li>
          </ul>
        )}
      </div>

      <section aria-label="Results" data-results={rows ? "" : undefined} className="mt-8">
        {!rows ? (
          <ul aria-busy="true" aria-label="Loading Gigsters" className="grid grid-cols-12 gap-x-6 gap-y-10">
            {Array.from({ length: 8 }, (_, i) => (
              <li key={i} className="col-span-12 grid gap-3 sm:col-span-6 lg:col-span-3"><Skeleton shape="block" className="aspect-square" /><Skeleton className="h-6 w-2/3" /><Skeleton className="w-1/2" /></li>
            ))}
          </ul>
        ) : rows.length === 0 ? (
          <EmptyState className="py-16" icon={<SearchX />} title="No Gigsters match all of that" headingLevel={2}
            action={<Button variant="secondary" onClick={clear}>Clear filters</Button>}>
            Try fewer filters, or search for part of a name or craft.
          </EmptyState>
        ) : (
          <ul className="grid grid-cols-12 gap-x-6 gap-y-12">
            {rows.map((r) => <li key={r.person.id} className="col-span-12 sm:col-span-6 lg:col-span-3"><GigsterCard row={r} /></li>)}
          </ul>
        )}
      </section>

      {data.kind === "sample" && <p className="mt-16 text-body-sm text-ink-muted">These are fictional sample profiles: the people, biographies and credits are made up for the preview.</p>}
    </>
  );
}

function GigsterCard({ row: { person, profile } }: { row: Listed }) {
  const f = profile.fields;
  const name = f.name || person.name;
  const department = craftOf(f.position, f.skills) ?? (f.position || f.services[0] || "");
  const area = f.market === "la" ? f.areas.join(" · ") || "Los Angeles" : "Another market";
  return (
    <Link href={`/p/${person.slug}/`} className="group grid gap-4 border-t-4 border-line-strong pt-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus">
      <span className="block aspect-square overflow-hidden">
        <PersonPhoto id={person.id} name={name} src={f.photo || undefined} alt="" fallback="brand" department={f.position} skills={f.skills}
          className="size-full transition-transform duration-slow group-hover:scale-105 motion-reduce:transition-none" />
      </span>
      <span className="grid gap-1">
        <span className="font-display text-heading-md font-bold tracking-tight text-ink group-hover:underline">{name}</span>
        {department && <span className="text-body-md text-ink">{department}</span>}
        <span className="text-body-sm text-ink-muted">{area}</span>
      </span>
      <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-t border-line pt-3">
        <span className="font-display text-heading-sm text-ink tabular-nums">{f.rate ? `From $${f.rate}/${basisShort[f.basis]}` : "Rate on request"}</span>
        <span className="text-label-sm text-ink-muted">{monthStatusLabel[f.monthStatus]}</span>
      </span>
      {person.sample && <span className="sr-only">(fictional sample)</span>}
    </Link>
  );
}
