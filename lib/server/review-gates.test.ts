import { afterEach, expect, it, vi } from "vitest";
import { resendInvite, draftOps } from "./gigs";
import { handleWorkUpload } from "./showcase";
import { blankFields } from "@/lib/data/fields";
import type { CompanyOs } from "./companyos";
afterEach(() => vi.unstubAllEnvs());
it.each(["", "0", "1"])("preserves the old invitation contract unless review activation is 1 (%s)", async flag => {
  vi.stubEnv("COMPANY_OS_PROFILE_REVIEW", flag);
  const create = vi.fn(async () => ({ data: { status: "queued" } }));
  const cos = { me: vi.fn(async () => ({ isSuperAdmin: true })), byIds: vi.fn(async () => [{id:"fictional",data:{email:"fictional@example.org"}}]), adminUsers: vi.fn(async () => []), invite: vi.fn(async () => ({url:"https://test.example/join/?invite=fictional"})), create } as unknown as CompanyOs;
  expect(await resendInvite({cos,cred:{kind:"session",token:"fictional-token"},appUrl:"https://test.example"},["fictional"])).toEqual({invited:1,skipped:0});
  const payload = create.mock.calls[0] as unknown[];
  if(flag === "1") expect(payload[2]).toHaveProperty("category","marketing");
  else expect(payload[2]).not.toHaveProperty("category");
});
it("refuses new uploads and excludes new persisted fields with activation off", async () => {
  vi.stubEnv("COMPANY_OS_PROFILE_REVIEW", "");
  const query = vi.fn();
  const result = await handleWorkUpload(new Request("https://test.example/api/profiles/uploadWork/", { method:"POST",headers:{authorization:"Bearer fictional-token"},body:"fictional" }), {cos:{query} as unknown as CompanyOs});
  expect(result.status).toBe(503); expect(query).not.toHaveBeenCalled();
  const fields = {...blankFields(),name:"Fictional",showcase:[{id:"a",kind:"image" as const,url:"https://example.org/a.jpg"}],marketingEmailConsent:true};
  expect(JSON.stringify(draftOps("fictional",fields,{items:[]},false))).not.toMatch(/public_details|private_details|service_proposal|showcase|marketingEmailConsent/);
});
it("selects the legacy live editor unless explicitly activated", async () => {
  vi.stubEnv("NEXT_PUBLIC_DATA_SOURCE","api");vi.stubEnv("NEXT_PUBLIC_PROFILE_REVIEW","");vi.resetModules();
  expect((await import("@/lib/profile/review")).PROFILE_REVIEW_ENABLED).toBe(false);
});
