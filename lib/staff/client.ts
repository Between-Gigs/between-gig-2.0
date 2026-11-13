import { basePath } from "@/lib/site";
import { apiSource, DataError } from "@/lib/data/api";
import type { StaffGateway } from "./types";

async function call<T>(action: string, input: unknown = {}): Promise<T> {
  const token = await apiSource.token();
  if (!token) throw new DataError(401, "unauthorized", "Sign in with a superadmin account to manage staff.");
  const response = await fetch(basePath + "/api/staff/" + action + "/", { method: "POST", headers: { authorization: "Bearer " + token, "content-type": "application/json" }, body: JSON.stringify(input) });
  const body = await response.json().catch(() => ({})) as { result?: T; error?: string; message?: string };
  if (!response.ok) throw new DataError(response.status, body.error ?? "unavailable", body.message ?? "This change could not be completed. Refresh and try again.");
  return body.result as T;
}

export const staffClient: StaffGateway = {
  snapshot: () => call("snapshot"),
  invite: input => call("invite", input),
  addRole: input => call("addRole", input),
  removeRole: input => call("removeRole", input),
  savePermissions: input => call("savePermissions", input),
  getPolicies: roleKey => call("getPolicies", { roleKey }),
};
