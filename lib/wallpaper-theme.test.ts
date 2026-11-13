import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { crewCallDark, selectedDarkWallpaper } from "./wallpaper-theme";

const read = (path: string) => fs.readFileSync(path, "utf8");
const hash = (path: string) => createHash("sha256").update(fs.readFileSync(path)).digest("hex");
describe("selected Craft wallpaper theme variants", () => {
  it.each(["desktop", "portrait"])("maps %s aliases to exact selected art retained in server builds", (format) => {
    const target = `/art/stage/still-life-${format}-dark.png`;
    expect(selectedDarkWallpaper(`/art/stage/still-life-${format}.jpg`)).toBe(target);
    expect(selectedDarkWallpaper(`email/craft-invitation-${format}.jpg`)).toBe(target);
    expect(hash(`public${target}`)).toBe(hash(`public/art/wallpapers/craft-invitation-${format}-dark.png`));
    expect(fs.existsSync(`public/art/stage/still-life-${format}-night.jpg`)).toBe(true);
  });
  it.each(["desktop", "portrait"] as const)("keeps selected Crew %s artwork for the explicit hero only", (format) => {
    expect(hash(`public${crewCallDark[format]}`)).toBe(hash(`public/art/wallpapers/crew-call-${format}-dark.png`));
    expect(fs.existsSync("public/art/crew-call/hero.jpg")).toBe(true);
    expect(fs.existsSync("public/art/crew-call/hero-night.jpg")).toBe(true);
    const hero = read("components/crew-call/CrewCall.tsx");
    expect(hero).toContain("srcSet={asset(crewCallDark.portrait)}");
    expect(hero).toContain("src={asset(crewCallDark.desktop)}");
    expect(hero).toContain("to-transparent dark:hidden");
  });
  it("does not remap distinct hero art, footer bands, or cutout props", () => {
    for (const src of ["art/crew-call/hero.jpg", "/art/footer/craft.jpg", "/art/stage/props-top-right.webp"]) {
      expect(selectedDarkWallpaper(src)).toBeUndefined();
    }
  });
  it("preserves responsive breakpoints and removes the launch auth dark opacity treatment", () => {
    const auth = read("components/ds/templates/AuthStageTemplate.tsx");
    const submitted = read("components/gigster/SubmittedPage.tsx");
    const stage = read("components/ds/organisms/index.tsx");
    expect(auth).toContain('(min-width: 64rem)');
    expect(auth).not.toContain("dark:opacity-20");
    expect(auth).toContain('dark ? "hidden dark:block" : "dark:hidden"');
    expect(submitted).toContain('(min-width: 48rem)');
    expect(submitted).not.toContain('still-life-desktop-night.jpg');
    expect(stage).toContain('(orientation: portrait)');
    expect(stage).toContain('selectedDarkWallpaper(portrait)');
    expect(stage).toContain('selectedDarkWallpaper(image)');
    expect(read("components/auth/AuthShell.tsx")).toContain('darkSrc={selectedDarkWallpaper("email/craft-invitation-desktop.jpg")}');
  });
});
