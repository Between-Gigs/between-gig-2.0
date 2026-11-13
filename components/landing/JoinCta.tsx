/*
 * The one call to action of the public pages (feedback 13 Nov): no two-step call-sheet form. Every button goes
 * straight to /join/ and says where it goes. On For professionals the practical reasons sit right beside it (Peter).
 */
import { cx } from "@ds/components/cx";
import { ArrowRight, Check } from "lucide-react";
import { ButtonLink } from "@/components/ui/ButtonLink";

export const JOIN_HREF = "/join/";
export const JOIN_LABEL = "Create your Gigster profile";
export const REASONS = ["You set your rates.", "Choose your projects.", "Decide when you're available."] as const;

/** The join button: primary, large, "Create your Gigster profile →". */
export function JoinButton({ label = JOIN_LABEL, className }: { label?: string; className?: string }) {
  return (
    <ButtonLink href={JOIN_HREF} variant="primary" size="lg" iconEnd={<ArrowRight aria-hidden="true" />} className={cx("h-14! px-7! text-heading-sm! [&_svg]:size-5!", className)}>
      {label}
    </ButtonLink>
  );
}

/**
 * The button with the three practical reasons beside it (stacked under it on phones), and a small "free to join"
 * line. `align` centres the group on centred sections.
 */
export function JoinCta({ align = "center", note = "Free to join · Los Angeles", className }: { align?: "center" | "start"; note?: string; className?: string }) {
  return (
    <div className={cx("grid gap-4 sm:flex sm:flex-wrap sm:items-center sm:gap-x-8", align === "center" ? "justify-items-start sm:justify-items-center sm:justify-center" : "justify-items-start", className)}>
      <div className={cx("grid gap-2", align === "center" ? "justify-items-start sm:justify-items-center" : "justify-items-start")}>
        <JoinButton />
        {note && <p className="text-label-sm text-ink-muted">{note}</p>}
      </div>
      <ul aria-label="Why it works between gigs" className="grid gap-1.5 text-left">
        {REASONS.map((r) => (
          <li key={r} className="flex items-center gap-2 text-label-md font-semibold text-ink">
            <span aria-hidden="true" className="grid size-5 shrink-0 place-items-center rounded-full bg-accent-gold-soft ring-1 ring-accent-gold"><Check className="size-3" /></span>
            {r}
          </li>
        ))}
      </ul>
    </div>
  );
}
