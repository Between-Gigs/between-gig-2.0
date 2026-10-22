"use client";
import { Badge, cx } from "@ds/components";
import { Clapperboard, MapPin } from "lucide-react";
import * as React from "react";
import type { ProfileFields } from "@/lib/data";
import { basisShort, monthStatusLabel } from "@/lib/data/taxonomy";
import { PersonPhoto } from "@/components/people/PersonPhoto";

export const areaLine = (f: ProfileFields) =>
  f.market === "la" ? (f.areas.length ? `${f.areas.slice(0, 2).join(" · ")}, Los Angeles` : "Los Angeles") : f.otherCity || "Another market";

const availabilityTone = { available: "success", limited: "info", away: "neutral" } as const;

/**
 * Highlights its content briefly whenever `value` changes, so the preview visibly fills in as someone
 * types. A colour change only (no movement); under reduced motion it switches without a fade.
 */
function Live({ value, className, children }: { value: unknown; className?: string; children: React.ReactNode }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const prev = React.useRef(JSON.stringify(value));
  const key = JSON.stringify(value);
  React.useEffect(() => {
    if (prev.current === key) return;
    prev.current = key;
    const el = ref.current;
    if (!el) return;
    el.dataset.flash = "";
    const t = window.setTimeout(() => { delete el.dataset.flash; }, 700);
    return () => window.clearTimeout(t);
  }, [key]);
  return <span ref={ref} className={cx("rounded-md transition-colors duration-slow data-flash:bg-surface-selected motion-reduce:transition-none", className)}>{children}</span>;
}

/**
 * The client's view of a profile card, as it appears in search. Beside the builder it updates as they
 * type; on My profile it shows the finished card. Empty fields show quiet placeholders, not prompts.
 */
export function ProfilePreviewCard({ fields: d, personId, badge = "Live preview", className }: { fields: ProfileFields; personId: string; badge?: string | null; className?: string }) {
  const credits = d.credits.filter((c) => c.trim());
  const shown = d.services.slice(0, 3);
  return (
    <article aria-label={badge ? `${badge} of your profile card` : `${d.name || "Profile"} card`} className={cx("overflow-hidden rounded-2xl border border-line bg-surface shadow-lg", className)}>
      <div className="relative aspect-video overflow-hidden">
        <PersonPhoto id={personId} name={d.name} src={d.photo || undefined} alt={d.photo ? `Profile photo of ${d.name || "you"}` : "No photo yet"}
          fallback="brand" department={d.position} skills={d.skills} iconClass="size-10" textClass="text-heading-lg" className="size-full" />
        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          {badge ? <Badge tone="brand" size="sm" className="shadow-sm">{badge}</Badge> : <span />}
          <Live value={d.monthStatus}><Badge tone={availabilityTone[d.monthStatus]} size="sm" className="shadow-sm">{monthStatusLabel[d.monthStatus]}</Badge></Live>
        </div>
      </div>
      <div className="grid gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-heading-lg break-words text-ink">
              <Live value={d.name}>{d.name || <span className="text-ink-subtle">Your name</span>}</Live>
            </h3>
            <p className="text-label-md text-ink-brand">
              <Live value={[d.position, d.years]}>{d.position || <span className="text-ink-subtle">Your role</span>}{d.years && ` · ${d.years} ${d.years === "1" ? "year" : "years"}`}</Live>
            </p>
          </div>
          <Live value={[d.rate, d.basis]} className="shrink-0 text-right">
            {d.rate
              ? <b className="font-display text-heading-md text-ink tabular-nums">${d.rate}<span className="text-body-sm font-normal text-ink-muted">/{basisShort[d.basis]}</span></b>
              : <span className="text-body-sm text-ink-subtle">Rate on request</span>}
          </Live>
        </div>
        <Live value={d.services} className="flex min-h-5 flex-wrap gap-1.5">
          {shown.length
            ? <>{shown.map((t) => <Badge key={t} tone="brand" size="sm">{t}</Badge>)}{d.services.length > 3 && <Badge tone="neutral" size="sm">+{d.services.length - 3}</Badge>}</>
            : <><span aria-hidden="true" className="h-5 w-24 rounded-full bg-surface-sunken" /><span aria-hidden="true" className="h-5 w-16 rounded-full bg-surface-sunken" /></>}
        </Live>
        <Live value={d.about} className="block">
          {d.about.trim()
            ? <span className="line-clamp-3 text-body-sm text-ink-muted">{d.about}</span>
            : <span aria-hidden="true" className="grid gap-2 py-1"><span className="h-2.5 w-full rounded-full bg-surface-sunken" /><span className="h-2.5 w-11/12 rounded-full bg-surface-sunken" /><span className="h-2.5 w-2/3 rounded-full bg-surface-sunken" /></span>}
        </Live>
        <div className="flex items-center justify-between gap-3 border-t border-line pt-3 text-body-sm">
          <Live value={[d.market, d.areas, d.otherCity]} className="flex min-w-0 items-center gap-1 text-ink-subtle">
            <MapPin className="size-3.5 shrink-0" aria-hidden="true" /><span className="truncate">{areaLine(d)}</span>
          </Live>
          <Live value={credits.length} className="flex shrink-0 items-center gap-1 text-ink-subtle">
            <Clapperboard className="size-3.5" aria-hidden="true" />{credits.length} {credits.length === 1 ? "credit" : "credits"}
          </Live>
        </div>
      </div>
    </article>
  );
}
