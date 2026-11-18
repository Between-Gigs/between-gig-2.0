"use client";
import * as React from "react";
import { previewGeometry, previewViewport, type EmailPreviewDevice } from "@/lib/email-preview-view";

/** A fixed document viewport, visually scaled to its host. Gallery previews never intercept card links. */
export function EmailPreviewFrame(props: { html: string; title: string; device: EmailPreviewDevice; view: "full" | "thumbnails"; passive?: boolean }) {
  return <MeasuredFrame key={`${props.device}:${props.html}`} {...props} />;
}
function MeasuredFrame({ html, title, device, view, passive = false }: { html: string; title: string; device: EmailPreviewDevice; view: "full" | "thumbnails"; passive?: boolean }) {
  const host = React.useRef<HTMLDivElement>(null);
  const cleanup = React.useRef<() => void>(() => {});
  const [available, setAvailable] = React.useState(0);
  const [height, setHeight] = React.useState(900);
  const viewport = previewViewport(device);
  React.useEffect(() => {
    const el = host.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setAvailable(entry.contentRect.width));
    observer.observe(el);
    return () => { observer.disconnect(); cleanup.current(); };
  }, []);
  const measure = (event: React.SyntheticEvent<HTMLIFrameElement>) => {
    cleanup.current();
    const doc = event.currentTarget.contentDocument;
    const content = doc?.querySelector<HTMLElement>("[data-email-preview-content]");
    if (!doc || !content) return;
    let active = true;
    const fit = () => { if (active) setHeight(Math.max(1, Math.ceil(content.getBoundingClientRect().height))); };
    const observer = new ResizeObserver(fit);
    observer.observe(content);
    for (const image of Array.from(doc.images)) { image.addEventListener("load", fit); image.addEventListener("error", fit); }
    void doc.fonts.ready.then(fit);
    fit();
    cleanup.current = () => {
      active = false;
      observer.disconnect();
      for (const image of Array.from(doc.images)) { image.removeEventListener("load", fit); image.removeEventListener("error", fit); }
    };
  };
  // A content wrapper measures natural height without the iframe viewport's scrollHeight floor.
  // This lets shorter replacements and responsive documents shrink instead of retaining a previous tall frame.
  const doc = html.replace(/(<body\b[^>]*>)/i, '$1<div data-email-preview-content style="display:flow-root">').replace(/<\/body>/i, "</div></body>");
  const geometry = previewGeometry(available, viewport, height, view);
  return <div ref={host} aria-hidden={passive || undefined} data-email-preview={view} data-preview-device={device}
    className="relative w-full overflow-hidden bg-surface-embed" style={{ height: geometry.height }}>
    <iframe title={passive ? "" : title} tabIndex={passive ? -1 : undefined} sandbox="allow-same-origin" scrolling="no"
      srcDoc={doc} onLoad={measure} className={`absolute top-0 origin-top-left border-0 ${passive ? "pointer-events-none" : ""}`}
      style={{ width: viewport, height, left: geometry.left, transform: `scale(${geometry.scale})` }} />
  </div>;
}
