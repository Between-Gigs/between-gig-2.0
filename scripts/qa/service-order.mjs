// Fictional local current-editor fixtures only. No real identity, account, email or hosted acceptance.
import assert from "node:assert/strict";
import fs from "node:fs";
import {chromium} from "playwright-core";
import {serve} from "./serve.mjs";
const {server,url}=await serve(process.env.OUT_DIR||"out");
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||"/usr/bin/chromium"});
const services=["Interior Styling","Event Styling","Photography & Portraits"];
const lines=Object.fromEntries(services.map((s,i)=>[s,`Fictional service description ${i+1}`]));
const fields=page=>page.evaluate(()=>{const s=JSON.parse(localStorage.getItem("bg2-sample-v2"));return s.drafts.find(d=>d.personId===s.session.personId)?.fields;});
const uiOrder=page=>page.locator('#sec-help button[id^="service-grip-"]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute("aria-label").replace(/^Move /,"").replace(/, service \d+ of \d+$/, "")));
fs.mkdirSync("deliverables/service-order",{recursive:true});
try{for(const width of ((process.env.BASELINE_ONLY||process.env.TOUCH_ONLY)?[390]:[320,390,768,1440]))for(const theme of((process.env.BASELINE_ONLY||process.env.TOUCH_ONLY)?["light"]:["light","dark"])){
 const context=await browser.newContext({viewport:{width,height:1600},hasTouch:width<768,isMobile:width<768,colorScheme:theme,reducedMotion:"reduce"}),external=[];
 await context.route("**/*",r=>new URL(r.request().url()).origin===new URL(url).origin?r.continue():(external.push(r.request().url()),r.abort()));
 await context.addInitScript(t=>localStorage.setItem("bg-theme",t),theme);const page=await context.newPage();page.setDefaultTimeout(15000);
 await page.goto(url+"/");await page.waitForFunction(()=>!!window.bgSample);await page.evaluate(()=>window.bgSample.reset().then(()=>window.bgSample.signInAs("gigster","maya")));
 await page.evaluate(({services,lines})=>{const s=JSON.parse(localStorage.getItem("bg2-sample-v2"));const f=s.drafts.find(d=>d.personId===s.session.personId).fields;f.services=services;f.serviceLines=lines;localStorage.setItem("bg2-sample-v2",JSON.stringify(s));},{services,lines});
 await page.goto(url+"/profile/canvas/");await page.locator("#service-grip-0").waitFor();const before=await fields(page);
 await page.evaluate(()=>window.scrollTo(0,document.querySelector("#sec-help").getBoundingClientRect().top+scrollY-20));
 await page.evaluate(()=>document.addEventListener("pointerdown",e=>{window.__qaPointerId=e.pointerId;},{once:true,capture:true}));
 const first=await page.locator("#service-grip-0").boundingBox();await page.mouse.move(first.x+first.width/2,first.y+first.height/2);await page.mouse.down();
 await page.evaluate(()=>{const id=window.__qaPointerId;for(const node of [document.querySelector("#service-grip-0"),document.querySelector("#sec-help > ol")])if(node?.hasPointerCapture(id))node.releasePointerCapture(id);});
 await page.mouse.move(2,2);await page.mouse.up();const third=await page.locator("#service-grip-2").boundingBox();await page.mouse.move(third.x+third.width/2,third.y+third.height/2);
 await page.waitForTimeout(600);
 assert.deepEqual(await uiOrder(page),services,"capture loss followed by hover must never reorder a service");
 assert.deepEqual((await fields(page)).services,services,"capture loss must not create an unintended autosave");
 if(!process.env.BASELINE_ONLY){
  // Right-click is not a reorder gesture. Suppress the native context menu only in this local test.
  await page.evaluate(()=>document.addEventListener("contextmenu",e=>e.preventDefault(),{once:true}));
  const rightFrom=await page.locator("#service-grip-0").boundingBox(),rightTo=await page.locator("#service-grip-2").boundingBox();
  await page.mouse.move(rightFrom.x+rightFrom.width/2,rightFrom.y+rightFrom.height/2);await page.mouse.down({button:"right"});
  await page.mouse.move(rightTo.x+rightTo.width/2,rightTo.y+rightTo.height/2,{steps:8});await page.mouse.up({button:"right"});assert.deepEqual(await uiOrder(page),services,"secondary button must not reorder");
  // A normal drag must cross two rows, even as the dragged DOM row changes position.
  const from=await page.locator("#service-grip-0").boundingBox(),to=await page.locator("#sec-help > ol > li").nth(2).boundingBox();
  await page.mouse.move(from.x+from.width/2,from.y+from.height/2);await page.mouse.down();
  await page.locator("#sec-help > ol").dispatchEvent("pointermove",{pointerId:99,pointerType:"touch",isPrimary:false,buttons:1,clientX:from.x+from.width/2,clientY:to.y+to.height-4});
  await page.locator("#sec-help > ol").dispatchEvent("pointercancel",{pointerId:99,pointerType:"touch",isPrimary:false});
  assert.deepEqual(await uiOrder(page),services,"a foreign pointer cannot move or cancel the active gesture");
  await page.mouse.move(from.x+from.width/2,to.y+to.height-4,{steps:16});await page.mouse.up();
  const moved=[services[1],services[2],services[0]];assert.deepEqual(await uiOrder(page),moved,"drag across two rows");
  await page.waitForFunction(expected=>{const s=JSON.parse(localStorage.getItem("bg2-sample-v2"));return JSON.stringify(s.drafts.find(d=>d.personId===s.session.personId).fields.services)===JSON.stringify(expected);},moved);
  await page.reload();await page.locator("#service-grip-0").waitFor();assert.deepEqual(await uiOrder(page),moved);
  await page.locator("#service-grip-2").focus();await page.keyboard.press("ArrowUp");const keyboard=[services[1],services[0],services[2]];
  await page.waitForFunction(()=>document.activeElement?.id==="service-grip-1");assert.deepEqual(await uiOrder(page),keyboard);
  await page.waitForFunction(expected=>{const s=JSON.parse(localStorage.getItem("bg2-sample-v2"));return JSON.stringify(s.drafts.find(d=>d.personId===s.session.personId).fields.services)===JSON.stringify(expected);},keyboard);
  if(width===390&&theme==="light") {
    const touch=await context.newCDPSession(page);
    const grip=await page.locator("#service-grip-2").boundingBox(),row=await page.locator("#sec-help > ol > li").nth(0).boundingBox();
    const x=grip.x+grip.width/2,fromY=grip.y+grip.height/2,toY=row.y+row.height/2-10;
    await touch.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[{x,y:fromY,id:7}]});
    for(let i=1;i<=16;i++)await touch.send("Input.dispatchTouchEvent",{type:"touchMove",touchPoints:[{x,y:fromY+(toY-fromY)*i/16,id:7}]});
    await touch.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});
    const expected=[services[2],services[1],services[0]];assert.deepEqual(await uiOrder(page),expected,"Chromium touch drag across two rows");
    await page.waitForFunction(expected=>{const s=JSON.parse(localStorage.getItem("bg2-sample-v2"));return JSON.stringify(s.drafts.find(d=>d.personId===s.session.personId).fields.services)===JSON.stringify(expected);},expected);
    await touch.detach();console.log("PASS Chromium touch drag at390px (not physical Safari acceptance)");
  }
  const after=await fields(page);assert.deepEqual(after.serviceLines,lines,"descriptions follow service identity");
  for(const key of ["tools","transport","credits","workSamples","mode","insurance","bookingMobile"])assert.deepEqual(after[key],before[key],`preserve ${key}`);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.equal(external.length,0);
  await page.locator("#sec-help").screenshot({path:`deliverables/service-order/LOCAL-NOT-LIVE-SAMPLE-${width}-${theme}.png`});
 }
 await context.close();console.log(`PASS ${width}/${theme}: capture-loss refusal${process.env.BASELINE_ONLY?"":", multi-row drag, keyboard/focus, save/reload, description identity and unrelated-field preservation"} (local sample)`);
}}finally{await browser.close();server.close();}
