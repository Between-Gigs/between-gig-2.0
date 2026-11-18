import {expect,it} from "vitest";
import {completeFields} from "@/lib/data/contract/fixtures";
import {defaultProfileTemplate,encodeProfileTemplate,parseProfileTemplate,requiredProfileRules} from "./template";
import {validateGigster} from "./validate";
import {publicBookingRows} from "./stage-two";
it("retires generic minimum requirements and hidden-field errors without modifying stored answers",()=>{
 const template={...defaultProfileTemplate,required:[...defaultProfileTemplate.required,"bookingMinimum" as const]};
 const fields={...completeFields("Fictional Crew","/media/f"),bookingMinimum:"x".repeat(100)};
 expect(requiredProfileRules(template)).not.toContain("bookingMinimum");expect(validateGigster(fields,template).bookingMinimum).toBeUndefined();expect(fields.bookingMinimum).toHaveLength(100);
 expect(parseProfileTemplate(encodeProfileTemplate(template))?.required).not.toContain("bookingMinimum");
});
it("omits the generic minimum from public presentation while retaining unrelated booking details",()=>{
 expect(publicBookingRows({bookingMinimum:"Two hours",earliestStart:"2026-12-02",personality:"Fictional answer."})).toEqual([["Earliest start date","Dec 2, 2026"],["A little about me","Fictional answer."]]);
});
