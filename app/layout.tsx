import type { Metadata, Viewport } from "next";
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
 * collapsed rail (components/owners/OwnerShell.tsx), so neither jumps after the page loads.
 */
const themeScript = `(function(){try{var d=document.documentElement,t=localStorage.getItem("bg-theme");if(t==="light"||t==="dark")d.setAttribute("data-theme",t);if(localStorage.getItem("bg2-owner-nav-collapsed")==="1")d.setAttribute("data-owner-nav","collapsed")}catch(e){}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-bg text-ink">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
