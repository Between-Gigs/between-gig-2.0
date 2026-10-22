import { cx } from "@ds/components";
import { createElement } from "react";
import { initials } from "@ds/components/Avatar";
import { asset } from "@/lib/site";
import { portraitName } from "@/lib/motion";
import { departmentIcon } from "@/lib/profile/department";

/**
 * A person's portrait at any size: their photo, or their initials when there isn't one (the design
 * system's Avatar stops at 48px). `morph` gives it the shared view-transition name, so it flies between
 * the search card and the profile.
 *
 * `fallback="brand"` turns the no-photo state into a placeholder portrait: a silhouette on the forest
 * surface with a "No photo yet" badge carrying their department icon, instead of giant initials.
 */
export function PersonPhoto({ id, name, src, className, morph = false, alt, textClass = "text-display-sm", fallback = "plain", department, skills }: {
  id: string; name: string; src?: string; className?: string; morph?: boolean; alt?: string; textClass?: string;
  fallback?: "plain" | "brand"; department?: string; skills?: string[]; /** Kept for callers; the placeholder badge has a fixed icon size. */ iconClass?: string;
}) {
  const style = morph ? portraitName(id) : undefined;
  if (src) {
    return <img src={asset(src)} alt={alt ?? `Portrait of ${name || "this Gigster"}`} decoding="async" style={style} className={cx("block object-cover", className)} />;
  }
  const a11y = alt === "" ? { "aria-hidden": true as const } : { role: "img", "aria-label": alt ?? `${name || "Gigster"} (no photo yet)` };
  if (fallback === "brand") {
    // A placeholder portrait: a head-and-shoulders silhouette lit from above on the forest surface, with the
    // person's department as a small badge, so a missing photo still reads as "a person goes here".
    return (
      <span {...a11y} data-theme="dark" style={style}
        className={cx("@container relative isolate block overflow-hidden bg-surface-brand phosphor-dots select-none", className)}>
        <svg aria-hidden="true" viewBox="0 0 200 200" preserveAspectRatio="xMidYMax meet" className="absolute inset-x-0 bottom-0 mx-auto h-5/6 max-h-full w-auto text-ink-brand">
          <defs>
            <linearGradient id={`pp-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="currentColor" stopOpacity=".42" />
              <stop offset="1" stopColor="currentColor" stopOpacity=".08" />
            </linearGradient>
          </defs>
          <circle cx="100" cy="74" r="38" fill={`url(#pp-${id})`} />
          <path d="M22 200c4-46 38-74 78-74s74 28 78 74z" fill={`url(#pp-${id})`} />
        </svg>
        <span aria-hidden="true" className="absolute bottom-2 left-2 inline-flex items-center gap-1.5 rounded-full bg-surface/80 p-1.5 text-label-sm text-ink backdrop-blur-sm @3xs:px-2 @3xs:py-1">
          {createElement(departmentIcon(department, skills), { className: "size-3.5 text-ink-brand", strokeWidth: 1.75 })}
          <span className="hidden @3xs:inline">No photo yet</span>
        </span>
      </span>
    );
  }
  return (
    <span {...a11y} style={style}
      className={cx("grid place-items-center bg-surface-selected font-display text-ink-brand select-none", textClass, className)}>
      <span aria-hidden="true">{initials(name || "?")}</span>
    </span>
  );
}
