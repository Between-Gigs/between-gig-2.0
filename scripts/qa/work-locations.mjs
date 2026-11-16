// Current Gigster editor, fictional browser-local fixtures. No real Clerk or hosted acceptance.
import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright-core";
import { serve } from "./serve.mjs";
const {server,url}=await serve("out");const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||"/usr/bin/chromium"});
fs.mkdirSync("deliverables/work-locations",{recursive:true});
try{for(const width of [320,390,768,1440])for(const theme of ["light","dark"]){
 const context=await browser.newContext({viewport:{width,height:1100},colorScheme:theme,reducedMotion:"reduce"}),external=[];
 await context.route("**/*",r=>new URL(r.request().url()).origin===new URL(url).origin?r.continue():(external.push(r.request().url()),r.abort()));
 await context.addInitScript(t=>localStorage.setItem("bg-theme",t),theme);
 const page=await context.newPage();page.setDefaultTimeout(15000);await page.goto(url+"/");await page.waitForFunction(()=>!!window.bgSample);
 await page.evaluate(()=>window.bgSample.reset().then(()=>window.bgSample.signInAs("gigster","maya")));await page.goto(url+"/profile/canvas/");await page.locator("#sec-details").waitFor();
 if(await page.locator("#f-details-open").count())await page.locator("#f-details-open").click();
 const before=await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem("bg2-sample-v2"));return s.drafts.find(d=>d.personId===s.session.personId)?.fields;});
 const client=()=>page.getByRole("checkbox",{name:"On Site, at the client’s location.",exact:true});
 const business=()=>page.getByRole("checkbox",{name:"At my office, studio or other place of business.",exact:true});
 // Enter both from either existing single value.
 if(!await client().isChecked())await client().check();if(!await business().isChecked())await business().check();
 await page.waitForFunction(()=>{const s=JSON.parse(localStorage.getItem("bg2-sample-v2"));return s.drafts.find(d=>d.personId===s.session.personId)?.fields.mode==="both";});
 await page.reload();assert.equal(await client().isChecked(),true);assert.equal(await business().isChecked(),true);
 await client().uncheck();assert.equal(await business().isChecked(),true);assert.equal(await business().isDisabled(),true,"cannot erase the last existing-contract location");
 await page.waitForFunction(()=>{const s=JSON.parse(localStorage.getItem("bg2-sample-v2"));return s.drafts.find(d=>d.personId===s.session.personId)?.fields.mode==="studio";});
 await page.reload();assert.equal(await client().isChecked(),false);assert.equal(await business().isChecked(),true);
 // Native keyboard activation adds the second location, then client-only is saved.
 await client().focus();await page.keyboard.press("Space");assert.equal(await client().isChecked(),true);await business().uncheck();
 assert.equal(await client().isDisabled(),true);
 await page.waitForFunction(()=>{const s=JSON.parse(localStorage.getItem("bg2-sample-v2"));return s.drafts.find(d=>d.personId===s.session.personId)?.fields.mode==="on-site";});
 await page.reload();assert.equal(await client().isChecked(),true);assert.equal(await business().isChecked(),false);
 const after=await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem("bg2-sample-v2"));return s.drafts.find(d=>d.personId===s.session.personId)?.fields;});
 for(const key of ["tools","transport","insurance","insuranceNotes","services","credits","workSamples","bookingMobile"])assert.deepEqual(after[key],before[key],`preserve ${key}`);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),"no horizontal overflow");assert.equal(external.length,0);
 await page.locator("#sec-details").screenshot({path:`deliverables/work-locations/LOCAL-NOT-LIVE-SAMPLE-${width}-${theme}.png`});
 await context.close();console.log(`PASS ${width}/${theme}: both/single persistence, native keyboard, minimum-one legacy contract, no unrelated changes/overflow/network (sample only)`);
}}finally{await browser.close();server.close();}
