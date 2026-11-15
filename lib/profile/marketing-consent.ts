import type {ProfileFields} from "@/lib/data/types";
/** An unchanged/stale draft cannot opt a person back in after an email unsubscribe. */
export function marketingPreferenceChange(f:ProfileFields):boolean|undefined{
 if(typeof f.marketingEmailConsent!=="boolean")return undefined;
 if(typeof f.marketingConsentBaseline==="boolean"&&f.marketingEmailConsent!==f.marketingConsentBaseline)return f.marketingEmailConsent===true;
 if(f.marketingEmailConsent===false&&f.marketingPreferenceConfigured!==true)return false;
 return undefined;
}
