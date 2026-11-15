import type { CompanyOs, Credential } from "./companyos";
import type { ShowcaseItem } from "@/lib/data/types";
const ids=(items:ShowcaseItem[]|undefined)=>new Set((items??[]).flatMap(i=>[i.url,i.thumbnail??""]).flatMap(url=>{const m=/^\/media\/([0-9a-f-]{36})(?:#.*)?$/i.exec(url);return m?[m[1]]:[];}));
/** After metadata is saved, remove only formerly referenced portfolio files owned by this profile. */
export async function cleanupShowcase(cos:CompanyOs,cred:Credential,profileId:string,previous:ShowcaseItem[]|undefined,next:ShowcaseItem[]|undefined){
 const retained=ids(next),removed=new Set([...ids(previous)].filter(id=>!retained.has(id)));if(!removed.size)return;
 const files=await cos.query(cred,{entity:"file",filter:{field:"owner_id",op:"eq",value:profileId},limit:50});
 for(const file of files)if(removed.has(file.id)&&file.data.owner_id===profileId&&file.data.owner_entity==="profile"&&["portfolio","portfolio_video"].includes(String(file.data.kind)))await cos.remove(cred,"file",file.id);
}
