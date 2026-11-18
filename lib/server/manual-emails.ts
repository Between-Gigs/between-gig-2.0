/** Fixed owner gateway to Company OS's audited stored-version/manual resend commands. */
import { hubEmailKeys } from "../email-hub";
import { manualRecipient } from "../email-manual";
import type { EmailTemplate } from "../data/types";
import { CompanyOsError } from "./companyos";
import type { Ctx } from "./gigs";
const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const HASH = /^[0-9a-f]{64}$/;
const PROFILES = new Set<EmailTemplate>(["approved", "changes-requested", "profile-submitted"]);
const invalid = () => new CompanyOsError(400, "invalid_manual_email_request");
async function owner(ctx: Ctx) {
  if (!(await ctx.cos.me(ctx.cred)).isSuperAdmin) throw new CompanyOsError(403, "super-admin only");
}
function name(value: unknown, profileOnly = false): EmailTemplate {
  if (typeof value !== "string" || !Object.hasOwn(hubEmailKeys, value) || (profileOnly && !PROFILES.has(value as EmailTemplate))) throw invalid();
  return value as EmailTemplate;
}
function object(args: unknown[]): Record<string, unknown> {
  if (args.length !== 1 || !args[0] || typeof args[0] !== "object" || Array.isArray(args[0])) throw invalid();
  return args[0] as Record<string, unknown>;
}
function keys(input: Record<string, unknown>, expected: string[]) {
  if (Object.keys(input).sort().join(",") !== [...expected].sort().join(",")) throw invalid();
}
const uuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);
const hash = (v: unknown): v is string => typeof v === "string" && HASH.test(v);
async function status(ctx: Ctx, template: EmailTemplate) {
  return (await ctx.cos.call<{ data: { templateId: string | null } & Record<string, unknown> }>(ctx.cred, "GET", `/comms/template-releases?templateKey=${encodeURIComponent(hubEmailKeys[template])}`)).data;
}
export async function manualStatus(ctx: Ctx, args: unknown[]) {
  await owner(ctx);
  if (args.length !== 1) throw invalid();
  return status(ctx, name(args[0]));
}
export async function releaseVersion(ctx: Ctx, args: unknown[]) {
  await owner(ctx);
  const p = object(args);
  const template = name(p.name);
  const action = p.action;
  if (!["draft", "approve", "publish", "revoke"].includes(String(action))) throw invalid();
  keys(p, ["name", "action", "templateId", "sourceHash", ...(action === "draft" ? [] : ["releaseId"])]);
  if (!uuid(p.templateId) || !hash(p.sourceHash) || (action !== "draft" && !uuid(p.releaseId))) throw invalid();
  // The site cannot become an arbitrary template editor. Backend rechecks the hash/release atomically.
  const current = await status(ctx, template);
  if (current.templateId !== p.templateId) throw invalid();
  return (await ctx.cos.call<{ data: unknown }>(ctx.cred, "POST", "/comms/template-releases", {
    action, templateId: p.templateId, sourceHash: p.sourceHash, ...(action === "draft" ? {} : { releaseId: p.releaseId }),
  })).data;
}
export async function previewReal(ctx: Ctx, args: unknown[]) {
  await owner(ctx);
  const p = object(args);
  keys(p, ["name", "recipient"]);
  const template = name(p.name, true);
  const recipient = manualRecipient(p.recipient);
  if (!recipient) throw invalid();
  return (await ctx.cos.call<{ data: unknown }>(ctx.cred, "POST", "/comms/manual-sends/preview", { templateKey: hubEmailKeys[template], recipient })).data;
}
export async function sendReal(ctx: Ctx, args: unknown[]) {
  await owner(ctx);
  const p = object(args);
  keys(p, ["name", "requestId", "binding"]);
  const template = name(p.name, true);
  if (!uuid(p.requestId) || !p.binding || typeof p.binding !== "object" || Array.isArray(p.binding)) throw invalid();
  const b = p.binding as Record<string, unknown>;
  keys(b, ["templateKey", "recipient", "contextId", "eventId", "releaseId", "fingerprint"]);
  if (b.templateKey !== hubEmailKeys[template] || typeof b.recipient !== "string" || manualRecipient(b.recipient) !== b.recipient || !uuid(b.contextId) || !uuid(b.eventId) || !uuid(b.releaseId) || !hash(b.fingerprint)) throw invalid();
  // Never re-preview here: an uncertain retry must reach the original durable backend reservation,
  // even if context/template state changed after it was accepted. Backend owns all semantic checks.
  return (await ctx.cos.call<{ data: unknown }>(ctx.cred, "POST", "/comms/manual-sends", { requestId: p.requestId, binding: b }, { "Idempotency-Key": `manual-email_${p.requestId}` })).data;
}
export async function realReceipt(ctx: Ctx, args: unknown[]) {
  await owner(ctx);
  const p = object(args);
  keys(p, ["name", "requestId"]);
  name(p.name, true);
  if (!uuid(p.requestId)) throw invalid();
  return (await ctx.cos.call<{ data: unknown }>(ctx.cred, "GET", `/comms/manual-sends?requestId=${encodeURIComponent(p.requestId)}`)).data;
}
