/*
 * Resend's delivery webhook (POST /webhooks/resend/), passed on to Company OS, which checks its Svix signature over the
 * raw body and records the delivery status (Company OS docs/integration-guide.md, "Delivery status webhook"). 2.0's
 * server only forwards: the body byte for byte, the three svix-* headers and the content type, nothing else (no
 * cookies). The body is never logged: it carries recipients' addresses.
 */
import { readCapped } from "./routes";

const MAX_BODY = 256 * 1024;
const SVIX = ["svix-id", "svix-timestamp", "svix-signature"] as const;

export async function forwardResend(req: Request, deps: { url?: string; fetch?: typeof fetch } = {}): Promise<Response> {
  const empty = (status: number) => new Response(null, { status, headers: { "cache-control": "no-store" } });
  if (req.method !== "POST") return empty(405);
  if (SVIX.some((h) => !req.headers.get(h))) return empty(400);
  const body = await readCapped(req, MAX_BODY);
  if (!body) return empty(413);
  const base = (deps.url ?? process.env.COMPANY_OS_URL ?? "").replace(/\/+$/, "");
  if (!/^https?:\/\//.test(base)) return empty(503);
  const headers: Record<string, string> = { "content-type": req.headers.get("content-type") ?? "application/json" };
  for (const h of SVIX) headers[h] = req.headers.get(h)!;
  try {
    const res = await (deps.fetch ?? fetch)(`${base}/webhooks/messaging/resend`, { method: "POST", headers, body: body as Uint8Array<ArrayBuffer>, signal: AbortSignal.timeout(10_000) });
    // Company OS's status (2xx, or 401 for a bad signature, so Resend retries or gives up as it should), no body.
    return empty(res.status);
  } catch {
    console.error("resend webhook: Company OS unreachable");
    return empty(502);
  }
}
