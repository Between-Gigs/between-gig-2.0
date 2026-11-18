import {expect,it} from "vitest";
import {blankFields} from "@/lib/data/fields";
import {workDetailRows} from "./work-details";
it("labels work topics while preserving authored text and excluding private data",()=>{
 const f={...blankFields(),tools:"Lighting kit\nCamera",transport:"My van",travel:"Up to 15 miles",insurance:"yes" as const,insuranceNotes:"Private note",bookingMobile:"+1 213 555 0123"};
 const rows=workDetailRows(f,false);expect(rows).toContainEqual(["Tools and equipment","Lighting kit\nCamera"]);expect(rows).toContainEqual(["Transport","My van"]);expect(rows.some(([label])=>label==="Insurance")).toBe(false);
 expect(JSON.stringify(rows)).not.toContain("Private note");expect(JSON.stringify(rows)).not.toContain("555");expect(workDetailRows(f,true).some(([label])=>label==="Insurance")).toBe(true);
});
