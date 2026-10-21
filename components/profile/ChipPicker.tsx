import { cx } from "@ds/components";
import { Check, Plus } from "lucide-react";

/** Multi-select as a cloud of toggle chips: every option visible, one tap to pick or drop. From the GigsterOnboarding template. */
export function ChipPicker({ id, options, value, onChange, label, invalid, describedBy }: {
  id?: string; options: string[]; value: string[]; onChange: (v: string[]) => void; label: string; invalid?: boolean; describedBy?: string;
}) {
  const toggle = (o: string) => onChange(value.includes(o) ? value.filter((v) => v !== o) : [...value, o]);
  return (
    <div id={id} role="group" aria-label={label} aria-describedby={describedBy} tabIndex={-1} className="flex flex-wrap gap-2 outline-none">
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button key={o} type="button" aria-pressed={on} onClick={() => toggle(o)}
            className={cx("group inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 text-label-md transition-colors duration-fast",
              on ? "border-ink-brand bg-surface-selected text-ink-brand" : cx("text-ink-muted hover:border-ink hover:text-ink", invalid ? "border-danger" : "border-line-strong"))}>
            <span aria-hidden="true" className="relative size-4 shrink-0">
              <Plus className={cx("absolute inset-0 size-4 transition duration-fast", on ? "scale-75 opacity-0" : "opacity-70")} />
              <Check className={cx("absolute inset-0 size-4 transition duration-fast", on ? "opacity-100" : "scale-75 opacity-0")} />
            </span>
            {o}
          </button>
        );
      })}
    </div>
  );
}
