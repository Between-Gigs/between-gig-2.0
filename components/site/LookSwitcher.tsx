"use client";
import { Menu } from "@ds/components";
import { Palette } from "lucide-react";
import { lookIds, looks } from "@/lib/look";
import { asset } from "@/lib/site";
import { selectLook, setUnstyled, useLook, useUnstyled } from "./LookSync";

/** Changes the design in place, independently of the Day/Night switch. */
export function LookSwitcher({ compact = false }: { compact?: boolean } = {}) {
  const current = useLook();
  const plain = useUnstyled();
  return (
    <Menu align="end"
      trigger={
        <button type="button" title={`Theme: ${looks[current].name}`} aria-label={`Theme: ${looks[current].name}`}
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-md px-2 text-label-md text-ink hover:bg-surface-hover">
          <Palette aria-hidden="true" className="size-4" /><span className={compact ? "sr-only" : undefined}>Theme</span>
        </button>
      }
      items={[
        { label: "Design system", description: "All themes and components", onSelect: () => { window.location.assign(asset("/preview/design-system/")); } },
        "separator",
        { heading: "Mode" },
        { label: "Styled", description: "The chosen theme", checked: !plain, onSelect: () => setUnstyled(false) },
        { label: "Unstyled", description: "Wireframe, no colour or art", checked: plain, onSelect: () => setUnstyled(true) },
        "separator",
        { heading: "Theme" },
        ...lookIds.map((look) => ({
          label: looks[look].name, description: looks[look].detail,
          icon: <span aria-hidden="true" className="look-option" data-option={look} />,
          checked: current === look, onSelect: () => selectLook(look),
        })),
      ]}
    />
  );
}
