"use client";
import { ConfirmDialog } from "@ds/components";
import * as React from "react";
import { data, type PersonStatus, type ProfileFields } from "@/lib/data";
import { LIVE_FIELDS } from "@/lib/profile/validate";
import { markArea } from "@/lib/split-area";

markArea("bg-split:dashboard");

/**
 * Asks once before the first change to an approved profile, where that change would take it off the site.
 *
 * Live (one record, decision N-09): any change other than availability goes back to review at once, so it asks first.
 * The sample keeps a draft beside the live page: changes wait, unsent, until "Send again", and the page stays up, so
 * there is nothing to warn about and it never asks (`needed` false). `guard(field, apply)` runs `apply` now, or after
 * the person agrees; "Keep it live" drops the change and leaves the editor as it was, focus back on the field.
 */
export function useLiveEditWarning(status: PersonStatus | undefined, needed = data.kind === "live") {
  const [agreed, setAgreed] = React.useState(false);
  // Changes made before the answer, in order (one edit can set two fields, like credits and their pins).
  const [pending, setPending] = React.useState<(() => void)[]>([]);
  const origin = React.useRef<HTMLElement | null>(null);
  const guard = (field: keyof ProfileFields, apply: () => void) => {
    if (!needed || status !== "approved" || agreed || (LIVE_FIELDS as readonly string[]).includes(field)) { apply(); return; }
    if (!pending.length) origin.current = document.activeElement as HTMLElement | null;
    setPending((p) => [...p, apply]);
  };
  const back = () => { const el = origin.current; requestAnimationFrame(() => el?.isConnected && el.focus({ preventScroll: true })); };
  const dialog = (
    <ConfirmDialog open={pending.length > 0} tone="default" title="Edit your live profile?"
      description="Your profile comes off the site while the Between Gigs team reviews your changes, and goes back up once they approve them. Updating your availability doesn't need a review."
      confirmLabel="Edit my profile" cancelLabel="Keep it live"
      onCancel={() => { setPending([]); back(); }}
      onConfirm={() => { setAgreed(true); pending.forEach((apply) => apply()); setPending([]); back(); }} />
  );
  return { guard, dialog };
}
