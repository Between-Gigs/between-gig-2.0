"use client";
import { Button, Field, Input, SegmentedControl, cx } from "@ds/components";
import { ArrowDownRight, RotateCcw } from "lucide-react";
import * as React from "react";

/*
 * The Journal's three interactive blocks, from the live reader (components/journal/reader.tsx and
 * industry-chart.tsx). Same copy and numbers; rebuilt on design-system controls and tokens.
 */

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const clamp = (v: string, min: number, max: number) => Math.max(min, Math.min(max, Number(v) || 0));

export function BudgetPlanner() {
  const [guests, setGuests] = React.useState(40);
  const [crew, setCrew] = React.useState(12);
  const [reserve, setReserve] = React.useState(15);
  const [guestMeal, setGuestMeal] = React.useState(65);
  const [crewMeal, setCrewMeal] = React.useState(25);
  const [costs, setCosts] = React.useState([1500, 2400, 1200, 800, 600]);
  const names = ["Production lead & story", "Cast & rehearsal", "Costumes & props", "Sound & lighting", "Transport"];
  const base = costs.reduce((a, b) => a + b, 0) + guests * guestMeal + crew * crewMeal;
  const total = base * (1 + reserve / 100);
  const money = <span className="text-label-md">$</span>;
  return (
    <section aria-labelledby="budget-h" className="grid gap-5 rounded-2xl border border-line bg-surface-sunken p-5 sm:p-6">
      <div>
        <p className="font-mono text-data-sm tracking-wider text-ink-brand uppercase">On the back of a call sheet</p>
        <h2 id="budget-h" className="mt-1 font-display text-display-sm text-ink">Make room for the magic.</h2>
        <p className="mt-1 text-body-md text-ink-muted">Try a first-pass budget. Every number is an illustrative allowance in USD.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Guests"><Input type="number" inputMode="numeric" min={1} max={500} value={guests} onChange={(e) => setGuests(Math.max(1, clamp(e.target.value, 1, 500)))} /></Field>
        <Field label="Crew"><Input type="number" inputMode="numeric" min={0} max={100} value={crew} onChange={(e) => setCrew(clamp(e.target.value, 0, 100))} /></Field>
        <Field label="Reserve %"><Input type="number" inputMode="numeric" min={0} max={50} value={reserve} onChange={(e) => setReserve(clamp(e.target.value, 0, 50))} /></Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {names.map((n, i) => (
          <Field key={n} label={n}><Input type="number" inputMode="numeric" min={0} max={100000} start={money} value={costs[i]} onChange={(e) => setCosts((c) => c.map((x, j) => (j === i ? clamp(e.target.value, 0, 100000) : x)))} /></Field>
        ))}
        <Field label="Guest meals · per person"><Input type="number" inputMode="numeric" min={0} max={1000} start={money} value={guestMeal} onChange={(e) => setGuestMeal(clamp(e.target.value, 0, 1000))} /></Field>
        <Field label="Crew meals · per person"><Input type="number" inputMode="numeric" min={0} max={1000} start={money} value={crewMeal} onChange={(e) => setCrewMeal(clamp(e.target.value, 0, 1000))} /></Field>
      </div>
      <dl aria-live="polite" className="grid gap-3 rounded-xl border border-line bg-surface p-4 sm:grid-cols-3">
        {[["Subtotal", base], [`Reserve (${reserve}%)`, total - base], ["Working total", total]].map(([k, v], i) => (
          <div key={k as string} className="grid gap-0.5"><dt className="text-label-sm text-ink-subtle">{k}</dt><dd className={cx("font-display tabular-nums text-ink", i === 2 ? "text-display-sm" : "text-heading-lg")}>{usd(v as number)}</dd></div>
        ))}
      </dl>
      <p className="text-caption text-ink-subtle">Planning exercise only · edits last while this page is open. Excludes unconfirmed venue, taxes, gratuities, permits, insurance and animal services. This is not a supplier quote.</p>
    </section>
  );
}

