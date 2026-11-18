/* The /hub sample export, served only to a currently verified platform super admin.
 * Sample rendering remains credential-free; the server checks the real session before any document/alias.
 * The old preview grant cookie is compatibility data, never Hub authorization.
 */
import { createHash, createHmac } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { CompanyOsError, companyOs, configFromEnv, type CompanyOs } from "./companyos";
import { hubTarget } from "@/lib/hub-target";
import { sessionToken } from "./media";

export const PREVIEW_COOKIE = "bg_preview";
export const PREVIEW_ROOT = "preview-site";
// Legacy grant cookie only. Its expiry is unrelated to Hub access, which rechecks the real session.
const MAX_AGE_S = 3600;

// Bound to the site (APP_URL), so a cookie minted on test never opens production's preview, even with one secret.
const sign = (secret: string, userId: string, exp: number, site = process.env.APP_URL ?? "") =>
  createHmac("sha256", secret).update(`preview|${site}|${userId}|${exp}`).digest("hex");

/** The cookie's value: expiry (ms), the super admin's user id (base64url) and the signature. */
export const previewCookieValue = (secret: string, userId: string, exp: number, site?: string) =>
  `${exp}.${Buffer.from(userId, "utf8").toString("base64url")}.${sign(secret, userId, exp, site)}`;


const NO_STORE = { "cache-control": "private, no-store", vary: "Cookie, Authorization" };
const plain = (status: number, body = "") => new Response(body || null, { status, headers: { ...NO_STORE, "content-type": "text/plain; charset=utf-8", "x-content-type-options": "nosniff" } });

/**
 * The export's policy. A static export has no nonce, so each page may run exactly its own inline scripts, by hash
 * (never 'unsafe-inline': the preview shares the live site's origin and its signed-in session). It frames its own
 * pages, and the email gallery's previews load the emails' Google fonts.
 */
export function previewCsp(scriptHashes: string[] = []) {
  return [
    "default-src 'self'", ["script-src 'self'", ...scriptHashes].join(" "), "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob:", "font-src 'self' data: https://fonts.gstatic.com", "connect-src 'self'", "frame-src 'self'",
    "worker-src 'self' blob:", "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'self'",
  ].join("; ");
}

/** The hashes of a page's inline scripts (those without src), as CSP sources. */
export function inlineScriptHashes(html: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/\bsrc\s*=/i.test(m[1]!) || m[2] === "") continue;
    out.push(`'sha256-${createHash("sha256").update(m[2]!, "utf8").digest("base64")}'`);
  }
  return out;
}

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json", ".txt": "text/plain; charset=utf-8", ".map": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif",
  ".ico": "image/x-icon", ".woff2": "font/woff2", ".woff": "font/woff", ".mp4": "video/mp4", ".webm": "video/webm",
  ".webmanifest": "application/manifest+json", ".xml": "application/xml", ".pdf": "application/pdf",
};

/** The file a /hub/… path names inside root, or null when it would leave it or isn't a plain path. */
export function resolveInside(root: string, rawPath: string): string | null {
  if (!rawPath.startsWith("/hub/")) return null;
  const rest = rawPath.slice("/hub/".length);
  // Encoded separators and NUL never mean anything in a URL the export makes.
  if (/%2f|%5c|%00|\\/i.test(rest)) return null;
  const segments: string[] = [];
  for (const raw of rest.split("/")) {
    let s: string;
    try { s = decodeURIComponent(raw); } catch { return null; }
    if (s === "" ) continue;
    if (s === "." || s === ".." || s.includes("\0") || s.includes("/")) return null;
    segments.push(s);
  }
  const full = path.resolve(root, ...segments);
  const rel = path.relative(path.resolve(root), full);
  return rel.startsWith("..") || path.isAbsolute(rel) ? null : full;
}

/** The file to send (a directory's index.html), only if its real path, links followed, is still inside root. */
async function fileOf(root: string, full: string): Promise<string | null> {
  const realRoot = await fs.realpath(root).catch(() => null);
  const inside = async (p: string) => {
    const real = await fs.realpath(p).catch(() => null);
    if (!real || !realRoot) return null;
    const rel = path.relative(realRoot, real);
    return !rel.startsWith("..") && !path.isAbsolute(rel) ? real : null;
  };
  const stat = await fs.stat(full).catch(() => null);
  if (stat?.isFile()) return inside(full);
  if (stat?.isDirectory()) {
    const index = path.join(full, "index.html");
    if ((await fs.stat(index).catch(() => null))?.isFile()) return inside(index);
  }
  return null;
}

const PUBLIC_ASSETS = new Set([".js", ".mjs", ".css", ".svg", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".ico", ".woff2", ".woff", ".mp4", ".webm"]);
const publicAsset = (file: string) => PUBLIC_ASSETS.has(path.extname(file).toLowerCase());

// Documents (including RSC payloads) are never cached as public authorization decisions.
function fileHeaders(file: string, root: string, body: Uint8Array) {
  const ext = path.extname(file).toLowerCase();
  const rel = path.relative(root, file).split(path.sep).join("/");
  const cache = !publicAsset(file) ? NO_STORE["cache-control"] : rel.startsWith("_next/static/") ? "private, max-age=31536000, immutable" : "private, max-age=3600";
  return {
    "content-type": TYPES[ext] ?? "application/octet-stream",
    "cache-control": cache,
    ...(!publicAsset(file) ? { vary: NO_STORE.vary } : {}),
    "content-security-policy": previewCsp(ext === ".html" ? inlineScriptHashes(Buffer.from(body).toString("utf8")) : []),
    "x-frame-options": "SAMEORIGIN",
    "x-robots-tag": "noindex, nofollow",
    "x-content-type-options": "nosniff",
  };
}

