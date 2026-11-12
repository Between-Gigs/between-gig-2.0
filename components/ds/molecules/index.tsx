/*
 * Molecules (Figma: DS · Components → Molecules). Small groups of atoms with one job: a labelled field, an alert,
 * profile completeness, a builder step, an "add" tile, a service row, a rate block, a section heading.
 */
import { cx } from "@ds/components/cx";
import { AlertCircle, Camera, Check, Clock, Info, Lock } from "lucide-react";
import type * as React from "react";
import { Eyebrow, Heading, Price, Status, Text } from "../atoms";

export { Field } from "@ds/components/Field";

/** Inline message. Info (sunken), Success, Warning, Danger. */
export function Alert({ tone = "info", title, children, className }: { tone?: "info" | "success" | "warning" | "danger"; title: React.ReactNode; children?: React.ReactNode; className?: string }) {
  const t = { info: ["bg-surface-sunken", Info, "text-ink"], success: ["bg-success-soft", Check, "text-success"], warning: ["bg-warning-soft", Clock, "text-warning"], danger: ["bg-danger-soft", AlertCircle, "text-danger"] } as const;
  const [bg, Icon, fg] = t[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cx("flex gap-3 rounded-md px-4 py-3", bg, className)}>
      <Icon aria-hidden="true" className={cx("mt-0.5 size-5 shrink-0", fg)} />
      <div className="grid gap-0.5"><p className="text-label-md font-semibold text-ink">{title}</p>{children && <div className="text-body-sm text-ink-muted">{children}</div>}</div>
    </div>
  );
}

/** "Profile completeness 40%" with a thin bar. */
export function Completeness({ value, label = "Profile completeness", className }: { value: number; label?: string; className?: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={cx("flex items-center gap-3", className)}>
      <span className="text-label-md font-semibold text-ink">{label}</span>
      <span className="text-label-md text-ink-muted tabular-nums">{v}%</span>
      <span role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={label} className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-line">
        <span className="absolute inset-y-0 left-0 rounded-full bg-action transition-[width] duration-slow" style={{ width: `${v}%` }} />
      </span>
    </div>
  );
}

/** One row of the builder's step list. */
export function StepNavItem({ state = "default", children, onClick, className }: { state?: "default" | "current" | "done" | "locked"; children: React.ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button type="button" onClick={onClick} aria-current={state === "current" ? "step" : undefined}
      className={cx("flex min-h-11 w-full items-center gap-2 rounded-md px-3 text-left text-label-md font-semibold transition-colors duration-fast",
        state === "current" ? "bg-action text-on-action" : "text-ink hover:bg-surface-hover", className)}>
      {state === "done" && <Check aria-hidden="true" className="size-4 shrink-0 text-success" />}
      {state === "locked" && <Lock aria-hidden="true" className="size-4 shrink-0 text-ink-muted" />}
      <span className="min-w-0 flex-1">{children}</span>
    </button>
  );
}

/** Dashed placeholder for something not added yet (photo, work sample, service). */
export function AddTile({ label, hint, quiet = false, onClick, className, children }: { label?: string; hint?: string; quiet?: boolean; onClick?: () => void; className?: string; children?: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={cx("grid min-h-40 w-full place-content-center justify-items-center gap-2 rounded-lg border-2 border-dashed border-line-dashed bg-surface p-4 text-center transition-colors duration-fast hover:border-line-strong", className)}>
      <Camera aria-hidden="true" className={cx("size-6", quiet ? "text-ink-subtle" : "text-ink")} />
      {!quiet && label && <span className="text-label-md font-semibold text-ink">{label}</span>}
      {!quiet && hint && <span className="text-caption text-ink-subtle">{hint}</span>}
      {children}
    </button>
  );
}

/** A service: its name, then what a customer can hire them to do (in customer words). Stack with border-b. */
export function ServiceRow({ name, description, className }: { name: React.ReactNode; description: React.ReactNode; className?: string }) {
  return (
    <div className={cx("grid gap-2 border-b border-line py-4 sm:flex sm:gap-6", className)}>
      <p className="text-label-md font-semibold text-ink sm:w-56 sm:shrink-0">{name}</p>
      <Text muted className="min-w-0 flex-1 sm:border-l sm:border-line sm:pl-6">{description}</Text>
    </div>
  );
}

/** Price, minimum, availability and earliest start: the right column of a profile. */
export function RateBlock({ price, minimum, available = true, availability, earliest, className }: { price: React.ReactNode; minimum?: React.ReactNode; available?: boolean; availability?: React.ReactNode; earliest?: React.ReactNode; className?: string }) {
  return (
    <div className={cx("grid content-start gap-2", className)}>
      <Price>{price}</Price>
      {minimum && <Text muted>{minimum}</Text>}
      {available && <Status tone="brand">Available for work</Status>}
      {availability && <Text>{availability}</Text>}
      {earliest && <Text muted>{earliest}</Text>}
    </div>
  );
}

/** Serif section heading with optional eyebrow (and its accent rule) and a supporting line. */
export function SectionHeading({ eyebrow, title, subtitle, level = "h1", as = "h2", className }: { eyebrow?: React.ReactNode; title: React.ReactNode; subtitle?: React.ReactNode; level?: "display-l" | "h1" | "h2" | "h3"; as?: "h1" | "h2" | "h3"; className?: string }) {
  return (
    <div className={cx("grid gap-3", className)}>
      {eyebrow && <Eyebrow rule>{eyebrow}</Eyebrow>}
      <Heading level={level} as={as}>{title}</Heading>
      {subtitle && <Text size="lg" muted>{subtitle}</Text>}
    </div>
  );
}
