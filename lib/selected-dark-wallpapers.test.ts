import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("selected dark wallpaper downloads", () => {
  it("uses the selected PNGs and accurate metadata without deleting earlier night grades", () => {
    const expected: Record<string, [number, number]> = {
      "craft-invitation-desktop": [1672, 941], "craft-invitation-portrait": [1097, 1434],
      "crew-call-desktop": [1672, 941], "crew-call-portrait": [941, 1672],
    };
    for (const [name, size] of Object.entries(expected)) {
      const file = fs.readFileSync(path.join(process.cwd(), `public/art/wallpapers/${name}-dark.png`));
      expect([file.readUInt32BE(16), file.readUInt32BE(20)]).toEqual(size);
      expect(fs.existsSync(`public/art/wallpapers/${name}-dark-preview.webp`)).toBe(true);
      expect(fs.existsSync(`public/art/wallpapers/${name}-night.jpg`)).toBe(true);
    }
    const page = fs.readFileSync("app/preview/wallpapers/page.tsx", "utf8");
    expect(page).toContain('"-dark.png"');
    expect(page).not.toContain('"-night.jpg"');
    expect(page).toContain("items={dark(invitation)}");
    expect(page).toContain("items={dark(crewCall)}");
  });
});
