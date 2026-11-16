import {onSetSkills} from "@/lib/data/taxonomy";
import {optionKey} from "@/lib/data/companyos/fields";
export const CUSTOM_SKILL_MAX=80,SKILL_LIMIT=20;
export const customSkillsEnabled=()=>process.env.NEXT_PUBLIC_PROFILE_CUSTOM_SKILLS==="1";
export const skillIdentity=(value:string)=>value.normalize("NFKC").trim().replace(/\s+/gu," ").toLowerCase();
export function skillLabel(query:string){
 const label=query.normalize("NFC").trim().replace(/\s+/gu," ");
 return onSetSkills.find(v=>skillIdentity(v)===skillIdentity(label)||skillIdentity(optionKey(v))===skillIdentity(label))??label;
}
/** Validate only an explicit add. Stored selections are never rewritten to normalize them. */
export function skillAddError(query:string,selected:readonly string[]):string|undefined{
 if(/[\p{Cc}\p{Cf}\u2028\u2029]/u.test(query))return "Use a short skill name without hidden characters.";
 const label=skillLabel(query);
 if(!label)return "Enter a skill name.";
 if(label.length>CUSTOM_SKILL_MAX)return `Keep a skill to ${CUSTOM_SKILL_MAX} characters.`;
 if(selected.some(v=>skillIdentity(v)===skillIdentity(label)))return "That skill is already selected.";
 if(selected.length>=SKILL_LIMIT)return `Choose up to ${SKILL_LIMIT} skills. Remove one before adding another.`;
}
