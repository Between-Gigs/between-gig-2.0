import { it, expect, vi } from "vitest";
import { unsubscribePage } from "./unsubscribe";
import type { CompanyOs } from "./companyos";
it("does not opt out on a scanner GET and posts the signed link without login", async () => { const call = vi.fn(async () => ({ ok: true })), cos = { unsubscribe: call } as unknown as CompanyOs; const get = await unsubscribePage(new Request("https://test.example/unsubscribe/?token=abc.signature"), { cos }); expect(get.status).toBe(200); expect(call).toHaveBeenLastCalledWith("abc.signature", false); const post = await unsubscribePage(new Request("https://test.example/unsubscribe/?token=abc.signature", { method: "POST" }), { cos }); expect(post.status).toBe(200); expect(call).toHaveBeenLastCalledWith("abc.signature", true); });
