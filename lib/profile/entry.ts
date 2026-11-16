import type { Person, PersonSummary } from "@/lib/data/types";
import { blankFields } from "@/lib/data/fields";
import { contentChanged } from "./validate";

type EntrySummary = Pick<PersonSummary, "fields" | "completeness"> & { person: Pick<Person, "status"> };

/** Resolve the signed-in person's own entry; submitted/reviewed snapshots always keep their status view. */
export function needsProfileEditor(summary: EntrySummary, hasSubmittedProfile: boolean): boolean {
  if (hasSubmittedProfile || ["submitted", "changes_requested", "approved", "published"].includes(summary.person.status)) return false;
  if (summary.person.status === "invited" || summary.person.status === "registered" || !summary.fields) return true;
  // A saved optional answer is still a real draft even when required-part completeness is zero.
  const fields = { ...summary.fields, credits: summary.fields.credits.filter(credit => credit.trim()) };
  return !contentChanged(fields, { ...blankFields(fields.name), credits: [] });
}
