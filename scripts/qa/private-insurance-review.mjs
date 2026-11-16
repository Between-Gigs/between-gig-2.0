// Actual local owner/Gigster/public components with fictional browser-local data. No live identity or backend claim.
import assert from "node:assert/strict";
import fs from "node:fs";
import {chromium} from "playwright-core";
import {serve} from "./serve.mjs";
const widths=process.env.QA_WIDTH?[Number(process.env.QA_WIDTH)]:[320,390,768,1440];
if(widths.some(w=>![320,390,768,1440].includes(w)))throw Error("Use one of the documented QA widths");
const{server,url}=await serve("out");const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||"/usr/bin/chromium"});
const note='Fictional coverage summary.\n<img src=x onerror="window.__privateNoteExecuted=true">\n'+'x'.repeat(200);
const unsent="UNSENT FICTIONAL NOTE MUST NOT APPEAR IN SUBMITTED REVIEW";
fs.mkdirSync("deliverables/private-insurance-review",{recursive:true});
try{for(const width of widths)for(const theme of ["light","dark"]){
 const context=await browser.newContext({viewport:{width,height:1100},colorScheme:theme,reducedMotion:"reduce"}),external=[];
 await context.route("**/*",r=>new URL(r.request().url()).origin===new URL(url).origin?r.continue():(external.push(r.request().url()),r.abort()));
 await context.addInitScript(t=>localStorage.setItem("bg-theme",t),theme);
 const page=await context.newPage();page.setDefaultTimeout(15000);await page.goto(url+"/");await page.waitForFunction(()=>!!window.bgSample);await page.evaluate(()=>window.bgSample.reset().then(()=>window.bgSample.signInAs("owner")));
 const person=await page.evaluate(({note,unsent})=>{const s=JSON.parse(localStorage.getItem("bg2-sample-v2"));const p=s.people.find(p=>p.id==="maya");p.status="submitted";const profile=s.profiles.find(p=>p.personId==="maya");profile.fields.insurance="yes";profile.fields.insuranceNotes=note;const draft=s.drafts.find(p=>p.personId==="maya");draft.fields.insurance="yes";draft.fields.insuranceNotes=unsent;localStorage.setItem("bg2-sample-v2",JSON.stringify(s));return {name:p.name,slug:p.slug};},{note,unsent});
 await page.goto(url+"/owners/people/maya/?from=review");await page.getByRole("heading",{name:"Private insurance description",exact:true}).waitFor();
 const region=page.getByRole("region",{name:"Private insurance description",exact:true});
 assert.equal(await region.locator("#owner-insurance-description").textContent(),note);
 assert.equal(await region.locator("img,script,svg").count(),0,"private note renders literal text only");
 assert.equal(await page.evaluate(()=>window.__privateNoteExecuted),undefined);
 assert.equal(await page.getByText(unsent,{exact:true}).count(),0,"sample submitted version wins over unsent draft");
 if(!await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)) console.log(JSON.stringify(await page.evaluate(()=>({viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,note:(()=>{const e=document.querySelector("#owner-insurance-description");return{clientWidth:e.clientWidth,scrollWidth:e.scrollWidth,right:e.getBoundingClientRect().right};})(),overflow:[...document.querySelectorAll("body *")].map(e=>({tag:e.tagName,id:e.id,cls:e.className,width:Math.round(e.getBoundingClientRect().width),right:Math.round(e.getBoundingClientRect().right)})).filter(e=>e.right>innerWidth+1&&e.width>0).sort((a,b)=>b.width-a.width).slice(0,8)}))));
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),"owner note must wrap at narrow widths");
 await region.screenshot({path:`deliverables/private-insurance-review/LOCAL-NOT-LIVE-OWNER-${width}-${theme}.png`});
 // Current disclosure controls visibility without deleting the retained private note.
 await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem("bg2-sample-v2"));s.profiles.find(p=>p.personId==="maya").fields.insurance="no";localStorage.setItem("bg2-sample-v2",JSON.stringify(s));});
 await page.reload();await page.getByRole("heading",{name:person.name,exact:true}).first().waitFor();assert.equal(await page.locator("#owner-insurance-description").count(),0);
 if((width===390&&theme==="light")||(width===1440&&theme==="dark")){
  // The regular approved owner view uses the same private section; the public view never does.
  await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem("bg2-sample-v2"));s.people.find(p=>p.id==="maya").status="approved";s.profiles.find(p=>p.personId==="maya").fields.insurance="yes";localStorage.setItem("bg2-sample-v2",JSON.stringify(s));});
  await page.goto(url+"/owners/people/maya/");await page.locator("#owner-insurance-description").waitFor();assert.equal(await page.locator("#owner-insurance-description").textContent(),note);
  await page.goto(`${url}/p/${person.slug}/`);await page.getByRole("heading",{name:person.name,exact:true}).first().waitFor();assert.equal(await page.locator("#owner-insurance-description").count(),0);assert.equal((await page.locator("body").innerText()).includes("Fictional coverage summary."),false);
  await page.evaluate(()=>window.bgSample.signInAs("gigster","maya"));await page.goto(url+"/owners/people/maya/");await page.getByRole("heading",{name:"For the Between Gigs team",exact:true}).waitFor();assert.equal(await page.locator("#owner-insurance-description").count(),0);
  await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem("bg2-sample-v2"));s.session=null;localStorage.setItem("bg2-sample-v2",JSON.stringify(s));});await page.reload();await page.getByRole("heading",{name:"For the Between Gigs team",exact:true}).waitFor();assert.equal(await page.locator("#owner-insurance-description").count(),0);
 }
 assert.equal(external.length,0);await context.close();console.log(`PASS ${width}/${theme}: protected owner note, escaped text, conditional visibility, responsive wrap${(width===390&&theme==="light")||(width===1440&&theme==="dark")?", owner/public/Gigster/anonymous separation":""} (sample only)`);
}}finally{await browser.close();server.close();}
