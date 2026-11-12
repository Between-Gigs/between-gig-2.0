/*
 * Template · Search (Figma: DS · Patterns → Find a professional). A serif section heading, the search and filter bar
 * on one raised card, a results line with removable filter chips, then the results as a vertical list of
 * ProfileResultCard. The route (components/people/GigsterBrowse) owns the data, the query string and the filtering;
 * this template only lays it out, so every look filters the same way.
 */
import { Input, Select, Skeleton } from "@ds/components";
import { cx } from "@ds/components/cx";
import { Search, X } from "lucide-react";
import type * as React from "react";
import { Button, Text } from "../atoms";
import { SectionHeading } from "../molecules";
import { ProfileResultCard } from "../organisms";

export type SearchFilter = { label: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void };
export type SearchChip = { key: string; label: string; onRemove: () => void };
export type SearchResult = React.ComponentProps<typeof ProfileResultCard> & { id: string; sample?: boolean };
export type SearchEmpty = { title: React.ReactNode; body: React.ReactNode; action: string };

export function SearchTemplate({ total, query, onQuery, onSubmit, filters, chips, onClear, results, empty, note, className }: {
  /** Every listed Gigster (null while loading). */
  total: number | null;
  query: string;
  onQuery: (value: string) => void;
  onSubmit: () => void;
  filters: SearchFilter[];
  chips: SearchChip[];
  onClear: () => void;
  /** null while loading. */
  results: SearchResult[] | null;
  /** Shown when results is an empty list. */
  empty: SearchEmpty;
  note?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("mx-auto grid w-full max-w-5xl gap-8", className)}>
      <SectionHeading eyebrow="Find a professional" as="h1" level="h1" title="Film and TV crew, between productions"
        subtitle={total === null ? "Every Gigster here is reviewed by the Between Gigs team." : `${total} ${total === 1 ? "Gigster" : "Gigsters"} listed, each reviewed by the Between Gigs team.`} />

      <form role="search" aria-label="Find a Gigster" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
        className="grid gap-3 rounded-xl border border-line bg-surface p-4 shadow-sm sm:grid-cols-3 sm:p-5 lg:grid-cols-5">
        <div className="sm:col-span-3 lg:col-span-2">
          <Input size="lg" aria-label="Search Gigsters" type="search" value={query} onChange={(e) => onQuery(e.target.value)} placeholder="Name, craft or service" start={<Search />} />
        </div>
        {filters.map((f) => (
          <Select key={f.label} size="lg" aria-label={f.label} value={f.value} onValueChange={f.onChange} options={f.options} />
        ))}
      </form>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line pb-4">
        <p aria-live="polite" className="font-display text-heading-md text-ink">
          {results ? <><span className="tabular-nums">{results.length}</span> {results.length === 1 ? "Gigster" : "Gigsters"}{chips.length > 0 && " match"}</> : "Loading Gigsters"}
        </p>
        {chips.length > 0 && (
          <ul aria-label="Active filters" className="flex flex-wrap items-center gap-2">
            {chips.map((c) => (
              <li key={c.key}>
                <button type="button" aria-label={`Remove filter: ${c.label}`} onClick={c.onRemove}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-surface-sunken pr-3 pl-4 text-label-sm font-semibold text-ink transition-colors duration-fast hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
                  {c.label}<X className="size-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
            {/* With no results the empty state carries the one Clear filters. */}
            {results?.length !== 0 && <li><Button variant="ghost" iconStart={<X />} onClick={onClear}>Clear filters</Button></li>}
          </ul>
        )}
      </div>

      <section aria-label="Results" data-results={results ? "" : undefined}>
        {!results ? (
          <ul aria-busy="true" aria-label="Loading Gigsters" className="grid gap-4">
            {Array.from({ length: 4 }, (_, i) => (
              <li key={i} className="flex flex-col gap-5 rounded-lg border border-line bg-surface p-3 sm:flex-row sm:items-center">
                <Skeleton shape="block" className="aspect-4/3 w-full sm:w-40" />
                <div className="grid flex-1 gap-2"><Skeleton className="h-6 w-1/2" /><Skeleton className="w-1/3" /><Skeleton className="w-2/3" /></div>
              </li>
            ))}
          </ul>
        ) : results.length === 0 ? (
          <div className="grid justify-items-start gap-4 rounded-xl border border-line bg-surface p-6 sm:p-8">
            <h2 className="font-display text-display-sm text-balance text-ink">{empty.title}</h2>
            <Text size="lg" muted className="max-w-xl text-pretty">{empty.body}</Text>
            <Button variant="secondary" size="lg" iconStart={<X />} className="mt-2" onClick={onClear}>{empty.action}</Button>
          </div>
        ) : (
          <ul className="grid gap-4">
            {results.map(({ id, sample, ...card }) => (
              <li key={id}>
                <ProfileResultCard {...card} />
                {sample && <span className="sr-only">(fictional sample)</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {note && <Text size="sm" muted className="mt-8">{note}</Text>}
    </div>
  );
}
