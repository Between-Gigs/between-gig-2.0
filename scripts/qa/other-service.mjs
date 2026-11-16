// Fictional browser-local sample only. No hosted accounts, publication, sends or service calls.
import assert from "node:assert/strict";
import fs from "node:fs";
import {chromium} from "playwright-core";
import {serve} from "./serve.mjs";
const {server,url}=await serve(process.env.OUT_DIR||"out");
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||"/usr/bin/chromium"});
const services=["Interior Styling","Event Styling","Photography & Portraits","Wardrobe & Closet","Home Organization"];
const name="Fictional prop restoration",line="Restore a fictional display prop.";
const fields=page=>page.evaluate(()=>{const s=JSON.parse(localStorage.getItem("bg2-sample-v2"));return s.drafts.find(d=>d.personId===s.session.personId).fields;});
async function savedOther(page,expected){await page.waitForFunction(expected=>{const s=JSON.parse(localStorage.getItem("bg2-sample-v2"));return s.drafts.find(d=>d.personId===s.session.personId).fields.other===expected;},expected);}
fs.mkdirSync("deliverables/other-service",{recursive:true});
try{for(const width of(process.env.BASELINE_ONLY?[390]:[320,390,768,1440]))for(const theme of(process.env.BASELINE_ONLY?["light"]:["light","dark"])){
 const context=await browser.newContext({viewport:{width,height:1100},colorScheme:theme,reducedMotion:"reduce"}),external=[];
 await context.route("**/*",r=>new URL(r.request().url()).origin===new URL(url).origin?r.continue():(external.push(r.request().url()),r.abort()));
 await context.addInitScript(t=>localStorage.setItem("bg-theme",t),theme);
 const page=await context.newPage();page.setDefaultTimeout(10000);await page.goto(url+"/");await page.waitForFunction(()=>!!window.bgSample);
 await page.evaluate(()=>window.bgSample.reset().then(()=>window.bgSample.signInAs("gigster","maya")));
 const identity=await page.evaluate(()=>JSON.parse(localStorage.getItem("bg2-sample-v2")).session);
 await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem("bg2-sample-v2"));const f=s.drafts.find(d=>d.personId===s.session.personId).fields;f.services=[];f.serviceLines={};f.other="";localStorage.setItem("bg2-sample-v2",JSON.stringify(s));});
 await page.goto(url+"/profile/canvas/");const before=await fields(page),section=page.locator("#sec-help"),other=()=>section.getByRole("button",{name:"Other — name your service",exact:true});
 // Real same-context storage events update the mounted editor without a reload.
 const peer=await context.newPage();await peer.goto(url+"/");
 await peer.evaluate(({services,name,line})=>{const s=JSON.parse(localStorage.getItem("bg2-sample-v2"));const d=s.drafts.find(d=>d.personId===s.session.personId);d.fields.services=services.slice(0,4);d.fields.serviceLines=Object.fromEntries(d.fields.services.map(s=>[s,"Fictional description."]));d.fields.other=`${name}\n${line}`;d.savedAt=new Date(Date.now()+1000).toISOString();localStorage.setItem("bg2-sample-v2",JSON.stringify(s));},{services,name,line});
 await page.locator("#f-other").waitFor();assert.equal(await page.locator("#f-other").inputValue(),name,"external custom service is visible without remount");assert.equal(await other().count(),0);assert.equal(await section.getByRole("button",{name:/Add another service/}).count(),0,"external custom service counts as the fifth slot");
 await peer.evaluate(()=>{const s=JSON.parse(localStorage.getItem("bg2-sample-v2"));const d=s.drafts.find(d=>d.personId===s.session.personId);d.fields.services=[];d.fields.serviceLines={};d.fields.other="";d.savedAt=new Date(Date.now()+2000).toISOString();localStorage.setItem("bg2-sample-v2",JSON.stringify(s));});await page.locator("#f-other").waitFor({state:"hidden"});await peer.close();
 await other().waitFor();await other().focus();await page.keyboard.press("Enter");await page.waitForFunction(()=>document.activeElement?.id==="f-other");
 await page.locator("#f-other").fill(name);await page.locator("#f-other-line").fill(line);await savedOther(page,`${name}\n${line}`);await page.reload();await page.locator("#f-other").waitFor();assert.equal(await page.locator("#f-other").inputValue(),name);assert.equal(await page.locator("#f-other-line").inputValue(),line);
 await section.getByRole("button",{name:"Remove your own service",exact:true}).click();await savedOther(page,"");await page.locator("#f-service-0").click();await page.getByRole("option",{name:"Other — name your service",exact:true}).click();await page.waitForFunction(()=>document.activeElement?.id==="f-other");
 await page.locator("#f-other").fill(name);await page.locator("#f-other-line").fill(line);await savedOther(page,`${name}\n${line}`);
 // Existing custom field and service array remain separate; together they reserve at most five slots.
 await page.evaluate(services=>{const s=JSON.parse(localStorage.getItem("bg2-sample-v2"));const f=s.drafts.find(d=>d.personId===s.session.personId).fields;f.services=services.slice(0,4);f.serviceLines=Object.fromEntries(services.slice(0,4).map(s=>[s,"Fictional service description."]));localStorage.setItem("bg2-sample-v2",JSON.stringify(s));},services);await page.reload();await page.locator("#f-other").waitFor();assert.equal(await other().count(),0);assert.equal(await section.getByRole("button",{name:/Add another service/}).count(),0);assert.equal(await section.getByRole("combobox").count(),4);
 await section.getByRole("button",{name:"Remove your own service",exact:true}).click();await savedOther(page,"");await other().click();await page.waitForFunction(()=>document.activeElement?.id==="f-other");assert.equal(await section.getByRole("button",{name:/Add another service/}).count(),0,"empty custom editor reserves the fifth slot");await section.getByRole("button",{name:"Remove your own service",exact:true}).click();await other().waitFor();assert.equal((await fields(page)).other,"");await other().click();await page.waitForFunction(()=>document.activeElement?.id==="f-other");await page.locator("#f-other").fill(name);await page.locator("#f-other-line").fill(line);await savedOther(page,`${name}\n${line}`);
 // A pre-existing over-limit draft is preserved verbatim; the user can explicitly remove an entry.
 await page.evaluate(services=>{const s=JSON.parse(localStorage.getItem("bg2-sample-v2"));const f=s.drafts.find(d=>d.personId===s.session.personId).fields;f.services=services;f.serviceLines=Object.fromEntries(services.map(s=>[s,"Fictional service description."]));localStorage.setItem("bg2-sample-v2",JSON.stringify(s));},services);await page.reload();await page.locator("#f-other").waitFor();assert.deepEqual((await fields(page)).services,services);assert.equal((await fields(page)).other,`${name}\n${line}`);assert.equal(await section.getByRole("combobox").count(),5);assert.equal(await other().count(),0);
 await section.getByRole("button",{name:`Remove ${services[4]}`,exact:true}).click();await page.waitForFunction(()=>{const s=JSON.parse(localStorage.getItem("bg2-sample-v2"));return s.drafts.find(d=>d.personId===s.session.personId).fields.services.length===4;});
 const after=await fields(page);assert.equal(after.other,`${name}\n${line}`);for(const key of ["workSamples","credits","tools","transport","insurance","bookingMobile","photo"])assert.deepEqual(after[key],before[key],`preserve ${key}`);
 assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem("bg2-sample-v2")).session),identity);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await section.screenshot({path:`deliverables/other-service/LOCAL-NOT-LIVE-SAMPLE-${width}-${theme}.png`});
 const person=await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem("bg2-sample-v2"));const p=s.people.find(p=>p.id===s.session.personId);return {slug:p.slug,name:p.name};});await page.goto(`${url}/p/${person.slug}/`);await page.getByRole("heading",{name:person.name,exact:true}).first().waitFor();assert.equal((await page.locator("body").innerText()).includes(name),false,"unsent custom service never replaces the published profile");assert.equal(external.length,0);
 await context.close();console.log(`PASS ${width}/${theme}: discoverable button/select, keyboard focus, save/reload, five-slot limit, legacy preservation, unsent/public separation (sample only)`);
}}finally{await browser.close();server.close();}
