"use client";
import * as React from "react";
import {Input} from "@ds/components";
import {getCountries,getCountryCallingCode,type CountryCode} from "libphonenumber-js/min";
import {formatPhoneEntry,nationalPhoneDigits,phoneCountry,phoneEdit,selectedPhoneCountry} from "@/lib/profile/phone-input";
import {stageTwoLimits} from "@/lib/profile/stage-two";
const names=new Intl.DisplayNames(["en"],{type:"region"});
const countries=getCountries().map(code=>({code,name:names.of(code)??code,dial:getCountryCallingCode(code)})).sort((a,b)=>a.name.localeCompare(b.name));
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
 return <div className="grid min-w-0 gap-3">
  <div className="grid gap-1.5"><label htmlFor="f-phone-country" className="text-body-sm text-ink-muted">Country or region</label>
   <select id="f-phone-country" value={country} onChange={e=>{const next=e.target.value as CountryCode;setChosen(next);if(value.trim()){const digits=nationalPhoneDigits(value);onChange(formatPhoneEntry(`+${getCountryCallingCode(next)}${digits}`,next).slice(0,stageTwoLimits.bookingMobile));}input.current?.focus();}}
    className="min-h-11 min-w-0 w-full rounded-md border border-line bg-surface px-3 text-body-md text-ink focus-visible:outline-2 focus-visible:outline-focus">
    {countries.map(c=><option key={c.code} value={c.code}>{c.name} (+{c.dial})</option>)}
   </select>
  </div>
  <Input ref={input} id={id} type="tel" inputMode="tel" autoComplete="tel" maxLength={stageTwoLimits.bookingMobile} value={value} invalid={invalid} aria-describedby={[describedBy,`${id}-hint`].filter(Boolean).join(" ")} placeholder={country==="US"?"+1 (213) 555-0123":`+${getCountryCallingCode(country)} …`} onPaste={e=>{const text=e.clipboardData.getData("text").trim();if(text.startsWith("+"))setChosen(phoneCountry(text));}} onChange={edit}/>
  <p id={`${id}-hint`} className="text-body-sm text-ink-muted">Type your number or paste it with a country code. This stays private.</p>
 </div>;
}
