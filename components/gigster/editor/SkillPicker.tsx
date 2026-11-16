"use client";
import * as React from "react";
import {Button,Input} from "@ds/components";
import {cx} from "@ds/components/cx";
import {Check,X} from "lucide-react";
import {onSetSkills} from "@/lib/data/taxonomy";
import {CUSTOM_SKILL_MAX,SKILL_LIMIT,skillAddError,skillIdentity,skillLabel} from "@/lib/profile/skills";

/** Search suggestions and add a plain-text skill; existing selections stay lossless. */
export function SkillPicker({value,onChange,describedBy}:{value:string[];onChange:(values:string[],added?:string)=>void;describedBy?:string}){
 const [query,setQuery]=React.useState("");const [error,setError]=React.useState<string|undefined>();const input=React.useRef<HTMLInputElement>(null);
 const add=(raw:string)=>{const problem=skillAddError(raw,value);if(problem){setError(problem);return;}const label=skillLabel(raw);onChange([...value,label],label);setQuery("");setError(undefined);input.current?.focus();};
 const remove=(at:number)=>{onChange(value.filter((_,i)=>i!==at));setError(undefined);input.current?.focus();};
 const matches=onSetSkills.filter(v=>skillIdentity(v).includes(skillIdentity(query)));
 const label=skillLabel(query),selected=value.some(v=>skillIdentity(v)===skillIdentity(label));
 return <div className="grid min-w-0 gap-3" aria-describedby={describedBy}>
  <label htmlFor="f-skills-search" className="text-body-sm text-ink-muted">Search for a skill or add your own.</label>
  <Input ref={input} id="f-skills-search" type="search" value={query} maxLength={CUSTOM_SKILL_MAX} placeholder="Search on-set skills" aria-label="Search on-set skills" aria-describedby={["f-skills-hint",describedBy,error?"f-skills-add-error":undefined].filter(Boolean).join(" ")} invalid={!!error} onChange={e=>{setQuery(e.target.value);setError(undefined);}} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();add(query);}if(e.key==="Escape"){setQuery("");setError(undefined);}}}/>
  <p id="f-skills-hint" className="text-body-sm text-ink-muted">Choose suggestions or add a short skill name. Up to {SKILL_LIMIT}. Selected skills appear on your profile after approval.</p>
  <p role="status" className="sr-only">{value.length} skills selected.</p>
  <div role="group" aria-label="Selected on-set skills" className="flex min-w-0 flex-wrap gap-2">
   {value.map((v,i)=><button key={`${i}:${v}`} type="button" aria-label={`Remove skill ${v}`} onClick={()=>remove(i)} className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border border-ink-brand bg-tint-mint-soft px-3 py-2 text-left text-label-sm text-ink"><span className="min-w-0 [overflow-wrap:anywhere]">{v}</span><X aria-hidden="true" className="size-4 shrink-0"/></button>)}
  </div>
  <div role="group" aria-label="Suggested on-set skills" className="flex min-w-0 flex-wrap gap-2">
   {matches.map(v=>{const index=value.findIndex(s=>skillIdentity(s)===skillIdentity(v));const on=index>=0;return <button key={v} type="button" aria-pressed={on} disabled={!on&&value.length>=SKILL_LIMIT} onClick={()=>on?remove(index):add(v)} className={cx("inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border px-3 py-2 text-left text-label-sm focus-visible:outline-2 focus-visible:outline-focus",on?"border-ink-brand bg-tint-mint-soft text-ink":"border-line text-ink-muted hover:bg-surface-hover","disabled:opacity-50")}><span className="min-w-0 [overflow-wrap:anywhere]">{v}</span>{on&&<Check aria-hidden="true" className="size-4 shrink-0"/>}</button>;})}
  </div>
  {query.trim()&&!selected&&<Button id="f-skill-add" variant="secondary" onClick={()=>add(query)} disabled={value.length>=SKILL_LIMIT} className="max-w-full justify-self-start whitespace-normal text-left [overflow-wrap:anywhere]">Add “{label}”</Button>}
  {error&&<p id="f-skills-add-error" role="alert" className="text-body-sm text-danger">{error}</p>}
 </div>;
}
