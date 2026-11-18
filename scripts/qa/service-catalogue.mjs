// Local fictional browser storage only: no real account, hosted persistence or profile publication.
import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright-core";
import { serviceCatalogue, serviceLabel } from "../../lib/profile/service-catalogue.ts";
import { serve } from "./serve.mjs";
const {server,url}=await serve(process.env.OUT_DIR||"out");
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||"/usr/bin/chromium"});
const dir="deliverables/service-catalogue";fs.mkdirSync(dir,{recursive:true});
const read=page=>page.evaluate(()=>{const s=JSON.parse(localStorage.getItem("bg2-sample-v2"));return s.drafts.find(d=>d.personId===s.session.personId).fields;});
async function waitSaved(page,expected){await page.waitForFunction(expected=>{const s=JSON.parse(localStorage.getItem("bg2-sample-v2"));const f=s.drafts.find(d=>d.personId===s.session.personId).fields;return Object.entries(expected).every(([k,v])=>JSON.stringify(f[k])===JSON.stringify(v));},expected);}
async function fixture(page,services,other=""){await page.goto(url+"/");await page.evaluate(({services,other})=>{const s=JSON.parse(localStorage.getItem("bg2-sample-v2")),f=s.drafts.find(d=>d.personId===s.session.personId).fields;f.services=services;f.serviceLines=Object.fromEntries(services.map((v,i)=>[v,`My personal answer ${i}.`]));f.other=other;localStorage.setItem("bg2-sample-v2",JSON.stringify(s));},{services,other});await page.goto(url+"/profile/canvas/");await page.locator("#sec-help").waitFor();}
try{for(const width of [320,390,768,1440])for(const theme of ["light","dark"]){
 const ctx=await browser.newContext({viewport:{width,height:1100},colorScheme:theme,reducedMotion:"reduce"}),external=[],errors=[];
 await ctx.route("**/*",r=>new URL(r.request().url()).origin===new URL(url).origin?r.continue():(external.push(r.request().url()),r.abort()));
 await ctx.addInitScript(t=>localStorage.setItem("bg-theme",t),theme);
 const page=await ctx.newPage();page.setDefaultTimeout(12000);page.on("pageerror",e=>errors.push(e.message));
 await page.goto(url+"/");await page.waitForFunction(()=>!!window.bgSample);await page.evaluate(()=>window.bgSample.reset().then(()=>window.bgSample.signInAs("gigster","maya")));
 await fixture(page,[]);const before=await read(page);
 await page.locator("#f-service-0").click();
 assert.deepEqual(await page.getByRole("option").allTextContents(),[...serviceCatalogue.map(c=>c.label),"Other — name your service"]);
 await page.keyboard.press("Escape");assert.equal(await page.locator("#f-service-0").evaluate(e=>e===document.activeElement),true);
 // Every category exposes its own complete approved copy, without copying it into the personal answer.
 for(const category of serviceCatalogue){
  await fixture(page,[]);await page.locator("#f-service-0").click();await page.getByRole("option",{name:category.label,exact:true}).click();
  const section=page.locator("#sec-help");await section.getByText(category.tagline,{exact:true}).waitFor();
  await section.locator("summary").click();
  for(const example of category.examples){await section.getByText(example.title,{exact:true}).waitFor();await section.getByText(example.description,{exact:true}).waitFor();}
  assert.equal(await page.locator("#f-line-0").inputValue(),"");
  const text="My own tailored service, in my words.";await page.locator("#f-line-0").fill(text);await waitSaved(page,{services:[category.value],serviceLines:{[category.value]:text}});
  await page.reload();await page.locator("#f-line-0").waitFor();assert.equal(await page.locator("#f-line-0").inputValue(),text);await page.locator("#sec-help summary").click();
  if(category.value==="Video Editing & Digital Content"||category.value==="Event Styling")await page.locator("#sec-help").screenshot({path:`${dir}/LOCAL-NOT-LIVE-${category.key}-${width}-${theme}.png`});
 }
 // Legacy consolidation must preserve independent rows and exact text through reload/reordering.
 const legacy=["Hair Styling","Makeup Services","Beauty & Personal Styling","Wardrobe & Laundry Care","Event Styling"];
 await fixture(page,legacy);const legacyBefore=await read(page);assert.deepEqual(legacyBefore.services,legacy);
 for(let i=0;i<legacy.length;i++)assert.equal(await page.locator(`#f-service-${i}`).innerText(),serviceLabel(legacy[i]));
 assert.equal(await page.getByRole("button",{name:/Add another service/}).count(),0);
 await page.locator("#service-grip-4").focus();await page.keyboard.press("ArrowUp");const ordered=[...legacy];[ordered[3],ordered[4]]=[ordered[4],ordered[3]];await waitSaved(page,{services:ordered});
 await page.reload();await page.locator("#f-line-0").waitFor();assert.deepEqual((await read(page)).serviceLines,legacyBefore.serviceLines);
 // At the five-slot limit replacing a row with Other reserves the same slot and carries personal text.
 await page.locator("#f-service-0").click();await page.getByRole("option",{name:"Other — name your service",exact:true}).click();
 await page.locator("#f-other").waitFor();assert.equal(await page.locator("#f-other-line").inputValue(),legacyBefore.serviceLines[legacy[0]]);
 await page.locator("#f-other").fill("Fictional custom service");await page.locator("#f-other-line").fill("My personal custom answer.");await waitSaved(page,{other:"Fictional custom service\nMy personal custom answer."});
 await page.reload();await page.locator("#f-other").waitFor();assert.equal(await page.locator("#f-other").inputValue(),"Fictional custom service");assert.equal(await page.getByRole("button",{name:/Add another service/}).count(),0);
 await page.getByRole("button",{name:"Remove your own service",exact:true}).click();await waitSaved(page,{other:""});
 await page.getByRole("button",{name:/Add another service/}).click();await page.locator("#f-service-4").click();await page.getByRole("option",{name:"Other — name your service",exact:true}).click();
 await page.getByRole("button",{name:"Remove your own service",exact:true}).click();assert.equal((await read(page)).other,"");
 // Repeated interrupted picker flows never add an answer. Remove/re-add a category explicitly.
 await fixture(page,["Interior Styling"]);for(let i=0;i<2;i++){await page.getByRole("button",{name:/Add another service/}).click();await page.locator("#f-service-1").click();await page.keyboard.press("Escape");await page.locator("#sec-help").getByRole("button",{name:"Cancel",exact:true}).click();}
 assert.deepEqual((await read(page)).services,["Interior Styling"]);
 await page.getByRole("button",{name:"Remove Interior Styling",exact:true}).click();await page.locator("#f-service-0").click();await page.getByRole("option",{name:"Interior Styling",exact:true}).click();await waitSaved(page,{services:["Interior Styling"]});
 assert.equal(await page.locator("#f-line-0").inputValue(),"");
 const after=await read(page);for(const key of ["workSamples","credits","tools","transport","insurance","bookingMobile","photo"])assert.deepEqual(after[key],before[key]);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 await ctx.close();console.log(`PASS ${width}/${theme}: 8 categories/24 full descriptions/8 taglines, exact personal roundtrip, legacy preservation/reorder, five-slot Other conversion, remove/re-add, interrupted/repeated selection, focus return, no overflow/errors/external requests (sample only)`);
}}finally{await browser.close();server.close();}
