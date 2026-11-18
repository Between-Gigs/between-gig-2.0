import {expect,it} from "vitest";
import {experienceOrder,parseExperienceOrder,moveExperienceField} from "./experience-layout";
it("accepts only complete distinct field orders and safely ignores invalid saved preferences",()=>{
 expect(experienceOrder).toEqual(["skills","years","about"]);
 expect(parseExperienceOrder('["about","skills","years"]')).toEqual(["about","skills","years"]);
 for(const value of ['null','["skills","skills","about"]','["skills","years"]','["photo","years","about"]','{bad'])expect(parseExperienceOrder(value)).toEqual(experienceOrder);
});
it("reorders field identities without any profile values, with bounded movement",()=>{
 expect(moveExperienceField(experienceOrder,"about",-1)).toEqual(["skills","about","years"]);
 expect(moveExperienceField(experienceOrder,"skills",-1)).toEqual(experienceOrder);
 expect(moveExperienceField(experienceOrder,"about",1)).toEqual(experienceOrder);
 expect(experienceOrder).toEqual(["skills","years","about"]);
});
