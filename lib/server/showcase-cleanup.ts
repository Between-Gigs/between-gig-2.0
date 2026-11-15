import type { CompanyOs, Credential } from "./companyos";
import type { ShowcaseItem } from "@/lib/data/types";
/** Retain stored media until the backend can atomically check current references.
 * A separate tab can restore a reference between a metadata save and deletion;
 * a frontend read-before-delete cannot make that operation safe.
 */
export async function cleanupShowcase(cos:CompanyOs,cred:Credential,profileId:string,previous:ShowcaseItem[]|undefined,next:ShowcaseItem[]|undefined){
 void cos; void cred; void profileId; void previous; void next;
}
