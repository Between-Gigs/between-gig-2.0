"use client";
import { usePathname } from "next/navigation";
import * as React from "react";
import { cursorAllowed, onCursorChange, savedCursor, startCursorFx, type CursorKind } from "@/lib/cursor-fx";
import { SITE_CURSOR, cursorCss, onCursorStyleChange, savedCursorStyle, type CursorStyle } from "@/lib/cursor-style";

/**
 * Runs the mouse effect chosen on /preview/cursors across the whole site (saved in this browser only). Off on the
 * chooser itself, where each panel runs its own, and for touch or reduced motion.
 */
export function CursorFx() {
  const pathname = usePathname();
  const [kind, setKind] = React.useState<CursorKind>("none");
  React.useEffect(() => { setKind(savedCursor()); return onCursorChange(() => setKind(savedCursor())); }, []); // eslint-disable-line react-hooks/set-state-in-effect
  React.useEffect(() => {
    if (kind === "none" || pathname.startsWith("/preview/cursors") || !cursorAllowed()) return;
    return startCursorFx(kind);
  }, [kind, pathname]);
  return null;
}

/** Applies the site's pointer shape (Spotlit 3D arrow), or a preview choice from /preview/cursors in this browser. */
export function CursorStyleSheet() {
  const [style, setStyle] = React.useState<CursorStyle>(SITE_CURSOR);
  React.useEffect(() => { setStyle(savedCursorStyle()); return onCursorStyleChange(() => setStyle(savedCursorStyle())); }, []); // eslint-disable-line react-hooks/set-state-in-effect
  const css = cursorCss(style);
  return css ? <style>{css}</style> : null;
}
