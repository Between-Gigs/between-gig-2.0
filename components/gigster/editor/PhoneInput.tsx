"use client";
import * as React from "react";
import {ChevronDown} from "lucide-react";
import {Input} from "@ds/components";
import {getCountries,getCountryCallingCode,type CountryCode} from "libphonenumber-js/min";
import {formatPhoneEntry,nationalPhoneDigits,phoneCountry,phoneEdit,selectedPhoneCountry} from "@/lib/profile/phone-input";
import {stageTwoLimits} from "@/lib/profile/stage-two";
const names=new Intl.DisplayNames(["en"],{type:"region"});
const countries=getCountries().map(code=>({code,name:names.of(code)??code,dial:getCountryCallingCode(code)})).sort((a,b)=>a.code==="US"?-1:b.code==="US"?1:a.name.localeCompare(b.name));
export function PhoneInput({value,onChange,invalid,id="f-mobile","aria-describedby":describedBy}:{id?:string;value:string;onChange:(value:string)=>void;invalid?:boolean;"aria-describedby"?:string}){
 const [chosen,setChosen]=React.useState<CountryCode|undefined>();const country=selectedPhoneCountry(value,chosen);
 const input=React.useRef<HTMLInputElement>(null);
 const pendingCaret=React.useRef<{digits:number;end:boolean;value:string}|null>(null);
 React.useLayoutEffect(()=>{const pending=pendingCaret.current,el=input.current;pendingCaret.current=null;if(!pending||!el||document.activeElement!==el||el.value!==pending.value)return;if(pending.end){el.setSelectionRange(el.value.length,el.value.length);return;}let seen=0,pos=0;for(;pos<el.value.length&&seen<pending.digits;pos++)if(/\d/.test(el.value[pos]))seen++;el.setSelectionRange(pos,pos);},[value]);
 const edit=(e:React.ChangeEvent<HTMLInputElement>)=>{const field=e.target,raw=field.value,at=field.selectionStart??raw.length,wasEnd=at===raw.length;
  const edited=phoneEdit(value,raw,(e.nativeEvent as InputEvent).inputType,at);
  const next=formatPhoneEntry(edited.text,country).slice(0,stageTwoLimits.bookingMobile),inferred=phoneCountry(raw);if(chosen&&inferred&&getCountryCallingCode(chosen)!==getCountryCallingCode(inferred))setChosen(inferred);
  const addedPrefix=!edited.text.trim().startsWith("+")&&next.startsWith("+")?Math.max(0,next.replace(/\D/g,"").length-edited.text.replace(/\D/g,"").length):0;
  const digits=edited.text.slice(0,edited.caret).replace(/\D/g,"").length+addedPrefix;pendingCaret.current={digits,end:wasEnd,value:next};onChange(next);
 };
 const countryPicker=<div className="relative flex h-full w-16 shrink-0 items-center gap-2 rounded-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus">
   <span aria-hidden="true">{country}</span><ChevronDown aria-hidden="true"/>
   <select id={`${id}-country`} title="Country or region" value={country} onChange={e=>{const next=e.target.value as CountryCode;setChosen(next);if(value.trim()){const digits=nationalPhoneDigits(value);onChange(formatPhoneEntry(`+${getCountryCallingCode(next)}${digits}`,next).slice(0,stageTwoLimits.bookingMobile));}input.current?.focus();}}
    className="absolute inset-0 h-full w-full cursor-pointer opacity-0">
    {countries.map(c=><option key={c.code} value={c.code}>{c.name} (+{c.dial})</option>)}
   </select>
  </div>;
 return <div className="grid min-w-0 gap-3">
  <label htmlFor={`${id}-country`} className="sr-only">Country or region</label>
  <Input start={countryPicker} className="h-12 min-w-0" ref={input} id={id} type="tel" inputMode="tel" autoComplete="tel" maxLength={stageTwoLimits.bookingMobile} value={value} invalid={invalid} aria-describedby={[describedBy,`${id}-hint`].filter(Boolean).join(" ")} placeholder={country==="US"?"+1 (213) 555-0123":`+${getCountryCallingCode(country)} …`} onPaste={e=>{const text=e.clipboardData.getData("text").trim();if(text.startsWith("+"))setChosen(phoneCountry(text));}} onChange={edit}/>
  <p id={`${id}-hint`} className="text-body-sm text-ink-muted">Booking contact only, not your sign-in or SMS verification number. Type or paste with a country code. This stays private.</p>
 </div>;
}
