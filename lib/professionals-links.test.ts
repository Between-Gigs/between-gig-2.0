import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("fictional Professionals marketing cards", () => {
  for (const path of [
    "components/landing/ForProfessionals.tsx",
    "components/funnel/BrandProfessionals.tsx",
    "components/funnel/SwissProfessionals.tsx",
  ]) {
    it(`${path} offers signup without linking fictional full profiles`, () => {
      const source = read(path);
      expect(source).not.toMatch(/ExampleProfileLink|usePublishedExamples|View full profile/);
      expect(source).toMatch(/Create a profile like this|CallSheetButton/);
      expect(source).toContain("profiles.map");
    });
  }
  it("keeps real public-profile browsing separate from the marketing cards", () => {
    expect(read("components/profile/PublicProfile.tsx")).toContain("data.people.getPublic(slug)");
    expect(read("components/ds/organisms/index.tsx")).toContain('View profile</TextLink>');
  });
});
