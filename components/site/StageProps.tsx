/*
 * The still-life props (Coming soon, sign-up, Profile submitted) at the edges of a working page, so the editor and
 * My profile belong to the same family without competing with the forms. Cut from public/art/stage/still-life-desktop.jpg
 * with the paper keyed out and the inner edges faded. Green Room only, behind everything, never clickable; fainter in
 * dark, where the paper's shadows would read as halos.
 */
import { cx } from "@ds/components/cx";
import { ThemedImg } from "@/components/ui/ThemedImg";

// Night grades in the dark theme (art/stage/*-night.webp), so they sit in the dark instead of glowing as faded paper.
const piece = "pointer-events-none absolute select-none opacity-50 dark:opacity-70";

/** Only the top-right and bottom-left corner pieces: pieces at the side, mid-page, sat beside the fields and were taken
 * out (13 Nov 2026). `corners` is kept so existing callers still compile; both settings now draw the same two. */
export function StageProps({ className, top = true }: { corners?: boolean; top?: boolean; className?: string }) {
  return (
    <div aria-hidden="true" className={cx("pointer-events-none absolute inset-0 -z-10 hidden overflow-hidden editorial:block", className)}>
      {top && <ThemedImg src="/art/stage/props-top-right.webp" width={780} height={470} className={cx(piece, "-top-6 -right-20 w-56 sm:-top-2 sm:-right-16 sm:w-96 lg:-right-10 lg:w-120")} />}
      <ThemedImg src="/art/stage/props-bottom-left.webp" width={600} height={440} className={cx(piece, "-bottom-4 -left-20 w-64 sm:w-80 lg:w-96")} />
    </div>
  );
}
