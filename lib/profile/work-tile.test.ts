import fs from "node:fs";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { WorkTile } from "@/components/profile/WorkTile";
import { portfolioItems } from "./video-links";

// The public profile shows a video sample as its thumbnail with a play badge that links OUT to the video.
// It never embeds: no iframe, video, embed or object element, and the link can't hand the new tab an opener.
const photo = "data:image/jpeg;base64,AAAA";
const yt = "video:" + encodeURIComponent(JSON.stringify({ u: "https://youtu.be/dQw4w9WgXcQ", c: "Showreel" }));
const vm = "video:" + encodeURIComponent(JSON.stringify({ u: "https://vimeo.com/76979871", c: "" }));
const render = (sample: string, enabled = true) => {
  const [it] = portfolioItems([sample], enabled);
  return renderToStaticMarkup(React.createElement(WorkTile, { it, onPhoto: vi.fn(), buttonClassName: "b", imgClassName: "i" }));
};

describe("portfolioItems", () => {
  it("numbers photos for the lightbox and leaves videos out of that numbering", () => {
    const items = portfolioItems([photo, yt, photo], true);
    expect(items.map((i) => i.photoIndex)).toEqual([0, -1, 1]);
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
  it("a YouTube sample is a link out with the provider thumbnail and a play badge", () => {
    const html = render(yt);
    expect(html).toMatch(/<a [^>]*href="https:\/\/www\.youtube\.com\/watch\?v=dQw4w9WgXcQ"/);
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain("https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg");
    expect(html).toMatch(/data-play-badge/);
    expect(html).toMatch(/aria-label="Watch video: Showreel \(opens in a new tab\)"/);
    expect(html).not.toMatch(/<(iframe|video|embed|object|script)/i);
  });
  it("a Vimeo sample with no thumbnail yet shows a neutral placeholder, still with the badge and link", () => {
    const html = render(vm);
    expect(html).toContain('href="https://vimeo.com/76979871"');
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

describe("the four layouts share the tile and never embed", () => {
  for (const file of ["components/profile/ProfileView.tsx", "components/profile/WarmProfile.tsx", "components/profile/ModernProfile.tsx", "components/ds/templates/ProfileTemplate.tsx"]) {
    it(file, () => {
      const src = fs.readFileSync(file, "utf8");
      expect(src).toContain("WorkTile");
      expect(src).not.toMatch(/<iframe|<video|<embed/i);
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
