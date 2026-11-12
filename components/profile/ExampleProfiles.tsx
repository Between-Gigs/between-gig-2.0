"use client";
import { Button, Field, Input, Select, Skeleton } from "@ds/components";
import { ArrowRight, ListChecks, PencilLine, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Page } from "@/components/site/Page";
import { data, type RateBasis } from "@/lib/data";
import { basisLabel, basisShort, monthStatusLabel } from "@/lib/data/taxonomy";
import { professionalExamples, type ExampleId } from "@/lib/professional-examples";
import { clearExampleFilters, matchesExample, type ExampleFilters } from "@/lib/profile/example-filters";
import { usePublishedExamples } from "./ExampleProfileLink";
import { ProfilePreviewCard } from "./ProfilePreviewCard";

const options = (all: string, values: string[]) => [{ value: "all", label: all }, ...[...new Set(values)].sort().map((v) => ({ value: v, label: v }))];

export function ExampleProfiles() {
  const router = useRouter();
  const rows = usePublishedExamples();
  const [filters, setFilters] = React.useState<ExampleFilters>(clearExampleFilters);
  const [opening, setOpening] = React.useState<ExampleId | null>(null);
  const [error, setError] = React.useState("");
  const active = Object.values(filters).some((v) => !!v.trim());
  const setFilter = (key: "service" | "area" | "availability", value: string) =>
    setFilters((old) => ({ ...old, [key]: value === "all" ? "" : value }));
  const cards = professionalExamples.map((card) => ({ card, row: rows?.find(({ person }) => person.id === card.id) }))
    .filter(({ row }) => !active || (!!row && matchesExample(row.profile, filters)));

  const edit = async (id: ExampleId, url: "/profile/canvas/" | "/profile/edit/") => {
    if (!data.demo || opening) return;
    setOpening(id);
    setError("");
    try {
      await data.demo.signInAs("gigster", id);
      router.push(url);
    } catch {
      setOpening(null);
      setError("The editor could not be opened. Please try again.");
    }
  };

  return (
    <Page>
      <header data-call-sheet-stage="intro" className="mb-8 grid gap-3">
        <Link href="/preview/" className="inline-flex min-h-11 w-fit items-center text-label-md text-ink-muted underline underline-offset-4">Preview guide</Link>
        <h1 className="font-display text-display-sm text-balance text-ink sm:text-display-md">Sample Gigster profiles</h1>
        <p className="max-w-2xl text-body-lg text-ink-muted">Compare four fictional Gigsters. Open a profile for its services and work samples, or try editing it as that Gigster.</p>
        <Link href="/professionals/#profiles" className="inline-flex min-h-11 w-fit items-center gap-1.5 text-label-md text-link underline underline-offset-4">Compare the Professionals cards <ArrowRight aria-hidden="true" className="size-4" /></Link>
      </header>
      <section aria-label="Find a sample Gigster" className="mb-6 grid gap-4 rounded-xl border border-line bg-surface p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <Field label="Search by name or service" className="w-full sm:max-w-md">
            <Input type="search" value={filters.q} onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))} placeholder="Try furniture or venue" start={<Search />} />
          </Field>
          <div className="flex min-h-11 items-center gap-4">
            <span aria-live="polite" className="text-label-sm text-ink-muted">{rows ? `${cards.length} of ${professionalExamples.length} examples` : "Loading profiles…"}</span>
            {active && <Button variant="ghost" size="sm" onClick={() => setFilters(clearExampleFilters)}>Reset filters</Button>}
          </div>
        </div>
        <details>
          <summary className="w-fit cursor-pointer py-2 text-label-md text-ink">Filter profiles</summary>
          <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Service"><Select aria-label="Service" value={filters.service || "all"} options={options("All services", rows?.flatMap((r) => r.profile.fields.services) ?? [])} onValueChange={(v) => setFilter("service", v)} /></Field>
            <Field label="Service area"><Select aria-label="Service area" value={filters.area || "all"} options={options("All areas", rows?.flatMap((r) => r.profile.fields.areas) ?? [])} onValueChange={(v) => setFilter("area", v)} /></Field>
            <Field label="Availability"><Select aria-label="Availability" value={filters.availability || "all"} options={[{ value: "all", label: "Any availability" }, ...Object.entries(monthStatusLabel).map(([value, label]) => ({ value, label }))]} onValueChange={(v) => setFilter("availability", v)} /></Field>
            <Field label="Rate basis"><Select aria-label="Rate basis" value={filters.basis || "all"} options={[{ value: "all", label: "Any rate basis" }, ...Object.entries(basisLabel).map(([value, label]) => ({ value, label }))]} onValueChange={(v) => setFilters((f) => ({ ...f, basis: v === "all" ? "" : v as RateBasis, max: "" }))} /></Field>
            {filters.basis && <Field label={`Maximum starting rate ($/${basisShort[filters.basis]})`}><Input type="number" inputMode="decimal" min={0} step="any" value={filters.max} onChange={(e) => setFilters((f) => ({ ...f, max: e.target.value }))} /></Field>}
          </div>
        </details>
      </section>
      {error && <p role="alert" className="mb-6 rounded-md bg-danger-soft p-4 text-body-md text-danger">{error}</p>}
      {rows && cards.length === 0 && <p className="py-6 text-body-md text-ink-muted">No sample profiles match these filters. Try another service or reset the filters.</p>}
      <ul className="grid items-start gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ card, row }) => (
          <li key={card.id} className="grid gap-3 rounded-xl border border-line bg-surface p-3 shadow-sm swiss:border-0 swiss:border-t-4 swiss:border-line-strong swiss:p-0 swiss:pt-3">
            {!rows ? <div aria-label={`Loading ${card.name}'s card`} aria-busy="true" className="grid gap-4"><Skeleton shape="block" className="aspect-square w-full" /><Skeleton className="h-8 w-2/3" /></div>
              : row ? <>
                <ProfilePreviewCard personId={card.id} fields={row.profile.fields} badge={null} />
                <Link href={`/p/${row.person.slug}/`} aria-label={`View ${card.name}'s full profile`} className="inline-flex min-h-11 w-fit items-center gap-2 text-label-md text-link underline underline-offset-4">View full profile <ArrowRight aria-hidden="true" className="size-4" /></Link>
              </> : <p className="text-body-md text-ink-muted">{card.name}’s sample is awaiting approval before its public page opens.</p>}
            {rows && <div className="flex flex-wrap gap-2 border-t border-line pt-3">
              <Button size="sm" iconStart={<PencilLine />} aria-label={`Edit ${card.name} on the page`} disabled={!!opening} onClick={() => void edit(card.id, "/profile/canvas/")}>Edit on page</Button>
              <Button size="sm" variant="ghost" iconStart={<ListChecks />} aria-label={`Edit ${card.name} in the form`} disabled={!!opening} onClick={() => void edit(card.id, "/profile/edit/")}>Edit in form</Button>
            </div>}
          </li>
        ))}
      </ul>
    </Page>
  );
}
