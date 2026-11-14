/**
 * The Work section's mosaic on the public profile: the first four photos, each cropped to its frame (object-cover).
 * The editor lays the photos out with the same frames, so a Gigster sees each crop and the effect of the order
 * exactly as clients will (Justin, 14 Nov 2026). The rest open from "Show all photos".
 */
export const WORK_SHOWN = 4;
export const workGrid = "grid grid-cols-6 gap-3 sm:gap-6";
const tiles = ["col-span-6 aspect-4/3 sm:col-span-4 sm:row-span-2 sm:aspect-auto", "col-span-3 aspect-6/5 sm:col-span-2", "col-span-3 aspect-6/5 sm:col-span-2", "col-span-6 aspect-5/2"];
/** The frame for photo i (0-based) when `count` photos are shown in the mosaic. */
export const workTile = (i: number, count: number) => (count === 1 ? "col-span-6 aspect-video" : tiles[i] ?? "col-span-3 aspect-video");
