import { cx } from "@ds/components";
import { initials } from "@ds/components/Avatar";
import { asset } from "@/lib/site";
import { portraitName } from "@/lib/motion";

/**
 * A person's portrait at any size: their photo, or their initials on a brand wash when there isn't one
 * (the design system's Avatar stops at 48px). `morph` gives it the shared view-transition name, so it
 * flies between the search card and the profile.
 */
export function PersonPhoto({ id, name, src, className, morph = false, alt, textClass = "text-display-sm" }: {
  id: string; name: string; src?: string; className?: string; morph?: boolean; alt?: string; textClass?: string;
}) {
  const style = morph ? portraitName(id) : undefined;
  if (src) {
    return <img src={asset(src)} alt={alt ?? `Portrait of ${name || "this Gigster"}`} decoding="async" style={style} className={cx("block object-cover", className)} />;
  }
  return (
    <span role="img" aria-label={alt ?? `${name || "Gigster"} (no photo yet)`} style={style}
      className={cx("grid place-items-center bg-surface-selected font-display text-ink-brand select-none", textClass, className)}>
      <span aria-hidden="true">{initials(name || "?")}</span>
    </span>
  );
}
