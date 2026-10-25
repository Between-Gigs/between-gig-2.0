"use client";
import * as React from "react";
import type { Base, Collection, View } from "@/lib/studio/types";

export type Panel = "data" | "assets" | "settings";
export type InspectorMode = "record" | "field" | "view";

/** What's open in the editor: the collection and view on the canvas, and what the inspector shows. */
export interface UiState {
  base: Base;
  collection: Collection;
  view: View;
  lookup: (id: string) => string;
  open: (collectionId: string, viewId?: string) => void;
  search: string;
  setSearch: (q: string) => void;
  recordId: string | null;
  fieldId: string | null;
  mode: InspectorMode;
  /** Shows a record, field or the view settings in the inspector (and opens it on small screens). */
  inspect: (mode: InspectorMode, id?: string | null) => void;
  inspectorOpen: boolean;
  setInspectorOpen: (open: boolean) => void;
  addFieldOpen: boolean;
  setAddFieldOpen: (open: boolean) => void;
}

export const UiContext = React.createContext<UiState | null>(null);

export function useUi() {
  const s = React.useContext(UiContext);
  if (!s) throw new Error("useUi needs the Studio shell");
  return s;
}
