"use client";
import { ConfirmDialog } from "@ds/components";
import * as React from "react";
import type { PersonStatus, ProfileFields } from "@/lib/data";

/** Availability is the one thing a live profile can change without going back to review (Company OS decision N-09). */
const LIVE_FIELDS: (keyof ProfileFields)[] = ["month", "monthStatus", "dates"];

/**
 * Asks once before the first change to an approved profile: any change other than availability takes it off the
 * site until the Between Gigs team approves it again. `guard(field, apply)` runs `apply` now, or after the person agrees.
 */
export function useLiveEditWarning(status: PersonStatus | undefined) {
  const [agreed, setAgreed] = React.useState(false);
  // Changes made before the answer, in order (one edit can set two fields, like credits and their pins).
  const [pending, setPending] = React.useState<(() => void)[]>([]);
  const guard = (field: keyof ProfileFields, apply: () => void) => {
    if (status !== "approved" || agreed || LIVE_FIELDS.includes(field)) apply();
    else setPending((p) => [...p, apply]);
  };
  const dialog = (
    <ConfirmDialog open={pending.length > 0} tone="default" title="Edit your live profile?"
      description="Your profile comes off the site while the Between Gigs team reviews your changes, and goes back up once they approve them. Updating your availability doesn't need a review."
      confirmLabel="Edit my profile" cancelLabel="Keep it live"
      onCancel={() => setPending([])}
      onConfirm={() => { setAgreed(true); pending.forEach((apply) => apply()); setPending([]); }} />
  );
  return { guard, dialog };
}
