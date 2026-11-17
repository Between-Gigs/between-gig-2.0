// Railway's healthcheck (.railway/railway.ts): the server is up and the backend has what this build's feature flags need
// (lib/server/backend-readiness.ts). Exempt from the test gate. 503 keeps the previous version serving during a deploy.
// The body names the missing features only: no address, token or Company OS detail.
import { backendReadiness } from "@/lib/server/backend-readiness";

export const dynamic = "force-dynamic";

export async function GET() {
  const { ready, missing } = await backendReadiness();
  if (!ready) return new Response(JSON.stringify({ ok: false, missing }), { status: 503, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
  return new Response("ok", { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
}
