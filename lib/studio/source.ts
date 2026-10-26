/*
 * The app's own source, as the build exported it (scripts/studio-source.mjs → public/studio-source/). Studio's code
 * editor reads files from here. Edits made in Studio are kept per browser as drafts; the repository is never touched.
 */
import { basePath } from "@/lib/site";

export interface SourceFile { path: string; lines: number }

let manifest: Promise<SourceFile[]> | null = null;
const files = new Map<string, Promise<string>>();

export function sourceManifest(): Promise<SourceFile[]> {
  manifest ??= fetch(`${basePath}/studio-source/manifest.json`)
    .then((r) => (r.ok ? r.json() : { files: [] }))
    .then((m: { files: SourceFile[] }) => m.files)
    .catch(() => []);
  return manifest;
}

export function sourceFile(path: string): Promise<string> {
  let f = files.get(path);
  if (!f) {
    f = fetch(`${basePath}/studio-source/${path}.txt`).then((r) => {
      if (!r.ok) throw new Error(`${path} isn't in this build`);
      return r.text();
    });
    f.catch(() => files.delete(path));
    files.set(path, f);
  }
  return f;
}

const DRAFTS = "studio-code-drafts";
type Drafts = Record<string, string>;
const readDrafts = (): Drafts => { try { return JSON.parse(localStorage.getItem(DRAFTS) ?? "{}"); } catch { return {}; } };

/** Every file with a browser-only edit. */
export const draftPaths = (): string[] => Object.keys(readDrafts()).sort();

/** A browser-only edit of a source file, or undefined if it's untouched. */
export const draftOf = (path: string): string | undefined => readDrafts()[path];
export function saveDraft(path: string, text: string | undefined) {
  const d = readDrafts();
  if (text === undefined) delete d[path]; else d[path] = text;
  try { localStorage.setItem(DRAFTS, JSON.stringify(d)); } catch { /* storage full or blocked: the edit stays in memory */ }
}
