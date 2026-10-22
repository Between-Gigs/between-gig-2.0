"use client";
import { Button, IconButton, cx } from "@ds/components";
import { ArrowRight, ChevronDown, ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
import * as React from "react";
import { asset } from "@/lib/site";
import { scenePages } from "@/lib/storyboard";
import { createBook, type BookState } from "./engine";
import "./book.css";

export interface StoryBookHandle { goTo: (index: number) => void; prefetch: (index: number) => void }

/**
 * The Storyboard hero, as approved: one centered column. Peter's handwritten "Your next chapter starts
 * here.", the sketchbook (drag a page, tap a half, or use the arrows / arrow keys), the caption, zoom, the
 * hint, then the two ways in.
 */
export const StoryBook = React.forwardRef<StoryBookHandle, { onPlan: (kind: "buyer" | "talent") => void; onScrollOn: () => void }>(
  function StoryBook({ onPlan, onScrollOn }, ref) {
    const stage = React.useRef<HTMLDivElement>(null);
    const frame = React.useRef<HTMLDivElement>(null);
    const book = React.useRef<HTMLDivElement>(null);
    const captions = React.useRef<HTMLDivElement>(null);
    const engine = React.useRef<ReturnType<typeof createBook> | null>(null);
    const [state, setState] = React.useState<BookState>({ index: 0, canPrev: false, canNext: true, zoom: 1 });
    const [hinted, setHinted] = React.useState(false);

    React.useEffect(() => {
      if (!stage.current || !frame.current || !book.current || !captions.current) return;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const e = createBook({
        pages: scenePages.map((p) => ({ url: asset(`art/storyboard/${p.file}`), title: p.title, story: p.story, cover: p.type === "cover" })),
        stage: stage.current, frame: frame.current, book: book.current, captions: captions.current,
        reduced, onChange: setState, onInteract: () => setHinted(true),
      });
      engine.current = e;
      // Arrow keys turn the page, unless someone is typing or a dialog is open.
      const onKey = (k: KeyboardEvent) => {
        if ((k.key !== "ArrowLeft" && k.key !== "ArrowRight") || k.metaKey || k.ctrlKey || k.altKey) return;
        const t = k.target as HTMLElement | null;
        if (t?.closest("input, textarea, select, [contenteditable], [role=dialog], [role=listbox], [role=menu], [role=radiogroup], [role=tablist]")) return;
        const r = stage.current?.getBoundingClientRect();
        if (!r || r.bottom < 0 || r.top > innerHeight) return;   // only while the book is on screen
        k.preventDefault();
        e.step(k.key === "ArrowRight" ? "next" : "prev");
      };
      addEventListener("keydown", onKey);
      return () => { removeEventListener("keydown", onKey); e.destroy(); engine.current = null; };
    }, []);

    React.useImperativeHandle(ref, () => ({ goTo: (i: number) => engine.current?.goTo(i), prefetch: (i: number) => engine.current?.prefetch(i) }), []);

    const page = scenePages[state.index];
    return (
      <section aria-labelledby="sb-h" className="relative mx-auto grid w-full max-w-5xl justify-items-center gap-5 px-4 pt-10 pb-6 sm:px-6 sm:pt-14">
        <h1 id="sb-h" className="m-0">
          <img src={asset("art/your-next-chapter-transparent.png")} width={300} height={100} alt="Your next chapter starts here." className="sb-script" />
        </h1>

        <div ref={stage} className="sb-stage" role="group" aria-roledescription="book" aria-label="The Storyboard: a sketchbook of what Between Gigs talent can do">
          {/* Beside the book from sm up; on a phone they move below it, off the artwork. */}
          <span className="hidden sm:contents">
            <TurnButton dir="prev" disabled={!state.canPrev} onClick={() => engine.current?.step("prev")} className="absolute top-1/2 -left-2 z-raised -translate-y-1/2" />
          </span>
          <div ref={frame} className="sb-3d">
            <div className="sb-tilt">
              <div aria-hidden="true" className="sb-cast ambient" />
              <div aria-hidden="true" className="sb-cast contact" />
              <div aria-hidden="true" className="sb-cast hair" />
              <div ref={book} className="sb-book" />
            </div>
          </div>
          <span className="hidden sm:contents">
            <TurnButton dir="next" disabled={!state.canNext} onClick={() => engine.current?.step("next")} className="absolute top-1/2 -right-2 z-raised -translate-y-1/2" />
          </span>
        </div>

        {/* Live caption for the current page; the visual one cross-fades with the turn. */}
        <p className="sr-only" aria-live="polite">Page {state.index + 1} of {scenePages.length}: {page.title}. {page.story}</p>
        <div ref={captions} aria-hidden="true" className="sb-captions max-w-3xl px-4" />

        <div className="flex flex-wrap items-center justify-center gap-3">
          <span className="contents sm:hidden"><TurnButton dir="prev" disabled={!state.canPrev} onClick={() => engine.current?.step("prev")} /></span>
          <div role="group" aria-label="Zoom" className="flex items-center gap-1 rounded-full border border-line bg-surface/70 px-1.5 py-1 backdrop-blur-sm">
            <IconButton label="Zoom out" variant="ghost" size="sm" icon={<Minus />} disabled={state.zoom <= 0.901} onClick={() => engine.current?.zoom(1 / 1.16)} />
            <span className="min-w-10 text-center text-label-sm text-ink-subtle tabular-nums">{Math.round(state.zoom * 100)}%</span>
            <IconButton label="Zoom in" variant="ghost" size="sm" icon={<Plus />} disabled={state.zoom >= 1.499} onClick={() => engine.current?.zoom(1.16)} />
          </div>
          <span className="text-label-sm text-ink-subtle tabular-nums">{state.index + 1} / {scenePages.length}</span>
          <span className="contents sm:hidden"><TurnButton dir="next" disabled={!state.canNext} onClick={() => engine.current?.step("next")} /></span>
        </div>
        <p className={cx("text-body-sm text-ink-subtle transition-opacity duration-slow", hinted && "opacity-0")}>Drag the page or use the arrows to turn</p>

        <div className="flex flex-wrap justify-center gap-3">
          <Button variant="primary" size="lg" className="glow-hover" iconEnd={<ArrowRight />} onClick={() => onPlan("buyer")}>Find talent for a project</Button>
          <Button variant="secondary" size="lg" onClick={() => onPlan("talent")}>Offer your skills</Button>
        </div>

        <IconButton label="Scroll to how it works" variant="ghost" icon={<ChevronDown />} onClick={onScrollOn} className="mt-2 opacity-60 hover:opacity-100" />
      </section>
    );
  },
);

/** Page-turn arrow on a solid surface, so it reads over the artwork and beside it in both themes. */
function TurnButton({ dir, disabled, onClick, className }: { dir: "prev" | "next"; disabled: boolean; onClick: () => void; className?: string }) {
  return (
    <IconButton label={dir === "prev" ? "Previous page" : "Next page"} variant="ghost" icon={dir === "prev" ? <ChevronLeft /> : <ChevronRight />}
      disabled={disabled} onClick={onClick}
      className={cx("rounded-full border border-line bg-surface/90 shadow-md backdrop-blur-sm hover:bg-surface disabled:opacity-60", className)} />
  );
}
