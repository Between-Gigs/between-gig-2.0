"use client";
import * as React from "react";
import {Button,Input} from "@ds/components";
import {Plus,X} from "lucide-react";
import {onSetSkills} from "@/lib/data/taxonomy";
import {CUSTOM_SKILL_MAX,SKILL_LIMIT,addSkillEntries,skillIdentity,skillLabel} from "@/lib/profile/skills";

/** Search suggestions and add a plain-text skill; existing selections stay lossless. */
export function SkillPicker({value,onChange,describedBy}:{value:string[];onChange:(values:string[],added?:string)=>void;describedBy?:string}){
 const [query,setQuery]=React.useState("");const [error,setError]=React.useState<string|undefined>();const input=React.useRef<HTMLInputElement>(null);
 const add=(raw:string)=>{const result=addSkillEntries(raw,value);if(result.error){setError(result.error);return;}const next=result.values!;onChange(next,next.find(v=>!value.includes(v)));setQuery("");setError(undefined);input.current?.focus();};
 const remove=(at:number)=>{onChange(value.filter((_,i)=>i!==at));setError(undefined);input.current?.focus();};
 const matches=onSetSkills.filter(v=>skillIdentity(v).includes(skillIdentity(query))&&!value.some(s=>skillIdentity(s)===skillIdentity(v)));
 const label=skillLabel(query),selected=value.some(v=>skillIdentity(v)===skillIdentity(label));
 return <div className="grid min-w-0 gap-3" aria-describedby={describedBy}>
  <label htmlFor="f-skills-search" className="text-body-sm text-ink-muted">Search for a skill or add your own.</label>
  <Input ref={input} id="f-skills-search" type="search" value={query} maxLength={CUSTOM_SKILL_MAX*SKILL_LIMIT} placeholder="Type a skill, then comma or Enter" aria-label="Search on-set skills" aria-describedby={["f-skills-hint",describedBy,error?"f-skills-add-error":undefined].filter(Boolean).join(" ")} invalid={!!error} onChange={e=>{setQuery(e.target.value);setError(undefined);}} onPaste={e=>{const text=e.clipboardData.getData("text");if(/[,\r\n]/.test(text)){e.preventDefault();const start=e.currentTarget.selectionStart??query.length,end=e.currentTarget.selectionEnd??start;add(query.slice(0,start)+text+query.slice(end));}}} onKeyDown={e=>{if(e.nativeEvent.isComposing)return;if(e.key==="Enter"||e.key===","){e.preventDefault();add(query);}if(e.key==="Escape"){setQuery("");setError(undefined);}}}/>
  <p id="f-skills-hint" className="text-body-sm text-ink-muted">Choose a suggestion, or type a skill and press comma or Enter. Up to {SKILL_LIMIT}. Selected skills appear on your profile after approval.</p>
  <p role="status" className="sr-only">{value.length} skills selected.</p>
  <section aria-labelledby="f-selected-skills-title" className="grid min-w-0 gap-3 rounded-lg border border-ink-brand bg-tint-mint-soft p-3 sm:p-4">
   <div className="flex items-center justify-between gap-3"><h4 id="f-selected-skills-title" className="text-label-md font-semibold text-ink">Selected skills</h4><span className="text-body-sm font-semibold text-ink">{value.length} of {SKILL_LIMIT}</span></div>
   <p id="f-selected-skills-hint" className="text-body-sm text-ink-muted">Your profile skills. Use × to remove one.</p>
   <div role="group" aria-label="Selected on-set skills" aria-describedby="f-selected-skills-hint" className="flex min-w-0 flex-wrap gap-2">
    {value.length ? value.map((v,i)=><button key={`${i}:${v}`} type="button" aria-label={`Remove skill ${v}`} onClick={()=>remove(i)} className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border border-action bg-action px-3 py-2 text-left text-label-sm font-semibold text-on-action focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"><span className="min-w-0 [overflow-wrap:anywhere]">{v}</span><X aria-hidden="true" className="size-4 shrink-0"/></button>) : <p className="text-body-sm text-ink-muted">No skills selected yet.</p>}
   </div>
  </section>
  <section aria-labelledby="f-suggested-skills-title" className="mt-1 grid min-w-0 gap-3 border-t border-line-strong pt-4">
   <div className="grid gap-1"><h4 id="f-suggested-skills-title" className="text-label-md font-semibold text-ink">Suggested skills</h4><p id="f-suggested-skills-hint" className="text-body-sm text-ink-muted">Use + to add a suggestion to your selected skills.</p></div>
   <div role="group" aria-label="Suggested on-set skills" aria-describedby="f-suggested-skills-hint" className="flex min-w-0 flex-wrap gap-2">
    {matches.map(v=><button key={v} type="button" aria-label={`Add skill ${v}`} disabled={value.length>=SKILL_LIMIT} aria-describedby={value.length>=SKILL_LIMIT?"f-skill-limit":undefined} onClick={()=>add(v)} className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border border-line-strong bg-transparent px-3 py-2 text-left text-label-sm text-ink hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50"><Plus aria-hidden="true" className="size-4 shrink-0"/><span className="min-w-0 [overflow-wrap:anywhere]">{v}</span></button>)}
   </div>
   {!matches.length&&<p className="text-body-sm text-ink-muted">{query.trim()?"No matching suggestions. You can add your own above.":"All suggestions are selected. You can add your own above."}</p>}
   {value.length>=SKILL_LIMIT&&<p id="f-skill-limit" role="status" className="text-body-sm text-ink-muted">Remove a selected skill before adding another.</p>}
  </section>
  {query.trim()&&!selected&&<Button id="f-skill-add" variant="secondary" onClick={()=>add(query)} disabled={value.length>=SKILL_LIMIT} className="max-w-full justify-self-start whitespace-normal text-left [overflow-wrap:anywhere]">Add “{label}”</Button>}
  {error&&<p id="f-skills-add-error" role="alert" className="text-body-sm text-danger">{error}</p>}
 </div>;
}
