/* The public /hub sample export, with /preview compatibility redirects.
 * Built without Clerk or Company OS credentials; all actual app data stays behind its existing auth.
 * The old grant endpoint remains protected for compatibility, but Hub files no longer require its cookie.
 */
import { createHash, createHmac } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { CompanyOsError, companyOs, configFromEnv, type CompanyOs } from "./companyos";
import { sessionToken } from "./media";

export const PREVIEW_COOKIE = "bg_preview";
export const PREVIEW_ROOT = "preview-site";
// One hour: it doesn't follow sign-out, and /preview-access/ renews it without a click while the person is signed in.
const MAX_AGE_S = 3600;

// Bound to the site (APP_URL), so a cookie minted on test never opens production's preview, even with one secret.
const sign = (secret: string, userId: string, exp: number, site = process.env.APP_URL ?? "") =>
  createHmac("sha256", secret).update(`preview|${site}|${userId}|${exp}`).digest("hex");

/** The cookie's value: expiry (ms), the super admin's user id (base64url) and the signature. */
export const previewCookieValue = (secret: string, userId: string, exp: number, site?: string) =>
  `${exp}.${Buffer.from(userId, "utf8").toString("base64url")}.${sign(secret, userId, exp, site)}`;


const NO_STORE = { "cache-control": "no-store" };
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

/** The file a /preview/… path names inside root, or null when it would leave it or isn't a plain path. */
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
    if (!real || !realRoot) return false;
    const rel = path.relative(realRoot, real);
    return !rel.startsWith("..") && !path.isAbsolute(rel);
  };
  const stat = await fs.stat(full).catch(() => null);
  if (stat?.isFile()) return (await inside(full)) ? full : null;
  if (stat?.isDirectory()) {
    const index = path.join(full, "index.html");
    if ((await fs.stat(index).catch(() => null))?.isFile() && (await inside(index))) return index;
  }
  return null;
}

// Every answer is private: a shared cache must never hand a gated file to someone without the cookie.
function fileHeaders(file: string, root: string, body: Uint8Array) {
  const ext = path.extname(file).toLowerCase();
  const rel = path.relative(root, file).split(path.sep).join("/");
  const cache = ext === ".html" ? "no-store" : rel.startsWith("_next/static/") ? "private, max-age=31536000, immutable" : "private, max-age=3600";
  return {
    "content-type": TYPES[ext] ?? "application/octet-stream",
    "cache-control": cache,
    "content-security-policy": previewCsp(ext === ".html" ? inlineScriptHashes(Buffer.from(body).toString("utf8")) : []),
    "x-frame-options": "SAMEORIGIN",
    "x-robots-tag": "noindex, nofollow",
    "x-content-type-options": "nosniff",
  };
}

/** Public sample sandbox during Clerk testing. Real app routes and APIs remain session protected. */
export async function servePreview(req: Request, deps: { root?: string; secret?: string; now?: number } = {}): Promise<Response> {
  const root = path.resolve(deps.root ?? path.join(process.cwd(), PREVIEW_ROOT));
  if (req.method !== "GET" && req.method !== "HEAD") return plain(405);
  const url = new URL(req.url);
  const old = url.pathname === "/preview" || url.pathname.startsWith("/preview/");
  if (old) {
    const rest = url.pathname.slice("/preview".length);
    const invalid = resolveInside(root, "/hub/" + rest.replace(/^\//, "")) === null;
    if (invalid) return plain(404, "Not found");
    const tools = /^\/(?:cursors|curtain|design-system|gigster-journey|profile-editor|profiles|wallpapers)(?:\/|$)/;
    const target = !rest || rest === "/" || /^\/preview\/?$/.test(rest) ? "/hub/" : tools.test(rest) ? "/hub/preview" + rest : "/hub" + rest;
    return new Response(null, { status: 307, headers: { ...NO_STORE, location: target + url.search } });
  }
  if (url.pathname !== "/hub" && !url.pathname.startsWith("/hub/")) return plain(404, "Not found");
  if (url.pathname === "/hub" || url.pathname === "/hub/hub/" || url.pathname === "/hub/preview/") return new Response(null, { status: 307, headers: { ...NO_STORE, location: "/hub/" + url.search } });
  const full = resolveInside(root, url.pathname);
  const file = full ? await fileOf(root, full) : null;
  if (!file) {
    const notFound = await fs.readFile(path.join(root, "404.html")).catch(() => null);
    if (!notFound) return plain(404, "Not found");
    const bytes = new Uint8Array(notFound);
    return new Response(req.method === "HEAD" ? null : bytes, { status: 404, headers: fileHeaders(path.join(root, "404.html"), root, bytes) });
  }
  const bytes = new Uint8Array(await fs.readFile(file));
  return new Response(req.method === "HEAD" ? null : bytes, { status: 200, headers: fileHeaders(file, root, bytes) });
}

let cachedCos: Pick<CompanyOs, "me"> | null = null;

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
