import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

// Execute the actual workflow shell with a local stub: no Railway API, auth or secrets.
describe("profile guard sync preserves rollback enforcement",()=>{
 for(const workflow of ["deploy-test.yml","deploy-prod.yml"]){
  it.each(["","1"])(`${workflow} sync with optional guard %s`,flag=>{
   const dir=mkdtempSync(join(tmpdir(),"bg-profile-sync-"));
   try{
    const calls=join(dir,"calls.jsonl"),stub=join(dir,"railway");
    writeFileSync(stub,'#!/usr/bin/env node\nconst fs=require("node:fs");fs.appendFileSync(process.env.FAKE_CALLS,JSON.stringify({args:process.argv.slice(2),input:fs.readFileSync(0,"utf8")})+"\\n");\n');chmodSync(stub,0o700);
    const yml=readFileSync(new URL(`../.github/workflows/${workflow}`,import.meta.url),"utf8");
    const step=yml.split("      - name: Sync secrets and settings\n")[1].split(/\n      - /)[0];
    const shell=step.split("        run: |\n")[1].split("\n").filter(x=>x.startsWith("          ")).map(x=>x.slice(10)).join("\n");
    const env={PATH:`${dir}:${process.env.PATH}`,FAKE_CALLS:calls,SERVICE:"fictional-web",RAILWAY_ENV:"fictional-test",APP_URL:"https://fictional.invalid",COMPANY_OS_READ_TOKEN:"fictional-read",COMPANY_OS_SUBMIT_TOKEN:"fictional-submit",COOKIE_SIGNING_SECRET:"fictional-cookie",TEST_GATE_PASSPHRASE:"fictional-passphrase",CUSTOM_SERVICE_REVIEW_ENABLED:flag};
    const result=spawnSync("bash",["-e","-o","pipefail","-c",shell],{env,encoding:"utf8"});expect(result.status,result.stderr).toBe(0);
    const actual=readFileSync(calls,"utf8").trim().split("\n").map(x=>JSON.parse(x));
    const guards=actual.filter(c=>c.args[2]==="CUSTOM_SERVICE_REVIEW_ENABLED");expect(guards).toHaveLength(flag==="1"?1:0);
    if(flag==="1")expect(guards[0].input).toBe("1");
    for(const call of actual){expect(call.args).toContain("--stdin");expect(call.args).toContain("--skip-deploys");expect(call.args).toContain("fictional-web");expect(call.args).toContain("fictional-test");}
    expect(actual.filter(c=>c.args[2]==="TEST_GATE_PASSPHRASE")).toHaveLength(workflow==="deploy-test.yml"?1:0);
   }finally{rmSync(dir,{recursive:true,force:true});}
  });
 }
 it("the actual CLI needs no receipts to activate, and still refuses a malformed flag",()=>{
  const run=(extra:Record<string,string>)=>spawnSync(process.execPath,["scripts/check-profile-activation.mjs"],{cwd:new URL("../",import.meta.url),env:{PATH:process.env.PATH,...extra},encoding:"utf8"});
  expect(run({NEXT_PUBLIC_CUSTOM_SERVICE_REVIEW:"0",CUSTOM_SERVICE_REVIEW_ENABLED:""}).status).toBe(0);
  expect(run({NEXT_PUBLIC_CUSTOM_SERVICE_REVIEW:"1",CUSTOM_SERVICE_REVIEW_ENABLED:"1"}).status).toBe(0);
  const bad=run({NEXT_PUBLIC_PROFILE_DETAILS:"yes"});expect(bad.status).toBe(1);expect(bad.stderr).toContain("must be absent, 0 or 1");
 });
});
