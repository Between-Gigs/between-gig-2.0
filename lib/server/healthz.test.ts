import { describe, expect, it, vi } from "vitest";

const readiness = vi.hoisted(() => vi.fn());
vi.mock("./backend-readiness", () => ({ backendReadiness: readiness }));
import { GET } from "@/app/healthz/route.server";

describe("/healthz/", () => {
  it("answers 200 ok when the backend is ready", async () => {
    readiness.mockResolvedValue({ ready: true, missing: [] });
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("ok");
  });
  it("answers 503 with the missing features when it is not, so Railway keeps the old version", async () => {
    readiness.mockResolvedValue({ ready: false, missing: ["profileDetails", "videoLinks"] });
    const res = await GET();
    expect(res.status).toBe(503);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({ ok: false, missing: ["profileDetails", "videoLinks"] });
  });
});
