/*
 * The workspace's own data, kept in this browser until there's a backend: comments pinned on pages, changes to
 * projects (renamed, moved, duplicated, archived, in the trash), published versions and notifications.
 * One small store with a subscribe, so every part of the shell sees a change at once.
 */
import * as React from "react";
import { folders as baseFolders, projects as baseProjects, type FolderId, type Project } from "./projects";

export interface Message { id: string; by: string; at: string; text: string }
export interface Thread {
  id: string;
  project: string;
  page: string;
  /** Where it's pinned: x as a share of the page's width, y in page pixels from the top. */
  x: number;
  y: number;
  /** The width the page was at when pinned, so pins line up again at the same width. */
  width: number;
  messages: Message[];
  resolved: boolean;
}
export interface Version { n: number; at: string; by: string; note: string; restoredFrom?: number }
export interface WsEvent { id: string; at: string; kind: "comment" | "reply" | "resolve" | "publish" | "restore" | "project"; text: string; href: string }
export interface Folder { id: string; name: string }

interface State {
  threads: Thread[];
  /** Per project: name, folder, archived or trashed, over the built-in list; plus projects made here. */
  edits: Record<string, { name?: string; folder?: string; archived?: boolean; trashed?: string; gone?: boolean }>;
  made: (Project & { duplicateOf?: string })[];
  folders: Folder[];
  versions: Record<string, Version[]>;
  events: WsEvent[];
  readAt: string;
}

const KEY = "bg-ws-local";
const empty = (): State => ({ threads: [], edits: {}, made: [], folders: [], versions: {}, events: [], readAt: "1970-01-01T00:00:00Z" });
let cache: State | null = null;
const subs = new Set<() => void>();
const load = (): State => {
  if (cache) return cache;
  try { const raw = localStorage.getItem(KEY); cache = raw ? { ...empty(), ...(JSON.parse(raw) as State) } : empty(); } catch { cache = empty(); }
  return cache;
};
const save = (fn: (s: State) => State) => {
  cache = fn(load());
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* storage full or blocked: kept for this visit */ }
  subs.forEach((f) => f());
};

export const uid = () => Math.random().toString(36).slice(2, 9);
const now = () => new Date().toISOString();
export const ME = "You";

/** The workspace's local state. Empty until mounted, so the static build and the first paint agree. */
export function useLocal() {
  const [s, setS] = React.useState<State>(empty);
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    const sync = () => setS(load());
    sync();
    setReady(true); // eslint-disable-line react-hooks/set-state-in-effect
    subs.add(sync);
    return () => { subs.delete(sync); };
  }, []);
  return { s, ready };
}

const event = (e: Omit<WsEvent, "id" | "at">) => (st: State): State => ({ ...st, events: [{ ...e, id: uid(), at: now() }, ...st.events].slice(0, 60) });

/* Comments */
export const comments = {
  add(t: Omit<Thread, "id" | "messages" | "resolved">, text: string, label: string) {
    const id = uid();
    save((st) => event({ kind: "comment", text: `${ME} commented on ${label}: “${text.slice(0, 60)}”`, href: `/workspace/${t.project}/?page=${t.page}&thread=${id}` })(
      { ...st, threads: [...st.threads, { ...t, id, resolved: false, messages: [{ id: uid(), by: ME, at: now(), text }] }] }));
    return id;
  },
  reply(id: string, text: string, label: string) {
    save((st) => {
      const th = st.threads.find((x) => x.id === id);
      const next = { ...st, threads: st.threads.map((x) => (x.id === id ? { ...x, messages: [...x.messages, { id: uid(), by: ME, at: now(), text }] } : x)) };
      return th ? event({ kind: "reply", text: `${ME} replied on ${label}: “${text.slice(0, 60)}”`, href: `/workspace/${th.project}/?page=${th.page}&thread=${id}` })(next) : next;
    });
  },
  resolve(id: string, resolved: boolean, label: string) {
    save((st) => {
      const th = st.threads.find((x) => x.id === id);
      const next = { ...st, threads: st.threads.map((x) => (x.id === id ? { ...x, resolved } : x)) };
      return th && resolved ? event({ kind: "resolve", text: `${ME} resolved a comment on ${label}`, href: `/workspace/${th.project}/?page=${th.page}&thread=${id}` })(next) : next;
    });
  },
  remove(id: string) { save((st) => ({ ...st, threads: st.threads.filter((x) => x.id !== id) })); },
};

