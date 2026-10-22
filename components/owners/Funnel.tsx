"use client";
import { cx } from "@ds/components";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import type { DashboardSummary } from "@/lib/data";

interface Detail { label: string; value: number; href: string }
interface Stage { label: string; value: number; href: string; /** Who reached this stage and went on to the next. */ next: number; details: Detail[] }

/** Runs once, the first time the element is on screen (straight away with reduced motion or no observer). */
function useSeenOnce<T extends Element>() {
  const ref = React.useRef<T>(null);
  const [seen, setSeen] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined" || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { setSeen(true); return; } // eslint-disable-line react-hooks/set-state-in-effect
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, seen] as const;
}

const pct = (n: number, of: number) => (of ? Math.round((n / of) * 100) : 0);

/**
 * From waitlist to live: one funnel where every stage counts everyone who ever reached it, so each is part of
 * the one before. Each bar shows who went on to the next stage (bright) and who is still at this one (soft);
 * the soft part is the "where people are now" breakdown, with a link to that exact list.
 */
export function Funnel({ d, className }: { d: DashboardSummary; className?: string }) {
  const f = d.funnel, w = d.waitlist, c = d.counts;
  const stages: Stage[] = [
    { label: "Waitlist sign-ups", value: f.signups, next: f.invited, href: "/owners/waitlist/", details: [{ label: "not invited yet", value: w.not_invited, href: "/owners/waitlist/?status=not_invited" }] },
    { label: "Invited", value: f.invited, next: f.opened, href: "/owners/people/", details: [{ label: "haven't opened it", value: w.invited, href: "/owners/waitlist/?status=invited" }] },
    { label: "Opened their invite", value: f.opened, next: f.accounts, href: "/owners/waitlist/?status=opened", details: [{ label: "no account yet", value: w.opened, href: "/owners/waitlist/?status=opened" }] },
    {
      label: "Account created", value: f.accounts, next: f.submitted, href: "/owners/people/?status=draft",
      details: [{ label: "not started", value: c.registered, href: "/owners/people/?status=registered" }, { label: "drafting", value: c.draft, href: "/owners/people/?status=draft" }],
    },
    {
      label: "Profile submitted", value: f.submitted, next: f.approved, href: "/owners/review/",
      details: [{ label: "waiting for review", value: c.submitted, href: "/owners/review/" }, { label: "making edits", value: c.changes_requested, href: "/owners/people/?status=changes_requested" }],
    },
    { label: "Approved", value: f.approved, next: f.approved, href: "/owners/people/?status=approved", details: [{ label: "live on the site", value: c.approved, href: "/owners/people/?status=approved" }] },
  ];
  const [ref, seen] = useSeenOnce<HTMLOListElement>();

  return (
    <section aria-labelledby="funnel-h" data-theme="dark" className={cx("relative isolate overflow-hidden rounded-2xl bg-surface-brand phosphor-dots p-5 sm:p-6", className)}>
      <span aria-hidden="true" className="glow-horizon opacity-25" />
      <div className="relative z-raised">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="grid gap-1">
            <p className="text-eyebrow text-ink-brand uppercase">The call sheet</p>
            <h2 id="funnel-h" className="font-display text-heading-lg text-ink">From waitlist to live</h2>
            <p className="max-w-xl text-body-sm text-ink-muted">Each step counts everyone who ever reached it, so each is part of the one above. Select a step to see those people.</p>
          </div>
          <p aria-hidden="true" className="flex flex-wrap gap-x-4 gap-y-1 text-caption text-ink-muted">
            <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-xs bg-mint-300" />Went on to the next step</span>
            <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-xs bg-mint-500/45" />Still at this step</span>
          </p>
        </div>

        <ol ref={ref} className="mt-5 grid gap-1">
          {stages.map((s, i) => {
            // The first bar is out of every sign-up; the rest are out of everyone invited, so the small numbers stay readable.
            const scale = i === 0 ? f.signups : f.invited;
            const width = Math.max(scale ? (s.value / scale) * 100 : 0, s.value ? 2 : 0);
            const went = s.value ? (s.next / s.value) * 100 : 0;
            return (
              <React.Fragment key={s.label}>
                {i === 1 && <li aria-hidden="true" className="py-1 text-caption text-ink-subtle">Bars below are out of the {f.invited} invited</li>}
                <li className="group relative grid grid-cols-1 gap-x-4 gap-y-1.5 rounded-lg px-2 py-2 transition-colors duration-fast hover:bg-surface-hover md:grid-cols-12 md:items-center">
                  <div className="flex items-baseline justify-between gap-3 md:col-span-3 md:grid md:justify-start md:gap-0">
                    <Link href={s.href} className="inline-flex min-h-6 items-center gap-1 text-label-md text-ink after:absolute after:inset-0 after:rounded-lg hover:text-ink-brand">
                      {s.label}<ArrowRight className="size-3.5 opacity-0 transition-opacity duration-fast group-hover:opacity-100" aria-hidden="true" />
                    </Link>
                    <span className="font-display text-heading-lg text-ink tabular-nums md:hidden">{s.value}</span>
                    {i > 0 && <span className="hidden text-caption text-ink-subtle tabular-nums md:block">{pct(s.value, stages[i - 1].value)}% of the step above</span>}
                  </div>
                  <div className="flex items-center gap-3 md:col-span-6">
                    <div aria-hidden="true" className="h-3 min-w-0 flex-1">
                      <div style={{ width: `${width}%`, transitionDelay: `${i * 90}ms` }}
                        className={cx("flex h-full origin-left gap-0.5 transition-transform duration-slow ease-enter motion-reduce:transition-none", seen ? "scale-x-100" : "scale-x-0")}>
                        {went > 0 && <span style={{ width: `${went}%` }} className="h-full rounded-xs bg-mint-300" />}
                        {went < 100 && <span className="h-full flex-1 rounded-xs bg-mint-500/45" />}
                      </div>
                    </div>
                    <span className="hidden w-12 shrink-0 text-right font-display text-heading-lg text-ink tabular-nums md:block">{s.value}</span>
                  </div>
                  <p className="flex flex-wrap gap-x-3 gap-y-1 text-body-sm text-ink-muted md:col-span-3">
                    {i > 0 && <span className="text-ink-subtle tabular-nums md:hidden">{pct(s.value, stages[i - 1].value)}% of above</span>}
                    {s.details.map((x) => (
                      <Link key={x.label} href={x.href} className="relative z-raised inline-flex min-h-6 items-center whitespace-nowrap underline decoration-line-strong underline-offset-2 hover:text-ink hover:decoration-current">
                        <b className="mr-1 font-semibold text-ink tabular-nums">{x.value}</b>{x.label}
                      </Link>
                    ))}
                  </p>
                </li>
              </React.Fragment>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
