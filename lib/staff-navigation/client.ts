import { basePath } from "@/lib/site";
import { apiSource, DataError } from "@/lib/data/api";
import type { NavigationGateway, NavigationSnapshot } from "./model";
export const menuChangedEvent = "bg2-staff-menus-changed";
async function call(action: string, input = {}): Promise<NavigationSnapshot> {
  const token = await apiSource.token();
  if (!token) throw new DataError(401, "unauthorized", "Sign in with a current superadmin account.");
  const response = await fetch(basePath + "/api/staff-navigation/" + action + "/", { method: "POST", headers: { authorization: "Bearer " + token, "content-type": "application/json" }, body: JSON.stringify(input), cache: "no-store" });
  const body = await response.json().catch(() => ({})) as { result?: NavigationSnapshot; error?: string; message?: string };
  if (!response.ok || !body.result) throw new DataError(response.status, body.error ?? "unavailable", body.message ?? "Menus could not be read. Refresh before retrying a save.");
  if (action !== "snapshot") window.dispatchEvent(new Event(menuChangedEvent));
  return body.result;
}
export const navigationClient: NavigationGateway = {
  snapshot: userId => call("snapshot", userId ? { userId } : {}), setup: () => call("setup"),
  save: input => call("save", input), repair: input => call("repair", input),
};
