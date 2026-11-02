/*
 * The test environment's passphrase gate (Company OS playbook rule D5). The test site is on the public internet, so
 * everyone who opens it first types the team's passphrase; production never sets one. proxy.server.ts calls it first
 * for every request; null means "let it through".
 *
 * - On only when TEST_GATE_PASSPHRASE is set. With it but without COOKIE_SIGNING_SECRET, every gated request is 503
 *   (fail closed: half a configuration never opens the site).
 * - A right passphrase sets a signed cookie for 30 days. It is bound to the passphrase, so a new passphrase signs
 *   everyone out.
 * - 5 wrong tries in 15 minutes from one address, then 429 (in memory: one server instance on test).
 * - Exempt: Resend's signed webhook, the email images (mail clients fetch them without a cookie) and the healthcheck.
 */
// Web Crypto: runs the same in any runtime Next gives the proxy.

export interface GateEnv {
  passphrase?: string;
  secret?: string;
  /** APP_URL: the site's public origin. Next's proxy needs an absolute Location; behind Railway's edge the request's own URL may say http. */
  origin?: string;
}

export const GATE_COOKIE = "bg_test_gate";
export const GATE_PATH = "/test-gate/";
const MAX_AGE_S = 30 * 86_400;
const MAX_BODY = 4096;
const LIMIT = { max: 5, windowMs: 15 * 60_000 };
const WEBHOOK = /^\/webhooks\/resend\/?$/;
// Reading an email image only: a plain file name with an image extension, nothing encoded.
const EMAIL_IMAGE = /^\/email\/[A-Za-z0-9._-]+\.(?:png|jpe?g|gif|webp)$/;
const HEALTH = /^\/healthz\/?$/;

export const gateEnv = (env: NodeJS.ProcessEnv = process.env): GateEnv => ({
  // Never on production, whatever reached its variables (the deploy refuses the secret too).
  passphrase: env.RAILWAY_ENVIRONMENT_NAME === "production" ? undefined : env.TEST_GATE_PASSPHRASE || undefined,
  secret: env.COOKIE_SIGNING_SECRET || undefined,
  origin: env.APP_URL || undefined,
});

