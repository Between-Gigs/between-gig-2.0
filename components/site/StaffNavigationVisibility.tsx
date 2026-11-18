"use client";
import * as React from "react";
import { data } from "@/lib/data";
import { useSession } from "@/lib/session";
import { staffNavigation } from "@/lib/staff-navigation/selected";
import { menuChangedEvent } from "@/lib/staff-navigation/client";
import { DEFAULT_MENU, MINIMAL_MENU, type MenuConfiguration } from "@/lib/staff-navigation/model";
const Context = React.createContext<{ menu: MenuConfiguration; issue: string }>({ menu: DEFAULT_MENU, issue: "" });
export const useStaffMenuVisibility = () => React.useContext(Context);
/** Menu preferences never alter session roles or protect a destination. Server/API guards remain authoritative. */
export function StaffNavigationVisibility({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const owner = session?.role === "owner", key = owner ? data.kind + ":" + session.email.toLowerCase() : "";
  const [state, setState] = React.useState<{ key: string; menu: MenuConfiguration; issue: string }>();
  React.useEffect(() => {
    if (!key) return;
    let live = true, generation = 0;
    const load = () => { const request = ++generation; void staffNavigation.snapshot().then(snapshot => {
      if (live && request === generation) setState({ key, menu: snapshot.configuration ?? DEFAULT_MENU, issue: snapshot.conflict ? "Conflicting menu settings need repair. Use Manage team menus in your account menu." : "" });
    }).catch(() => { if (live && request === generation) setState({ key, menu: MINIMAL_MENU, issue: "Menu settings could not be verified. Basic menus remain available; use Manage team menus to refresh or repair." }); }); };
    const visible = () => { if (!document.hidden) load(); };
    load(); window.addEventListener(menuChangedEvent, load); window.addEventListener("focus", load); document.addEventListener("visibilitychange", visible);
    return () => { live = false; window.removeEventListener(menuChangedEvent, load); window.removeEventListener("focus", load); document.removeEventListener("visibilitychange", visible); };
  }, [key]);
  const value = !owner ? { menu: DEFAULT_MENU, issue: "" } : state?.key === key ? state : { menu: MINIMAL_MENU, issue: "Loading saved menu settings…" };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
