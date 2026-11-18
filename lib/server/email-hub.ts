import { hubEmailKeys, plainRecipient, type EmailHubStatus } from "../email-hub";
import type { EmailTemplate } from "../data/types";
import type { Ctx } from "./gigs";
import { CompanyOsError, type Row } from "./companyos";
async function owner(ctx: Ctx) {
  if (!(await ctx.cos.me(ctx.cred)).isSuperAdmin) throw new CompanyOsError(403, "super-admin only");
}
async function templates(ctx: Ctx) {
  return ctx.cos.all(ctx.cred, { entity: "message_template", filter: { field: "channel", op: "eq", value: "email" } });
}
function choose(rows: Row[], key: string) {
  const matches = rows.filter(r => r.data.key === key && !r.data.locale);
  return matches.length === 1 ? matches[0] : undefined;
}
export async function emailHubStatus(ctx: Ctx, args: unknown[]): Promise<EmailHubStatus> {
  await owner(ctx);
  if (args.length) throw new CompanyOsError(400, "invalid_email_request");
  const rows = await templates(ctx);
  // An unreadable automation entity is unknown, never evidence of inactivity.
  let automations: Row[] | null = null;
  try { automations = await ctx.cos.all(ctx.cred, { entity: "automation" }); } catch { /* explicitly unknown below */ }
  const result: EmailHubStatus = {};
  for (const [name, key] of Object.entries(hubEmailKeys)) {
    const row = choose(rows, key);
    const enabled = automations?.filter(r => r.data.template === key && r.data.active !== false && Array.isArray(r.data.channels) && r.data.channels.includes("email"));
    let testEnabled = false;
    if (row && row.data.active !== false) {
      try {
        const status = await ctx.cos.call<{ data: { enabled: boolean } }>(ctx.cred, "GET", `/comms/template-tests?templateId=${encodeURIComponent(row.id)}`);
        testEnabled = status.data.enabled === true;
      } catch { /* unsupported or disabled backend; fail closed */ }
    }
    result[name as EmailTemplate] = {
      lifecycle: "unknown", // message_template.active is availability, not a recorded approval.
      content: row ? row.data.active === false ? "disabled" : "enabled" : rows.some(r => r.data.key === key) ? "unknown" : "not_installed",
      usage: enabled?.length ? "configured" : name === "sign-in-code" ? "external" : name === "invite" ? "manual" : automations === null ? "unknown" : "inactive",
      triggers: (enabled ?? []).map(r => {
        const filter = r.data.filter as Record<string, unknown> | undefined;
        return `${String(r.data.event ?? "unknown event")}${typeof filter?.to === "string" ? ` → ${filter.to}` : ""}`;
      }), testEnabled,
    };
  }
  return result;
}
export async function testHubEmail(ctx: Ctx, args: unknown[]) {
  await owner(ctx);
  const input = args[0];
  if (args.length !== 1 || !input || typeof input !== "object" || Array.isArray(input)) throw new CompanyOsError(400, "invalid_test_request");
  const p = input as Record<string, unknown>;
  if (Object.keys(p).sort().join(",") !== "name,recipient,requestId" || typeof p.name !== "string" || !Object.hasOwn(hubEmailKeys, p.name) || typeof p.requestId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(p.requestId)) throw new CompanyOsError(400, "invalid_test_request");
  const recipient = plainRecipient(p.recipient);
  if (!recipient) throw new CompanyOsError(400, "invalid_recipient");
  const row = choose(await templates(ctx), hubEmailKeys[p.name as EmailTemplate]);
  if (!row || row.data.active === false) throw new CompanyOsError(409, "template_unavailable");
  // Existing Company OS test API adds TEST markings, safe fictional data, inert links,
  // rate limits and durable replay. No contact creation, invitation or publication.
  return (await ctx.cos.call<{ data: unknown }>(ctx.cred, "POST", "/comms/template-tests", {
    templateId: row.id, recipient, mode: "live",
    source: { subject: String(row.data.subject ?? ""), body: String(row.data.body ?? ""), bodyHtml: String(row.data.body_html ?? "") },
  }, { "Idempotency-Key": `owner-email:${p.requestId}` })).data;
}
