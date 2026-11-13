"use client";
/*
 * Small pieces the Gigster editor's sections share: the section frame (serif heading over a rule, with Required or
 * Optional said plainly), pill toggles for quick picks, and the setter type every section takes.
 */
import { cx } from "@ds/components/cx";
import { Check } from "lucide-react";
import type * as React from "react";
import type { ProfileFields } from "@/lib/data";
import type { FieldErrors } from "@/lib/profile/validate";
import { Heading, Text } from "@/components/ds/atoms";
import { markArea } from "@/lib/split-area";

markArea("bg-split:dashboard");

export type Setter = <K extends keyof ProfileFields>(k: K) => (v: ProfileFields[K]) => void;

/** What every section gets: the answers, the setter, and the errors from the last Submit. */
export interface SectionProps {
  d: ProfileFields;
  set: Setter;
  errors: FieldErrors;
}

/** "Required" or "Optional · add it later", beside a heading. */
export function Need({ required }: { required: boolean }) {
  return required
    ? <span className="inline-flex w-fit items-center rounded-full bg-accent-gold-soft px-2.5 py-0.5 text-label-sm font-semibold text-ink ring-1 ring-accent-gold">Required</span>
    : <span className="inline-flex w-fit items-center rounded-full bg-surface-sunken px-2.5 py-0.5 text-label-sm font-semibold text-ink-muted">Optional · add it later</span>;
}

/** One part of the editor: an id to link to, a serif heading over a rule, an optional lead line, then its fields. */
export function EditorSection({ id, title, need, lead, size = "h2", children, className }: {
  id: string; title: React.ReactNode; need?: boolean; lead?: React.ReactNode; size?: "h1" | "h2" | "h3"; children: React.ReactNode; className?: string;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className={cx("grid min-w-0 scroll-mt-40 content-start gap-5", className)}>
      <div className="grid gap-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Heading id={`${id}-h`} level={size} as="h2" className="break-words">{title}</Heading>
          {need !== undefined && <Need required={need} />}
        </div>
        {lead && <Text muted className="max-w-2xl text-pretty">{lead}</Text>}
      </div>
      {children}
    </section>
  );
}

/** A row of pill buttons: one tap fills a field (single) or toggles a value (multi). */
export function Pills({ label, options, isOn, onToggle, className }: {
  label: string; options: readonly string[]; isOn: (o: string) => boolean; onToggle: (o: string) => void; className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cx("flex flex-wrap gap-2", className)}>
      {options.map((o) => {
        const on = isOn(o);
        return (
          <button key={o} type="button" aria-pressed={on} onClick={() => onToggle(o)}
            className={cx("inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-label-md font-semibold transition-colors duration-fast",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
              on ? "border-action bg-action text-on-action" : "border-line-strong text-ink hover:bg-surface-hover")}>
            {on && <Check aria-hidden="true" className="size-4" strokeWidth={2.5} />}{o}
          </button>
        );
      })}
    </div>
  );
}

/** An error line under a group that isn't a single Field (services, skills, credits). */
export function GroupError({ id, children }: { id: string; children?: React.ReactNode }) {
  return children ? <p id={id} className="text-body-sm text-danger">{children}</p> : null;
}
