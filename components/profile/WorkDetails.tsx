import type {ProfileFields} from "@/lib/data/types";
import {workDetailRows} from "@/lib/profile/work-details";
export function WorkDetails({fields,showInsurance}:{fields:ProfileFields;showInsurance:boolean}){
 return <dl className="grid gap-4 sm:grid-cols-2">{workDetailRows(fields,showInsurance).map(([label,value])=><div key={label} className="grid min-w-0 content-start gap-1 border-t border-line pt-3"><dt className="text-body-sm font-semibold text-ink-muted">{label}</dt><dd className="whitespace-pre-line break-words text-body-md text-ink">{value}</dd></div>)}</dl>;
}
