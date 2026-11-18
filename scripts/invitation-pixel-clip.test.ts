import {describe,expect,it} from "vitest";
import {containedPixelClip} from "./qa/invitation-pixel-clip.mjs";

describe("fully contained invitation screenshot pixels",()=>{
  it("excludes the fractional bottom edge that captured parent colour in the real 320px CI case",()=>{
    expect(containedPixelClip({x:0,y:1,width:320,height:418.453125})).toEqual({x:0,y:1,width:320,height:418});
  });
  it("rounds inward on every fractional edge, while retaining every fully contained pixel",()=>{
    expect(containedPixelClip({x:1.25,y:2.75,width:100.5,height:200.5})).toEqual({x:2,y:3,width:99,height:200});
    expect(containedPixelClip({x:0,y:1,width:320,height:418})).toEqual({x:0,y:1,width:320,height:418});
  });
  it("refuses invalid or empty comparison regions",()=>{
    for(const rect of [{x:NaN,y:0,width:20,height:20},{x:0,y:0,width:0,height:20},{x:.2,y:.2,width:.3,height:.3}])expect(()=>containedPixelClip(rect)).toThrow();
  });
});
