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
 await page.goto(url+"/profile/canvas/"); await page.locator("#sec-details").waitFor();
 if(await page.locator("#f-details-open").count()) await page.locator("#f-details-open").click();
 const before=await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem("bg2-sample-v2")); return s.drafts.find(d=>d.personId===s.session.personId)?.fields;});
 await page.getByRole("radio",{name:"No insurance yet",exact:true}).check();
 assert.equal(await page.locator("#f-insurance-notes").count(),0);
 await page.getByRole("radio",{name:"I have liability insurance",exact:true}).check();
 const note="Fictional private coverage summary for local QA";
 await page.getByLabel("Describe your liability insurance").fill(note);
 await page.waitForFunction(n=>{const s=JSON.parse(localStorage.getItem("bg2-sample-v2"));return s.drafts.find(d=>d.personId===s.session.personId)?.fields.insuranceNotes===n;},note);
 await page.reload(); await page.locator("#f-insurance-notes").waitFor();
 assert.equal(await page.locator("#f-insurance-notes").inputValue(),note);
 await page.getByRole("radio",{name:"Prefer to discuss privately",exact:true}).check();
 assert.equal(await page.locator("#f-insurance-notes").count(),0);
 await page.getByRole("radio",{name:"I have liability insurance",exact:true}).check();
 assert.equal(await page.locator("#f-insurance-notes").inputValue(),note);
 const after=await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem("bg2-sample-v2"));return s.drafts.find(d=>d.personId===s.session.personId)?.fields;});
 for(const key of ["tools","transport","workSamples","services","credits","bookingMobile"]) assert.deepEqual(after[key],before[key],`preserve ${key}`);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),"no horizontal overflow");
 assert.equal(external.length,0);
 await page.locator("#sec-details").screenshot({path:`deliverables/insurance-notes/LOCAL-NOT-LIVE-SAMPLE-${width}-${theme}.png`});
 await context.close(); console.log(`PASS ${width}/${theme}: conditional note, autosave/reload, hidden-value preservation, unchanged media/details, no overflow/external requests (sample only)`);
}} finally {await browser.close();server.close();}
