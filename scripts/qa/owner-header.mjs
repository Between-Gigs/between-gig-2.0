// Local sample components only: no real accounts, role grants, profile writes or hosted acceptance.
import assert from "node:assert/strict";
import fs from "node:fs";
import {chromium} from "playwright-core";
import {serve} from "./serve.mjs";
const {server,url}=await serve(process.env.QA_OUT_DIR||"out");
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||"/usr/bin/chromium"});
const ownerCases=(process.env.HEADER_SMOKE?["editorial"]:["editorial","swiss","modern"]).flatMap(look=>(process.env.HEADER_SMOKE?[320]:[320,352,360,390,768,1440]).flatMap(width=>(process.env.HEADER_SMOKE?["light"]:["light","dark"]).map(theme=>({role:"owner",look,width,theme}))));
const viewerCases=process.env.HEADER_SMOKE?[]:["anonymous","gigster"].flatMap(role=>[320,390,768,1440].flatMap(width=>["light","dark"].map(theme=>({role,look:"editorial",width,theme}))));
fs.mkdirSync("deliverables/owner-header",{recursive:true});
try{for(const {role,look,width,theme}of[...ownerCases,...viewerCases]){
 const context=await browser.newContext({viewport:{width,height:1100},colorScheme:theme,reducedMotion:"reduce"}),external=[];
 await context.addInitScript(({look,theme})=>{localStorage.setItem("bg2-site-look-v2",look);localStorage.setItem("bg-theme",theme);},{look,theme});
 await context.route("**/*",r=>new URL(r.request().url()).origin===new URL(url).origin?r.continue():(external.push(r.request().url()),r.abort()));
 const page=await context.newPage();page.setDefaultTimeout(15000);await page.goto(url+"/");await page.waitForFunction(()=>!!window.bgSample);await page.evaluate(role=>window.bgSample.reset().then(()=>role==="anonymous"?undefined:window.bgSample.signInAs(role==="owner"?"owner":"gigster",role==="owner"?undefined:"maya")),role);
 const identity=await page.evaluate(()=>JSON.parse(localStorage.getItem("bg2-sample-v2")).session);
 const routes=role==="owner"?["/owners/people/maya/?from=review","/profile/canvas/","/"]:role==="anonymous"?["/","/login/","/join/","/owners/people/maya/"]:["/","/profile/canvas/","/owners/people/maya/"];
 for(const route of routes){
  await page.goto(url+route);const header=page.locator("header").filter({has:page.getByRole("link",{name:"Between Gigs home",exact:true})}).first();await header.waitFor();await page.evaluate(()=>document.fonts.ready);
  if(role==="owner"&&route.startsWith("/owners/"))await header.getByRole("button",{name:"Switch experience",exact:true}).waitFor();else if(role==="owner")await header.getByRole("button",{name:/^Account:/}).waitFor();else if(role==="anonymous")await header.getByRole("link",{name:"Sign in",exact:true}).waitFor();else await header.getByRole("button",{name:/^Account:/}).waitFor();
  const overflow=await header.evaluate(el=>({viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,controls:[...el.querySelectorAll("a,button")].map(n=>({name:n.getAttribute("aria-label")||n.textContent?.trim(),left:n.getBoundingClientRect().left,right:n.getBoundingClientRect().right,width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height})).filter(r=>r.width>0&&r.height>0&&(r.left< -1||r.right>innerWidth+1))}));
  assert.deepEqual(overflow.controls,[],`${role}/${look}/${width}/${theme}${route}: clipped header controls`);assert.ok(overflow.documentWidth<=width+1,`${role}/${look}/${width}/${theme}${route}: document ${overflow.documentWidth}>${width}`);
  const trigger=header.getByRole("button",{name:"Switch experience",exact:true});
  if(role==="owner"){
   const switchVisible=await trigger.isVisible();assert.equal(switchVisible,route.startsWith("/owners/")||width<768,"existing public/editor desktop navigation remains unchanged");
   if(switchVisible){const rect=await trigger.boundingBox();assert.ok(rect.height>=44&&rect.width>=44,"experience trigger keeps its touch target");
   if(width===320)assert.ok((await trigger.locator("span").boundingBox()).width<=1,"only the small-screen visible word is clipped");
   if(width>=390)assert.ok((await trigger.locator("span").boundingBox()).width>1,"normal-width visible label remains");}
   if(route.startsWith("/owners/")){
    await trigger.focus();await page.keyboard.press("Enter");const menu=page.getByRole("menu");await menu.waitFor();
    for(const label of ["Gigster Experience · edit my profile","Owner Experience · dashboard","Hub · all work in progress"])await menu.getByText(label,{exact:true}).waitFor();
    const menuRect=await menu.boundingBox();assert.ok(menuRect.x>=-1&&menuRect.x+menuRect.width<=width+1,"experience menu stays within viewport");
    await page.keyboard.press("Escape");await page.waitForFunction(()=>document.activeElement?.getAttribute("aria-label")==="Switch experience");
    const night=header.getByRole("switch",{name:"Night mode",exact:true});await night.click();await page.waitForFunction(t=>document.documentElement.dataset.theme!==t,theme);await night.click();await page.waitForFunction(t=>document.documentElement.dataset.theme===t,theme);
    if(width<1024){let open=header.getByRole("button",{name:"Open owner menu",exact:true});if(!await open.count())open=page.getByRole("button",{name:"More owner pages and account actions",exact:true});await open.click();await page.getByRole("dialog").waitFor();await page.keyboard.press("Escape");await page.getByRole("dialog").waitFor({state:"hidden"});}
   }
  }else{
   assert.equal(await trigger.count(),0,"experience navigation remains owner-only");
   if(route.startsWith("/owners/"))await page.getByRole("heading",{name:"For the Between Gigs team",exact:true}).waitFor();
  }
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem("bg2-sample-v2")).session),identity,"navigation and theme controls never change identity or role");
 }
 assert.equal(external.length,0);await page.locator("header").first().screenshot({path:`deliverables/owner-header/LOCAL-NOT-LIVE-${role}-${look}-${width}-${theme}.png`});await context.close();console.log(`PASS ${role}/${look}/${width}/${theme}: header bounds, controls, identity and role boundary (sample only)`);
}}finally{await browser.close();server.close();}
