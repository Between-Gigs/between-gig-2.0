"use client";
import { usePathname } from "next/navigation";
import * as React from "react";
import { cursorAllowed, onCursorChange, savedCursor, startCursorFx, type CursorKind } from "@/lib/cursor-fx";

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
