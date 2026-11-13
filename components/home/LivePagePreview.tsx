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
    const sync = () => setAppearance([root.dataset.look, root.dataset.theme, root.hasAttribute("data-unstyled") ? "unstyled" : "styled"].join("/"));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["data-look", "data-theme", "data-unstyled"] });
    return () => observer.disconnect();
  }, []);
  return (
    <Appearance.Provider value={appearance}>
      <ProfileLayout.Provider value={encodeProfileTemplate(template)}>{children}</ProfileLayout.Provider>
    </Appearance.Provider>
  );
}

type PreviewProps = { href: string; title: string; as?: string };

/*
 * Each preview is a whole page in an iframe, and the hub has dozens. Loading them all as they pass made scrolling
 * stutter and frames reload on the way back. So: a card asks for its frame only after it has been on screen briefly,
 * at most two frames load at a time, and loaded frames stay (up to eight; the ones seen longest ago go first).
 */
const MAX_LOADING = 2;
const MAX_MOUNTED = 8;
const DWELL_MS = 250;
type Slot = { visible: boolean; mounted: boolean; loading: boolean; seen: number; set: (on: boolean) => void };
const slots = new Set<Slot>();
function pump() {
  const all = [...slots];
  const mounted = all.filter((e) => e.mounted);
  if (mounted.length > MAX_MOUNTED) {
    for (const e of mounted.filter((m) => !m.visible).sort((a, b) => a.seen - b.seen).slice(0, mounted.length - MAX_MOUNTED)) {
      e.mounted = false; e.loading = false; e.set(false);
    }
  }
  let free = MAX_LOADING - all.filter((e) => e.loading).length;
  for (const e of all.filter((w) => w.visible && !w.mounted).sort((a, b) => a.seen - b.seen)) {
    if (free <= 0) break;
    e.mounted = true; e.loading = true; e.set(true); free--;
  }
}
const Loaded = React.createContext<() => void>(() => {});

export function LivePagePreview({ href, title, as = "visitor" }: PreviewProps) {
  const host = React.useRef<HTMLSpanElement>(null);
  const appearance = React.useContext(Appearance);
  const savedTemplate = React.useContext(ProfileLayout);
  const template = /^\/(?:p|profile|preview\/(?:profile-editor|profiles|gigster-journey))(?:\/|$)/.test(href) ? savedTemplate : undefined;
  const [nearby, setNearby] = React.useState(false);
  const [scale, setScale] = React.useState(0);
  const slot = React.useRef<Slot | null>(null);
  React.useEffect(() => {
    const el = host.current;
    if (!el) return;
    const me: Slot = { visible: false, mounted: false, loading: false, seen: 0, set: setNearby };
    slot.current = me; slots.add(me);
    let dwell = 0;
    const resize = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / width));
    resize.observe(el);
    const visibility = new IntersectionObserver(([entry]) => {
      window.clearTimeout(dwell);
      if (entry.isIntersecting) dwell = window.setTimeout(() => { me.visible = true; me.seen = performance.now(); pump(); }, DWELL_MS);
      else if (me.visible) { me.visible = false; me.seen = performance.now(); pump(); }
    }, { rootMargin: "100px 0px" });
    visibility.observe(el);
    return () => { window.clearTimeout(dwell); visibility.disconnect(); resize.disconnect(); slots.delete(me); pump(); };
  }, []);
  // When the appearance changes every frame reloads: they queue again.
  React.useEffect(() => {
    const me = slot.current;
    if (me?.mounted) { me.loading = true; }
  }, [appearance, template]);
  const loaded = React.useCallback(() => { const me = slot.current; if (me && me.loading) { me.loading = false; pump(); } }, []);

  return (
    <span ref={host} inert aria-hidden="true"
      className="pointer-events-none relative block aspect-video w-full overflow-hidden rounded-lg bg-surface-sunken">
      {nearby && scale > 0 && appearance && (
        <Loaded.Provider value={loaded}>
          <PreviewFrame key={`${appearance}/${template ?? ""}`} template={template} href={href} as={as} title={title} scale={scale} />
        </Loaded.Provider>
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
  const done = React.useContext(Loaded);
  // Ready or not, a settled frame frees its loading place for the next card.
  React.useEffect(() => { if (status !== "loading") done(); }, [status, done]);
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
