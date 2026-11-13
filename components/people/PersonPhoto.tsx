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
 * `fallback="brand"` turns the no-photo state into the standard placeholder portrait: a plain person silhouette and a
 * "No photo yet" tag.
 * Square in every direction G crop: callers hard-crop it into their grid cell.
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
    // The standard placeholder avatar (client, 13 Nov 2026): a plain person silhouette on a quiet surface and a
    // "No photo yet" tag, the same for everyone, instead of the forest spotlight with a craft icon.
    return (
      <span {...a11y} style={style}
        className={cx("@container relative isolate grid place-items-center overflow-hidden bg-surface-sunken select-none", className)}>
        <svg aria-hidden="true" viewBox="0 0 64 64" className="absolute bottom-0 left-1/2 h-4/5 -translate-x-1/2 text-ink-disabled opacity-50" fill="currentColor">
          <circle cx="32" cy="22" r="12" />
          <path d="M8 64c0-14 10.7-24 24-24s24 10 24 24Z" />
        </svg>
        <span aria-hidden="true" className="absolute bottom-2 left-2 inline-flex items-center gap-1.5 rounded-sm bg-surface/90 p-1.5 text-label-sm text-ink @3xs:px-2 @3xs:py-1">
          {createElement(departmentIcon(department, skills), { className: "size-3.5 text-ink-muted", strokeWidth: 1.75 })}
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
