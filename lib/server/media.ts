/*
 * /media/<file id>: a profile photo, streamed by 2.0's server from Company OS's short-lived link (ADR 0021 revision,
 * point 6). The signed-in person's own (or, for an owner, anyone's) through the private link; an approved profile's
 * through the public one. The link itself never reaches the browser. An <img> can't send a header, so here (a read,
 * never a write) the session also comes from Clerk's `__session` cookie.
 */
import { CompanyOsError, companyOs, configFromEnv, type CompanyOs } from "./companyos";
import { bearer } from "./routes";

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const IMAGE = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"]);

const notFound = () => new Response("Not found", { status: 404, headers: { "content-type": "text/plain", "x-content-type-options": "nosniff", "cache-control": "no-store" } });

export function sessionToken(req: Request) {
  const fromHeader = bearer(req);
  if (fromHeader) return fromHeader;
  const m = /(?:^|;\s*)__session=([^;]{10,4096})/.exec(req.headers.get("cookie") ?? "");
  return m ? decodeURIComponent(m[1]!) : null;
}

let cached: CompanyOs | null = null;

export async function media(req: Request, id: string, deps: { cos?: CompanyOs } = {}): Promise<Response> {
  if (!ID.test(id)) return notFound();
  const cos = deps.cos ?? (cached ??= companyOs(configFromEnv()));
  const token = sessionToken(req);
  let link: string | null = null;
  let visibility: "private" | "public" = "private";
  if (token) {
    try { link = (await cos.fileUrl({ kind: "session", token }, id)).url; } catch (e) { if (!(e instanceof CompanyOsError)) throw e; }
  }
  if (!link) {
    try { link = (await cos.publicFileUrl(id)).url; visibility = "public"; } catch (e) { if (!(e instanceof CompanyOsError)) throw e; }
  }
  if (!link) return notFound();
  const upstream = await cos.getBytes(link).catch(() => null);
  if (!upstream?.ok || !upstream.body) return notFound();
  const type = (upstream.headers.get("content-type") ?? "").split(";")[0]!.trim().toLowerCase();
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "content-type": IMAGE.has(type) ? type : "application/octet-stream",
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'; sandbox",
      "cache-control": visibility === "public" ? "public, max-age=300" : "private, max-age=60",
      ...(upstream.headers.get("content-length") ? { "content-length": upstream.headers.get("content-length")! } : {}),
    },
  });
}
