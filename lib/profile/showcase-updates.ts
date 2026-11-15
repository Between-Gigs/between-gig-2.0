import type { ShowcaseItem } from "@/lib/data/types";
import { parseSample, withFit } from "./work-fit";

/** An async upload changes only its stable target; newer order, captions and removals win. */
export function applyShowcaseUpload(current: ShowcaseItem[], uploaded: ShowcaseItem, target: string | null): ShowcaseItem[] {
  return target === null ? [...current, uploaded].slice(0, 5) : current.map(item =>
    item.id === target ? { ...uploaded, id: item.id, description: item.description } : item);
}

/** Migration translates URLs only; it must never restore an earlier list or resurrect a removed item. */
export function mergeMigratedShowcase(current: ShowcaseItem[], replacements: ReadonlyMap<string, string>): ShowcaseItem[] {
  return current.map(item => {
    const { src, fit } = parseSample(item.url), replacement = replacements.get(src);
    return replacement ? { ...item, url: fit ? withFit(replacement, fit) : replacement } : item;
  });
}
