"use client";
import * as React from "react";

/** Lightweight chrome context: public pages must not import the dashboard bundle. */
export const AppFrameContext = React.createContext<{ setSection: (section?: string) => void; setFit: (fit: boolean) => void } | null>(null);
export const useInAppFrame = () => React.useContext(AppFrameContext) !== null;
