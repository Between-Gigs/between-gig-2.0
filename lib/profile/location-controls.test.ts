import { afterEach, describe, expect, it, vi } from "vitest";
import { completeFields } from "@/lib/data/contract/fixtures";

afterEach(()=>{vi.unstubAllEnvs();vi.resetModules();});
describe("Patti location controls compatibility",()=>{
 it("removes invisible LA area errors but requires travel in the new mode",async()=>{
  vi.stubEnv("NEXT_PUBLIC_PROFILE_LOCATION_CONTROLS","1");vi.resetModules();
  const {validateGigster}=await import("./validate");const {defaultProfileTemplate}=await import("./template");
  const f={...completeFields("Fictional Crew","/media/f"),market:"la" as const,areas:[],zip:"90026",travel:""};
  const errors=validateGigster(f,defaultProfileTemplate);expect(errors.areas).toBeUndefined();expect(errors.travel).toBe("Choose a travel radius.");
  expect(validateGigster({...f,travel:"Up to 15 miles"},defaultProfileTemplate)).toEqual({});
 });
 it("adds travel to saved legacy templates without discarding other rules or history",async()=>{
  vi.stubEnv("NEXT_PUBLIC_PROFILE_LOCATION_CONTROLS","1");vi.resetModules();
  const {parseProfileTemplate,defaultProfileTemplate,encodeProfileTemplate}=await import("./template");
  const legacy={...defaultProfileTemplate,required:["name","tools"] as const};
  const parsed=parseProfileTemplate(JSON.stringify({...legacy,version:1}))!;expect(parsed.required).toEqual(["name","travel","tools"]);expect(parsed.order).toEqual(legacy.order);
  expect(JSON.parse(encodeProfileTemplate(legacy)).required).toEqual(["name","travel","tools"]);
 });
 it("leaves live legacy validation untouched while the new flag is absent",async()=>{
  vi.stubEnv("NEXT_PUBLIC_PROFILE_LOCATION_CONTROLS","");vi.resetModules();
  const {validateGigster}=await import("./validate");const {defaultProfileTemplate}=await import("./template");
  const f={...completeFields("Fictional Crew","/media/f"),market:"la" as const,areas:[],travel:""};
  const errors=validateGigster(f,defaultProfileTemplate);expect(errors.areas).toBeTruthy();expect(errors.travel).toBeUndefined();
 });
});
