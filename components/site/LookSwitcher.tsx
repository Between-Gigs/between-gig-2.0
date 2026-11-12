"use client";
import { Menu } from "@ds/components";
import { Palette } from "lucide-react";
import { lookIds, looks } from "@/lib/look";
import { selectLook, useLook } from "./LookSync";

/** Changes the design in place, independently of the Day/Night switch. */
export function LookSwitcher() {
  const current = useLook();
  return (
    <Menu align="end"
      trigger={
        <button type="button" aria-label={`Theme: ${looks[current].name}`}
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-md px-2 text-label-md text-ink hover:bg-surface-hover">
          <Palette aria-hidden="true" className="size-4" />Theme
        </button>
      }
      items={lookIds.map((look) => ({
        label: looks[look].name, description: looks[look].detail,
        checked: current === look, onSelect: () => selectLook(look),
      }))}
    />
  );
}
