import type { ProfileFields } from "@/lib/data/types";

export const stageTwoLimits = { bookingMobile: 32, bookingMinimum: 80, hireableJobs: 240, personality: 160 } as const;
export type StageTwoField = keyof typeof stageTwoLimits | "earliestStart";

/** A calendar day has the same public label regardless of the viewer's time zone. */
export function startDateLabel(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const date = new Date(value + "T00:00:00Z");
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/** Includes only the booking answers a client can read. */
export function publicBookingRows(fields: Pick<ProfileFields, "earliestStart" | "bookingMinimum" | "personality">): [string, string][] {
  const rows: [string, string][] = [
    ["Earliest start date", startDateLabel(fields.earliestStart)],
    ["Minimum booking", fields.bookingMinimum?.trim() ?? ""],
    ["A little about me", fields.personality?.trim() ?? ""],
  ];
  return rows.filter(([, value]) => value !== "");
}
