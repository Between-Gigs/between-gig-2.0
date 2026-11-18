// Fictional browser fixture: every application request is intercepted; no email is sent.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import {createRequire} from "node:module";
import {pathToFileURL} from "node:url";
import tailwind from "@tailwindcss/postcss";
import {chromium} from "playwright-core";
const require=createRequire(import.meta.url);
const postcss=createRequire(require.resolve("@tailwindcss/postcss"))("postcss");
const esbuildDir=fs.readdirSync("node_modules/.pnpm").find(n=>n.startsWith("esbuild@"));
const {build}=await import(pathToFileURL(path.resolve("node_modules/.pnpm/"+esbuildDir+"/node_modules/esbuild/lib/main.js")));
const entry="import React from 'react';import {createRoot} from 'react-dom/client';import {DiagnosticEmail} from './components/emails/DiagnosticEmail';createRoot(document.getElementById('root')).render(<DiagnosticEmail/>);";
const bundle=await build({stdin:{contents:entry,resolveDir:process.cwd(),loader:"tsx"},bundle:true,write:false,format:"iife",define:{"process.env.NODE_ENV":'"production"'},plugins:[{name:"fictional-owner",setup(b){
 b.onResolve({filter:/^@\/(?:lib\/(?:data(?:\/api)?|session|site|auth\/clerk)|components\/(?:site\/AppPage|owners\/kit))$/},a=>({path:a.path,namespace:"fake"}));
 b.onLoad({filter:/.*/,namespace:"fake"},a=>({loader:"jsx",resolveDir:process.cwd(),contents:{
 "@/lib/data":'export const data={kind:"live"}',
 "@/lib/data/api":'export const apiSource={token:async()=>"fictional-owner"}',
 "@/lib/session":'export const useSession=()=>({session:{email:"owner@example.invalid",personId:"fictional-owner"},loading:false})',
 "@/lib/site":'export const basePath=""',
 "@/lib/auth/clerk":'export const clerkEnabled=true',
 "@/components/site/AppPage":'import React from "react";export const AppPage=({children})=><div>{children}</div>',
 "@/components/owners/kit":'import React from "react";export const OwnerPage=({children,title,description,breadcrumbs})=><><h1>{title}</h1><p>{description}</p>{breadcrumbs}{children}</>'
 }[a.path]}));
}}]});
const css=(await postcss([tailwind()]).process(fs.readFileSync("app/globals.css","utf8"),{from:path.resolve("app/globals.css")})).css;
const assets={"/fixture.js":["text/javascript",bundle.outputFiles[0].text],"/fixture.css":["text/css",css],"/":["text/html",'<!doctype html><html lang="en"><meta charset="utf-8"><title>Diagnostic test fixture</title><link rel="stylesheet" href="/fixture.css"><main class="mx-auto grid max-w-3xl gap-4 p-4" id="root"></main><script src="/fixture.js"></script></html>']};
const server=http.createServer((req,res)=>{
 if(/^\/email\/[\w.-]+$/.test(req.url)){
  const file=path.join("public",req.url);
  if(fs.existsSync(file)){res.writeHead(200,{"content-type":file.endsWith(".png")?"image/png":"image/jpeg"});return res.end(fs.readFileSync(file));}
 }
 const a=assets[req.url];res.writeHead(a?200:404,{"content-type":a?.[0]??"text/plain"});res.end(a?.[1]??"");
});
await new Promise(r=>server.listen(0,"127.0.0.1",r));const origin="http://127.0.0.1:"+server.address().port;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??"/usr/bin/chromium",args:["--no-sandbox"]});
const out=path.resolve("deliverables/diagnostic-template-tests");fs.mkdirSync(out,{recursive:true});
try{
 for(const [label,width,height] of [["desktop",1280,1000],["phone",390,844]]){
 const page=await browser.newPage({viewport:{width,height}});const sends=[];let boundedSends=0;
 await page.route("**/*",async route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.pathname==="/api/emails/hubStatus/")return route.fulfill({json:{result:{diagnostic:{testEnabled:true,content:"enabled",usage:"inactive",lifecycle:"unknown",triggers:[]}}}});
  if(url.pathname==="/api/emails/diagnosticStatus/")return route.fulfill({json:{result:{enabled:false,recipient:null,sender:null,receipt:null,receipts:[]}}});
  if(url.pathname==="/api/emails/testTemplate/"){sends.push(req.postDataJSON());await new Promise(r=>setTimeout(r,100));return route.fulfill({json:{result:{status:"queued"}}});}
  if(url.pathname==="/api/emails/sendDiagnostic/"){boundedSends++;return route.fulfill({status:409,json:{error:"diagnostic_disabled"}});}
  if(url.pathname.startsWith("/api/"))throw Error("Unexpected request "+url.pathname);
  if(url.origin===origin)return route.continue();
  return route.abort();
 });
 await page.goto(origin);
 await page.getByLabel("Test recipient · one email address").fill("first@example.invalid,second@example.invalid");
 assert.equal(await page.getByRole("button",{name:"Send test email",exact:true}).isDisabled(),true);
 await page.getByLabel("Test recipient · one email address").fill("tester@example.invalid");
 page.once("dialog",d=>d.dismiss());await page.getByRole("button",{name:"Send test email",exact:true}).click();assert.equal(sends.length,0);
 page.once("dialog",d=>d.accept());await page.getByRole("button",{name:"Send test email",exact:true}).dblclick();
 await page.getByText(/Test request accepted for queuing/).waitFor();assert.equal(sends.length,1);assert.equal(sends[0].args[0].name,"diagnostic");assert.equal(sends[0].args[0].recipient,"tester@example.invalid");
 await page.reload();await page.getByRole("button",{name:"Check / retry same test",exact:true}).waitFor();
 page.once("dialog",d=>d.accept());await page.getByRole("button",{name:"Check / retry same test",exact:true}).click();await page.getByText(/Test request accepted for queuing/).waitFor();assert.equal(sends.length,2);assert.deepEqual(sends[1],sends[0]);
 await page.getByRole("radio",{name:"Real email",exact:true}).click();assert.equal(await page.getByRole("button",{name:"Real send unavailable",exact:true}).isDisabled(),true);assert.equal(boundedSends,0);
 await page.getByRole("radio",{name:"Test email",exact:true}).click();
 const frame=page.frameLocator('iframe[title="Diagnostic email preview"]');await frame.locator("body").waitFor();
 for(const scheme of ["Light","Dark"]){
  await page.getByRole("radio",{name:scheme,exact:true}).click();
  const expected=scheme==="Light"?"rgb(239, 233, 223)":"rgb(24, 24, 24)";
  assert.equal(await frame.locator("body").evaluate(el=>getComputedStyle(el).backgroundColor),expected);
  await page.screenshot({path:path.join(out,label+"-"+scheme.toLowerCase()+".png"),fullPage:true});
 }
 await page.getByRole("button",{name:"Phone preview",exact:true}).click();assert.ok((await page.locator("iframe").boundingBox()).width<=384);
 await page.getByRole("button",{name:"Desktop preview",exact:true}).click();
 assert.equal(await page.getByText("Existing one-time diagnostic authorization and receipt").count(),1);
 assert.equal(await page.locator("details").evaluate(el=>el.open),false);
 await page.getByText("Existing one-time diagnostic authorization and receipt",{exact:true}).click();await page.getByRole("button",{name:"Refresh delivery status",exact:true}).click();assert.equal(boundedSends,0);
 assert.equal(await page.getByRole("button",{name:"Send one diagnostic",exact:true}).isDisabled(),true);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
 await page.close();
 }
 console.log("PASS: diagnostic single-address generic tests, cancel, duplicate click, UUID replay on reload, unsupported real send, unchanged bounded authorization, light/dark and phone/desktop; all requests intercepted.");
}finally{await browser.close();await new Promise(r=>server.close(r));}

