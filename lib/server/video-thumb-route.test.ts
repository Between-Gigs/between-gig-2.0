import { afterEach, describe, expect, it, vi } from "vitest";

const lookup = vi.fn<(id: string) => Promise<string | null>>(async () => "https://i.vimeocdn.com/video/zz1_640.jpg");
vi.mock("@/lib/server/vimeo-thumb", () => ({ vimeoThumbnail: (id: string) => lookup(id) }));
import { GET } from "@/app/api/video-thumb/route.server";

afterEach(() => { vi.unstubAllEnvs(); lookup.mockClear(); });

describe("GET /api/video-thumb", () => {
  it("with video links off, answers the placeholder and never looks the video up", async () => {
    vi.stubEnv("NEXT_PUBLIC_PROFILE_VIDEO_LINKS", "");
    const res = await GET(new Request("http://localhost/api/video-thumb/?id=76979871"));
    expect(await res.json()).toEqual({ url: null });
    expect(lookup).not.toHaveBeenCalled();
  });
  it("with video links on, looks the video up", async () => {
    vi.stubEnv("NEXT_PUBLIC_PROFILE_VIDEO_LINKS", "1");
    const res = await GET(new Request("http://localhost/api/video-thumb/?id=90000001"));
    expect(await res.json()).toEqual({ url: "https://i.vimeocdn.com/video/zz1_640.jpg" });
    expect(lookup).toHaveBeenCalledWith("90000001");
  });
});
