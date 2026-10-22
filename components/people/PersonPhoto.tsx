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
 * `fallback="brand"` turns the no-photo state into a finished-looking tile: the forest surface with
 * phosphor dots, the person's department icon and modest initials, instead of giant letters on a wash.
 */
export function PersonPhoto({ id, name, src, className, morph = false, alt, textClass = "text-display-sm", fallback = "plain", department, skills, iconClass = "size-8" }: {
  id: string; name: string; src?: string; className?: string; morph?: boolean; alt?: string; textClass?: string;
  fallback?: "plain" | "brand"; department?: string; skills?: string[]; iconClass?: string;
}) {
  const style = morph ? portraitName(id) : undefined;
  if (src) {
    return <img src={asset(src)} alt={alt ?? `Portrait of ${name || "this Gigster"}`} decoding="async" style={style} className={cx("block object-cover", className)} />;
  }
  const a11y = alt === "" ? { "aria-hidden": true as const } : { role: "img", "aria-label": alt ?? `${name || "Gigster"} (no photo yet)` };
  if (fallback === "brand") {
    return (
      <span {...a11y} data-theme="dark" style={style}
        className={cx("relative isolate grid place-items-center overflow-hidden bg-surface-brand phosphor-dots select-none", className)}>
        <span aria-hidden="true" className="grid justify-items-center gap-2">
          {createElement(departmentIcon(department, skills), { className: cx("text-ink-brand", iconClass), strokeWidth: 1.5 })}
          <span className={cx("font-display tracking-wide text-ink", textClass)}>{initials(name || "?")}</span>
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
