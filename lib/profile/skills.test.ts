import {describe,expect,it} from "vitest";
import {skillLabel,skillAddError,skillIdentity,SKILL_LIMIT} from "./skills";
describe("explicit skill additions",()=>{
 it("canonicalizes suggestions and new text only at explicit add",()=>{expect(skillLabel(" set_decoration ")).toBe("Set decoration");expect(skillLabel("  Foley   craft  ")).toBe("Foley craft");expect(skillIdentity("FOLEY  craft")).toBe(skillIdentity("Foley craft"));});
 it("refuses duplicates, oversized/hidden text and additions over the existing limit",()=>{expect(skillAddError("foley craft",["Foley craft"])).toContain("already");expect(skillAddError("x".repeat(81),[])).toContain("80");for(const v of ["x\ny","x\u202ey","x\u200by"])expect(skillAddError(v,[])).toContain("hidden");expect(skillAddError("Foley",Array.from({length:SKILL_LIMIT},(_,i)=>`Old ${i}`))).toContain("20");});
 it("treats markup as bounded text and never changes stored selections",()=>{const existing=["  Historical Skill  ","x".repeat(90)];expect(skillAddError('<img src=x onerror="window.bad=true">',existing)).toBeUndefined();expect(existing).toEqual(["  Historical Skill  ","x".repeat(90)]);});
});

it("adds comma/Enter/paste batches once, preserving existing answers and refusing partial invalid batches",async()=>{
 const {addSkillEntries}=await import("./skills");const old=["  Historical Skill  "];
 expect(addSkillEntries("Foley craft, Props\nSet decoration",old)).toEqual({values:[...old,"Foley craft","Props","Set decoration"]});
 expect(addSkillEntries("Props,props, Props",[])).toEqual({values:["Props"]});
 expect(addSkillEntries("Props,\u202eevil",old).error).toContain("hidden");
 expect(addSkillEntries("One,Two",Array.from({length:19},(_,i)=>`Saved${i}`)).error).toContain("20");
 expect(old).toEqual(["  Historical Skill  "]);
});
