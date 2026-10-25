"use client";
import * as React from "react";
import type { Breakpoint, ElementType, Page } from "@/lib/studio/types";

/** Something being dragged onto the canvas or navigator: a new element from Add, or an existing one. */
export type DragItem = { kind: "new"; type: ElementType } | { kind: "move"; id: string };

export interface DesignState {
  page: Page;
  setPageId: (id: string) => void;
  selectedId: string | null;
  select: (id: string | null) => void;
  hoverId: string | null;
  setHover: (id: string | null) => void;
  bp: Breakpoint;
  setBp: (bp: Breakpoint) => void;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  drag: DragItem | null;
  setDrag: (d: DragItem | null) => void;
  /** Bumped when the canvas should re-measure its overlays (scroll, resize, edits). */
  tick: number;
  remeasure: () => void;
  /** Switches the editor to the CMS (the collection is chosen through the UI state). */
  openCms: () => void;
}

export const DesignContext = React.createContext<DesignState | null>(null);

export function useDesign() {
  const s = React.useContext(DesignContext);
  if (!s) throw new Error("useDesign needs the Designer");
  return s;
}

/** Drag payloads also travel in dataTransfer, which some browsers require to start a drag at all. */
export const DRAG_MIME = "application/x-studio-element";
