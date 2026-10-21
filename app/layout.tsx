import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/site/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Between Gigs", template: "%s · Between Gigs" },
  description: "Extraordinary talent. Everyday solutions. Hollywood professionals between productions, for projects in everyday life.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

/* Restores the saved theme before first paint, so a dark-mode visitor never sees a light flash. */
const themeScript = `(function(){try{var t=localStorage.getItem("bg-theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

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