export function ProductionKit() {
  const items: [string, string][] = [
    ["The creative brief", "Audience, story, duration, guest participation and the one moment everyone will remember."],
    ["The call sheet", "One shared schedule with locations, contacts, arrival windows, meals and emergency information."],
    ["The running order", "Every cue, who owns it, and the handoff that follows."],
    ["The budget & change log", "Allowances, quotes, approvals, actuals and the cost of changing the plan."],
    ["The physical kit", "Radios, charged batteries, marked props, costume repair supplies, a sound system and agreed weather cover."],
    ["The venue walk-through", "Guest routes, access, restrooms, power, load-in, weather alternatives and any animal decision."],
  ];
  return (
    <section aria-labelledby="kit-h" data-theme="dark" className="relative isolate overflow-hidden rounded-2xl bg-surface-brand p-5 sm:p-6">
      <span aria-hidden="true" className="glow-horizon opacity-50" />
      <div className="relative z-raised">
        <p className="font-mono text-data-sm tracking-wider text-ink-brand uppercase">Pin this to the production wall</p>
        <h2 id="kit-h" className="mt-1 font-display text-display-sm text-ink">The tools behind the evening.</h2>
        <ol className="mt-5 grid gap-4 sm:grid-cols-2">
          {items.map(([t, d], i) => (
            <li key={t} className="flex gap-3 border-t border-line pt-4">
              <span className="font-mono text-data-md text-ink-brand">{String(i + 1).padStart(2, "0")}</span>
              <span><b className="block text-label-md text-ink">{t}</b><span className="text-body-sm text-ink-muted">{d}</span></span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

const annual = [{ year: "2024", days: 23480 }, { year: "2025", days: 19694 }];

/** FilmLA annual on-location shoot days. Bars start at zero; the numbers table is always available. */
export function IndustryChart() {
  const [mode, setMode] = React.useState<"days" | "index">("days");
  const [selected, setSelected] = React.useState(1);
  const [run, setRun] = React.useState(0);
  const d = annual[selected];
  const max = mode === "days" ? 25000 : 100;
  return (
    <figure aria-labelledby="chart-h" className="grid gap-5 rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-data-sm tracking-wider text-ink-brand uppercase">Field study 01 / FilmLA</p>
          <h2 id="chart-h" className="mt-1 font-display text-display-sm text-ink">Fewer days on location.</h2>
          <p className="text-body-sm text-ink-muted">Greater Los Angeles · annual production activity</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl label="Chart scale" size="sm" value={mode} onChange={(v) => setMode(v as "days" | "index")} options={[{ value: "days", label: "Shoot days" }, { value: "index", label: "2024 = 100" }]} />
          <Button size="sm" variant="ghost" iconStart={<RotateCcw />} onClick={() => setRun((n) => n + 1)}>Replay</Button>
        </div>
      </div>
      <div role="group" aria-label="Select a year to explore the reported figures" className="grid gap-3">
        {annual.map((item, i) => {
          const value = mode === "days" ? item.days : (item.days / annual[0].days) * 100;
          return (
            <button key={item.year} type="button" aria-pressed={selected === i} onClick={() => setSelected(i)} onMouseEnter={() => setSelected(i)}
              aria-label={`${item.year}: ${item.days.toLocaleString()} shoot days`}
              className={cx("grid grid-cols-12 items-center gap-3 rounded-lg p-2 text-left transition-colors duration-fast", selected === i ? "bg-surface-selected" : "hover:bg-surface-hover")}>
              <span className="col-span-2 font-mono text-data-md text-ink sm:col-span-1">{item.year}</span>
              <span className="col-span-10 h-9 overflow-hidden rounded-md bg-surface-sunken sm:col-span-11">
                <span key={`${mode}-${run}`} className="flex h-full items-center justify-end rounded-md bg-ink-brand px-2 font-mono text-data-sm text-bg transition-all duration-deliberate"
                  style={{ width: `${(value / max) * 100}%` }}>
                  {mode === "days" ? item.days.toLocaleString() : value.toFixed(1)}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <div aria-live="polite" className="grid gap-1 rounded-xl border border-line p-4">
        <p className="font-mono text-data-sm text-ink-subtle uppercase">{d.year} / {selected === 0 ? "The comparison year" : "The following year"}</p>
        <p className="font-display text-display-sm text-ink tabular-nums">{d.days.toLocaleString()} <span className="text-body-md text-ink-muted">shoot days</span></p>
        <p className="text-body-sm text-ink-muted">{selected === 0 ? "The starting point for this annual comparison. Each bar begins at zero." : "3,786 fewer shoot days than 2024, a 16.1% decline in reported activity."}</p>
      </div>
      <p className="flex items-center gap-2 font-display text-heading-md text-ink"><ArrowDownRight className="size-5 text-ink-brand" aria-hidden="true" />Less work on location. The skills are still here.</p>
      <details className="text-body-sm text-ink-muted">
        <summary className="inline-flex min-h-6 cursor-pointer items-center text-label-md text-ink">View the numbers & scope</summary>
        <table className="mt-3 w-full text-left">
          <caption className="sr-only">FilmLA annual on-location shoot days</caption>
          <thead><tr className="border-b border-line"><th className="py-2">Year</th><th className="py-2">Shoot days</th><th className="py-2">2024 = 100</th></tr></thead>
          <tbody>{annual.map((x) => <tr key={x.year} className="border-b border-line"><th className="py-2 font-normal">{x.year}</th><td className="py-2 tabular-nums">{x.days.toLocaleString()}</td><td className="py-2 tabular-nums">{((x.days / 23480) * 100).toFixed(1)}</td></tr>)}</tbody>
        </table>
        <p className="mt-3">Bars begin at zero. FilmLA’s covered Greater Los Angeles jurisdictions only. This measures on-location activity, not unemployment, individual income or all entertainment production.</p>
      </details>
      <figcaption className="grid gap-3 border-t border-line pt-4 text-body-sm">
        <a href="https://filmla.com/rising-california-film-tv-tax-credit-productions-signal-growing-industry-momentum-amid-2025-production-losses/" target="_blank" rel="noreferrer" className="w-fit text-link underline underline-offset-2">Source: FilmLA · January 15, 2026<span className="sr-only"> (opens in a new tab)</span></a>
        <span className="rounded-lg bg-surface-sunken p-3"><b className="block text-label-md text-ink">Next checkpoint · Q2 2026</b><span className="text-ink-muted">4,711 shoot days · −12.7% year over year</span><span className="block text-caption text-ink-subtle">A quarterly update, separate from the annual comparison above.</span></span>
      </figcaption>
    </figure>
  );
}
