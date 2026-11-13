"use client";
/*
 * A branded date picker: the field opens a calendar in the design system's Popover, instead of the browser's own
 * picker (unstyled blue, different in every browser). The value is the same "yyyy-mm-dd" string a date input gives,
 * so it drops in where <Input type="date"> was.
 *
 * Keyboard: the calendar is a grid. Arrows move a day or a week, Home/End go to the week's ends, Page Up/Down change the
 * month, Enter or Space picks the day, Escape closes and returns to the field.
 */
import { Popover } from "@ds/components";
import { cx } from "@ds/components/cx";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s?: string) => { const m = s?.match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
const sameDay = (a: Date | null, b: Date | null) => !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const addMonths = (d: Date, n: number) => { const t = new Date(d.getFullYear(), d.getMonth() + n, 1); const last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate(); return new Date(t.getFullYear(), t.getMonth(), Math.min(d.getDate(), last)); };
const WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const long = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
const shown = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
const monthName = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });

export interface DateFieldProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  /** Days before this ("yyyy-mm-dd") can't be picked. Defaults to today: a start date in the past means nothing. */
  min?: string;
  placeholder?: string;
  invalid?: boolean;
  className?: string;
  "aria-describedby"?: string;
}

export function DateField({ id, value, onChange, min, placeholder = "Pick a date", invalid, className, ...aria }: DateFieldProps) {
  const today = React.useMemo(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); }, []);
  const picked = parse(value);
  const floor = parse(min) ?? today;
  const [open, setOpen] = React.useState(false);
  const [focus, setFocus] = React.useState<Date>(picked ?? today);
  const grid = React.useRef<HTMLDivElement>(null);
  const trigger = React.useRef<HTMLButtonElement>(null);

  // Opening starts on the chosen day (or today); after the popover has placed itself, focus that day.
  React.useEffect(() => {
    if (!open) return;
    setFocus(picked ?? (today < floor ? floor : today)); // eslint-disable-line react-hooks/set-state-in-effect
    const t = setTimeout(() => grid.current?.querySelector<HTMLButtonElement>("[data-focus]")?.focus(), 30);
    return () => clearTimeout(t);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => { if (open) grid.current?.querySelector<HTMLButtonElement>("[data-focus]")?.focus(); }, [focus, open]);

  const choose = (d: Date) => { onChange(iso(d)); setOpen(false); setTimeout(() => trigger.current?.focus(), 0); };
  const blocked = (d: Date) => d < floor;

  const first = new Date(focus.getFullYear(), focus.getMonth(), 1);
  const start = addDays(first, -first.getDay());
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const weeks = Array.from({ length: 6 }, (_, w) => days.slice(w * 7, w * 7 + 7)).filter((wk, i) => i < 5 || wk.some((d) => d.getMonth() === focus.getMonth()));

  const onKey = (e: React.KeyboardEvent) => {
    const step: Record<string, () => Date> = {
      ArrowLeft: () => addDays(focus, -1), ArrowRight: () => addDays(focus, 1), ArrowUp: () => addDays(focus, -7), ArrowDown: () => addDays(focus, 7),
      Home: () => addDays(focus, -focus.getDay()), End: () => addDays(focus, 6 - focus.getDay()),
      PageUp: () => addMonths(focus, -1), PageDown: () => addMonths(focus, 1),
    };
    if (step[e.key]) { e.preventDefault(); setFocus(step[e.key]()); }
    else if ((e.key === "Enter" || e.key === " ") && !blocked(focus)) { e.preventDefault(); choose(focus); }
  };

  const navButton = "inline-flex size-9 items-center justify-center rounded-full text-ink transition-colors duration-fast hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:text-ink-disabled disabled:hover:bg-transparent";
  const canPrev = addMonths(first, -1) >= new Date(floor.getFullYear(), floor.getMonth() - 1, 1) && new Date(first.getFullYear(), first.getMonth(), 0) >= floor;

  return (
    <Popover label="Choose a date" width="md" open={open} onOpenChange={setOpen} className="gap-2 p-3"
      trigger={
        <button ref={trigger} id={id} type="button" {...aria}
          className={cx("flex h-10 w-full items-center gap-2 rounded-md border bg-surface px-3 text-left text-body-md text-ink transition-colors duration-fast ease-standard",
            "hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
            invalid ? "border-danger" : "border-line-strong", className)}>
          <CalendarDays aria-hidden="true" className="size-4 shrink-0 text-ink-subtle" />
          <span className={cx("min-w-0 flex-1 truncate", !picked && "text-ink-subtle")}>{picked ? shown.format(picked) : placeholder}</span>
          <span className="sr-only">, choose a date</span>
        </button>
      }>
      <div className="flex items-center justify-between gap-2 px-1">
        <button type="button" className={navButton} aria-label="Previous month" disabled={!canPrev} onClick={() => setFocus(addMonths(focus, -1))}><ChevronLeft aria-hidden="true" className="size-4" /></button>
        <p aria-live="polite" className="font-display text-heading-sm text-ink">{monthName.format(first)}</p>
        <button type="button" className={navButton} aria-label="Next month" onClick={() => setFocus(addMonths(focus, 1))}><ChevronRight aria-hidden="true" className="size-4" /></button>
      </div>
      <div ref={grid} role="grid" aria-label={monthName.format(first)} onKeyDown={onKey} className="grid gap-1">
        <div role="row" className="grid grid-cols-7 gap-1">
          {WEEK.map((w) => <span key={w} role="columnheader" className="flex h-8 items-center justify-center text-label-sm font-semibold text-ink-muted">{w}</span>)}
        </div>
        {weeks.map((wk, i) => (
          <div key={i} role="row" className="grid grid-cols-7 gap-1">
            {wk.map((d) => {
              const inMonth = d.getMonth() === focus.getMonth(), sel = sameDay(d, picked), isToday = sameDay(d, today), off = blocked(d), here = sameDay(d, focus);
              return (
                <span key={iso(d)} role="gridcell" aria-selected={sel || undefined}>
                  <button type="button" tabIndex={here ? 0 : -1} data-focus={here ? "" : undefined} disabled={off}
                    aria-label={`${long.format(d)}${isToday ? ", today" : ""}${off ? ", not available" : ""}`} aria-pressed={sel}
                    onClick={() => choose(d)}
                    className={cx("flex size-10 w-full items-center justify-center rounded-full text-body-sm tabular-nums transition-colors duration-fast",
                      "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus",
                      sel ? "bg-action font-semibold text-on-action hover:bg-action-hover"
                        : off ? "cursor-not-allowed text-ink-disabled"
                        : cx("hover:bg-surface-hover", inMonth ? "text-ink" : "text-ink-subtle"),
                      isToday && !sel && "font-semibold text-ink-brand ring-1 ring-line-strong ring-inset")}>
                    {d.getDate()}
                  </button>
                </span>
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-line px-1 pt-2">
        <button type="button" disabled={!picked} onClick={() => { onChange(""); setOpen(false); trigger.current?.focus(); }}
          className="min-h-9 rounded-md px-2 text-label-md text-ink-muted underline-offset-4 hover:text-ink hover:underline disabled:invisible">Clear</button>
        <button type="button" disabled={blocked(today)} onClick={() => choose(today)}
          className="min-h-9 rounded-md px-2 text-label-md font-semibold text-ink-brand underline-offset-4 hover:underline">Today</button>
      </div>
    </Popover>
  );
}
