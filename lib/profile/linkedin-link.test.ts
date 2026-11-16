import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LinkedInLink } from "@/components/profile/LinkedInLink";

afterEach(() => vi.unstubAllEnvs());
const html = (value: string | undefined) => renderToStaticMarkup(createElement(LinkedInLink, { value }));

describe("LinkedInLink", () => {
  it("shows nothing with the flag off, even when a link is stored", () => expect(html("https://www.linkedin.com/in/x")).toBe(""));
  it("with the flag on, links out safely", () => {
    vi.stubEnv("NEXT_PUBLIC_PROFILE_DETAILS", "1");
    const out = html("https://www.linkedin.com/in/x");
    expect(out).toContain('href="https://www.linkedin.com/in/x"');
    expect(out).toContain('rel="noopener noreferrer"');
    expect(out).toContain('target="_blank"');
    expect(html("javascript:alert(1)")).toBe("");
    expect(html("https://linkedin.com.evil.com/in/x")).toBe("");
    expect(html(undefined)).toBe("");
  });
});

describe("the four public profile layouts", () => {
  const layouts = ["components/profile/ProfileView.tsx", "components/profile/ModernProfile.tsx", "components/profile/WarmProfile.tsx", "components/ds/templates/ProfileTemplate.tsx"];
  it.each(layouts)("%s shows the LinkedIn link and reads no private answer", (file) => {
    const src = readFileSync(file, "utf8");
    expect(src).toContain("<LinkedInLink");
    for (const k of ["contactChannels", "bookingContactConsent", "marketingEmailConsent", "private_details", "phone_channels"]) expect(src).not.toContain(k);
  });
});
