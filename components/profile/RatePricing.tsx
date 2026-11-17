import { pricingLines, profileDetailsEnabled } from "@/lib/profile/details";
import type { ProfileFields } from "@/lib/data/types";

/** Both pricing options on a public profile ("$X/hour · minimum N hours", "Projects from $Y"). Nothing unless the flag is on and both are chosen. */
export function RatePricing({ f, className = "" }: { f: ProfileFields; className?: string }) {
  const lines = profileDetailsEnabled() ? pricingLines(f) : null;
  if (!lines) return null;
  return <span className={`grid gap-0.5 ${className}`.trim()}>{lines.map((l) => <span key={l} className="font-display text-heading-md text-ink">{l}</span>)}</span>;
}
