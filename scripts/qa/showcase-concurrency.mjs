// Actual ShowcaseEditor uploads, keyboard/touch ordering and persistence. Fictional browser-local data only.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright-core';
import {serve} from './serve.mjs';
const {server,url}=await serve('out');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium'});
fs.mkdirSync('deliverables/showcase-concurrency',{recursive:true});
const file={name:'fictional.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="red"/></svg>')};
try {
for(const width of [390,1100]) {
 const context=await browser.newContext({viewport:{width,height:900},hasTouch:width===390,isMobile:width===390});
 const p=await context.newPage();
 await p.addInitScript(()=>{const old=HTMLCanvasElement.prototype.toBlob;HTMLCanvasElement.prototype.toBlob=function(callback,...args){old.call(this,blob=>setTimeout(()=>callback(blob),1200),...args);};});
 await p.route('https://example.org/**',route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="green"/></svg>'}));
 const captions=()=>p.locator('#sec-work textarea').evaluateAll(els=>els.map(el=>el.value));
 const setup=async()=>{await p.goto(url+'/');await p.waitForFunction(()=>window.bgSample);await p.evaluate(()=>window.bgSample.reset().then(()=>window.bgSample.signInAs('gigster','maya')));await p.evaluate(()=>{const key='bg2-sample-v2',s=JSON.parse(localStorage.getItem(key)),id=s.session.personId;s.people.find(x=>x.id===id).status='draft';s.drafts.find(x=>x.personId===id).fields.showcase=['Alpha','Beta','Gamma'].map((description,i)=>({id:'fictional-'+i,kind:'image',url:'https://example.org/'+i+'.png',description}));localStorage.setItem(key,JSON.stringify(s));});await p.goto(url+'/profile/canvas/');await p.getByRole('button',{name:'Move showcase item 1 down',exact:true}).waitFor();};
 const upload=async()=>{await p.locator('#sec-work input[aria-label="Upload showcase image or video"]').setInputFiles([file]);await p.waitForTimeout(100);};
 const persist=async(expected)=>{if(width>=640)await p.getByRole('button',{name:'Save draft',exact:true}).click();await p.waitForFunction(want=>{const s=JSON.parse(localStorage.getItem('bg2-sample-v2'));return JSON.stringify(s.drafts.find(d=>d.personId===s.session.personId).fields.showcase.map(i=>i.description))===JSON.stringify(want);},expected);await p.reload();await p.locator('#sec-work textarea').first().waitFor();assert.deepEqual(await captions(),expected);};
 await setup();await upload();
 await p.locator('#sample-grip-0').focus();await p.keyboard.press('ArrowDown');
 assert.equal(await p.evaluate(()=>document.activeElement.id),'sample-grip-1');
 await p.locator('#sec-work textarea').first().fill('Beta edited during upload');
 await p.getByRole('button',{name:'Remove showcase item 3',exact:true}).click();
 await p.waitForFunction(()=>document.querySelectorAll('#sec-work textarea').length===3 && [...document.querySelectorAll('#sec-work img')].some(i=>i.src.startsWith('blob:')));
 assert.deepEqual(await captions(),['Beta edited during upload','Alpha','']);
 await persist(['Beta edited during upload','Alpha','']);
 await p.locator('#sec-work').screenshot({path:`deliverables/showcase-concurrency/append-${width}.png`});
 // Replacing by stable id follows an item moved while the native chooser is open.
 await setup();
 const chooserPromise=p.waitForEvent('filechooser');await p.getByRole('button',{name:'Replace showcase item 1',exact:true}).click();const chooser=await chooserPromise;
 await p.getByRole('button',{name:'Move showcase item 1 down',exact:true}).click();await chooser.setFiles([file]);
 await p.waitForTimeout(100);await p.locator('#sec-work textarea').nth(1).fill('Alpha caption changed');
 await p.waitForFunction(()=>[...document.querySelectorAll('#sec-work img')].some(i=>i.src.startsWith('blob:')));
 assert.deepEqual(await captions(),['Beta','Alpha caption changed','Gamma']);await persist(['Beta','Alpha caption changed','Gamma']);
 // Removal while replacement is pending must never resurrect that item.
 await setup();const removeChooser=p.waitForEvent('filechooser');await p.getByRole('button',{name:'Replace showcase item 1',exact:true}).click();await (await removeChooser).setFiles([file]);await p.waitForTimeout(100);await p.getByRole('button',{name:'Remove showcase item 1',exact:true}).click();await p.waitForTimeout(1500);
 assert.deepEqual(await captions(),['Beta','Gamma']);await persist(['Beta','Gamma']);
 // A native touch drag remains available after asynchronous edits.
 if(width===390){await p.locator('#sample-grip-0').scrollIntoViewIfNeeded();const grip=await p.locator('#sample-grip-0').boundingBox(),tile=await p.locator('#sec-work li').nth(1).boundingBox();const cdp=await context.newCDPSession(p);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:grip.x+10,y:grip.y+10}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:tile.x+20,y:Math.min(tile.y+30,880)}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.deepEqual(await captions(),['Gamma','Beta']);await persist(['Gamma','Beta']);}
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await context.close();
}
console.log('PASS: pending uploads preserve keyboard order/captions/removals; replacement follows stable ids and never resurrects removed media; 390px touch and reload persistence; 1100px desktop');
}finally{await browser.close();server.close();}
