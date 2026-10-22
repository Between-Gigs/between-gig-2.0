"use client";
import { Drawer, cx } from "@ds/components";
import { Lightbulb } from "lucide-react";
import * as React from "react";

export interface Note { title: string; body: React.ReactNode }

/** What the pins need: whether notes are showing, this view's notes, and a way to open one in the drawer. */
export const NotesContext = React.createContext<{ on: boolean; notes: Note[]; open: (n: number) => void }>({ on: false, notes: [], open: () => undefined });

/**
 * A numbered pin beside a proposed section. Hidden until "Show design notes" is on, so each state renders
 * clean by default; a pin opens the notes drawer at its note. Dashed (BRAND.md: "empty slots and drop zones
 * use line-dashed and always carry a label") so it never reads as product UI.
 */
export function ProposalNote({ n, className }: { n: number; className?: string }) {
  const { on, notes, open } = React.useContext(NotesContext);
  const note = notes[n - 1];
  if (!on || !note) return null;
  return (
    <button type="button" onClick={() => open(n)}
      className={cx("mt-3 inline-flex w-fit max-w-full items-center justify-self-start gap-2 rounded-full border border-dashed border-line-dashed bg-surface py-1 pr-3 pl-1 text-left text-label-sm text-ink transition-colors duration-fast hover:border-line-strong hover:bg-surface-hover", className)}>
      <NoteNumber n={n} />
      <span className="truncate">{note.title}</span>
      <span className="sr-only">: open design note</span>
    </button>
  );
}

function NoteNumber({ n }: { n: number }) {
  return <span aria-hidden="true" className="grid size-6 shrink-0 place-items-center rounded-full bg-highlight text-label-sm text-ink tabular-nums">{n}</span>;
}

/** All of a view's notes in a side drawer, with the page's reasoning on top. */
export function NotesDrawer({ open, focus, onClose, title, summary, principles, notes }: {
  open: boolean; focus: number | null; onClose: () => void; title: string; summary: string; principles: [string, string][]; notes: Note[];
}) {
  React.useEffect(() => {
    if (!open || !focus) return;
    const t = window.setTimeout(() => document.getElementById(`design-note-${focus}`)?.scrollIntoView({ block: "start" }), 60);
    return () => window.clearTimeout(t);
  }, [open, focus]);
  return (
    <Drawer open={open} onClose={onClose} size="md" title={`Design notes · ${title}`} description={summary}>
      <div className="grid gap-6">
        <ol className="grid gap-3">
          {notes.map((note, i) => (
            <li key={note.title} id={`design-note-${i + 1}`}
              className={cx("scroll-mt-4 rounded-xl border border-dashed p-4 text-body-sm text-ink-muted", focus === i + 1 ? "border-line-strong bg-surface-selected" : "border-line-dashed bg-surface")}>
              <p className="mb-1 flex items-center gap-2 text-label-md text-ink"><NoteNumber n={i + 1} /><Lightbulb className="size-4 shrink-0 text-ink-brand" aria-hidden="true" />{note.title}</p>
              <div className="grid gap-1.5">{note.body}</div>
            </li>
          ))}
        </ol>
        <section aria-labelledby="principles-h" className="grid gap-2 border-t border-line pt-4">
          <h3 id="principles-h" className="text-label-md text-ink">Across all three proposals</h3>
          <ul className="grid gap-2">
            {principles.map(([t, d]) => <li key={t} className="text-body-sm text-ink-muted"><b className="text-ink">{t}.</b> {d}</li>)}
          </ul>
        </section>
      </div>
    </Drawer>
  );
}
