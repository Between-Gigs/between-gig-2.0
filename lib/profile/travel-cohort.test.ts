import { afterEach, expect, it, vi } from "vitest";
import { completeFields } from "@/lib/data/contract/fixtures";
afterEach(()=>{vi.unstubAllEnvs();vi.resetModules();});
it("does not make an existing legacy blank-travel profile incomplete through the new UI",async()=>{
 vi.stubEnv("NEXT_PUBLIC_PROFILE_LOCATION_CONTROLS","1");vi.resetModules();
 const {defaultProfileTemplate}=await import("./template");const {validateGigster,gigsterChecklist}=await import("./validate");
 const template={...defaultProfileTemplate,travelRequirement:"legacy-optional" as const};const f={...completeFields("Fictional Legacy Crew","/media/f"),areas:[],travel:"",serviceLines:{"Interior Styling":"Style a fictional display."}};
 expect(validateGigster(f,template).travel).toBeUndefined();expect(gigsterChecklist(f,template).required.find(x=>x.id==="where")?.done).toBe(true);
});

it("derives cohort from immutable creation metadata, with an inclusive cutoff and no invented legacy date",async()=>{
 const {travelRequiredForProfile,isUtcCutoff}=await import("./location-controls");const cutoff="2026-12-01T00:00:00.000Z";
 expect(travelRequiredForProfile("2026-11-30T23:59:59.999Z",cutoff)).toBe(false);expect(travelRequiredForProfile(cutoff,cutoff)).toBe(true);expect(travelRequiredForProfile("2026-12-01T00:00:00.001Z",cutoff)).toBe(true);
 expect(travelRequiredForProfile(undefined,cutoff)).toBe(false);expect(travelRequiredForProfile(null,cutoff)).toBe(true);expect(travelRequiredForProfile("invalid",cutoff)).toBe(false);
 for(const value of ["","2026-02-30T00:00:00.000Z","2026-12-01T00:00:00Z","2026-12-01T00:00:00.000+00:00",null])expect(isUtcCutoff(value)).toBe(false);
});
