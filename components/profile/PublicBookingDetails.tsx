import type { ProfileFields } from "@/lib/data/types";
import { publicBookingRows } from "@/lib/profile/stage-two";

/** Both expanded layouts use these public values. Account email and booking mobile never enter this component. */
export function PublicBookingDetails({ earliestStart, bookingMinimum, personality }: Pick<ProfileFields, "earliestStart" | "bookingMinimum" | "personality">) {
  const rows = publicBookingRows({ earliestStart, bookingMinimum, personality });
  if (!rows.length) return null;
  return (
    <dl className="mt-5 grid gap-4 border-t border-line pt-4">
      {rows.map(([label, value]) => (
        <div key={label} className="grid gap-1">
          <dt className="text-label-sm text-ink-muted">{label}</dt>
          <dd className="max-w-2xl break-words text-body-md text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
