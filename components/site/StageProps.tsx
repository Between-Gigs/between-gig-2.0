/*
 * The still-life props (Coming soon, sign-up, Profile submitted) at the edges of a working page, so the editor and
 * My profile belong to the same family without competing with the forms. Cut from public/art/stage/still-life-desktop.jpg
 * with the paper keyed out and the inner edges faded. Green Room only, behind everything, never clickable; fainter in
 * dark, where the paper's shadows would read as halos.
 */
import { cx } from "@ds/components/cx";
import { asset } from "@/lib/site";

const piece = "pointer-events-none absolute select-none opacity-50 dark:opacity-20";

/** `corners`: only the top-right and bottom-left pieces, for short pages where four would crowd. */
export function StageProps({ corners = false, className }: { corners?: boolean; className?: string }) {
  return (
    <div aria-hidden="true" className={cx("pointer-events-none absolute inset-0 -z-10 hidden overflow-hidden editorial:block", className)}>
      <img src={asset("/art/stage/props-top-right.webp")} alt="" width={780} height={470} className={cx(piece, "-top-6 -right-20 w-56 sm:-top-2 sm:-right-16 sm:w-96 lg:-right-10 lg:w-120")} />
      {!corners && <img src={asset("/art/stage/props-left.webp")} alt="" width={560} height={480} className={cx(piece, "top-1/3 -left-24 hidden w-80 xl:block")} />}
      {!corners && <img src={asset("/art/stage/props-bottom-right.webp")} alt="" width={540} height={490} className={cx(piece, "-right-20 bottom-1/4 hidden w-80 xl:block")} />}
      <img src={asset("/art/stage/props-bottom-left.webp")} alt="" width={600} height={440} className={cx(piece, "-bottom-4 -left-20 w-64 sm:w-80 lg:w-96")} />
    </div>
  );
}
