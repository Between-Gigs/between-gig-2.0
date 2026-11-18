import {beforeEach,describe,expect,it} from "vitest";
import {harness} from "./harness";
import {completeFields,photo,registered} from "./fixtures";
const h=await harness();beforeEach(()=>h.reset());
describe("legacy catalogue compatibility through the data source",()=>{
 it("keeps old selections, exact personal lines, custom text and order across repeated saves and owner alias searches",async()=>{
  const who=await registered(h,"catalogue-legacy","Fictional Catalogue Crew");
  const services=["Hair Styling","Makeup Services","Event Styling","Photography & Portraits"];
  const fields={...completeFields(who.name,await photo(h,who.personId)),services,serviceLines:Object.fromEntries(services.map((s,i)=>[s,`My personal answer ${i}.`])),other:"Fictional custom craft\nMy own custom service description."};
  await h.source.profiles.saveDraft(who.personId,fields,1);
  expect((await h.source.profiles.getDraft(who.personId))?.fields).toMatchObject({services,serviceLines:fields.serviceLines,other:fields.other});
  const reordered={...fields,services:[...services].reverse()};
  await h.source.profiles.saveDraft(who.personId,reordered,1);await h.source.profiles.saveDraft(who.personId,reordered,1);
  expect((await h.source.profiles.getDraft(who.personId))?.fields).toMatchObject({services:reordered.services,serviceLines:fields.serviceLines,other:fields.other});
  await h.signInOwner();
  for(const service of ["Beauty, Hair & Makeup","Parties & Event Planning","Photography & Videography"]){
   const listed=await h.source.people.list({service});
   expect(listed.some(r=>r.person.id===who.personId)).toBe(true);
  }
 });
});
