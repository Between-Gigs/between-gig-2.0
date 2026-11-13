import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { craftHero } from "../emails/craft";

const root = process.cwd();
describe("wallpaper and email artwork", () => {
  it("keeps email artwork in the live server asset directory", () => {
    for (const format of ["desktop", "portrait"]) {
      const name = `craft-invitation-${format}.jpg`;
      expect(fs.readFileSync(path.join(root, "public/email", name))).toEqual(fs.readFileSync(path.join(root, "public/art/wallpapers", name)));
    }
    const source = fs.readFileSync(path.join(root, "emails/craft.ts"), "utf8");
    expect(source).not.toContain("/email/craft-border.jpg");
    expect(source).not.toContain("/email/craft-top.jpg");
    expect(fs.readFileSync(path.join(root, "components/auth/AuthShell.tsx"), "utf8")).not.toContain("email/craft-bottom.jpg");
    expect(typeof craftHero).toBe("function");
  });
  it("retires old collections from the gallery without removing source artwork", () => {
    const gallery = fs.readFileSync(path.join(root, "app/preview/wallpapers/page.tsx"), "utf8");
    expect(gallery).not.toContain("Los Angeles Call Sheet");
    expect(gallery).not.toContain("Email template frame");
    expect(fs.existsSync(path.join(root, "public/email/craft-border.jpg"))).toBe(true);
    expect(fs.existsSync(path.join(root, "public/art/wallpapers/call-sheet-night.jpg"))).toBe(true);
  });
});
