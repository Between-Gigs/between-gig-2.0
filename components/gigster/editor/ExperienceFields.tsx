"use client";
import * as React from "react";
import {Button} from "@ds/components";
import {ArrowDown,ArrowUp,GripVertical} from "lucide-react";
import {experienceOrder,moveExperienceField,parseExperienceOrder,type ExperienceField} from "@/lib/profile/experience-layout";
const key="bg2-experience-editor-order-v1",event="bg2-experience-editor-order";
let temporary: string|null=null,cachedRaw: string|null=null,cachedOrder:readonly ExperienceField[]=experienceOrder;
function read(){let raw=temporary;try{raw=localStorage.getItem(key)??temporary;}catch{/* Optional preference. */}if(raw!==cachedRaw){cachedRaw=raw;cachedOrder=parseExperienceOrder(raw);}return cachedOrder;}
function subscribe(fn:()=>void){window.addEventListener(event,fn);window.addEventListener("storage",fn);return()=>{window.removeEventListener(event,fn);window.removeEventListener("storage",fn);};}
function persist(next:readonly ExperienceField[]){temporary=JSON.stringify(next);try{localStorage.setItem(key,temporary);temporary=null;}catch{/* Keep this session's preference. */}window.dispatchEvent(new Event(event));}
const labels:Record<ExperienceField,string>={skills:"On-set skills",years:"Years in the industry",about:"Customer benefit"};
/** Rearranging the editor never rewrites answers or sends unsupported layout fields to the API. */
export function ExperienceFields({fields}:{fields:Record<ExperienceField,React.ReactNode>}){
 const order=React.useSyncExternalStore(subscribe,read,()=>experienceOrder),[arranging,setArranging]=React.useState(false);
 const move=(field:ExperienceField,direction:-1|1)=>persist(moveExperienceField(order,field,direction));
 return <div className="grid gap-4">
  <div><Button variant="ghost" size="sm" iconStart={<GripVertical/>} aria-expanded={arranging} aria-controls="experience-arrangement" onClick={()=>setArranging(v=>!v)}>Arrange editor fields</Button></div>
  {arranging&&<div id="experience-arrangement" className="grid gap-3 rounded-lg border border-line bg-surface p-4">
   <p className="text-body-sm text-ink-muted">Move fields to choose your editor layout. Your answers and public profile stay unchanged.</p>
   <ol className="grid gap-2">{order.map((field,i)=><li key={field} className="flex items-center justify-between gap-3"><span className="text-body-md text-ink">{labels[field]}</span><span className="flex gap-1">
    <Button variant="ghost" size="sm" aria-label={`Move ${labels[field]} up`} disabled={i===0} title={i===0?"Already first":"Move up"} onClick={()=>move(field,-1)}><ArrowUp aria-hidden="true" className="size-4"/></Button>
    <Button variant="ghost" size="sm" aria-label={`Move ${labels[field]} down`} disabled={i===order.length-1} title={i===order.length-1?"Already last":"Move down"} onClick={()=>move(field,1)}><ArrowDown aria-hidden="true" className="size-4"/></Button>
   </span></li>)}</ol>
  </div>}
  <div className="grid items-start gap-5 lg:grid-cols-12">
   <div className="grid min-w-0 gap-5 lg:col-span-5"><div data-experience-field={order[0]} className="grid min-w-0 content-start gap-3 rounded-lg border border-line bg-surface p-4 sm:p-5">{fields[order[0]]}</div></div>
   <div className="grid min-w-0 gap-5 lg:col-span-7">{order.slice(1).map(field=><div key={field} data-experience-field={field} className="grid min-w-0 content-start gap-3 rounded-lg border border-line bg-surface p-4 sm:p-5">{fields[field]}</div>)}</div>
  </div>
 </div>;
}
