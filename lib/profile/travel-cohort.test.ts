import { afterEach, expect, it, vi } from "vitest";
import { completeFields } from "@/lib/data/contract/fixtures";
afterEach(()=>{vi.unstubAllEnvs();vi.resetModules();});
it("does not make an existing legacy blank-travel profile incomplete through the new UI",async()=>{
 vi.stubEnv("NEXT_PUBLIC_PROFILE_LOCATION_CONTROLS","1");vi.resetModules();
 const {defaultProfileTemplate}=await import("./template");const {validateGigster,gigsterChecklist}=await import("./validate");
 const template={...defaultProfileTemplate,travelRequirement:"legacy-optional" as const};const f={...completeFields("Fictional Legacy Crew","/media/f"),areas:[],travel:"",serviceLines:{"Interior Styling":"Style a fictional display."}};
 expect(validateGigster(f,template).travel).toBeUndefined();expect(gigsterChecklist(f,template).required.find(x=>x.id==="where")?.done).toBe(true);
});
