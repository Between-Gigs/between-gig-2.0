import {beforeEach,expect,it} from "vitest";
import {harness} from "./harness";
import {completeFields,photo,registered} from "./fixtures";
import {defaultProfileTemplate} from "@/lib/profile/template";
import {gigsterChecklist,validateGigster} from "@/lib/profile/validate";
const h=await harness();beforeEach(()=>h.reset());
it("submits and reviews a complete profile without a retired Department value",async()=>{
 const who=await registered(h,"department40","Fictional Departmentless Crew");
 const fields={...completeFields(who.name,await photo(h,who.personId)),position:"",serviceLines:{"Interior Styling":"Style a fictional display."}};
 expect(validateGigster(fields,defaultProfileTemplate)).toEqual({});expect(gigsterChecklist(fields,defaultProfileTemplate).required.find(i=>i.id==="film")?.done).toBe(true);
 await h.source.profiles.saveDraft(who.personId,fields,1);expect((await h.source.profiles.getDraft(who.personId))?.fields.position).toBe("");expect((await h.source.profiles.submit(who.personId)).person.status).toBe("submitted");
 await h.signInOwner();const approved=await h.source.owners.approve(who.personId);expect(approved.status).toBe("approved");await h.signOut();const pub=await h.source.people.getPublic(approved.slug);expect(pub.profile?.fields.skills).toEqual(fields.skills);expect(pub.profile?.fields.position).toBe("");
});
it("does not erase a historical Department while editing experience",async()=>{
 const who=await registered(h,"department40-legacy","Fictional Legacy Crew");const fields={...completeFields(who.name,await photo(h,who.personId)),position:"Fictional historical department"};
 await h.source.profiles.saveDraft(who.personId,fields,1);await h.source.profiles.saveDraft(who.personId,{...fields,about:"Updated fictional experience."},1);expect((await h.source.profiles.getDraft(who.personId))?.fields.position).toBe(fields.position);
});
