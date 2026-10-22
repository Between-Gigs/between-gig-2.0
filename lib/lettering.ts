/*
 * Lettering: approved hand-drawn phrases, kept as images. Unlike a font it can't set new words; each entry
 * is one phrase, drawn once. Black ink on transparent, so the web inverts it in dark mode and email puts it on
 * a white "paper" panel. Add a phrase here (with its source) before using it on a page or in an email.
 */
export interface LetteringEntry {
  /** The words, used as alt text so the phrase still reads with images off. */
  text: string;
  /** Web asset (transparent PNG) and its intrinsic size. */
  src: string;
  width: number;
  height: number;
  /** Email asset (flattened for mail clients) under public/. */
  email: string;
  source: string;
}

export const lettering = {
  "next-chapter": {
    text: "Your next chapter starts here.",
    src: "art/your-next-chapter-transparent.png",
    width: 960,
    height: 320,
    email: "email/your-next-chapter.png",
    source: "Peter Lenkov's handwriting, from the approved Storyboard hero and welcome email.",
  },
} satisfies Record<string, LetteringEntry>;

export type LetteringName = keyof typeof lettering;
