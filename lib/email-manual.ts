import { hubEmailKeys, plainRecipient } from "./email-hub";

export type ManualEmailName = "approved" | "changes-requested" | "profile-submitted";
export type ReleaseAction = "draft" | "approve" | "publish" | "revoke";

export type Release = {
  id: string;
  templateId: string;
  sourceHash: string;
  status: "draft" | "approved" | "published" | "superseded" | "revoked";
  subject: string;
  body: string;
  bodyHtml: string;
  createdAt: string;
  approvedAt: string | null;
  publishedAt: string | null;
};

export type ReleaseStatus = {
  supported: boolean;
  templateId: string | null;
  sourceHash: string | null;
  current: Release | null;
  releases: Release[];
  reason?: string;
};

export type ManualBinding = {
  templateKey: string;
  recipient: string;
  contextId: string;
  eventId: string;
  releaseId: string;
  fingerprint: string;
};

export type Receipt = {
  requestId: string;
  status: string;
  recipient: string;
  requestedAt: string;
  providerId: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  error: string | null;
};

export type ManualPreview =
  | { available: false; reason: string }
  | {
      available: true;
      binding: ManualBinding;
      subject: string;
      body: string;
      bodyHtml: string;
      person: { id: string; name: string; email: string };
      contextState: string;
      originalReceipt: Receipt;
    };

export type ManualEmailRequest = { requestId: string; binding: ManualBinding };

export function isManualEmailName(value: unknown): value is ManualEmailName {
  return value === "approved" || value === "changes-requested" || value === "profile-submitted";
}

export function manualRecipient(value: unknown): string | null {
  if (typeof value !== "string" || /[\x00-\x1f\x7f]/.test(value)) return null; // eslint-disable-line no-control-regex
  return plainRecipient(value);
}

const bindingKeys = ["templateKey", "recipient", "contextId", "eventId", "releaseId", "fingerprint"] as const;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const hash = /^[0-9a-f]{64}$/;
const isUuid = (value: unknown) => typeof value === "string" && uuid.test(value);

export function manualBindingMatchesName(value: unknown, name: ManualEmailName): value is ManualBinding {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const binding = value as Record<string, unknown>;
  return Object.keys(binding).length === bindingKeys.length
    && bindingKeys.every(key => typeof binding[key] === "string" && binding[key].length > 0)
    && binding.templateKey === hubEmailKeys[name]
    && manualRecipient(binding.recipient) === binding.recipient
    && isUuid(binding.contextId) && isUuid(binding.eventId) && isUuid(binding.releaseId)
    && typeof binding.fingerprint === "string" && hash.test(binding.fingerprint);
}

export function savedManualEmailRequest(value: unknown, name: ManualEmailName): ManualEmailRequest | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const request = value as Record<string, unknown>;
  if (typeof request.requestId !== "string" || !uuid.test(request.requestId) || !manualBindingMatchesName(request.binding, name)) return null;
  return { requestId: request.requestId, binding: request.binding };
}

export function manualRetryMatches(saved: ManualBinding, current: ManualBinding) {
  return bindingKeys.every(key => saved[key] === current[key]);
}

export function nextReleaseAction(templateId: string | null, sourceHash: string | null, current: Release | null): ReleaseAction | null {
  if (!templateId || !sourceHash) return null;
  if (!current) return "draft";
  if (current.templateId !== templateId) return null;
  if (current.sourceHash !== sourceHash) return "draft";
  switch (current.status) {
    case "draft": return "approve";
    case "approved": return "publish";
    case "published": return "revoke";
    default: return null;
  }
}

export function canStartAnotherManualRequest(status?: string) {
  return status === "sent" || status === "delivered" || status === "failed" || status === "bounced" || status === "cancelled";
}

const receiptStatuses: Record<string, string> = {
  scheduled: "Scheduled for sending",
  queued: "Queued for sending",
  sending: "Sending in progress",
  sent: "Accepted by the email provider",
  delivered: "Delivery reported by the email provider",
  failed: "Sending failed",
  bounced: "Bounced",
  cancelled: "Cancelled",
  history_unavailable: "Delivery history unavailable",
};
export function manualReceiptStatus(status: string) {
  return Object.hasOwn(receiptStatuses, status) ? receiptStatuses[status] : "Delivery status unknown";
}
