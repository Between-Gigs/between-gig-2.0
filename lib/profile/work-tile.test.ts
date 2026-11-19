import fs from "node:fs";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { WorkTile } from "@/components/profile/WorkTile";
import { portfolioItems } from "./video-links";

// Tiles do not mount players. Photos and videos enter one mixed-media lightbox on activation.
const photo = "data:image/jpeg;base64,AAAA";
const yt = "video:" + encodeURIComponent(JSON.stringify({ u: "https://youtu.be/dQw4w9WgXcQ", c: "Showreel" }));
const vm = "video:" + encodeURIComponent(JSON.stringify({ u: "https://vimeo.com/76979871", c: "" }));
const render = (sample: string, enabled = true) => {
  const [it] = portfolioItems([sample], enabled);
  return renderToStaticMarkup(React.createElement(WorkTile, { it, onPhoto: vi.fn(), buttonClassName: "b", imgClassName: "i" }));
};

describe("portfolioItems", () => {
  it("numbers photos and videos in the shared lightbox", () => {
    const items = portfolioItems([photo, yt, photo], true);
    expect(items.map((i) => i.photoIndex)).toEqual([0, 1, 2]);
    expect(items[1]).toMatchObject({ caption: "Showreel" });
  });
  it("flag off: video samples are not shown at all, and photo captions stay as they were", () => {
    const items = portfolioItems([photo, yt], false);
    expect(items).toHaveLength(1);
    expect(items[0].caption).toBe("Work sample 1");
  });
  it("skips a tampered video entry", () => {
    expect(portfolioItems(["video:" + encodeURIComponent(JSON.stringify({ u: "https://evil.com/youtube.com" })), photo], true)).toHaveLength(1);
  });
});

describe("WorkTile", () => {
  it("a YouTube sample opens the shared lightbox with the provider thumbnail and play badge", () => {
    const html = render(yt);
    expect(html).toContain('<button');
    expect(html).not.toContain('target="_blank"');
    expect(html).toContain("https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg");
    expect(html).toMatch(/data-play-badge/);
    expect(html).toContain('aria-label="Play video: Showreel"');
    expect(html).not.toMatch(/<(iframe|video|embed|object|script)/i);
  });
  it("a Vimeo sample with no thumbnail yet shows a neutral placeholder, still with the badge and link", () => {
    const html = render(vm);
    expect(html).toContain('aria-label="Play video: Video link"');
    expect(html).toContain("data-thumb-placeholder");
    expect(html).not.toContain("<img");
    expect(html).toMatch(/data-play-badge/);
  });
  it("an uploaded thumbnail wins over the provider's", () => {
    const html = render("video:" + encodeURIComponent(JSON.stringify({ u: "https://youtu.be/dQw4w9WgXcQ", t: "data:image/jpeg;base64,BBBB" })));
    expect(html).toContain("data:image/jpeg;base64,BBBB");
    expect(html).not.toContain("ytimg");
  });
  it("a photo is still the lightbox button, not a link", () => {
    const html = render(photo);
    expect(html).toMatch(/<button[^>]*aria-label="Open image: Work sample 1"/);
    expect(html).not.toContain("<a ");
  });
});

describe("the four layouts share the tile; only the central lightbox mounts an iframe", () => {
  for (const file of ["components/profile/ProfileView.tsx", "components/profile/WarmProfile.tsx", "components/profile/ModernProfile.tsx", "components/ds/templates/ProfileTemplate.tsx"]) {
    it(file, () => {
      const src = fs.readFileSync(file, "utf8");
      expect(src).toContain("WorkTile");
      if (!file.endsWith("/ProfileView.tsx")) expect(src).not.toMatch(/<iframe|<video|<embed/i);
    });
  }
});

describe("the editor", () => {
  const editor = fs.readFileSync("components/gigster/editor/canvas.tsx", "utf8");
  it("shows the video UI and the new wording only behind the flag, and the photo-only sentence otherwise", () => {
    expect(editor).toContain("videoLinksEnabled()");
    expect(editor).toContain("Upload photos or images of past projects");
    expect(editor).toContain("Upload photos, videos, or examples of past projects");
  });
  it("never accepts a video file", () => {
    expect(editor).not.toMatch(/accept="[^"]*video/);
  });
});
