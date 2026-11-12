"use client";
import { Button, IconButton, cx } from "@ds/components";
import { ArrowRight, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";
import { useLook } from "@/components/site/LookSync";
import { asset } from "@/lib/site";
import { Lettering } from "@/components/ui/Lettering";
import { scenePages } from "@/lib/storyboard";
import { createBook, type BookState } from "./engine";
import "./book.css";

export interface StoryBookHandle { goTo: (index: number) => void; prefetch: (index: number) => void }

/**
 * The Storyboard hero. The approved column is unchanged: Peter's handwritten "Your next chapter starts
 * here." and the sketchbook (drag a page, tap a half, or use the arrows / arrow keys). Under it, on the Swiss
 * grid: the page count and hint, the caption, then the two ways in.
 */
export const StoryBook = React.forwardRef<StoryBookHandle, { onPlan: (kind: "buyer" | "talent") => void; onScrollOn: () => void }>(
  function StoryBook({ onPlan, onScrollOn }, ref) {
    const swiss = useLook() === "swiss";
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
    const prev = () => engine.current?.step("prev");
    const next = () => engine.current?.step("next");
    return (
      <section aria-labelledby="sb-h" className={swiss ? "relative" : "relative mx-auto grid w-full max-w-5xl justify-items-center gap-5 px-4 pt-10 pb-6 sm:px-6 sm:pt-14"}>
        {/* The book's own column, exactly as approved: its width sets the sketchbook's geometry. */}
        <div className={swiss ? "relative mx-auto grid w-full max-w-5xl justify-items-center gap-5 px-4 pt-10 sm:px-6 sm:pt-14" : "contents"}>
          <h1 id="sb-h" className="m-0">
            <Lettering name="next-chapter" className="sb-script" />
          </h1>

          <div ref={stage} className="sb-stage" role="group" aria-roledescription="book" aria-label="The Storyboard: a sketchbook of what Between Gigs talent can do">
            {/* Beside the book from sm up; on a phone they move below it, off the artwork. */}
            <span className="hidden sm:contents">
              <TurnButton dir="prev" disabled={!state.canPrev} onClick={prev} className="absolute top-1/2 -left-2 z-raised -translate-y-1/2" />
            </span>
            <div ref={frame} className="sb-3d">
              <div className="sb-tilt">
                <div aria-hidden="true" className="sb-cast ambient" />
                <div aria-hidden="true" className="sb-cast contact" />
                <div aria-hidden="true" className="sb-cast hair" />
                {/* keep-round: the sketchbook's soft cover corners are part of the artwork. */}
                <div ref={book} className="sb-book keep-round" />
              </div>
            </div>
            <span className="hidden sm:contents">
              <TurnButton dir="next" disabled={!state.canNext} onClick={next} className="absolute top-1/2 -right-2 z-raised -translate-y-1/2" />
            </span>
          </div>
        </div>

        {/* Live caption for the current page; the visual one cross-fades with the turn. */}
        <p className="sr-only" aria-live="polite">Page {state.index + 1} of {scenePages.length}: {page.title}. {page.story}</p>

        {/* The chrome under the book: page count, caption, the two ways in, on the 12-column grid. */}
        <div className={swiss ? "mx-auto max-w-7xl px-4 pt-8 pb-6 sm:px-6 sm:pt-10" : "contents"}>
          <div className={swiss ? "grid grid-cols-12 gap-x-6 gap-y-6 border-t-4 border-line-strong pt-4" : "contents"}>
            {swiss ? (
              <div className="col-span-12 grid content-start gap-3 md:col-span-3">
                <div className="flex items-center justify-between gap-4">
                  <p aria-hidden="true" className="flex items-baseline gap-2 font-display text-display-sm text-ink tabular-nums">
                    {String(state.index + 1).padStart(2, "0")}<span className="text-heading-md text-ink-muted">/ {scenePages.length}</span>
                  </p>
                  <div className="flex gap-2 sm:hidden">
                    <TurnButton dir="prev" disabled={!state.canPrev} onClick={prev} />
                    <TurnButton dir="next" disabled={!state.canNext} onClick={next} />
                  </div>
                </div>
                <p className={cx("text-body-sm text-ink-muted transition-opacity duration-slow", hinted && "opacity-0 max-md:hidden")}>Drag the page or use the arrows to turn</p>
              </div>
            ) : (
              <div className="order-2 flex flex-wrap items-center justify-center gap-3">
                <span className="contents sm:hidden"><TurnButton dir="prev" disabled={!state.canPrev} onClick={prev} /></span>
                <span className="text-label-sm text-ink-subtle tabular-nums">{state.index + 1} / {scenePages.length}</span>
                <span className="contents sm:hidden"><TurnButton dir="next" disabled={!state.canNext} onClick={next} /></span>
              </div>
            )}
            {!swiss && <p className={cx("order-3 text-body-sm text-ink-subtle transition-opacity duration-slow", hinted && "opacity-0 max-md:hidden")}>Drag the page or use the arrows to turn</p>}
            <div ref={captions} aria-hidden="true" className={swiss ? "sb-captions col-span-12 md:col-span-5 lg:col-span-6" : "sb-captions order-1 max-w-3xl px-4"} />
            <div className={swiss ? "col-span-12 grid content-start gap-3 md:col-span-4 lg:col-span-3" : "order-4 flex flex-wrap justify-center gap-3"}>
              <Button variant="primary" size="lg" className={swiss ? "glow-hover w-full justify-between" : "glow-hover"} iconEnd={<ArrowRight />} onClick={() => onPlan("buyer")}>Find talent for a project</Button>
              <Button variant="secondary" size="lg" className={swiss ? "w-full justify-between" : undefined} onClick={() => onPlan("talent")}>Offer your skills</Button>
            </div>
          </div>
          <div className={swiss ? "mt-6 flex justify-center" : "order-5 mt-2 flex justify-center"}>
            <IconButton label="Scroll to how it works" variant="ghost" icon={<ChevronDown />} onClick={onScrollOn} className="text-ink-muted hover:text-ink" />
          </div>
        </div>
      </section>
    );
  },
);

/** Square page-turn arrow on a solid surface with an ink rule, so it reads beside the book in both themes. */
function TurnButton({ dir, disabled, onClick, className }: { dir: "prev" | "next"; disabled: boolean; onClick: () => void; className?: string }) {
  return (
    <IconButton label={dir === "prev" ? "Previous page" : "Next page"} variant="ghost" icon={dir === "prev" ? <ChevronLeft /> : <ChevronRight />}
      disabled={disabled} onClick={onClick}
      className={cx("size-11 rounded-full border border-line bg-surface/90 shadow-md backdrop-blur-sm hover:bg-surface disabled:opacity-60 swiss:border-2 swiss:border-line-strong swiss:bg-surface swiss:text-ink swiss:hover:bg-surface-sunken swiss:disabled:opacity-40", className)} />
  );
}
