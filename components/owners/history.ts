import type { PersonSummary, ReviewNote } from "@/lib/data";
import { readNotes } from "@/lib/profile/validate";
import { markArea } from "@/lib/split-area";

markArea("bg-split:dashboard");

/**
 * Where a profile is in its review loop: which round this is (Person.reviewRound), what the owners asked for last
 * time (Person.previousNotes, kept by submit() after Suggest edits) and whether the Gigster has newer changes they
 * haven't sent (PersonSummary.unsent). Live leaves these unset, and the UI then shows nothing for them.
 */
export interface ReviewHistory {
  /** 1 for a first review; 2 and up once they've come back after Suggest edits. */
  round: number;
  /** The notes from the last round, photo notes read as photo notes (older ones were "Photo: …" under About you). */
  asked: ReviewNote[];
  /** They're still editing: the draft is newer than what the owners are looking at. */
  unsentDraft: boolean;
}

export function reviewHistory(s: PersonSummary): ReviewHistory {
  const previous = s.person.previousNotes ?? [];
  // Only the latest round's notes, should earlier rounds ever be kept alongside.
  const lastAt = previous.reduce((t, n) => (n.at > t ? n.at : t), "");
  const asked = readNotes(previous.filter((n) => n.at === lastAt));
  const round = s.person.reviewRound ?? (previous.length ? 2 : 1);
  return { round, asked, unsentDraft: !!s.unsent };
}

/** "2nd", "3rd", "11th". */
export const ordinal = (n: number) => {
  const t = n % 100;
  const suffix = t >= 11 && t <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
  return `${n}${suffix}`;
};
