import { describe, expect, it } from "vitest";
import { fetchPublicHtml, publicPageUrl } from "./social-preview";
describe("public share inspection", () => {
  it("resolves relative images against the inspected page and strips fragments", () => {
    expect(publicPageUrl("../og/home.jpg#x", "https://between-gigs.com/home/").href).toBe("https://between-gigs.com/og/home.jpg");
  });
  it("rejects credentials, non-HTTPS, private literal hosts and custom ports", () => {
    for (const url of ["http://between-gigs.com", "https://user:pass@between-gigs.com", "https://localhost/", "https://localhost./", "https://127.0.0.1/", "https://10.2.0.1/", "https://[::1]/", "https://router.local/", "https://between-gigs.com:8443/", "file:///etc/passwd", "javascript:alert(1)"]) expect(() => publicPageUrl(url)).toThrow();
  });
  it("rejects non-HTML and HTTP errors without manufacturing metadata", async () => {
    const original = globalThis.fetch;
    try {
      globalThis.fetch = async () => new Response("{}", { headers: { "content-type": "application/json" } });
      await expect(fetchPublicHtml("https://between-gigs.com/", new AbortController().signal)).rejects.toThrow("not an HTML");
      globalThis.fetch = async () => new Response("missing", { status: 404 });
      await expect(fetchPublicHtml("https://between-gigs.com/", new AbortController().signal)).rejects.toThrow("HTTP 404");
    } finally { globalThis.fetch = original; }
  });
  it("omits credentials and referrers and refuses redirects", async () => {
    const original = globalThis.fetch;
    try {
      globalThis.fetch = async (_, options) => {
        expect(options).toMatchObject({ credentials: "omit", redirect: "error", referrerPolicy: "no-referrer", cache: "no-store" });
        return new Response("<title>Real document</title>", { headers: { "content-type": "text/html" } });
      };
      expect((await fetchPublicHtml("https://between-gigs.com/", new AbortController().signal)).html).toContain("Real document");
    } finally { globalThis.fetch = original; }
  });
});
