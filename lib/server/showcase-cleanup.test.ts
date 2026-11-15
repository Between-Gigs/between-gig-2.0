import {it,expect,vi} from "vitest";
import {cleanupShowcase} from "./showcase-cleanup";
import type {CompanyOs} from "./companyos";

it("retains stored files when concurrent saves remove then restore a showcase reference",async()=>{
 const file="11111111-1111-1111-1111-111111111111";
 const remove=vi.fn(),query=vi.fn(async()=>[{id:file,data:{owner_id:"p",owner_entity:"profile",kind:"portfolio"}}]);
 const cos={query,remove} as unknown as CompanyOs,cred={kind:"session" as const,token:"test"};
 const item={id:"a",kind:"image" as const,url:"/media/"+file};
 // Tab A saves removal; tab B may save an older list restoring the reference
 // before A's cleanup starts. Neither request can prove exclusive ownership.
 await Promise.all([cleanupShowcase(cos,cred,"p",[item],[]),cleanupShowcase(cos,cred,"p",[],[item])]);
 expect(remove).not.toHaveBeenCalled();
});
