"use client";
import Link from "next/link";
import type { DashboardSummary } from "@/lib/data";
import { Panel } from "./kit";

interface Stage { label: string; value: number; href: string; now: { label: string; value: number; href: string }[] }

const pct = (n: number, of: number) => (of ? Math.round((n / of) * 100) : 0);

/**
 * From invite to live: everyone who was invited, and how far they've got. Each stage counts everyone who ever
 * reached it, so each is part of the one before; the bars share one scale (the invited). Under each stage, who
 * is still there now, linked to that list. The waitlist itself is a headline number above, not a bar here.
 */
export function Funnel({ d }: { d: DashboardSummary }) {
  const f = d.funnel, w = d.waitlist, c = d.counts;
  const stages: Stage[] = [
    { label: "Invited", value: f.invited, href: "/owners/people/", now: [{ label: "haven't opened it", value: w.invited, href: "/owners/waitlist/?status=invited" }] },
    { label: "Opened the invite", value: f.opened, href: "/owners/waitlist/?status=opened", now: [{ label: "no account yet", value: w.opened, href: "/owners/waitlist/?status=opened" }] },
    {
      label: "Created an account", value: f.accounts, href: "/owners/people/?status=draft",
      now: [{ label: "not started", value: c.registered, href: "/owners/people/?status=registered" }, { label: "drafting", value: c.draft, href: "/owners/people/?status=draft" }],
    },
    {
      label: "Submitted a profile", value: f.submitted, href: "/owners/review/",
      now: [{ label: "waiting for review", value: c.submitted, href: "/owners/review/" }, { label: "making edits", value: c.changes_requested, href: "/owners/people/?status=changes_requested" }],
    },
    { label: "Approved", value: f.approved, href: "/owners/people/?status=approved", now: [{ label: "live on the site", value: c.approved, href: "/owners/people/?status=approved" }] },
  ];
  const scale = f.invited || 1;

  return (
    <Panel title="From invite to live" aside={<span className="tabular-nums">Out of {f.invited} invited</span>} flush>
      <ol className="grid">
        {stages.map((s, i) => (
          <li key={s.label} className="grid grid-cols-1 gap-x-6 gap-y-2 border-t border-line px-5 py-4 first:border-t-0 md:grid-cols-12 md:items-center">
            <div className="grid min-w-0 gap-0.5 md:col-span-4">
              <Link href={s.href} className="inline-flex min-h-6 w-fit items-center text-label-md text-ink hover:text-ink-brand">{s.label}</Link>
              <p className="flex flex-wrap gap-x-4 text-body-sm text-ink-subtle">
                {s.now.map((x) => (
                  <Link key={x.label} href={x.href} className="inline-flex min-h-6 items-center gap-1 whitespace-nowrap hover:text-ink"><span className="text-ink-muted tabular-nums">{x.value}</span> {x.label}</Link>
                ))}
              </p>
            </div>
            <div className="flex items-center gap-4 md:col-span-8">
              <div aria-hidden="true" className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-sunken">
                <div className="h-full rounded-full bg-action" style={{ width: `${Math.max((s.value / scale) * 100, s.value ? 1.5 : 0)}%` }} />
              </div>
              <span className="w-10 shrink-0 text-right font-display text-heading-md text-ink tabular-nums">{s.value}</span>
              <span className="w-24 shrink-0 text-right text-body-sm text-ink-subtle tabular-nums">
                {i === 0 ? "of invited" : <>{pct(s.value, stages[i - 1].value)}% of above</>}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

export type FunnelView = "invited" | "building" | "submitted" | "approved";

/**
 * The same funnel, compact, for the one-screen dashboard: one tight row per stage. Selecting a stage shows
 * who is at that stage now in the dashboard's list, in place.
 */
export function FunnelCompact({ d, onSelect, selected }: { d: DashboardSummary; onSelect: (v: FunnelView) => void; selected?: string }) {
  const f = d.funnel;
  const stages: { label: string; value: number; view: FunnelView }[] = [
    { label: "Invited", value: f.invited, view: "invited" },
    { label: "Opened the invite", value: f.opened, view: "invited" },
    { label: "Created an account", value: f.accounts, view: "building" },
    { label: "Submitted a profile", value: f.submitted, view: "submitted" },
    { label: "Approved", value: f.approved, view: "approved" },
  ];
  const scale = f.invited || 1;
  return (
    <Panel title="From invite to live" aside={<span className="tabular-nums">Out of {f.invited} invited</span>} flush className="shrink-0">
      <ol className="grid py-1.5">
        {stages.map((s, i) => (
          <li key={s.label}>
            <button type="button" onClick={() => onSelect(s.view)} aria-pressed={selected === s.view && i !== 1}
              className="grid min-h-9 w-full grid-cols-12 items-center gap-3 px-5 py-1 text-left transition-colors duration-fast hover:bg-surface-hover">
              <span className="col-span-5 truncate text-body-sm text-ink-muted">{s.label}</span>
              <span aria-hidden="true" className="col-span-4 h-1.5 overflow-hidden rounded-full bg-surface-sunken">
                <span className="block h-full rounded-full bg-action" style={{ width: `${Math.max((s.value / scale) * 100, s.value ? 2 : 0)}%` }} />
              </span>
              <span className="col-span-1 text-right text-label-md text-ink tabular-nums">{s.value}</span>
              <span className="col-span-2 text-right text-caption text-ink-subtle tabular-nums">{i === 0 ? "" : `${pct(s.value, stages[i - 1].value)}%`}</span>
            </button>
          </li>
        ))}
      </ol>
    </Panel>
  );
}
