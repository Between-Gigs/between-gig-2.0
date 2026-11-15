import { describe, expect, it } from "vitest";
import { progress } from "./progress";
import type { WorkItem } from "./types";
const item = (id: string, kind: WorkItem["kind"], status: WorkItem["status"], parent = "") => ({id, kind, status, parent, evidence: [{label:"Check",url:"https://example.org",note:"Verified",checkedAt:"2026-11-15"}]} as WorkItem);
describe("evidenced leaf progress", () => {
 it("does not double count containers or communications", () => { expect(progress([item("p","project","in_progress"),item("m","milestone","in_progress","p"),item("a","task","done","m"),item("b","task","blocked","m"),item("c","communication","done"),item("d","task","archived")])).toEqual({done:1,total:2,blocked:1,percent:50}); });
 it("does not invent a percentage for an empty plan",()=>expect(progress([]).percent).toBeNull());
 it("does not treat unsupported done as verified",()=>expect(progress([{...item("a","task","done"),evidence:[]}]).done).toBe(0));
});
