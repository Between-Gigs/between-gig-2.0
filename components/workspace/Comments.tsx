"use client";
import { Button, IconButton, Textarea, cx } from "@ds/components";
import { Check, MessageSquarePlus, RotateCcw, Send, Trash2, X } from "lucide-react";
import * as React from "react";
import { ago, comments, ME, useLocal, type Thread } from "@/lib/workspace/local";

/*
 * Comment mode, like Framer's and Webflow's: with it on, click anywhere on the page to pin a comment there; pins
 * stay on the page (they scroll with it), open into a thread you can reply to, resolve or reopen. Kept in this
 * browser for now; the backend will share them with the team and the client.
 */

/** Follows the framed page's scroll and size, so pins move with it. */
function useFrameScroll(frame: React.RefObject<HTMLIFrameElement | null>, nonce: unknown) {
  const [pos, setPos] = React.useState({ y: 0, h: 0 });
  React.useEffect(() => {
    const el = frame.current;
    if (!el) return;
    let win: Window | null = null;
    const read = () => { try { const w = el.contentWindow; if (w) setPos({ y: w.scrollY, h: w.document.documentElement.scrollHeight }); } catch { /* not ours */ } };
    const attach = () => {
      try { win?.removeEventListener("scroll", read); win = el.contentWindow; win?.addEventListener("scroll", read, { passive: true }); } catch { /* ignore */ }
      read();
    };
    attach();
    el.addEventListener("load", attach);
    return () => { el.removeEventListener("load", attach); try { win?.removeEventListener("scroll", read); } catch { /* ignore */ } };
  }, [frame, nonce]);
  return pos;
}

export function CommentLayer({ project, page, label, frame, nonce, on, active, onActive }: {
  project: string; page: string; label: string; frame: React.RefObject<HTMLIFrameElement | null>; nonce: unknown;
  on: boolean; active: string | null; onActive: (id: string | null) => void;
}) {
  const { s } = useLocal();
  const layer = React.useRef<HTMLDivElement>(null);
  const { y: scrollY } = useFrameScroll(frame, nonce);
  const [draft, setDraft] = React.useState<{ x: number; y: number } | null>(null);
  const threads = s.threads.filter((t) => t.project === project && t.page === page);
  const shown = threads.filter((t) => !t.resolved || t.id === active);
  // The layer's size, measured (not read from the ref while rendering), so pins follow resizes and device widths.
  const [{ width, height }, setSize] = React.useState({ width: 0, height: 0 });
  React.useEffect(() => {
    const el = layer.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ width: el.clientWidth, height: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  React.useEffect(() => { if (!on) setDraft(null); }, [on]); // eslint-disable-line react-hooks/set-state-in-effect

  const place = (e: React.MouseEvent) => {
    if (!on || e.target !== e.currentTarget) return;
    const r = e.currentTarget.getBoundingClientRect();
    onActive(null);
    setDraft({ x: (e.clientX - r.left) / r.width, y: e.clientY - r.top + scrollY });
  };
  const numberOf = (t: Thread) => threads.indexOf(t) + 1;

  return (
    <div ref={layer} onClick={place} aria-hidden={!on && shown.length === 0}
      className={cx("absolute inset-0 z-raised overflow-hidden", on ? "cursor-crosshair bg-info/5" : "pointer-events-none")}>
      {shown.map((t) => {
        const top = t.y - scrollY, left = t.x * width;
        if (top < -24 || top > height + 24) return null;
        return (
          <React.Fragment key={t.id}>
            <button type="button" onClick={(e) => { e.stopPropagation(); setDraft(null); onActive(active === t.id ? null : t.id); }}
              aria-label={`Comment ${numberOf(t)}: ${t.messages[0]?.text.slice(0, 60)}${t.resolved ? " (resolved)" : ""}`} aria-expanded={active === t.id}
              style={{ left, top }}
              className={cx("pointer-events-auto absolute grid size-8 -translate-x-1/2 -translate-y-full place-items-center rounded-full rounded-bl-none border-2 border-surface text-label-sm shadow-md transition-transform duration-fast hover:scale-110",
                t.resolved ? "bg-surface-sunken text-ink-subtle" : "bg-ink-brand text-bg", active === t.id && "scale-110 ring-4 ring-ink-brand/30")}>
              {numberOf(t)}
            </button>
            {active === t.id && <ThreadCard t={t} n={numberOf(t)} label={label} left={left} top={top} width={width} onClose={() => onActive(null)} />}
          </React.Fragment>
        );
      })}
      {draft && (
        <>
          <span aria-hidden="true" style={{ left: draft.x * width, top: draft.y - scrollY }} className="absolute grid size-8 -translate-x-1/2 -translate-y-full place-items-center rounded-full rounded-bl-none border-2 border-surface bg-ink-brand text-bg shadow-md"><MessageSquarePlus className="size-4" /></span>
          <Composer left={draft.x * width} top={draft.y - scrollY} width={width} label="New comment" placeholder="On this spot." submit="Comment"
            onCancel={() => setDraft(null)}
            onSubmit={(text) => {
              const id = comments.add({ project, page, x: draft.x, y: draft.y, width }, text, label);
              setDraft(null);
              onActive(id);
            }} />
        </>
      )}
    </div>
  );
}

/** A card beside a pin, kept inside the frame. */
function Card({ left, top, width, children, label }: { left: number; top: number; width: number; children: React.ReactNode; label: string }) {
  const w = 320;
  const x = Math.max(8, Math.min(left + 18, width - w - 8));
  return (
    <div role="dialog" aria-label={label} onClick={(e) => e.stopPropagation()} style={{ left: x, top: Math.max(8, top - 12), width: w }}
      className="pointer-events-auto absolute z-popover grid max-w-full gap-3 rounded-xl border border-line bg-surface-raised p-3 text-ink shadow-lg">
      {children}
    </div>
  );
}

function Composer({ left, top, width, label, placeholder, submit, onSubmit, onCancel }: {
  left: number; top: number; width: number; label: string; placeholder: string; submit: string; onSubmit: (text: string) => void; onCancel: () => void;
}) {
  const [text, setText] = React.useState("");
  return (
    <Card left={left} top={top} width={width} label={label}>
      <Textarea aria-label="Your comment" aria-describedby="comment-hint" rows={3} autoFocus value={text} onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); onCancel(); } if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && text.trim()) onSubmit(text.trim()); }} />
      <div className="flex items-center justify-between gap-2">
        <span id="comment-hint" className="text-caption text-ink-subtle">{placeholder} ⌘↵ posts.</span>
        <span className="flex gap-1.5"><Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button><Button size="sm" variant="primary" iconStart={<Send />} onClick={() => text.trim() && onSubmit(text.trim())}>{submit}</Button></span>
      </div>
    </Card>
  );
}

