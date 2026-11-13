import { apiSource, DataError } from "@/lib/data/api";
import { basePath } from "@/lib/site";
import type { StaffGateway } from "./types";

async function call<T>(action: string, input: unknown = {}): Promise<T> {
  const token = await apiSource.token();
  if (!token) throw new DataError(401, "unauthorized", "Sign in with a super admin account.");
  const response = await fetch(`${basePath}/api/staff/${action}/`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  const body = await response.json().catch(() => ({})) as { result?: T; error?: string; message?: string };
  if (!response.ok) throw new DataError(response.status, body.error ?? "error", body.message);
  return body.result as T;
}
export const staffClient: StaffGateway = {
  snapshot: () => call("snapshot"),
  invite: (input) => call("invite", input),
  addRole: (input) => call("addRole", input),
  removeRole: (input) => call("removeRole", input),
  savePermissions: (input) => call("savePermissions", input),
  getPolicies: (roleKey) => call("getPolicies", { roleKey }),
};
