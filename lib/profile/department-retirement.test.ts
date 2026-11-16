import {expect,it,vi} from "vitest";
import {completeFields} from "@/lib/data/contract/fixtures";
import {defaultProfileTemplate,encodeProfileTemplate,parseProfileTemplate} from "./template";
import {gigsterChecklist,validateGigster} from "./validate";
const fields={...completeFields("Fictional Crew","/media/f"),position:"",serviceLines:{"Interior Styling":"Style a fictional display."}};
it("accepts skills/years/experience without Department, while keeping other required answers",()=>{
 expect(defaultProfileTemplate.required).not.toContain("position");expect(validateGigster(fields)).toEqual({});expect(gigsterChecklist(fields).required.find(i=>i.id==="film")?.done).toBe(true);
 for(const bad of [{...fields,skills:[]},{...fields,years:""},{...fields,about:""}])expect(Object.keys(validateGigster(bad)).length).toBeGreaterThan(0);
});
it("does not make a retained overlong hidden Department block the current editor",()=>{
 expect(validateGigster({...fields,position:"Legacy historical department ".repeat(5)}).position).toBeUndefined();
});
it("removes only retired Department from old templates and preserves other requirements/order",()=>{
 const raw={version:1,required:["position","name","skills"],order:[...defaultProfileTemplate.order].reverse(),sections:[...defaultProfileTemplate.sections].reverse()};
 const parsed=parseProfileTemplate(JSON.stringify(raw))!;expect(parsed).not.toBeNull();expect(parsed.required).toEqual(["name","skills"]);expect(parsed.order).toEqual(raw.order);expect(parsed.sections).toEqual(raw.sections);
 expect(JSON.parse(encodeProfileTemplate({...defaultProfileTemplate,required:["position","name","skills"]})).required).toEqual(["name","skills"]);
 expect(parseProfileTemplate(JSON.stringify({...raw,required:["position","not_a_field"]}))).toBeNull();expect(parseProfileTemplate(JSON.stringify({...raw,required:["position","position"]}))).toBeNull();
});
it("preserves the legacy Department requirement for a live build until explicitly enabled",async()=>{
 vi.stubEnv("NEXT_PUBLIC_DATA_SOURCE","api");vi.stubEnv("BG_BUILD","server");vi.stubEnv("NEXT_PUBLIC_PROFILE_NO_DEPARTMENT","");vi.resetModules();try{
  const t=await import("./template"),v=await import("./validate");expect(t.defaultProfileTemplate.required).toContain("position");expect(v.validateGigster(fields,t.defaultProfileTemplate).position).toBeTruthy();expect(v.validateGigster({...fields,position:"L".repeat(41)},t.defaultProfileTemplate).position).toBeTruthy();
 }finally{vi.unstubAllEnvs();vi.resetModules();}
});
