import { apiSource, DataError } from "@/lib/data/api";
import { basePath } from "@/lib/site";
import type { ProductGateway, WorkspaceSnapshot } from "./types";
async function call(
  action: string,
  input: Record<string, unknown> = {},
): Promise<WorkspaceSnapshot> {
  const token = await apiSource.token();
  if (!token)
    throw new DataError(
      401,
      "unauthorized",
      "Sign in with a superadmin account.",
    );
  const response = await fetch(basePath + "/api/product-development/", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ action, ...input }),
    cache: "no-store",
  });
  const body = (await response.json().catch(() => ({}))) as {
    result?: WorkspaceSnapshot;
    error?: string;
    message?: string;
  };
  if (!response.ok || !body.result)
    throw new DataError(
      response.status,
      body.error ?? "unavailable",
      body.message ??
        "This operation could not be confirmed. Refresh before retrying; your earlier change may have saved.",
    );
  return body.result;
}
export const productClient: ProductGateway = {
  snapshot: () => call("snapshot"),
  initialize: () => call("initialize"),
  create: (fields, requestId) => call("create", { fields, requestId }),
  update: (input) => call("update", input),
  savePhase: (input) => call("savePhase", input),
};
