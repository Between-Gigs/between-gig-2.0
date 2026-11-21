import type { ProfileFields } from "@/lib/data/types";
import {parseSample} from './work-fit';
export const photoFileId=(sample:string):string|null=>/^\/media\/([A-Za-z0-9-]{1,64})$/.exec(parseSample(sample).src)?.[1]??null;
export const photoCaptionFor=(sample:string,captions:Record<string,string>={})=>{const id=photoFileId(sample);return id && typeof captions[id]==='string'?captions[id]:'';};
export const keepPhotoCaptions=(samples:readonly string[],captions:Record<string,string>={})=>Object.fromEntries(samples.flatMap(s=>{const id=photoFileId(s);return id && Object.hasOwn(captions,id)?[[id,captions[id]]]:[];}));

export function adoptPhotoCaptionSave(current:Record<string,string>={},sent:Record<string,string>={},saved:Record<string,string>={}) {
 return Object.fromEntries([...new Set([...Object.keys(current),...Object.keys(saved)])].flatMap(id=>{
   if (current[id]!==sent[id]) return Object.hasOwn(current,id)?[[id,current[id]]]:[];
   return Object.hasOwn(saved,id)?[[id,saved[id]]]:[];
 }));
}

type CaptionFields = Pick<ProfileFields, "photoCaptions" | "photoCaptionBaseline">;

export function reconcilePhotoCaptionSave(
  current: CaptionFields,
  localAtStart: CaptionFields,
  sent: CaptionFields,
  saved: Record<string, string>,
  touchedWhileSaving: boolean,
): CaptionFields {
  const latestBaseline = { ...saved };
  if (!touchedWhileSaving) return { photoCaptions: { ...saved }, photoCaptionBaseline: latestBaseline };

  const before = localAtStart.photoCaptions ?? {};
  const edits = current.photoCaptions ?? {};
  const expected = localAtStart.photoCaptionBaseline ?? {};
  const photoCaptions = adoptPhotoCaptionSave(edits, before, saved);
  for (const id of new Set([...Object.keys(before), ...Object.keys(edits)])) {
    if (edits[id] === before[id]) continue;
    // Advance a locally edited photo's baseline only if this save acknowledged
    // the earlier edit from this tab, not merely a newer value read from another tab.
    // Empty captions may be returned as an absent key after a successful clear.
    const acknowledged = (before[id] ?? "") !== (expected[id] ?? "") &&
      (sent.photoCaptions?.[id] ?? "") === (before[id] ?? "") &&
      (sent.photoCaptionBaseline?.[id] ?? "") === (expected[id] ?? "") &&
      (saved[id] ?? "") === (before[id] ?? "");
    if (acknowledged) continue;
    if (Object.hasOwn(expected, id)) latestBaseline[id] = expected[id]!;
    else delete latestBaseline[id];
  }
  return { photoCaptions, photoCaptionBaseline: latestBaseline };
}
