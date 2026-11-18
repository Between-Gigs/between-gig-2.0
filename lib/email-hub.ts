import type { EmailTemplate } from "./data/types";
export const hubEmailKeys: Record<EmailTemplate, string> = {
  invite: "invite", approved: "approved", "changes-requested": "changes_requested",
  "profile-submitted": "profile_submitted", "sign-in-code": "sign_in_code", welcome: "welcome", "coming-soon": "coming_soon",
};
export type EmailHubEntry = {
  lifecycle: "unknown";
  content: "enabled" | "disabled" | "not_installed" | "unknown";
  usage: "configured" | "inactive" | "manual" | "external" | "unknown";
  triggers: string[];
  testEnabled: boolean;
};
export type EmailHubStatus = Partial<Record<EmailTemplate, EmailHubEntry>>;
export const lifecycleWords = "Approval / publication: not verified";
export function usageWords(entry?: EmailHubEntry) {
  if (!entry) return "Usage: not verified";
  if (entry.usage === "external") return "Sign-in delivery is managed by Clerk; this preview is not wired to Clerk.";
  if (entry.usage === "manual") return "Manual owner invitation; no automatic trigger verified.";
  if (entry.usage === "configured") return `Enabled trigger configuration: ${entry.triggers.join(", ")}. Runtime delivery not verified.`;
  if (entry.usage === "inactive") return "No enabled trigger found in backend configuration.";
  return "Usage: not verified";
}
export function plainRecipient(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const s = value.trim().toLowerCase();
  return s.length <= 254 && /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(s) ? s : null;
}