/* Projects: the built-in list with this browser's changes applied. */
export function mergedProjects(s: State) {
  const all = [...baseProjects, ...s.made].map((p) => {
    const e = s.edits[p.id] ?? {};
    return { ...p, name: e.name ?? p.name, folder: (e.folder ?? p.folder) as FolderId, archived: !!e.archived, trashed: e.trashed, gone: !!e.gone, made: s.made.some((m) => m.id === p.id) };
  });
  return all.filter((p) => !p.gone);
}
export type WsProject = ReturnType<typeof mergedProjects>[number];
export const allFolders = (s: State): { id: string; name: string; sub?: string; custom?: boolean }[] => [...baseFolders, ...s.folders.map((f) => ({ ...f, custom: true }))];

const edit = (id: string, patch: State["edits"][string]) => (st: State): State => ({ ...st, edits: { ...st.edits, [id]: { ...st.edits[id], ...patch } } });
export const projectsStore = {
  rename(id: string, name: string) { save(edit(id, { name })); },
  move(id: string, folder: string) { save(edit(id, { folder })); },
  archive(id: string, archived: boolean) { save(edit(id, { archived })); },
  trash(id: string) { save(edit(id, { trashed: now(), archived: false })); },
  restore(id: string) { save(edit(id, { trashed: undefined })); },
  /** Forever: projects made here go; built-in ones are hidden in this browser. */
  destroy(id: string) { save((st) => ({ ...edit(id, { gone: true })(st), made: st.made.filter((m) => m.id !== id) })); },
  duplicate(p: Project, name: string) {
    const id = `${p.id}-copy-${uid()}`;
    save((st) => event({ kind: "project", text: `${ME} duplicated ${p.name} as ${name}`, href: `/workspace/${id}/` })({ ...st, made: [...st.made, { ...p, id, name, updated: now().slice(0, 10), duplicateOf: p.id }] }));
    return id;
  },
  addFolder(name: string) { const id = `f-${uid()}`; save((st) => ({ ...st, folders: [...st.folders, { id, name }] })); return id; },
  renameFolder(id: string, name: string) { save((st) => ({ ...st, folders: st.folders.map((f) => (f.id === id ? { ...f, name } : f)) })); },
};

/* Versions: publishing records a numbered version with a note; restoring records a new version from an old one. */
export const versionsStore = {
  publish(project: string, label: string, note: string) {
    save((st) => {
      const list = st.versions[project] ?? [];
      const n = (list[0]?.n ?? 0) + 1;
      return event({ kind: "publish", text: `${ME} published ${label} v${n}${note ? `: ${note}` : ""}`, href: `/workspace/${project}/` })({ ...st, versions: { ...st.versions, [project]: [{ n, at: now(), by: ME, note }, ...list] } });
    });
  },
  restore(project: string, label: string, from: number) {
    save((st) => {
      const list = st.versions[project] ?? [];
      const n = (list[0]?.n ?? 0) + 1;
      return event({ kind: "restore", text: `${ME} restored ${label} to v${from} (now v${n})`, href: `/workspace/${project}/` })({ ...st, versions: { ...st.versions, [project]: [{ n, at: now(), by: ME, note: `Restored v${from}`, restoredFrom: from }, ...list] } });
    });
  },
};

export const notifications = { markRead() { save((st) => ({ ...st, readAt: now() })); } };

/** "3 min ago", "2 h ago", "Oct 27". */
export function ago(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Where a project opens: built-in ones have their own route; ones made in this browser open through /workspace/open/. */
export const projectHref = (p: { id: string; made?: boolean }, page?: string) =>
  p.made ? `/workspace/open/?p=${p.id}${page ? `&page=${page}` : ""}` : `/workspace/${p.id}/${page ? `?page=${page}` : ""}`;
