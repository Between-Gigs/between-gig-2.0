"use client";
/*
 * What the Gigster needs to submit, and what can come later (Peter and Patti: no "0%" homework bar). Each item is a
 * link to its field; done items carry a check. Nothing is checked while typing: errors only appear after Submit.
 */
import { cx } from "@ds/components/cx";
import { Check, ChevronDown } from "lucide-react";
import * as React from "react";
import type { GigsterItemId } from "@/lib/profile/validate";
import { markArea } from "@/lib/split-area";

markArea("bg-split:dashboard");

export type ChecklistItem = { id: GigsterItemId; label: string; required: boolean; done: boolean };

function Item({ item, onGo }: { item: ChecklistItem; onGo: (id: GigsterItemId) => void }) {
  return (
    <li>
      <button type="button" onClick={() => onGo(item.id)}
        className="flex min-h-11 w-full items-center gap-3 rounded-md px-2 text-left text-body-md text-ink transition-colors duration-fast hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-focus">
        <span aria-hidden="true" className={cx("grid size-6 shrink-0 place-items-center rounded-full border", item.done ? "border-action bg-action text-on-action" : "border-line-strong")}>
          {item.done && <Check className="size-3.5" strokeWidth={3} />}
        </span>
        <span className="min-w-0 flex-1">{item.label}<span className="sr-only">{item.done ? ", done" : ", to do"}</span></span>
      </button>
    </li>
  );
}

export function Checklist({ required, optional, onGo }: { required: ChecklistItem[]; optional: ChecklistItem[]; onGo: (id: GigsterItemId) => void }) {
  const left = required.filter((i) => !i.done).length;
  const [later, setLater] = React.useState(false);
  return (
    <section aria-labelledby="checklist-h" className="grid gap-5 rounded-lg border border-line bg-surface p-5 shadow-sm sm:p-6 lg:grid-cols-12 lg:gap-8">
      <div className="grid content-start gap-3 lg:col-span-7">
        <div className="grid gap-1">
          <h2 id="checklist-h" className="font-display text-heading-md text-ink">What you need to submit</h2>
          <p className="text-body-sm text-ink-muted">
            {left === 0 ? "That's everything needed. Preview your profile, then submit it for review." : `${left === 1 ? "One thing" : `${left} things`} still to add. Tap one to go to it; we only check when you submit.`}
          </p>
        </div>
        <ul className="gap-x-4 sm:columns-2 *:break-inside-avoid">{required.map((i) => <Item key={i.id} item={i} onGo={onGo} />)}</ul>
      </div>
      <div className="grid content-start gap-3 border-t border-line pt-4 lg:col-span-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
        <button type="button" aria-expanded={later} aria-controls="checklist-later" onClick={() => setLater(!later)}
          className="flex min-h-11 items-center justify-between gap-3 text-left lg:pointer-events-none lg:cursor-default">
          <span className="grid gap-1">
            <span className="font-display text-heading-md text-ink">Can come later</span>
            <span className="text-body-sm text-ink-muted">Optional. They make your profile stronger.</span>
          </span>
          <ChevronDown aria-hidden="true" className={cx("size-5 shrink-0 text-ink transition-transform duration-fast lg:hidden", later && "rotate-180")} />
        </button>
        <ul id="checklist-later" className={cx("grid gap-x-4 sm:grid-cols-2 lg:grid-cols-1", !later && "max-lg:hidden")}>{optional.map((i) => <Item key={i.id} item={i} onGo={onGo} />)}</ul>
      </div>
    </section>
  );
}
