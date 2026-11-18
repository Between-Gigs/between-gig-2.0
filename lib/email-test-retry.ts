import { plainRecipient } from "./email-hub";
// Company OS replays for 24h. Stop earlier, measured from BEFORE the first network call.
// This is an accidental-retry guard, not a lifetime server reservation or a trusted client clock.
export const EMAIL_TEST_RETRY_MS = 23 * 60 * 60 * 1000;
export type EmailTestAttempt = { recipient: string; requestId: string; startedAt?: number };
export const TEST_RETRY_EXPIRED = "The saved test's retry window has expired or cannot be verified. Check backend test history before explicitly starting a new test; retrying after backend expiry can send another email.";
export function reusableEmailTest(attempt: Pick<EmailTestAttempt, "startedAt">, now = Date.now()) {
  const start = attempt.startedAt;
  return typeof start === "number" && Number.isSafeInteger(start) && start > 0 && now >= start && now - start < EMAIL_TEST_RETRY_MS;
}
export function savedEmailTest(value: unknown): EmailTestAttempt | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const p = value as Record<string, unknown>;
  const recipient = plainRecipient(p.recipient);
  if (!recipient || typeof p.requestId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(p.requestId)) return null;
  // Older saved requests have no timestamp: retain them as blocked, never assume they are new.
  return { recipient, requestId: p.requestId, ...(typeof p.startedAt === "number" ? { startedAt: p.startedAt } : {}) };
}
