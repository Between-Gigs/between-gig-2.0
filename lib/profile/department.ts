import { Brush, Camera, Clapperboard, ClipboardList, Hammer, Lightbulb, MapPinned, Palette, Shirt, Sofa, type LucideIcon } from "lucide-react";

/** Department keywords → icon, checked in order against the free-text position and on-set skills. */
const map: [RegExp, LucideIcon][] = [
  [/wardrobe|costume/i, Shirt],
  [/hair|makeup|make-up|beauty/i, Brush],
  [/light|grip|electric|gaffer/i, Lightbulb],
  [/camera|photo/i, Camera],
  [/set dec|decorat|dressing/i, Sofa],
  [/prop|construct|carpent|build/i, Hammer],
  [/art dep|art direct|design/i, Palette],
  [/location/i, MapPinned],
  [/office|coordinat|production/i, ClipboardList],
];

/** An icon for someone's department, for the branded no-photo portrait. Falls back to a clapperboard. */
export function departmentIcon(position = "", skills: string[] = []): LucideIcon {
  for (const text of [position, ...skills]) {
    const hit = map.find(([re]) => re.test(text));
    if (hit) return hit[1];
  }
  return Clapperboard;
}
