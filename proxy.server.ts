/*
 * The server build's Proxy (BG_BUILD=server; next.config.ts adds the "server.ts" page extension, so only that build
 * sees this file, and the static Pages export, which can't run a proxy, never does). Each document gets a fresh nonce
 * and a strict Content-Security-Policy; Next.js reads the nonce from the request's CSP header and puts it on its own
 * scripts, and app/layout.tsx on the theme script. The pages render per request (the layout reads headers()), since
 * prerendered HTML can't carry a per-request nonce.
 */
import { NextResponse, type NextRequest } from "next/server";
import { contentSecurityPolicy } from "@/lib/security/headers";

export default function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(18))).toString("base64");
  const csp = contentSecurityPolicy({
    nonce,
    clerkPublishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    dev: process.env.NODE_ENV === "development",
  });
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("content-security-policy", csp);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("content-security-policy", csp);
  return response;
}

export const config = {
  matcher: [
    // Every request but the build's static files, prefetches included, so every document gets a policy and the
    // x-nonce header the layout reads is always this proxy's, never one a client sent.
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
