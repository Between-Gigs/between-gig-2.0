import { expect, it, vi } from "vitest";
import { setupSelectedNavigation } from "./setup";
import type { NavigationSnapshot } from "./model";
const result = (userId: string) => ({ target: { userId } }) as NavigationSnapshot;
it("keeps the selected other admin after setup returns the caller snapshot", async () => {
  const gateway = { setup: vi.fn(async () => result("caller")), snapshot: vi.fn(async (id?: string) => result(id ?? "caller")) };
  expect((await setupSelectedNavigation(gateway, "selected-other", () => true))?.target.userId).toBe("selected-other");
  expect(gateway.snapshot).toHaveBeenCalledWith("selected-other");
});
it("discards setup results if selection changes while setup is pending", async () => {
  let release!: () => void, current = true;
  const gateway = { setup: vi.fn(async () => { await new Promise<void>(resolve => { release = resolve; }); return result("caller"); }), snapshot: vi.fn(async () => result("selected-other")) };
  const pending = setupSelectedNavigation(gateway, "selected-other", () => current);
  current = false; release(); expect(await pending).toBeUndefined(); expect(gateway.snapshot).not.toHaveBeenCalled();
});
it("discards selected-user readback if selection changes while it is pending", async () => {
  let release!: () => void, current = true;
  const gateway = { setup: vi.fn(async () => result("caller")), snapshot: vi.fn(async () => { await new Promise<void>(resolve => { release = resolve; }); return result("selected-other"); }) };
  const pending = setupSelectedNavigation(gateway, "selected-other", () => current);
  await vi.waitFor(() => expect(gateway.snapshot).toHaveBeenCalled()); current = false; release(); expect(await pending).toBeUndefined();
});