type PreviewDeps = { root?: string; secret?: string; now?: number; cos?: Pick<CompanyOs, "me"> };
let cachedCos: Pick<CompanyOs, "me"> | null = null;
const login = () => new Response(null, { status: 307, headers: { ...NO_STORE, location: "/login/?next=%2Fowners%2Fdeveloper%2F" } });

/** Never infer authorization from sample roles or a previously minted preview cookie. */
async function requireHubAdmin(req: Request, deps: PreviewDeps): Promise<Response | null> {
  let token: string | null;
  try { token = sessionToken(req); } catch { return login(); }
  if (!token) return login();
  try {
    const cos = deps.cos ?? (cachedCos ??= companyOs(configFromEnv()));
    const me = await cos.me({ kind: "session", token });
    if (!me || typeof me.isSuperAdmin !== "boolean" || !me.user || typeof me.user.id !== "string" || !me.user.id.trim() ||
      typeof me.user.email !== "string" || !me.user.email.trim() || !Array.isArray(me.roleKeys) || me.roleKeys.some(role => typeof role !== "string")) return plain(503);
    return me.isSuperAdmin === true ? null : plain(403, "Forbidden");
  } catch (error) {
    if (error instanceof CompanyOsError && error.status === 401) return login();
    if (error instanceof CompanyOsError && error.status === 403) return plain(403, "Forbidden");
    return plain(503);
  }
}

async function previewResponse(req: Request, deps: PreviewDeps): Promise<Response> {
  const root = deps.root ? path.resolve(/* turbopackIgnore: true */ deps.root) : path.join(process.cwd(), PREVIEW_ROOT);
  if (req.method !== "GET" && req.method !== "HEAD") return plain(405);
  const url = new URL(req.url);
  const old = url.pathname === "/preview" || url.pathname.startsWith("/preview/");
  if (old) {
    const rest = url.pathname.slice("/preview".length);
    const invalid = resolveInside(root, "/hub/" + rest.replace(/^\//, "")) === null;
    if (invalid) return plain(404, "Not found");
    const target = hubTarget(url.pathname + url.search);
    const destination = resolveInside(root, new URL(target, url).pathname);
    const file = destination ? await fileOf(root, destination) : null;
    if (!file || !publicAsset(file)) { const denied = await requireHubAdmin(req, deps); if (denied) return denied; }
    return new Response(null, { status: 307, headers: { ...NO_STORE, location: target } });
  }
  if (url.pathname !== "/hub" && !url.pathname.startsWith("/hub/")) return plain(404, "Not found");
  if (url.pathname === "/hub" || url.pathname === "/hub/hub/" || url.pathname === "/hub/preview/") {
    const denied = await requireHubAdmin(req, deps); if (denied) return denied;
    return new Response(null, { status: 307, headers: { ...NO_STORE, location: "/hub/" + url.search } });
  }
  const full = resolveInside(root, url.pathname);
  const file = full ? await fileOf(root, full) : null;
  if (!file || !publicAsset(file)) { const denied = await requireHubAdmin(req, deps); if (denied) return denied; }
  if (!file) {
    const notFound = await fs.readFile(path.join(root, "404.html")).catch(() => null);
    if (!notFound) return plain(404, "Not found");
    const bytes = new Uint8Array(notFound);
    return new Response(req.method === "HEAD" ? null : bytes, { status: 404, headers: fileHeaders(path.join(root, "404.html"), root, bytes) });
  }
  const bytes = new Uint8Array(await fs.readFile(file));
  return new Response(req.method === "HEAD" ? null : bytes, { status: 200, headers: fileHeaders(file, root, bytes) });
}

/** HTML, aliases, fallback documents and RSC reads share the same current-session policy, including HEAD. */
export async function servePreview(req: Request, deps: PreviewDeps = {}): Promise<Response> {
  const response = await previewResponse(req, deps);
  return req.method === "HEAD" ? new Response(null, { status: response.status, headers: response.headers }) : response;
}

export async function grantPreview(req: Request, deps: { secret?: string; cos?: Pick<CompanyOs, "me">; now?: number } = {}): Promise<Response> {
  const secret = "secret" in deps ? deps.secret : process.env.COOKIE_SIGNING_SECRET || undefined;
  const now = deps.now ?? Date.now();
  if (req.method !== "POST") return plain(405);
  // JSON only: a plain cross-site form can't send it without the browser asking first (CORS).
  if (!(req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return plain(415);
  if (!secret) return plain(503);
  const token = sessionToken(req);
  if (!token) return plain(401);
  const cos = deps.cos ?? (cachedCos ??= companyOs(configFromEnv()));
  let me;
  try {
    me = await cos.me({ kind: "session", token });
  } catch (e) {
    if (e instanceof CompanyOsError && e.status < 500) return plain(401);
    return plain(503);
  }
  if (!me.isSuperAdmin) return plain(404);
  const exp = now + MAX_AGE_S * 1000;
  return new Response(null, {
    status: 204,
    headers: { ...NO_STORE, "set-cookie": `${PREVIEW_COOKIE}=${previewCookieValue(secret, me.user.id, exp)}; Max-Age=${MAX_AGE_S}; Path=/preview; HttpOnly; Secure; SameSite=Lax` },
  });
}
