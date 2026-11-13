"use client";
import * as React from "react";

/**
 * Which presentation the sign-up and log-in screens use. "v2" is the launch design (still-life stage, AuthStageTemplate);
 * "v1" is the previous Green Room layout (AuthTemplate), kept for the Hub drafts at /preview/drafts/join-v1 and login-v1.
 * Only the presentation differs: every screen runs the same auth logic either way.
 */
export type AuthDesign = "v1" | "v2";

const Ctx = React.createContext<AuthDesign>("v2");

export function AuthDesignProvider({ design, children }: { design: AuthDesign; children: React.ReactNode }) {
  return <Ctx.Provider value={design}>{children}</Ctx.Provider>;
}

/** True when the launch (v2) presentation is showing. */
export function useAuthV2() {
  return React.useContext(Ctx) === "v2";
}

/**
 * The card heading. v1: the compact serif heading. v2: the larger serif title from Flow p2, centred on the main forms
 * (create account, log in) and left-aligned on the message screens that read as a list.
 */
export function authTitle(v2: boolean, centered = false) {
  if (!v2) return "font-display text-heading-lg text-balance text-ink";
  // Left-aligned like the fields and the line under it, so each card reads as one column.
  void centered;
  return "font-display text-display-sm text-balance text-ink";
}

/** The line under the card heading. */
export function authSubtitle(v2: boolean, centered = false) {
  // Subtitles run past two lines, so they stay left-aligned (docs/ui-rules.md).
  void v2; void centered;
  return "mt-2 text-body-md text-pretty text-ink-muted";
}
