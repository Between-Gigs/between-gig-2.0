import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Providers } from "@/components/site/Providers";
import { share, siteOrigin } from "@/lib/og";
import "./globals.css";

export const metadata: Metadata = {
  // Pages without their own share image use the call sheet's.
  ...share("home"),
  metadataBase: new URL(siteOrigin),
  title: { default: "Between Gigs", template: "%s · Between Gigs" },
  description: "Extraordinary talent. Everyday solutions. Hollywood professionals between productions, for projects in everyday life.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

/*
 * Before first paint: restores the saved theme (no light flash for a dark-mode visitor) and the owner sidebar's
 * collapsed rail (components/owners/OwnerShell.tsx), so neither jumps after the page loads. It also marks the
 * workspace (/workspace/) and any page shown inside it (data-embedded), whose own header, footer and sidebar then
 * step aside so the workspace shell is the only navigation.
 */
const themeScript = `(function(){try{var d=document.documentElement,t=localStorage.getItem("bg-theme");if(t==="light"||t==="dark")d.setAttribute("data-theme",t);if(localStorage.getItem("bg2-owner-nav-collapsed")==="1")d.setAttribute("data-owner-nav","collapsed");if(location.pathname.indexOf("/workspace/")>-1)d.setAttribute("data-workspace","")}catch(e){}try{if(window.top!==window&&window.top.document.documentElement.hasAttribute("data-workspace"))d.setAttribute("data-embedded","")}catch(e){}})()`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Server build only: render per request with the CSP nonce from proxy.server.ts (the Pages export stays static).
  const nonce = process.env.BG_BUILD === "server" ? (await headers()).get("x-nonce") ?? undefined : undefined;
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-bg text-ink">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
