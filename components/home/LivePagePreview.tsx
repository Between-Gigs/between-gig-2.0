"use client";
import { cx } from "@ds/components/cx";
import * as React from "react";
import { encodeProfileTemplate } from "@/lib/profile/template";
import { useProfileTemplate } from "@/lib/profile/use-profile-template";
import { guideReadyEvent } from "@/lib/guide-thumbnail";
import { basePath } from "@/lib/site";

const Appearance = React.createContext("");
const ProfileLayout = React.createContext("");
const width = 1280;
const height = 720;

/** Visible frames pick up appearance changes, including components that read Day/Night only on mount. */
export function GuidePreviews({ children }: { children: React.ReactNode }) {
  const template = useProfileTemplate();
  const [appearance, setAppearance] = React.useState("");
  React.useEffect(() => {
    const root = document.documentElement;
    const sync = () => setAppearance([root.dataset.look, root.dataset.theme].join("/"));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["data-look", "data-theme"] });
    return () => observer.disconnect();
  }, []);
  return (
    <Appearance.Provider value={appearance}>
      <ProfileLayout.Provider value={encodeProfileTemplate(template)}>{children}</ProfileLayout.Provider>
    </Appearance.Provider>
  );
}

type PreviewProps = { href: string; title: string; as?: string };

export function LivePagePreview({ href, title, as = "visitor" }: PreviewProps) {
  const host = React.useRef<HTMLSpanElement>(null);
  const appearance = React.useContext(Appearance);
  const savedTemplate = React.useContext(ProfileLayout);
  const template = /^\/(?:p|profile|preview\/(?:profile-editor|profiles|gigster-journey))(?:\/|$)/.test(href) ? savedTemplate : undefined;
  const [nearby, setNearby] = React.useState(false);
  const [scale, setScale] = React.useState(0);
  React.useEffect(() => {
    const el = host.current;
    if (!el) return;
    const resize = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / width));
    resize.observe(el);
    const visibility = new IntersectionObserver(([entry]) => setNearby(entry.isIntersecting), { rootMargin: "150px 0px" });
    visibility.observe(el);
    return () => { visibility.disconnect(); resize.disconnect(); };
  }, []);

  return (
    <span ref={host} inert aria-hidden="true"
      className="pointer-events-none relative block aspect-video w-full overflow-hidden rounded-lg bg-surface-sunken">
      {nearby && scale > 0 && appearance && (
        <PreviewFrame key={`${appearance}/${template ?? ""}`} template={template} href={href} as={as} title={title} scale={scale} />
      )}
    </span>
  );
}

function showsPage(frame: HTMLIFrameElement) {
  try { return !!frame.contentDocument?.documentElement?.hasAttribute("data-guide-thumbnail"); }
  catch { return false; }
}

function PreviewFrame({ href, as, title, scale, template }: PreviewProps & { scale: number; template?: string }) {
  const [status, setStatus] = React.useState<"loading" | "ready" | "unavailable">("loading");
  const frame = React.useRef<HTMLIFrameElement>(null);
  React.useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const ready = () => setStatus("ready");
    el.addEventListener(guideReadyEvent, ready);
    // The child can finish before the effect subscribes, or have delayed third-party resources.
    if (el.contentDocument?.documentElement?.hasAttribute("data-guide-ready")) ready();
    const timer = window.setTimeout(() => setStatus(showsPage(el) ? "ready" : "unavailable"), 12000);
    return () => { el.removeEventListener(guideReadyEvent, ready); window.clearTimeout(timer); };
  }, []);
  return (
    <>
      {status === "unavailable" && <span className="absolute inset-0 grid place-items-center px-2 text-center text-caption text-ink-muted">Preview unavailable</span>}
      {status === "loading" && <span className="absolute inset-0 animate-pulse bg-surface-hover motion-reduce:animate-none" />}
      <iframe ref={frame} data-guide-thumbnail="" data-profile-template={template} name={`bg-preview:${as}`} src={`${basePath}${href}`} title={`Preview of ${title}`} tabIndex={-1}
        className={cx("absolute top-0 left-0 origin-top-left max-w-none border-0", status !== "ready" && "opacity-0")}
        style={{ width, height, transform: `scale(${scale})` }}
        onLoad={(event) => {
          const el = event.currentTarget;
          if (!showsPage(el)) setStatus("unavailable");
          else if (el.contentDocument?.documentElement?.hasAttribute("data-guide-ready")) setStatus("ready");
        }} />
    </>
  );
}
