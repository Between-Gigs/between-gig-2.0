/*
 * Atoms (Figma: DS · Components → Atoms). The smallest pieces: type, links, status, dividers and the controls the
 * design-system package already provides. Everything reads the Cream & forest tokens (styles/look-editorial.css), so
 * atoms never carry raw colours or sizes. Figma text style → class: Display/XL text-display-xl, Display/L
 * text-display-lg, H1 text-display-md, H2 text-display-sm, H3 text-heading-lg, H4 text-heading-md, Body/L-M-S
 * text-body-lg/md/sm, Body/XS text-caption, Label text-label-md/sm, Eyebrow text-eyebrow, Price text-stat.
 */
import { cx } from "@ds/components/cx";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type * as React from "react";

export { Button } from "@ds/components/Button";
export { Logo } from "@ds/components/Logo";
export { Avatar } from "@ds/components/Avatar";
export { Checkbox } from "@ds/components/Checkbox";
export { RadioGroup } from "@ds/components/Radio";
export { Switch } from "@ds/components/Switch";
export { Input } from "@ds/components/Input";
export { Textarea } from "@ds/components/Textarea";
export { Select } from "@ds/components/Select";

type HeadingLevel = "display-xl" | "display-l" | "h1" | "h2" | "h3" | "h4";
const headingClass: Record<HeadingLevel, string> = {
  "display-xl": "text-display-xl", "display-l": "text-display-lg", h1: "text-display-md", h2: "text-display-sm", h3: "text-heading-lg", h4: "text-heading-md",
};
/** Serif heading (Newsreader). `level` is the visual style; `as` the HTML element. */
export function Heading({ level = "h2", as: Tag = "h2", className, children, ...rest }: { level?: HeadingLevel; as?: "h1" | "h2" | "h3" | "h4" | "p" | "span" } & React.HTMLAttributes<HTMLHeadingElement>) {
  return <Tag className={cx("font-display text-balance text-ink", headingClass[level], className)} {...rest}>{children}</Tag>;
}

/** Small uppercase label above a heading, with the short green accent rule from the references. */
export function Eyebrow({ children, rule = false, className }: { children: React.ReactNode; rule?: boolean; className?: string }) {
  return (
    <div className={cx("grid justify-items-start gap-3", className)}>
      <p className="text-eyebrow tracking-widest text-ink-muted uppercase">{children}</p>
      {rule && <span aria-hidden="true" className="h-0.5 w-10 rounded-full bg-border-focus" />}
    </div>
  );
}

/** Body text: L 18, M 16 (default), S 14, XS 12. Muted is the secondary ink. */
export function Text({ size = "md", muted = false, as: Tag = "p", className, children }: { size?: "lg" | "md" | "sm" | "xs"; muted?: boolean; as?: "p" | "span" | "div"; className?: string; children: React.ReactNode }) {
  const s = { lg: "text-body-lg", md: "text-body-md", sm: "text-body-sm", xs: "text-caption" }[size];
  return <Tag className={cx(s, muted ? "text-ink-muted" : "text-ink", className)}>{children}</Tag>;
}

/** Price in the serif: "$45 / hr". */
export function Price({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cx("font-display text-stat text-ink", className)}>{children}</p>;
}

/** Italic serif quote (the personality answer). */
export function Quote({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cx("font-display text-heading-lg text-ink italic", className)}>{children}</p>;
}

/** Underlined text link. kind: inline · arrow (next step) · external (opens a page). */
export function TextLink({ href, kind = "inline", children, className, ...rest }: { href: string; kind?: "inline" | "arrow" | "external"; children: React.ReactNode; className?: string } & Omit<React.ComponentProps<typeof Link>, "href">) {
  return (
    <Link href={href} className={cx("inline-flex min-h-11 items-center gap-1.5 text-label-md font-semibold text-ink underline decoration-1 underline-offset-4 hover:decoration-2", className)} {...rest}>
      {children}
      {kind === "arrow" && <ArrowRight aria-hidden="true" className="size-4" />}
      {kind === "external" && <ArrowUpRight aria-hidden="true" className="size-4" />}
    </Link>
  );
}

export type StatusTone = "neutral" | "success" | "warning" | "danger" | "brand" | "gold";
const tone: Record<StatusTone, string> = {
  neutral: "bg-surface-sunken text-ink-muted", success: "bg-success-soft text-success", warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger", brand: "bg-action text-on-action", gold: "bg-accent-gold-soft text-ink ring-1 ring-accent-gold",
};
/** Status pill: Draft, Live, In review, Changes asked, Available for work, Coming soon. */
export function Status({ tone: t = "neutral", dot = true, children, className }: { tone?: StatusTone; dot?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <span className={cx("inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-label-sm font-semibold", tone[t], className)}>
      {dot && <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />}{children}
    </span>
  );
}

/** 1px rule between sections; vertical inside rows. */
export function Divider({ vertical = false, className }: { vertical?: boolean; className?: string }) {
  return <span role="separator" aria-orientation={vertical ? "vertical" : "horizontal"} className={cx("block shrink-0 bg-line", vertical ? "w-px self-stretch" : "h-px w-full", className)} />;
}
