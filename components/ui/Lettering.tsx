import { cx } from "@ds/components";
import { asset } from "@/lib/site";
import { lettering, type LetteringName } from "@/lib/lettering";

/** One approved hand-lettered phrase (lib/lettering.ts). Size it with a width class; it inverts in dark mode. */
export function Lettering({ name, className, decorative = false }: { name: LetteringName; className?: string; decorative?: boolean }) {
  const l = lettering[name];
  return (
    <img src={asset(l.src)} width={l.width} height={l.height} alt={decorative ? "" : l.text} decoding="async"
      className={cx("lettering block h-auto", className)} />
  );
}
