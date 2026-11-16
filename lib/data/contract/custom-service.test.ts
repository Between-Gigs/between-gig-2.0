import {beforeEach,describe,expect,it} from "vitest";
import {harness} from "./harness";
import {completeFields,photo,registered} from "./fixtures";
const h=await harness();beforeEach(()=>h.reset());
describe("private custom-only service submission",()=>{
 it("submits a described custom service, exposes it to review, and refuses service-empty approval atomically",async()=>{
  const who=await registered(h,"custom-only","Fictional Custom Crew");
  const fields={...completeFields(who.name,await photo(h,who.personId)),services:[],serviceLines:{},other:"Fictional prop restoration\nRestore a fictional display prop."};
  await h.source.profiles.saveDraft(who.personId,fields,1);expect((await h.source.profiles.getDraft(who.personId))?.fields.other).toBe(fields.other);
  const submitted=await h.source.profiles.submit(who.personId);expect(submitted.person.status).toBe("submitted");
  await h.signInOwner();expect((await h.source.people.get(who.personId))?.fields?.other).toBe(fields.other);
  const outboxBefore=await h.source.emails.outbox();await expect(h.source.owners.approve(who.personId)).rejects.toThrow();
  expect((await h.source.people.get(who.personId))?.person.status).toBe("submitted");expect(await h.source.emails.outbox()).toEqual(outboxBefore);
  await h.signOut();expect((await h.source.people.getPublic(submitted.person.slug)).profile).toBeNull();
 });
 it("keeps partial custom text autosaved but refuses custom-only submission until it has a description",async()=>{
  const who=await registered(h,"custom-incomplete","Fictional Partial Crew");const fields={...completeFields(who.name,await photo(h,who.personId)),services:[],other:"Fictional prop restoration"};
  await h.source.profiles.saveDraft(who.personId,fields,1);expect((await h.source.profiles.getDraft(who.personId))?.fields.other).toBe(fields.other);
  await expect(h.source.profiles.submit(who.personId)).rejects.toThrow();expect((await h.source.people.get(who.personId))?.person.status).toBe("draft");
 });
});
