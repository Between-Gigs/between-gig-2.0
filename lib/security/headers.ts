/*
 * The server build's security headers (decision N-03; docs/handoff/companyos-deploy.md). The static hardening headers
 * are set in next.config.ts on every response; the Content-Security-Policy is set per request by proxy.server.ts,
 * with a fresh nonce that Next.js puts on its own scripts. Clerk's sources follow its CSP guide
 * (clerk.com/docs/security/clerk-csp). The GitHub Pages preview is a static export and gets none of this.
 */

/** The Clerk Frontend API host a publishable key names (`pk_test_` / `pk_live_` + base64 of `host$`), or null. */
export function clerkFrontendApi(publishableKey: string | undefined): string | null {
  const m = /^pk_(?:test|live)_([A-Za-z0-9+/=_-]+)$/.exec(publishableKey ?? "");
  if (!m) return null;
  const decoded = Buffer.from(m[1], "base64").toString("utf8");
  if (!decoded.endsWith("$")) return null;
  const host = decoded.slice(0, -1);
  // A plain host name only: anything else could add sources or directives to the policy.
  return /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i.test(host) ? host.toLowerCase() : null;
}

export interface CspOptions {
  /** This response's nonce (base64). */
  nonce: string;
  /** NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY; its Frontend API host is allowed. */
  clerkPublishableKey: string | undefined;
  /** next dev: React's debugging needs eval. Never in a production build. */
  dev?: boolean;
}

const CLOUDFLARE_CHALLENGES = "https://challenges.cloudflare.com";
const CLERK_PROTECT = "https://*.protect.clerk.com";

export function contentSecurityPolicy({ nonce, clerkPublishableKey, dev = false }: CspOptions): string {
  if (!/^[A-Za-z0-9+/=]+$/.test(nonce)) throw new Error("contentSecurityPolicy: the nonce must be base64");
  const fapi = clerkFrontendApi(clerkPublishableKey);
  const clerk = fapi ? [`https://${fapi}`] : [];
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // 'strict-dynamic': scripts the nonce'd ones add (Clerk's clerk-js, its bot check) may run; the hosts are the
    // fallback for browsers without CSP 3, which ignore the nonce's strictness.
    "script-src": ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...clerk, CLOUDFLARE_CHALLENGES, CLERK_PROTECT, ...(dev ? ["'unsafe-eval'"] : [])],
    // Clerk's components inject their CSS at runtime.
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", "https://img.clerk.com"],
    "font-src": ["'self'", "data:"],
    "connect-src": ["'self'", ...clerk, `${CLERK_PROTECT}:*`],
    "frame-src": ["'self'", CLOUDFLARE_CHALLENGES, CLERK_PROTECT],
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    "upgrade-insecure-requests": [],
  };
  return Object.entries(directives).map(([name, values]) => [name, ...values].join(" ")).join("; ");
}

/** Headers for every response of the server build (documents and static files). */
export function securityHeaders(): Array<{ key: string; value: string }> {
  return [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    // Old browsers that don't read CSP frame-ancestors.
    { key: "X-Frame-Options", value: "DENY" },
    // Two years. No `preload`: that is a separate, hard-to-undo choice for the owner.
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
    // Not plain same-origin: Clerk's popup sign-in (OAuth, later) needs its popup to keep an opener.
    { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  ];
}
