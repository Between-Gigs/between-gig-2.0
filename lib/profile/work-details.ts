import type {ProfileFields} from "@/lib/data/types";
import {modeLabel,insuranceLabel} from "@/lib/data/taxonomy";
import {extendedTravelLabel} from "./travel-preference";
/** Public work topics only. Contact answers and private insurance notes never enter this list. */
export function workDetailRows(f:ProfileFields,showInsurance:boolean):[string,string][]{
 return ([
  ["Work location",modeLabel[f.mode]],
  ["Travel",[f.travel.trim(),extendedTravelLabel(f.travelBeyondLA)].filter(Boolean).join(", ")],
  ["Transport",f.transport.trim()],
  ["Tools and equipment",f.tools.trim()],
  ["Insurance",showInsurance&&f.insurance==="yes"?insuranceLabel[f.insurance]:""],
 ] as [string,string][]).filter(([,value])=>!!value);
}
