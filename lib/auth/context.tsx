"use client";
import * as React from "react";
import { data } from "@/lib/data";

/**
 * What the UI needs from whichever sign-in is active. Without Clerk it's the sample login; with Clerk the
 * ClerkLayer supplies a sign-out that also ends the Clerk session.
 */
export interface AuthActions {
  provider: "sample" | "clerk";
  /** Wait for the identity SDK and its app-session bridge before making role/redirect decisions. */
  loading: boolean;
  sdkLoaded: boolean;
  prepareDemo: () => Promise<void>;
  onboarding: null | { email: string; name: string; finish: (input: { name: string; acceptTerms: boolean }) => Promise<void> };
  signOut: () => Promise<void>;
}

const fallback: AuthActions = { provider: "sample", loading: false, sdkLoaded: true, prepareDemo: () => data.auth.signOut(), onboarding: null, signOut: () => data.auth.signOut() };
export const AuthContext = React.createContext<AuthActions>(fallback);
export const useAuthActions = () => React.useContext(AuthContext);
