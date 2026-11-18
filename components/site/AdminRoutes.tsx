"use client";
import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { OwnerFrame } from "@/components/owners/OwnerShell";
import { adminPreviewRoute, faithfulPreviewRoute, publicPreviewTarget } from "@/lib/admin-preview";
import { isGuideThumbnail } from "@/lib/guide-thumbnail";
import { useSession } from "@/lib/session";
import { basePath } from "@/lib/site";

const subscribe = () => () => {};
function isEmbeddedPreview() {
  try { if (window.frameElement?.hasAttribute("data-developer-hub") && window.parent.location.origin === window.location.origin && window.parent.location.pathname.startsWith("/owners/developer/")) return true; } catch { /* standalone sample keeps its own chrome */ }
  try { return !!window.frameElement?.hasAttribute("data-admin-page-preview") || document.documentElement.hasAttribute("data-embedded") || document.documentElement.hasAttribute("data-workspace"); }
  catch { return false; }
}

/** One persistent frame across the sample dashboard, Hub, page tools and email gallery. Never grants a role. */
export function AdminRoutes({ children }: { children: React.ReactNode }) {
  const rawPathname = usePathname();
  const pathname = rawPathname.endsWith("/") ? rawPathname : `${rawPathname}/`;
  const { session, loading } = useSession();
  const ready = React.useSyncExternalStore(subscribe, () => true, () => false);
  const faithful = faithfulPreviewRoute(pathname);
  // Public-page and passive thumbnail documents retain their own faithful chrome. Do not recursively frame them.
  if (ready && (isGuideThumbnail() || isEmbeddedPreview() || (faithful && pathname !== "/preview/page/" && new URLSearchParams(window.location.search).get("preview") === "standalone"))) return <>{children}</>;
  const ownerRoute = /^\/owners(?:\/|$)/.test(pathname);
  if (!adminPreviewRoute(pathname, basePath) && !ownerRoute) return <>{children}</>;
  if (ownerRoute && !loading && session?.role !== "owner") return <>{children}</>;
  return <OwnerFrame mode={ownerRoute || session?.role === "owner" ? "owner" : "preview"} fit={faithful}>
    {faithful ? ready ? pathname === "/preview/page/" ? <React.Suspense fallback={<p role="status">Loading page preview…</p>}><VisitorPagePreview>{children}</VisitorPagePreview></React.Suspense> : <FaithfulPage path={pathname} /> : <p role="status" className="text-body-md text-ink-muted">Loading page preview…</p> : children}
  </OwnerFrame>;
}

/** Subscribe to router query state: window.location can still contain the old URL during a client transition. */
function VisitorPagePreview({ children }: { children: React.ReactNode }) {
  const params = useSearchParams();
  const path = publicPreviewTarget(params.get("path") ?? "", basePath);
  return path ? <FaithfulPage path={path} passive /> : <>{children}</>;
}

function FaithfulPage({ path, passive = false }: { path: string; passive?: boolean }) {
  const [appearance, setAppearance] = React.useState(() => [document.documentElement.dataset.theme, document.documentElement.dataset.look, document.documentElement.hasAttribute("data-unstyled")].join("/"));
  React.useEffect(() => {
    const observer = new MutationObserver(() => setAppearance([document.documentElement.dataset.theme, document.documentElement.dataset.look, document.documentElement.hasAttribute("data-unstyled")].join("/")));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-look", "data-unstyled"] });
    return () => observer.disconnect();
  }, []);
  const source = `${basePath}${path}${passive ? "" : `${window.location.search}${window.location.hash}`}`;
  const standalone = new URL(source, window.location.origin); if (!passive) standalone.searchParams.set("preview", "standalone");
  return <section aria-label="Public page preview" className="flex min-h-160 flex-1 flex-col gap-4 lg:min-h-0">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="font-display text-heading-md text-ink">Page preview</h1>
      <a href={standalone.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-label-md text-ink underline underline-offset-4">Open standalone page</a>
    </div>
    {passive && <p className="text-body-sm text-ink-muted">Read-only sample preview. Open the standalone page to use its forms and navigation.</p>}
    <iframe key={`${path}/${appearance}`} data-admin-page-preview="" data-guide-thumbnail={passive ? "" : undefined} name={passive ? "bg-preview:visitor" : undefined} title="Public page preview" src={source} className="min-h-120 w-full flex-1 rounded-lg border border-line bg-bg lg:min-h-0" />
  </section>;
}