function ThreadCard({ t, n, label, left, top, width, onClose }: { t: Thread; n: number; label: string; left: number; top: number; width: number; onClose: () => void }) {
  const [reply, setReply] = React.useState("");
  const send = () => { if (reply.trim()) { comments.reply(t.id, reply.trim(), label); setReply(""); } };
  return (
    <Card left={left} top={top} width={width} label={`Comment ${n}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-label-md text-ink">Comment {n}{t.resolved && <span className="ml-2 text-caption text-success">Resolved</span>}</p>
        <span className="flex">
          <IconButton size="sm" variant="ghost" label={t.resolved ? "Reopen" : "Resolve"} icon={t.resolved ? <RotateCcw /> : <Check />} onClick={() => { comments.resolve(t.id, !t.resolved, label); if (!t.resolved) onClose(); }} />
          <IconButton size="sm" variant="ghost" label="Delete thread" icon={<Trash2 />} onClick={() => { comments.remove(t.id); onClose(); }} />
          <IconButton size="sm" variant="ghost" label="Close" icon={<X />} onClick={onClose} />
        </span>
      </div>
      <ol className="grid max-h-60 gap-2.5 overflow-y-auto">
        {t.messages.map((m) => (
          <li key={m.id} className="grid gap-0.5">
            <span className="text-caption text-ink-subtle"><b className="font-semibold text-ink-muted">{m.by}</b> · {ago(m.at)}</span>
            <p className="text-body-sm whitespace-pre-line text-ink">{m.text}</p>
          </li>
        ))}
      </ol>
      {!t.resolved && (
        <div className="grid gap-2">
          <Textarea aria-label="Reply" rows={2} value={reply} onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(); }} />
          <div className="flex justify-end"><Button size="sm" variant="secondary" iconStart={<Send />} onClick={send}>Reply</Button></div>
        </div>
      )}
    </Card>
  );
}

/** The page's comments, for the details bar: open ones first, each opens its pin. */
export function CommentList({ project, page, onOpen }: { project: string; page: string; onOpen: (t: Thread) => void }) {
  const { s } = useLocal();
  const [resolved, setResolved] = React.useState(false);
  const threads = s.threads.filter((t) => t.project === project && t.page === page);
  const open = threads.filter((t) => !t.resolved);
  const list = resolved ? threads : open;
  return (
    <section className="grid gap-2 border-t border-line p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-label-sm text-ink-muted">Comments <span className="tabular-nums">{open.length}</span></h3>
        {threads.length > open.length && <button type="button" onClick={() => setResolved(!resolved)} className="inline-flex min-h-8 items-center text-caption text-link underline-offset-2 hover:underline">{resolved ? "Hide resolved" : `Show resolved (${threads.length - open.length})`}</button>}
      </div>
      {list.length === 0 ? (
        <p className="text-body-sm text-ink-muted">No comments yet. Turn on Comment (C) and click anywhere on the page to pin one.</p>
      ) : (
        <ol className="grid gap-1">
          {list.map((t) => (
            <li key={t.id}>
              <button type="button" onClick={() => onOpen(t)} className="flex min-h-11 w-full items-start gap-2.5 rounded-md px-2 py-2 text-left hover:bg-surface-hover">
                <span className={cx("grid size-6 shrink-0 place-items-center rounded-full rounded-bl-none text-caption", t.resolved ? "bg-surface-sunken text-ink-subtle" : "bg-ink-brand text-bg")}>{threads.indexOf(t) + 1}</span>
                <span className="grid min-w-0">
                  <span className="line-clamp-2 text-body-sm text-ink">{t.messages[0]?.text}</span>
                  <span className="text-caption text-ink-subtle">{t.messages[0]?.by ?? ME} · {ago(t.messages[t.messages.length - 1].at)}{t.messages.length > 1 && ` · ${t.messages.length - 1} ${t.messages.length === 2 ? "reply" : "replies"}`}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
