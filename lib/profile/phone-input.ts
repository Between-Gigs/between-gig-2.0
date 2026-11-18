import {AsYouType,parsePhoneNumberFromString,type CountryCode} from "libphonenumber-js/min";
export const phoneCountry=(value:string):CountryCode|undefined=>{
 if(!value.trim().startsWith("+"))return undefined;
 const formatter=new AsYouType();formatter.input(value);return formatter.getCountry();
};
export function nationalPhoneDigits(value:string){
 const parsed=parsePhoneNumberFromString(value);if(parsed)return String(parsed.nationalNumber);
 const digits=value.replace(/\D/g,"");if(!value.trim().startsWith("+"))return digits;
 const formatter=new AsYouType();formatter.input(value);const code=formatter.getCallingCode();return code?digits.slice(code.length):digits;
}
/** Format only an explicit edit. A saved phone number is never reformatted merely by viewing the editor. */
export function formatPhoneEntry(raw:string,country:CountryCode):string{
 if(!raw.trim())return "";
 if(/[^\d+ ()-]/.test(raw))return raw;
 const international=raw.trim().startsWith("+");
 const formatter=new AsYouType(international?undefined:country);const formatted=formatter.input(raw);
 const number=formatter.getNumber();
 if(number){if(number.countryCallingCode!=="1")return new AsYouType().input(String(number.number));const local=new AsYouType(number.country??country).input(String(number.nationalNumber));return `+${number.countryCallingCode}${local?` ${local}`:""}`;}
 return formatted;
}

/** Explicit country choices win for shared calling codes; a different international prefix wins on external updates. */
export function selectedPhoneCountry(value:string,chosen?:CountryCode):CountryCode{
 const inferred=phoneCountry(value);
 return chosen&&(!inferred||callingCode(chosen)===callingCode(inferred))?chosen:inferred??"US";
}
import {getCountryCallingCode as callingCode} from "libphonenumber-js/min";

/** Delete through generated separators without trapping the cursor or shifting its digit rank. */
export function phoneEdit(previous:string,raw:string,inputType:string,caret:number):{text:string;caret:number}{
 if(!["deleteContentBackward","deleteContentForward"].includes(inputType)||raw.length>=previous.length||raw.replace(/\D/g,"")!==previous.replace(/\D/g,"")||/[^\d+ ()-]/.test(previous))return {text:raw,caret};
 if(inputType==="deleteContentBackward"){for(let i=caret-1;i>=0;i--)if(/\d/.test(raw[i]))return {text:raw.slice(0,i)+raw.slice(i+1),caret:caret-1};}
 else {for(let i=caret;i<raw.length;i++)if(/\d/.test(raw[i]))return {text:raw.slice(0,i)+raw.slice(i+1),caret};}
 return {text:raw,caret};
}
export const phoneEditText=(previous:string,raw:string,inputType:string,caret:number)=>phoneEdit(previous,raw,inputType,caret).text;
