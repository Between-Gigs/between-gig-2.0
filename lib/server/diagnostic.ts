import type { Ctx } from "./gigs";
import { CompanyOsError } from "./companyos";
export const DIAGNOSTIC_RECIPIENT = "jmassion@gmail.com";
export const DIAGNOSTIC_SENDER = "hello@between-gigs.com";
export async function diagnosticRequest(
  ctx: Ctx,
  args: unknown[],
  send: boolean,
) {
  const me = await ctx.cos.me(ctx.cred);
  if (!me.isSuperAdmin) throw new CompanyOsError(403, "super-admin only");
  if (args.length) throw new CompanyOsError(400, "invalid_diagnostic_request");
  const status = await ctx.cos.call<{
    data: {
      enabled: boolean;
      recipient: string | null;
      sender: string | null;
      receipt: unknown;
    };
  }>(ctx.cred, "GET", "/comms/diagnostic");
  const allowed =
    status.data.recipient === DIAGNOSTIC_RECIPIENT &&
    status.data.sender === DIAGNOSTIC_SENDER;
  if (send && !allowed)
    throw new CompanyOsError(409, "diagnostic_configuration_mismatch");
  if (!send) return { ...status.data, enabled: allowed && status.data.enabled };
  // No envelope or HTML crosses from the browser. Backend owns the durable one-time reservation.
  return (
    await ctx.cos.call<{ data: unknown }>(
      ctx.cred,
      "POST",
      "/comms/diagnostic",
      {},
    )
  ).data;
}
