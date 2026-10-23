"use client";
// Test-only SDK boundary. The production build never aliases Clerk to this module.
import * as React from "react";

type Identity = { id: string; fullName: string; primaryEmailAddress: { emailAddress: string }; unsafeMetadata: Record<string, unknown>; publicMetadata: Record<string, unknown>; password: string | null; provider: string };
const KEY = "qa-clerk-identities";
const ACTIVE = "qa-clerk-active";
const google: Identity = { id: "existing-google-id", fullName: "Existing Google", primaryEmailAddress: { emailAddress: "existing-google@example.test" }, unsafeMetadata: {}, publicMetadata: {}, password: null, provider: "google" };
const accounts = (): Identity[] => JSON.parse(localStorage.getItem(KEY) ?? JSON.stringify([google]));
const Context = React.createContext({ isLoaded: false, user: null as Identity | null, signOut: (async () => {}) as (options?: { redirectUrl?: string } | (() => void | Promise<void>)) => Promise<void>, routerPush: (() => {}) as (url: string) => void });

type ProviderProps = { children: React.ReactNode; afterSignOutUrl?: string; routerPush: (url: string) => void; routerReplace: (url: string) => void; [key: string]: unknown };
export function ClerkProvider({ children, routerPush, afterSignOutUrl }: ProviderProps) {
  const [isLoaded, setLoaded] = React.useState(false);
  const [user, setUser] = React.useState<Identity | null>(null);
  React.useEffect(() => {
    // A cold callback must wait for the identity SDK, not redirect before initialization finishes.
    const timer = setTimeout(() => {
      setUser(JSON.parse(localStorage.getItem(ACTIVE) ?? "null")); setLoaded(true);
      (window as unknown as { qaSdkLoaded: boolean }).qaSdkLoaded = true;
    }, Number(sessionStorage.getItem("qa-sdk-delay") ?? "200"));
    return () => clearTimeout(timer);
  }, []);
  const signOut = React.useCallback(async (options?: { redirectUrl?: string } | (() => void | Promise<void>)) => {
    if (sessionStorage.getItem("qa-signout-mode") === "reject") throw new Error("Test sign-out failure");
    if (sessionStorage.getItem("qa-signout-mode") === "hold") await new Promise<void>((resolve) => {
      (window as unknown as { qaReleaseDemoSignOut: () => void }).qaReleaseDemoSignOut = resolve;
    });
    localStorage.removeItem(ACTIVE); setUser(null);
    if (typeof options === "function") await options();
    else routerPush(options?.redirectUrl ?? afterSignOutUrl ?? "/");
  }, [routerPush, afterSignOutUrl]);
  const value = React.useMemo(() => ({ isLoaded, user, signOut, routerPush }), [isLoaded, user, signOut, routerPush]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export const useUser = () => { const c = React.useContext(Context); return { isLoaded: c.isLoaded, isSignedIn: !!c.user, user: c.user }; };
export const useClerk = () => { const c = React.useContext(Context); return React.useMemo(() => ({ loaded: c.isLoaded, status: c.isLoaded ? "ready" : "loading", signOut: c.signOut, get user(): Identity | null { return typeof window === "undefined" ? null : JSON.parse(localStorage.getItem(ACTIVE) ?? "null"); } }), [c.isLoaded, c.signOut]); };

function callback(user: Identity, to: string) {
  localStorage.setItem(ACTIVE, JSON.stringify(user));
  // A full callback reload exercises the real Bridge and role guard before browser state is initialized.
  window.location.assign(to);
}
export function SignUp({ initialValues, unsafeMetadata, fallbackRedirectUrl }: { initialValues: { emailAddress: string; firstName: string; lastName?: string }; unsafeMetadata: Record<string, unknown>; fallbackRedirectUrl: string; [key: string]: unknown }) {
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  return <form aria-label="Mock native Clerk signup" onSubmit={(event) => {
    event.preventDefault();
    if (password.length < 8) { setError("Password must have at least 8 characters"); return; }
    const users = accounts();
    if (users.some((u) => u.primaryEmailAddress.emailAddress === initialValues.emailAddress)) { setError("Account already exists"); return; }
    // Client-editable metadata must never confer the owner role in the real Bridge.
    const user: Identity = { id: `clerk-${users.length}`, fullName: `${initialValues.firstName} ${initialValues.lastName ?? ""}`.trim(), primaryEmailAddress: { emailAddress: initialValues.emailAddress }, unsafeMetadata: { ...unsafeMetadata, role: "owner" }, publicMetadata: {}, password, provider: "password" };
    localStorage.setItem(KEY, JSON.stringify([...users, user]));
    callback(user, fallbackRedirectUrl);
  }}>
    <label>Password<input aria-label="Password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
    {error && <p role="alert">{error}</p>}
    <button type="submit">Create test account</button>
  </form>;
}
export function SignIn({ fallbackRedirectUrl }: { fallbackRedirectUrl: string; [key: string]: unknown }) {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  return <form aria-label="Mock native Clerk login" onSubmit={(event) => {
    event.preventDefault();
    const user = accounts().find((u) => u.primaryEmailAddress.emailAddress === email && u.password === password && u.provider === "password");
    if (!user) { setError("Incorrect email or password"); return; }
    callback(user, fallbackRedirectUrl);
  }}>
    <label>Email<input aria-label="Login email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
    <label>Password<input aria-label="Login password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
    {error && <p role="alert">{error}</p>}
    <button type="submit">Sign in to test account</button>
    <button type="button" onClick={() => callback(accounts().find((u) => u.id === google.id) ?? google, fallbackRedirectUrl)}>Continue with test Google</button>
  </form>;
}
