import type { Ctx } from "./gigs";
import { CompanyOsError } from "./companyos";
export const DIAGNOSTIC_RECIPIENT = "jmassion@gmail.com";
export const DIAGNOSTIC_SENDER = "hello@between-gigs.com";
export const REVISED_DIAGNOSTIC_HASH = "7c25145b910f881b85da101a0b2cb6cc24e4d6e34254a40998fa3b2eb67582ad";
export const ORIGINAL_DIAGNOSTIC_REQUEST = "3632e9c4-b3ac-476b-a3f1-471bdb8304c4";
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
      authorization?: string;
      templateSha256?: string | null;
      originalRequestId?: string | null;
      recipient: string | null;
      sender: string | null;
      receipt: unknown;
    };
  }>(ctx.cred, "GET", "/comms/diagnostic");
  const allowed =
    status.data.recipient === DIAGNOSTIC_RECIPIENT &&
    status.data.sender === DIAGNOSTIC_SENDER &&
    (status.data.authorization === undefined ||
      status.data.authorization === "original" ||
      (status.data.authorization === "revised" &&
        status.data.templateSha256 === REVISED_DIAGNOSTIC_HASH &&
        status.data.originalRequestId === ORIGINAL_DIAGNOSTIC_REQUEST));
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
