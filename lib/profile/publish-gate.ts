import type { PersonStatus } from "@/lib/data/types";

/*
 * The publish gate (API 1.17.0, module option publish_after_approval). With it on, the team's approval makes a profile
 * "approved": private, no email. Only "published" is public, and publishing is a later, owner-only action (no button yet).
 * Off (the default), "approved" is public exactly as before and "published" never appears.
 * NEXT_PUBLIC_PROFILE_PUBLISH_GATE is read at call time so tests (and the sample build) can flip it.
 */
export const publishGateOn = () => process.env.NEXT_PUBLIC_PROFILE_PUBLISH_GATE === "1";

export const APPROVED_NOT_PUBLIC = "Approved, not yet public";
export const APPROVED_NOT_PUBLIC_LINE = "The Between Gigs team approved your profile. It goes public when the team publishes it.";
export const APPROVED_EDIT_HINT = "Changes you make here go back to the team for review.";

/** The team has approved it (private or public). */
export const isReviewedStatus = (s: PersonStatus | string | null | undefined) => s === "approved" || s === "published";
/** Visitors can see it. Gate on: published only. Gate off: approved. */
export const isPublicStatus = (s: PersonStatus | string | null | undefined, gate = publishGateOn()) => (gate ? s === "published" : s === "approved" || s === "published");
/** Approved and waiting to be published. Never true with the gate off. */
export const isApprovedPrivate = (s: PersonStatus | string | null | undefined, gate = publishGateOn()) => gate && s === "approved";

/** The word a Gigster sees for the status. */
export function gigstersLabel(s: PersonStatus, gate = publishGateOn()): string {
  if (isApprovedPrivate(s, gate)) return APPROVED_NOT_PUBLIC;
  if (s === "published") return "Live";
  return ({ invited: "Invited", registered: "Not started", draft: "Draft", submitted: "Submitted for review", changes_requested: "Changes requested", approved: "Approved" } as Record<string, string>)[s] ?? "Draft";
}

/** The word an owner sees for the status. */
export function ownerLabel(s: PersonStatus, gate = publishGateOn()): string {
  if (isApprovedPrivate(s, gate)) return "Approved, not public";
  if (s === "published") return "Live";
  return ({ invited: "Invited", registered: "Registered", draft: "Draft", submitted: "Submitted", changes_requested: "Changes requested", approved: "Approved" } as Record<string, string>)[s] ?? "Draft";
}
