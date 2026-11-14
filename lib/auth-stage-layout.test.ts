import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

// Keep the height handoff intact: the Page main can grow beyond the content on
// tall screens, so the wallpaper stage and its grid must grow with it.
describe("launch auth wallpaper height handoff", () => {
  it("fills the main region without a viewport-specific fixed height", () => {
    const shell = readFileSync("components/auth/AuthShell.tsx", "utf8");
    const stage = readFileSync("components/ds/templates/AuthStageTemplate.tsx", "utf8");
    expect(shell).toContain('<Page bare className="flex flex-col">');
    expect(stage).toContain('className="relative isolate flex flex-1 flex-col overflow-hidden bg-bg"');
    expect(stage).toContain('className="grid w-full flex-1 gap-10');
    expect(stage).toContain('lg:inset-y-0 lg:aspect-auto lg:h-full lg:mask-none');
    expect(stage).toContain('pt-40 pb-12 sm:px-6 sm:pt-72 sm:pb-16');
    expect(stage).not.toContain('h-screen');
  });
});
