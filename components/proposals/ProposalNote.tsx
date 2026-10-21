import { cx } from "@ds/components";
import { Lightbulb } from "lucide-react";
import * as React from "react";

export const NotesContext = React.createContext(true);

/**
 * A design note beside a proposed section: why it's there and what it replaces. Dashed border (BRAND.md:
 * "empty slots and drop zones use line-dashed and always carry a label") so it never reads as product UI.
 * Hidden with the page's "Design notes" switch.
 */
export function ProposalNote({ n, title, children, className }: { n: number; title: string; children: React.ReactNode; className?: string }) {
  const on = React.useContext(NotesContext);
  if (!on) return null;
  return (
    <div role="note" aria-label={`Design note ${n}: ${title}`} className={cx("rounded-xl border border-dashed border-line-dashed bg-surface p-4 text-body-sm text-ink-muted", className)}>
      <p className="mb-1 flex items-center gap-2 text-label-md text-ink">
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-highlight font-mono text-data-sm text-ink">{n}</span>
        <Lightbulb className="size-4 text-ink-brand" aria-hidden="true" />{title}
      </p>
      <div className="grid gap-1.5">{children}</div>
    </div>
  );
}