const utf8 = new TextEncoder();
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
const sha256 = async (s: string) => hex(await crypto.subtle.digest("SHA-256", utf8.encode(s)));
async function sign(env: GateEnv, exp: number) {
  const key = await crypto.subtle.importKey("raw", utf8.encode(env.secret!), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  // Bound to the passphrase (a new one signs everyone out) and to the site (APP_URL).
  return hex(await crypto.subtle.sign("HMAC", key, utf8.encode(`gate|${env.origin ?? ""}|${await sha256(env.passphrase!)}|${exp}`)));
}
/** Same length strings compared without stopping at the first difference. */
function equal(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** The cookie's value for an expiry (ms since the epoch). */
export const gateCookieValue = async (env: GateEnv, exp: number) => `${exp}.${await sign(env, exp)}`;

async function validCookie(req: Request, env: GateEnv, now: number) {
  const m = new RegExp(`(?:^|;\\s*)${GATE_COOKIE}=(\\d{1,15})\\.([0-9a-f]{64})(?:;|$)`).exec(req.headers.get("cookie") ?? "");
  if (!m) return false;
  const exp = Number(m[1]);
  if (!(exp > now)) return false;
  return equal(await sign(env, exp), m[2]!);
}

/** Where to go after the passphrase: a path on this site only, anything else the home page. */
export function safeNext(raw: unknown): string {
  if (typeof raw !== "string" || raw.length > 2000) return "/";
  if (!/^\/(?![/\\])/.test(raw) || /[\u0000-\u001f\u007f\\]/.test(raw)) return "/";
  let decoded: string;
  try { decoded = decodeURIComponent(raw); } catch { return "/"; }
  if (/^\/[/\\]/.test(decoded) || decoded.includes("\\")) return "/";
  return raw;
}

const failures = new Map<string, number[]>();
export const resetGateLimits = () => failures.clear();
const recent = (ip: string, now: number) => (failures.get(ip) ?? []).filter((t) => now - t < LIMIT.windowMs);
function fail(ip: string, now: number) {
  failures.set(ip, [...recent(ip, now), now]);
  if (failures.size > 10_000) for (const k of [...failures.keys()].slice(0, 1_000)) failures.delete(k);
}

// System colours only: this page loads nothing (no tokens, no stylesheet) and follows the visitor's light or dark mode.
const BASE_HEADERS = { "cache-control": "no-store", "x-robots-tag": "noindex, nofollow", "x-content-type-options": "nosniff" };
const PAGE_CSP = "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'";
// Attributes here are double-quoted, so these four are enough.
const escape = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

function page(status: number, next: string, message = "") {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>Between Gigs · test</title>
<style>:root{color-scheme:light dark}body{font:16px/1.5 system-ui,sans-serif;margin:0;min-height:100vh;display:grid;place-items:center;background:Canvas;color:CanvasText}main{width:min(22rem,calc(100% - 2rem))}h1{font-size:1.25rem;margin:0 0 .25rem}p{margin:0 0 1rem}label{display:block;font-weight:600;margin-bottom:.25rem}input{width:100%;box-sizing:border-box;font:inherit;padding:.6rem .75rem;border:1px solid GrayText;border-radius:.5rem}button{margin-top:.75rem;width:100%;font:inherit;font-weight:600;padding:.6rem;border:0;border-radius:.5rem;background:AccentColor;color:AccentColorText;cursor:pointer}.e{font-weight:600}</style></head>
<body><main><h1>Between Gigs test site</h1><p>This is the team's test environment. Enter the passphrase to continue.</p>${message ? `<p class="e" role="alert">${escape(message)}</p>` : ""}
<form method="post" action="${GATE_PATH}"><input type="hidden" name="next" value="${escape(next)}"><label for="p">Passphrase</label><input id="p" name="passphrase" type="password" autocomplete="current-password" required autofocus><button type="submit">Continue</button></form></main></body></html>`;
  return new Response(html, { status, headers: { ...BASE_HEADERS, "content-type": "text/html; charset=utf-8", "content-security-policy": PAGE_CSP } });
}

const text = (status: number, body: string) => new Response(body, { status, headers: { ...BASE_HEADERS, "content-type": "text/plain; charset=utf-8" } });

async function readForm(req: Request): Promise<URLSearchParams | null> {
  const body = await req.text().catch(() => null);
  if (body === null || body.length > MAX_BODY) return null;
  return new URLSearchParams(body);
}

/** APP_URL's origin when it is the host the request came to (the request's own URL may say http behind the edge). */
function sameHost(origin: string | undefined, req: Request) {
  if (!origin) return undefined;
  try { return new URL(origin).host === req.headers.get("host") ? new URL(origin).origin : undefined; } catch { return undefined; }
}

/** null to let the request through, or the gate's own answer. */
export async function testGate(req: Request, env: GateEnv = gateEnv(), now = Date.now()): Promise<Response | null> {
  if (!env.passphrase) return null;
  const url = new URL(req.url);
  const read = req.method === "GET" || req.method === "HEAD";
  if (WEBHOOK.test(url.pathname) || (read && EMAIL_IMAGE.test(url.pathname))) return null;
  // Half configured: everything answers 503, the healthcheck included, so Railway doesn't call a closed site healthy.
  if (!env.secret) return text(503, "This test site is not configured yet.");
  if (HEALTH.test(url.pathname)) return null;

  const atGate = url.pathname === GATE_PATH || url.pathname === GATE_PATH.slice(0, -1);
  if (atGate && req.method === "POST") {
    const ip = req.headers.get("x-real-ip")?.trim() || "unknown";
    if (recent(ip, now).length >= LIMIT.max) return page(429, "/", "Too many tries. Wait 15 minutes and try again.");
    const form = await readForm(req);
    if (!form) return text(413, "Too large.");
    const next = safeNext(form.get("next"));
    // Digests, so the comparison takes the same time whatever the length typed.
    if (!equal(await sha256(form.get("passphrase") ?? ""), await sha256(env.passphrase))) {
      fail(ip, now);
      return page(401, next, "That passphrase didn't work.");
    }
    failures.delete(ip);
    const exp = now + MAX_AGE_S * 1000;
    return new Response(null, {
      status: 303,
      headers: { ...BASE_HEADERS, location: new URL(next, sameHost(env.origin, req) ?? url.origin).toString(), "set-cookie": `${GATE_COOKIE}=${await gateCookieValue(env, exp)}; Max-Age=${MAX_AGE_S}; Path=/; HttpOnly; Secure; SameSite=Lax` },
    });
  }

  if (await validCookie(req, env, now)) return null;
  if (url.pathname.startsWith("/api/")) {
    return new Response(JSON.stringify({ error: "test_gate" }), { status: 401, headers: { ...BASE_HEADERS, "content-type": "application/json" } });
  }
  return page(401, atGate ? "/" : safeNext(url.pathname + url.search));
}
