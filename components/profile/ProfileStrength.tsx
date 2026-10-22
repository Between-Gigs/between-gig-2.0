import { cx } from "@ds/components";
import * as React from "react";
import { Lightbulb } from "lucide-react";
import type { ProfileFields } from "@/lib/data";
import { ABOUT_MIN, IMDB_RE, completeness } from "@/lib/profile/validate";

/** The next most useful thing to add, in order. Neutral wording: no promises, no invented numbers. */
function nextTip(d: ProfileFields): string | null {
  if (!d.photo) return "Add a photo: clients see it first, and it helps them put a face to your name.";
  if (!d.position.trim()) return "Add your department so clients know where your experience comes from.";
  if (!d.credits.some((c) => c.trim())) return "Add a notable credit or two. They show up as a strip on your profile.";
  if (!IMDB_RE.test(d.imdb.trim())) return "Add your IMDb name link so the team can look at your credits.";
  if (!d.services.length && !d.other.trim()) return "Pick the services you'd offer between gigs.";
  if (d.market === "la" ? !d.areas.length : !d.otherCity.trim()) return "Choose where you work so the right clients find you.";
  if (!d.dates.trim()) return "Add the dates or times you're free this month.";
  if (d.about.trim().length < ABOUT_MIN) return "Write your story: a few lines on the help you offer and how you work.";
  if (!d.rate) return "Optional: a starting rate gives clients a place to begin.";
  if (!d.languages.trim()) return "Optional: add the languages you work in.";
  return null;
}

const word = (p: number) => (p >= 1 ? "Ready to submit" : p >= 0.75 ? "Almost there" : p >= 0.4 ? "Taking shape" : "Getting started");

/** Profile strength: how much of the questionnaire is answered, plus one suggestion for what to add next. */
export function ProfileStrength({ fields, className }: { fields: ProfileFields; className?: string }) {
  const p = completeness(fields);
  const pct = Math.round(p * 100);
  const tip = nextTip(fields);
  const id = React.useId();
  return (
    <section aria-labelledby={id} className={cx("rounded-2xl border border-line bg-surface p-5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={id} className="text-label-md text-ink">Profile strength</h2>
        <span className="text-label-md text-ink-brand">{word(p)}</span>
      </div>
      <div role="meter" aria-labelledby={id} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-valuetext={`${pct}%, ${word(p)}`}
        className="mt-3 grid grid-cols-12 gap-1">
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i} className={cx("h-1.5 rounded-full transition-colors duration-slow motion-reduce:transition-none", i < Math.round(p * 12) ? "bg-ink-brand" : "bg-surface-sunken")} />
        ))}
      </div>
      {tip && (
        <p className="mt-3 flex gap-2 text-body-sm text-ink-muted">
          <Lightbulb className="mt-0.5 size-4 shrink-0 text-ink-brand" aria-hidden="true" />{tip}
        </p>
      )}
    </section>
  );
}
