// Railway's healthcheck (.railway/railway.ts): the server is up. No data, and exempt from the test gate.
export const dynamic = "force-dynamic";

export function GET() {
  return new Response("ok", { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
}
