import { expect, it } from "vitest";
import type { ShowcaseItem } from "@/lib/data/types";
import { withFit, parseSample } from "./work-fit";
import { applyShowcaseUpload, mergeMigratedShowcase } from "./showcase-updates";
const photo = (id: string): ShowcaseItem => ({ id, kind: "image", url: `https://example.org/${id}.jpg`, description: id });
it("appends after the current order, without losing edits or exceeding five items", () => {
  const current = [{ ...photo("b"), description: "Edited while uploading" }, photo("a")];
  expect(applyShowcaseUpload(current, photo("c"), null).map(i => [i.id, i.description])).toEqual([["b", "Edited while uploading"], ["a", "a"], ["c", "c"]]);
  expect(applyShowcaseUpload(Array.from({length:5}, (_, i) => photo(String(i))), photo("extra"), null)).toHaveLength(5);
});
it("replaces the stable target at its new position, preserving its current caption", () => {
  const result = applyShowcaseUpload([photo("b"), {...photo("a"), description:"New caption"}], photo("upload"), "a");
  expect(result).toEqual([photo("b"), { ...photo("upload"), id:"a", description:"New caption" }]);
  expect(applyShowcaseUpload([photo("b")], photo("upload"), "a")).toEqual([photo("b")]);
});
it("migration retains reordered IDs/captions, replacements, additions and removals", () => {
  const current = [{...photo("b"),description:"Edited"},{...photo("a"),url:"https://example.org/replaced.jpg"},photo("new")];
  const map = new Map([[photo("a").url,"/media/upload-a"],[photo("b").url,"/media/upload-b"],[photo("removed").url,"/media/upload-removed"]]);
  expect(mergeMigratedShowcase(current,map)).toEqual([{...current[0],url:"/media/upload-b"},current[1],current[2]]);
});

it("migration keeps a newer crop selected while its upload was pending", () => {
  const fit = {cx:.4,cy:.6,z:2,a:1.5};
  const current = [{...photo("a"),url:withFit(photo("a").url,fit)}];
  const result = mergeMigratedShowcase(current,new Map([[photo("a").url,"/media/restored"]]));
  expect(parseSample(result[0].url)).toEqual({src:"/media/restored",fit});
});
