// Browser component fixture with fake owner/data/token and intercepted requests; never calls a real service.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";
const esbuildDir = fs.readdirSync("node_modules/.pnpm").find(n => n.startsWith("esbuild@"));
const { build } = await import(pathToFileURL(path.resolve(`node_modules/.pnpm/${esbuildDir}/node_modules/esbuild/lib/main.js`)));
const entry = `import React from 'react'; import {createRoot} from 'react-dom/client'; import {EmailActions} from './components/emails/EmailActions'; createRoot(document.getElementById('root')).render(<EmailActions name="invite" status={{testEnabled:true}}/>);`;
const bundle = await build({ stdin: { contents: entry, resolveDir: process.cwd(), loader: "tsx" }, bundle: true, write: false, format: "iife", define: { "process.env.NODE_ENV": '"production"' }, plugins: [{ name: "fake-backend-only", setup(b) {
  b.onResolve({ filter: /^@\/lib\/(data(?:\/api)?|session|site)$/ }, a => ({ path: a.path, namespace: "fake" }));
  b.onLoad({ filter: /.*/, namespace: "fake" }, a => ({ resolveDir: process.cwd(), contents: a.path.endsWith("data/api") ? 'export const apiSource={token:async()=>"fictional-owner"}' : a.path.endsWith("data") ? 'export const data={kind:"live",owners:{inviteAddresses:async(emails)=>{const r=await fetch("/fake-real",{method:"POST",body:JSON.stringify(emails)});if(!r.ok)throw Error("uncertain");return r.json()}}}' : a.path.endsWith("session") ? 'import {useState,useEffect} from "react"; export const useSession=()=>{const [email,set]=useState(window.fixtureOwner??"owner@example.org");useEffect(()=>{const changed=()=>set(window.fixtureOwner);window.addEventListener("fixture-owner",changed);return()=>window.removeEventListener("fixture-owner",changed)},[]);return {session:{email}}}' : 'export const basePath=""' }));
} }] });
const js = bundle.outputFiles[0].text;
const server = http.createServer((req,res) => { res.setHeader("content-type",req.url === "/fixture.js" ? "text/javascript" : "text/html"); res.end(req.url === "/fixture.js" ? js : '<!doctype html><title>Email controls fixture</title><div id="root"></div><script src="/fixture.js"></script>'); });
await new Promise(r=>server.listen(0,"127.0.0.1",r));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??"/usr/bin/chromium",args:["--no-sandbox"]});
try {
 const page=await browser.newPage(); let tests=[]; let real=0;
 await page.route("**/*",route=>{ const req=route.request(); if(req.url().includes("/api/emails/testTemplate/")){tests.push(req.postDataJSON());return route.fulfill({status:200,contentType:"application/json",body:'{"result":{"status":"queued"}}'});} if(req.url().endsWith("/fake-real")){real++; return route.fulfill({status:502,body:"uncertain"});} return new URL(req.url()).origin===origin?route.continue():route.abort(); });
 await page.goto(origin); await page.getByLabel("Test recipient · one email address").fill("a@example.org,b@example.org"); assert.equal(await page.getByRole("button",{name:"Send test email",exact:true}).isDisabled(),true);
 await page.getByLabel("Test recipient · one email address").fill("a@example.org");
 page.once("dialog",d=>d.dismiss()); await page.getByRole("button",{name:"Send test email",exact:true}).click(); assert.equal(tests.length,0);
 page.once("dialog",d=>d.accept()); await page.getByRole("button",{name:"Send test email",exact:true}).dblclick(); await page.getByText(/Test request accepted/).waitFor(); assert.equal(tests.length,1); assert.equal(await page.getByRole("button",{name:"Check / retry same test",exact:true}).isDisabled(),false); assert.equal(await page.getByText(/saved test's retry window has expired/).count(),0);
 await page.reload(); await page.getByRole("button",{name:"Check / retry same test",exact:true}).waitFor(); page.once("dialog",d=>d.accept()); await page.getByRole("button",{name:"Check / retry same test",exact:true}).click(); await page.getByText(/Test request accepted/).waitFor(); assert.equal(tests.length,2); assert.deepEqual(tests[0].args[0],tests[1].args[0],"retry preserves recipient, UUID and original startedAt");
 await page.evaluate(()=>{window.fixtureOwner="second-owner@example.org";window.dispatchEvent(new Event("fixture-owner"));});
 await page.getByRole("button",{name:"Send test email",exact:true}).waitFor(); assert.equal(await page.getByLabel("Test recipient · one email address").inputValue(),"");
 await page.evaluate(()=>{window.fixtureOwner="owner@example.org";window.dispatchEvent(new Event("fixture-owner"));});
 await page.getByRole("button",{name:"Check / retry same test",exact:true}).waitFor(); assert.equal(await page.getByLabel("Test recipient · one email address").inputValue(),"a@example.org");
 // A restored expired, future or legacy attempt must never gain a fresh replay window.
 const storedKey="bg-email-test:owner%40example.org:invite";
 for(const startedAt of [Date.now()-23*3600000,Date.now()-24*3600000,Date.now()+3600000,null]) {
   await page.evaluate(({storedKey,startedAt})=>{sessionStorage.setItem(storedKey,JSON.stringify({recipient:"a@example.org",requestId:"11111111-1111-4111-8111-111111111111",...(startedAt===null?{}:{startedAt})}));},{storedKey,startedAt});
   await page.reload(); await page.getByText(/saved test's retry window has expired/).waitFor();
   assert.equal(await page.getByRole("button",{name:"Check / retry same test",exact:true}).isDisabled(),true); assert.equal(tests.length,2);
   page.once("dialog",d=>d.dismiss());await page.getByRole("button",{name:"Start a new test",exact:true}).click();assert.equal(await page.getByRole("button",{name:"Check / retry same test",exact:true}).isDisabled(),true);
 }
 // The timer also closes a window on a page kept open, without a reload.
 await page.clock.install();
 await page.evaluate(({storedKey})=>sessionStorage.setItem(storedKey,JSON.stringify({recipient:"a@example.org",requestId:"11111111-1111-4111-8111-111111111111",startedAt:Date.now()-23*3600000+2000})),{storedKey});
 await page.reload(); await page.getByRole("button",{name:"Check / retry same test",exact:true}).waitFor();assert.equal(await page.getByRole("button",{name:"Check / retry same test",exact:true}).isDisabled(),false);
 await page.clock.fastForward(3000);assert.equal(await page.getByRole("button",{name:"Check / retry same test",exact:true}).isDisabled(),true);assert.equal(tests.length,2);
 page.once("dialog",d=>d.accept());await page.getByRole("button",{name:"Start a new test",exact:true}).click();await page.getByRole("button",{name:"Send test email",exact:true}).waitFor();
 await page.getByRole("radio",{name:"Real email",exact:true}).click(); await page.getByLabel("Email addresses",{exact:true}).fill("a@example.org"); page.once("dialog",d=>d.dismiss()); await page.getByRole("button",{name:"Send to 1 address",exact:true}).click(); assert.equal(real,0);
 page.once("dialog",d=>d.accept()); await page.getByRole("button",{name:"Send to 1 address",exact:true}).dblclick(); await page.getByText(/Outcome uncertain\. Do not resend/).waitFor(); assert.equal(real,1);
 await page.getByRole("radio",{name:"Test email",exact:true}).click(); await page.getByRole("radio",{name:"Real email",exact:true}).click(); await page.getByText(/An invitation attempt is recorded/).waitFor(); assert.equal(await page.getByRole("button",{name:"Send invitation",exact:true}).isDisabled(),true);
 await page.reload(); await page.getByRole("radio",{name:"Real email",exact:true}).click(); await page.getByText(/An invitation attempt is recorded/).waitFor(); assert.equal(await page.getByRole("button",{name:"Send invitation",exact:true}).isDisabled(),true); assert.equal(real,1);
 console.log("PASS: invalid/multiple addresses, cancelled confirmations, double-click guard, test replay across reload, real uncertain guard across mode changes and reload. All requests intercepted.");
} finally {await browser.close();await new Promise(r=>server.close(r));}
