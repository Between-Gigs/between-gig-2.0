"use client";
import { cx } from "@ds/components/cx";

/** A prominent availability control with track/thumb contrast in both themes. */
export function AvailabilitySwitch({checked,onChange}:{checked:boolean;onChange:(checked:boolean)=>void}) {
 return <div className="flex min-h-11 items-center gap-3">
  <button id="f-monthStatus" type="button" role="switch" aria-checked={checked} aria-labelledby="f-monthStatus-label" onClick={()=>onChange(!checked)}
   className={cx("relative inline-flex h-11 w-18 shrink-0 items-center rounded-full border-2 border-ink-muted transition-colors duration-fast ease-standard focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",checked?"bg-action":"bg-ink-muted")}>
   <span aria-hidden="true" className={cx("size-8 rounded-full shadow-xs transition-transform duration-fast ease-standard",checked?"translate-x-8 bg-on-action":"translate-x-1 bg-bg")}/>
  </button>
  <label id="f-monthStatus-label" htmlFor="f-monthStatus" className="text-label-md text-ink">Available for work</label>
 </div>;
}
