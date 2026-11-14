"use client";
import { cx } from "@ds/components/cx";
import * as React from "react";
import { encodeProfileTemplate } from "@/lib/profile/template";
import { useProfileTemplate } from "@/lib/profile/use-profile-template";
import { guideReadyEvent } from "@/lib/guide-thumbnail";
import { basePath } from "@/lib/site";

const Appearance = React.createContext("");
const ProfileLayout = React.createContext("");
export type GuidePreviewMode = "thumbnail" | "list" | "full";
export type GuidePreviewDevice = "desktop" | "mobile";
export const GuidePreviewDeviceContext = React.createContext<GuidePreviewDevice>("desktop");
const devices: Record<GuidePreviewDevice, { width: number; height: number }> = { desktop: { width: 1280, height: 720 }, mobile: { width: 390, height: 844 } };
export const GuidePreviewModeContext = React.createContext<GuidePreviewMode>("thumbnail");

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
  const mode = React.useContext(GuidePreviewModeContext);
  const device = React.useContext(GuidePreviewDeviceContext);
  const { width, height } = devices[device];
  const [pageHeight, setPageHeight] = React.useState(height);
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
    const visibility = new IntersectionObserver(([entry]) => {
      window.clearTimeout(dwell);
      if (entry.isIntersecting) dwell = window.setTimeout(() => { me.visible = true; me.seen = performance.now(); pump(); }, DWELL_MS);
      else if (me.visible) { me.visible = false; me.seen = performance.now(); pump(); }
    }, { rootMargin: "100px 0px" });
    visibility.observe(el);
    return () => { window.clearTimeout(dwell); visibility.disconnect(); slots.delete(me); pump(); };
  }, []);
  React.useEffect(() => {
    const el = host.current;
    if (!el) return;
    const resize = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / width));
    resize.observe(el);
    return () => resize.disconnect();
  }, [width]);
  // When the appearance changes every frame reloads: they queue again.
  React.useEffect(() => {
    const me = slot.current;
    if (me?.mounted) { me.loading = true; }
  }, [appearance, template, mode, device]);
  const loaded = React.useCallback(() => { const me = slot.current; if (me && me.loading) { me.loading = false; pump(); } }, []);

  return (
    <span ref={host} inert aria-hidden="true"
      data-guide-preview-mode={mode} data-guide-preview-device={device}
      className="pointer-events-none relative block w-full overflow-hidden rounded-lg bg-surface-sunken"
      style={mode === "full" && scale > 0 ? { height: Math.ceil(Math.max(height, pageHeight) * scale) } : { aspectRatio: `${width} / ${height}` }}>
      {nearby && scale > 0 && appearance && (
        <Loaded.Provider value={loaded}>
          <PreviewFrame key={`${appearance}/${template ?? ""}/${mode}/${device}`} template={template} href={href} as={as} title={title} scale={scale} mode={mode} device={device} onHeight={setPageHeight} />
        </Loaded.Provider>
      )}
    </span>
  );
}

function showsPage(frame: HTMLIFrameElement) {
  try { return !!frame.contentDocument?.documentElement?.hasAttribute("data-guide-thumbnail"); }
  catch { return false; }
}

function PreviewFrame({ href, as, title, scale, template, mode, device, onHeight }: PreviewProps & { scale: number; template?: string; mode: GuidePreviewMode; device: GuidePreviewDevice; onHeight: (height: number) => void }) {
  const { width, height } = devices[device];
  const [status, setStatus] = React.useState<"loading" | "ready" | "unavailable">("loading");
  const [documentHeight, setDocumentHeight] = React.useState(height);
  const frame = React.useRef<HTMLIFrameElement>(null);
  const done = React.useContext(Loaded);
  // Ready or not, a settled frame frees its loading place for the next card.
  React.useEffect(() => { if (status !== "loading") done(); }, [status, done]);
  React.useEffect(() => {
    if (status !== "ready") return;
    const doc = frame.current?.contentDocument;
    if (!doc?.body) return;
    let paint = 0;
    const measure = () => {
      const next = Math.max(height, doc.documentElement.scrollHeight, doc.body.scrollHeight);
      setDocumentHeight(next);
      onHeight(next);
    };
    const schedule = () => { cancelAnimationFrame(paint); paint = requestAnimationFrame(measure); };
    const observer = new ResizeObserver(schedule);
    const observeContent = () => {
      observer.observe(doc.documentElement);
      observer.observe(doc.body);
      for (const el of doc.querySelectorAll("body > *, main > *, header, footer, img, iframe")) observer.observe(el);
    };
    // Deferred sample content can overflow an unchanged viewport-sized body. Watch the content too.
    const mutations = new MutationObserver(() => { observeContent(); schedule(); });
    mutations.observe(doc.body, { childList: true, subtree: true, characterData: true });
    doc.addEventListener("load", schedule, true);
    observeContent();
    measure();
    return () => { cancelAnimationFrame(paint); observer.disconnect(); mutations.disconnect(); doc.removeEventListener("load", schedule, true); };
  }, [status, onHeight, height]);
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
      {/* A passive frame must not make its parent jump when the browser resolves a fragment anchor. */}
      <iframe ref={frame} data-guide-thumbnail="" data-profile-template={template} name={`bg-preview:${as}`} src={`${basePath}${href.split("#")[0]}`} title={`Preview of ${title}`} tabIndex={-1}
        className={cx("absolute top-0 left-0 origin-top-left max-w-none border-0", status !== "ready" && "opacity-0")}
        style={{ width, height: mode === "full" ? documentHeight : height, transform: `scale(${scale})` }}
        onLoad={(event) => {
          const el = event.currentTarget;
          if (!showsPage(el)) setStatus("unavailable");
          else if (el.contentDocument?.documentElement?.hasAttribute("data-guide-ready")) setStatus("ready");
        }} />
    </>
  );
}
