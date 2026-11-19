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
