import { cx } from "@ds/components";
import { createElement } from "react";
import { initials } from "@ds/components/Avatar";
import { asset } from "@/lib/site";
import { portraitName } from "@/lib/motion";
import { departmentIcon } from "@/lib/profile/department";
import { craftIcon } from "@/lib/icons3d";
import { Icon3D } from "@/components/ui/Icon3D";

/**
 * A person's portrait at any size: their photo, or their initials when there isn't one (the design
 * system's Avatar stops at 48px). `morph` gives it the shared view-transition name, so it flies between
 * the search card and the profile.
 *
 * `fallback="brand"` turns the no-photo state into a placeholder portrait: their craft as a 3D icon in a spotlight on
 * the dotted forest stage, initials faint behind it, and a square "No photo yet" tag, instead of a plain silhouette.
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
    // A placeholder portrait, "in the spotlight": the forest stage with its dots, a soft mint spotlight from above,
    // the person's craft as a big 3D icon standing on a stage shadow, and their initials faint behind it. It reads as
    // "this person, in this trade" until a photo arrives, and the badge says plainly that there isn't one yet.
    const craft = craftIcon(department || skills?.[0] || "", skills?.[0]);
    return (
      <span {...a11y} data-theme="dark" style={style}
        className={cx("@container relative isolate block overflow-hidden bg-surface-brand phosphor-dots select-none", className)}>
        <span aria-hidden="true" className="absolute -top-1/4 left-1/2 aspect-square w-4/5 -translate-x-1/2 rounded-full bg-mint-500/25 blur-3xl" />
        <span aria-hidden="true" className="absolute inset-0 grid place-items-center font-display text-display-xl tracking-tight text-ink-brand/15 @3xs:text-stat">{initials(name || "?")}</span>
        <span aria-hidden="true" className="absolute bottom-1/6 left-1/2 h-1/12 w-1/2 -translate-x-1/2 rounded-full bg-surface-sunken/70 blur-md" />
        <Icon3D name={craft} className="absolute bottom-1/5 left-1/2 aspect-square size-auto w-2/5 -translate-x-1/2 drop-shadow-xl" />
        <span aria-hidden="true" className="absolute bottom-2 left-2 inline-flex items-center gap-1.5 bg-surface/80 p-1.5 text-label-sm text-ink backdrop-blur-sm @3xs:px-2 @3xs:py-1">
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
