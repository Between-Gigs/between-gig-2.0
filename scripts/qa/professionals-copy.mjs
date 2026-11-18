// Actual rendered implementation, fictional marketing profiles; no signup submissions.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright-core';
import {serve} from './serve.mjs';
const {server,url}=await serve(process.env.PROFESSIONALS_OUT??'out');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium'});
fs.mkdirSync('deliverables/professionals-adjusted',{recursive:true});
try{for(const width of [320,390,768,1024,1440])for(const theme of ['light','dark']){
 const context=await browser.newContext({viewport:{width,height:1000},colorScheme:theme,reducedMotion:'reduce'});
 await context.addInitScript(t=>localStorage.setItem('bg-theme',t),theme);
 const page=await context.newPage();await page.goto(url+'/professionals/');await page.waitForLoadState('networkidle');await page.evaluate(()=>document.fonts.ready);
 const main=page.locator('main');
 const specialtyCards=page.locator('#specialties article');
 assert.equal(await specialtyCards.count(),20);
 assert.equal(await specialtyCards.getByRole('heading',{level:3}).count(),8);
 assert.equal(await specialtyCards.getByRole('heading',{level:4}).count(),12);
 for(const [name,description,review] of [["Photography & Videography","Photography, videos and original video production",false],["Locations & Location Management","Scouting, coordination and practical location logistics",false],["Vectorworks & CAD","Drafting and visualization; professional sign-off is separate",false],["Costumes, Cosplay & Custom-made Clothing","Tailoring, alterations and custom costume construction",false],["Landscaping & Greens","Landscaping and plant/greenery specialties confirmed by the provider",false],["Wardrobe & Personal Styling","Personal styling and outfits for a person or occasion",false],["Personal Shopping","Source clothing, gifts and everyday items",false],["Closet & Wardrobe Organization","Sort clothing and create an organized wardrobe",false],["Wallpaper Installation","Wallcovering preparation and installation, with surface condition and job scope agreed first.",false],["Project Management","Timelines, logistics, scheduling and coordination for an agreed project.",false],["Math & Technical Tutoring","Teaching and study support in a tutor’s demonstrated subject. Not engineering design, certification or professional sign-off.",false],["Costume Aging & Dyeing","Character finishes and color work for clothing or costumes; materials, care and safe handling to confirm.",false],["Wardrobe & Laundry Care","Garment-specific cleaning and care, with fabric requirements and specialist treatments agreed first.",false],["Rigging","Specialist rigging inquiry only. Relevant credentials, venue rules, insurance and job-specific safety review are required; no provider is matched here.",true],["Stunts","Industry background and specialist inquiry only. Training, supervision, insurance and job-specific safety must be reviewed before any work.",true],["Intimacy Coordination","Specialist production background. Training, consent protocols and the specific production scope need review; no provider is matched here.",true],["Armorer","Industry background only. This listing does not offer weapons, handling or instruction. Any production inquiry requires separate legal, credential and safety review.",true],["SFX Makeup","Character and special-effects makeup inquiry. Confirm the artist’s specific experience, materials and application requirements; generic makeup experience is not sufficient.",true],["Pyrotechnics","Industry background only, not an available fireworks service. Licensing, permissions, insurance and a separate safety review are required; no provider is matched here.",true],["Production Medic","Industry background only. No medical advice, care or emergency response is offered here. Any production request requires separate licensing and scope review.",true]]) {
  const heading=review?name+' · Scope Review':name;
  const card=specialtyCards.filter({has:page.getByRole('heading',{name:heading,exact:true})});
  assert.equal(await card.count(),1,`${width}/${theme}: ${heading}`);
  assert.equal(await card.getByText(description,{exact:true}).count(),1);
  assert.ok(await card.isVisible());
 }
 const reviewLinks=page.locator('#specialties').getByRole('link',{name:/^Register background for review —/});
 assert.equal(await reviewLinks.count(),7);
 for(const link of await reviewLinks.all())assert.equal(await link.getAttribute('href'),'/join/');
 const sampleCards=page.locator('#profiles article');
 assert.equal(await sampleCards.count(),4);
 for(const card of await sampleCards.all()) {
  for(const label of ['Background','Services','Pricing','Availability'])assert.equal(await card.getByText(label,{exact:true}).count(),1);
  const order=await card.innerText();
  assert.ok(order.indexOf('Services')<order.indexOf('Background'));
  assert.ok(order.indexOf('Background')<order.indexOf('Pricing'));
 }

 for(const copy of ['More specialties. More of the crew.','Named skills and industry backgrounds, with the exact service chosen and confirmed by each provider.','Joining records your interest; it does not verify qualifications or activate a service.','Wallpaper Installation','Production Medic · Scope Review','Vectorworks & CAD','Sample professional profiles','Maya','Credits include: Jurassic Park, Obsession, Planet of the Apes','Sample profiles, services and pricing shown for illustration.','Your expertise. New clients. On your terms.','Professional FAQ']) assert.ok(await main.getByText(copy,{exact:true}).count(),`${width}/${theme}: missing ${copy}`);
 assert.equal(await main.locator('summary').filter({hasText:'Explore service ideas'}).count(),10);
 assert.equal(await main.getByRole('link',{name:/^I offer this service —/}).count(),10);
 for(const link of await main.getByRole('link',{name:/^I offer this service —/}).all()) assert.equal(await link.getAttribute('href'),'/join/');
 const final=page.locator('#final-h');assert.equal(await final.innerText(),'Get discovered, get hired\nkeep creating.');
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${width}/${theme}: overflow`);
 await page.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=800){scrollTo(0,y);await new Promise(r=>setTimeout(r,30));}scrollTo(0,0);});await page.waitForLoadState('networkidle');
 const images=await main.locator('img').evaluateAll(imgs=>imgs.filter(i=>i.getClientRects().length).map(i=>({src:i.getAttribute('src'),ok:i.complete&&i.naturalWidth>0})));assert.ok(images.every(i=>i.ok),JSON.stringify(images.filter(i=>!i.ok)));
 await page.addScriptTag({content:fs.readFileSync('node_modules/axe-core/axe.min.js','utf8')});const violations=await page.evaluate(async()=> (await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})));assert.deepEqual(violations,[],`${width}/${theme}: axe`);
 const summary=main.locator('summary').first();await summary.focus();await page.keyboard.press('Enter');assert.equal(await summary.evaluate(e=>e.parentElement.open),true);
 await page.locator('#specialties details').evaluate(e=>{e.open=true;});
 if([390,1440].includes(width)){
  await page.evaluate(()=>scrollTo(0,0));const boxes={};
  for(const [name,selector] of [['hero','main > section:first-of-type'],['specialties','#specialties'],['profiles','#profiles'],['chapter','#next-chapter'],['faq','#faq'],['founders','#founders'],['closing','main > section:last-of-type']]) boxes[name]=await page.locator(selector).first().boundingBox();
  fs.writeFileSync(`deliverables/professionals-adjusted/${width}-${theme}-sections.json`,JSON.stringify(boxes));
  await page.screenshot({path:`deliverables/professionals-adjusted/${width}-${theme}-full.png`,fullPage:true});
 }
 await context.close();console.log(`PASS Professionals exact copy, artwork, routes, keyboard, fit/axe ${width}/${theme}`);
}}finally{await browser.close();server.close();}
