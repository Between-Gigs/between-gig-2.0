import { describe, expect, it } from "vitest";
import { realAccountLinks } from "./preview-links";

describe("real account entry from sample previews", () => {
  it("leaves an embedded Hub for the host's actual application, without retaining /hub", () => {
    expect(realAccountLinks("/hub")).toEqual({ join: "/join/", login: "/login/" });
  });
  it("leaves Pages for the verified test account entry instead of looping into the sample", () => {
    expect(realAccountLinks("/between-gig-2.0")).toEqual({ join: "https://test.between-gigs.com/join/", login: "https://test.between-gigs.com/login/" });
  });
});
