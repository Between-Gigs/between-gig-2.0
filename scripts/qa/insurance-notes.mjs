// Browser-local fictional fixtures only; does not certify hosted Clerk/Company OS authorization.
import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright-core";
import { serve } from "./serve.mjs";
const { server, url } = await serve("out");
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium" });
fs.mkdirSync("deliverables/insurance-notes", { recursive: true });
try { for (const width of [320,390,768,1440]) for (const theme of ["light","dark"]) {
 const context = await browser.newContext({viewport:{width,height:1100},colorScheme:theme,reducedMotion:"reduce"}), external=[];
 await context.route("**/*", r => new URL(r.request().url()).origin===new URL(url).origin ? r.continue() : (external.push(r.request().url()),r.abort()));
 await context.addInitScript(t=>localStorage.setItem("bg-theme",t),theme);
 const page=await context.newPage(); page.setDefaultTimeout(15000);
 await page.goto(url+"/"); await page.waitForFunction(()=>!!window.bgSample);
 await page.evaluate(()=>window.bgSample.reset().then(()=>window.bgSample.signInAs("gigster","maya")));
 const note="Fictional private coverage summary for local QA",tools="Fictional QA tool";
 await page.evaluate(note=>{const s=JSON.parse(localStorage.getItem("bg2-sample-v2")),f=s.drafts.find(d=>d.personId===s.session.personId).fields;Object.assign(f,{insurance:"yes",insuranceNotes:note,languages:"",tools:"",mode:"on-site"});localStorage.setItem("bg2-sample-v2",JSON.stringify(s));},note);
 await page.goto(url+"/profile/canvas/"); await page.locator("#sec-details").waitFor();
 const open=page.locator("#f-details-open"),insurance=page.locator('input[name="f-insurance"],#f-insurance-notes');
 await open.waitFor(); // A hidden legacy answer alone must not expand Details.
 await open.click();
 await page.locator("#f-tools").waitFor();
 assert.equal(await insurance.count(),0);
 const before=await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem("bg2-sample-v2"));return s.drafts.find(d=>d.personId===s.session.personId).fields;});
 await page.locator("#f-tools").fill(tools);
 await page.waitForFunction(t=>{const s=JSON.parse(localStorage.getItem("bg2-sample-v2"));return s.drafts.find(d=>d.personId===s.session.personId).fields.tools===t;},tools);
 await page.reload(); await page.locator("#f-tools").waitFor();
 assert.equal(await page.locator("#f-tools").inputValue(),tools);
 assert.equal(await insurance.count(),0);
 const after=await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem("bg2-sample-v2"));return s.drafts.find(d=>d.personId===s.session.personId).fields;});
 assert.equal(after.insurance,"yes");assert.equal(after.insuranceNotes,note);
 for(const key of ["transport","workSamples","services","credits","bookingMobile"]) assert.deepEqual(after[key],before[key],`preserve ${key}`);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),"no horizontal overflow");
 assert.equal(external.length,0);
 await page.locator("#sec-details").screenshot({path:`deliverables/insurance-notes/LOCAL-NOT-LIVE-SAMPLE-${width}-${theme}.png`});
 await context.close(); console.log(`PASS ${width}/${theme}: hidden controls, unrelated autosave/reload, legacy insurance preservation, unchanged media/details, no overflow/external requests (sample only)`);
}} finally {await browser.close();server.close();}
