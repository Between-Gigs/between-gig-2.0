import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=process.cwd();
import { chromium } from 'playwright-core';
import { serve } from './serve.mjs';
const {server,url}=await serve(root+'/out');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium'});
fs.mkdirSync(root+'/deliverables/profile-guidance',{recursive:true});
// Item 36: the sentence names videos only while video links exist (NEXT_PUBLIC_PROFILE_VIDEO_LINKS=1 at build time). Both states are asserted.
const videos=process.env.NEXT_PUBLIC_PROFILE_VIDEO_LINKS==='1';
const guidance=`Show customers what you can do! Upload ${videos?'photos, videos, or examples':'photos or images'} of past projects that demonstrate your skills and experience. These can be from your work in film and television or projects you’ve completed outside the industry.`;
try{
for(const width of [320,390,768,1440])for(const theme of ['light','dark']){
 const ctx=await browser.newContext({viewport:{width,height:1100},colorScheme:theme,reducedMotion:'reduce'}),external=[];
 await ctx.route('**/*',r=>new URL(r.request().url()).origin===new URL(url).origin?r.continue():(external.push(r.request().url()),r.abort()));
 await ctx.addInitScript(t=>localStorage.setItem('bg-theme',t),theme);
 const page=await ctx.newPage();page.setDefaultTimeout(15000);
 await page.goto(url+'/');await page.waitForFunction(()=>!!window.bgSample);await page.evaluate(()=>window.bgSample.reset().then(()=>window.bgSample.signInAs('gigster','maya')));
 await page.goto(url+'/profile/canvas/');await page.locator('#sec-work').waitFor();
 await page.locator('#sec-work').getByText(guidance,{exact:true}).waitFor();
 assert.equal(await page.locator('#sec-work').getByText('Only share work you have permission to display.',{exact:true}).count(),1);
 assert.equal(await page.locator('#sec-work input[type=file]').getAttribute('accept'),'image/*');
 const work=await page.locator('#sec-work').innerText();
 if(videos){assert.match(work,/Photo/i);await page.locator('#sec-work').getByRole('button',{name:'Add a work sample'}).first().click();await page.locator('#sec-work').getByRole('button',{name:'Video link'}).click();
  assert.equal(await page.locator('#f-video-url').count(),1);assert.equal(await page.locator('#sec-work input[type=file][accept*=video]').count(),0,'no video upload');
  await page.locator('#f-video-url').fill('https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ');await page.getByRole('button',{name:'Add video link'}).click();
  await page.getByText('Only YouTube and Vimeo links can be added.').waitFor();await page.getByRole('button',{name:'Cancel'}).click();}
 else assert.doesNotMatch(work,/YouTube|Vimeo|upload.*video|video links|Video link/i);
 await page.getByRole('button',{name:/^Ready to submit/}).click();
 await page.getByRole('button',{name:/^Your entertainment industry work/}).waitFor();
 await page.getByRole('button',{name:/^How customers benefit from your experience/}).waitFor();
 // Observe the real current-canvas reviewer-note presentation on a fictional local record.
 await page.evaluate(()=>{const state=JSON.parse(localStorage.getItem('bg2-sample-v2'));const person=state.people.find(p=>p.id===state.session.personId);person.status='changes_requested';person.reviewNotes=[{section:'story',note:'Fictional reviewer guidance only',by:'Local sample reviewer',at:'2026-11-16T00:00:00.000Z'}];localStorage.setItem('bg2-sample-v2',JSON.stringify(state));});
 await page.reload();await page.getByText('Your entertainment industry experience',{exact:true}).waitFor();
 await page.locator('#f-years').fill('');await page.locator('#f-about').fill('');
 await page.getByRole('button',{name:/^(Submit|Send).*review$/}).first().click();
 await page.getByRole('button',{name:/^Years in the Entertainment Industry:/}).waitFor();
 await page.getByRole('button',{name:/^How can customers benefit from your entertainment industry experience\?: Tell clients how your entertainment industry experience helps you deliver this service\./}).waitFor();
 await page.getByRole('button',{name:/^Years in the Entertainment Industry:/}).click();
 await page.waitForFunction(()=>document.activeElement?.id==='f-years');
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'page overflow');
 assert.equal(external.length,0,'external network attempts');
 await page.locator('#sec-work').screenshot({path:root+`/deliverables/profile-guidance/LOCAL-NOT-LIVE-showcase-${width}-${theme}.png`});
 console.log(`PASS ${width}/${theme}: ${videos?'video-link':'image-only'} guidance/permission, unchanged image input, industry readiness/errors/reviewer label, error focus, no overflow, zero external requests`);
 await ctx.close();
}
}finally{await browser.close();server.close();}
