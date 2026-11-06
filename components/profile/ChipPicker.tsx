import { cx } from "@ds/components";
import { Check } from "lucide-react";
import { markArea } from "@/lib/split-area";

markArea("bg-split:dashboard");

/**
 * Multi-select as a grid of square toggle tiles: every option visible, one tap to pick or drop. Picked tiles are filled
 * (forest on white, mint on dark) with a check. From the GigsterOnboarding template.
 */
export function ChipPicker({ id, options, value, onChange, label, invalid, describedBy }: {
  id?: string; options: string[]; value: string[]; onChange: (v: string[]) => void; label: string; invalid?: boolean; describedBy?: string;
}) {
  const toggle = (o: string) => onChange(value.includes(o) ? value.filter((v) => v !== o) : [...value, o]);
  return (
    <div id={id} role="group" aria-label={label} aria-describedby={describedBy} tabIndex={-1} className="grid grid-cols-2 gap-2 outline-none sm:grid-cols-3">
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button key={o} type="button" aria-pressed={on} onClick={() => toggle(o)}
            className={cx("flex min-h-13 items-center justify-between gap-2 border-2 px-4 py-2 text-left font-display text-label-md font-bold transition-colors duration-fast",
              "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus",
              on ? "border-ink-brand bg-ink-brand text-bg" : cx("text-ink hover:bg-surface-hover", invalid ? "border-danger" : "border-line-strong"))}>
            {o}
            <Check aria-hidden="true" strokeWidth={3} className={cx("size-4 shrink-0 transition duration-fast", on ? "opacity-100" : "scale-75 opacity-0")} />
          </button>
        );
      })}
    </div>
  );
}
