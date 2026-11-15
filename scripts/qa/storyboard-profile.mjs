// Public Storyboard navigation and fictional role sessions only. No real forms or email delivery.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright-core';
import {serve} from './serve.mjs';
const base=process.env.NEXT_PUBLIC_BASE_PATH??'';
const {server,url}=await serve('out',{base});const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium'});
fs.mkdirSync('deliverables/storyboard-profile',{recursive:true});
try{for(const width of [390,1440])for(const theme of ['light','dark'])for(const role of ['visitor','gigster','owner']){
 const context=await browser.newContext({viewport:{width,height:900},colorScheme:theme,reducedMotion:'reduce'});await context.addInitScript(t=>localStorage.setItem('bg-theme',t),theme);const page=await context.newPage();
 await page.goto(url+'/');await page.waitForFunction(()=>window.bgSample);
 await page.evaluate(role=>window.bgSample.reset().then(()=>role==='visitor'?undefined:window.bgSample.signInAs(role,role==='gigster'?'maya':undefined)),role);
 await page.goto(url+'/storyboard/');const cta=page.getByRole('link',{name:'Create your profile',exact:true});await cta.waitFor();
 await page.waitForFunction(({role,base})=>document.querySelector('a')&&[...document.querySelectorAll('a')].some(a=>a.textContent.trim()==='Create your profile'&&a.getAttribute('href')===base+(role==='visitor'?'/join/':'/profile/')),{role,base});
 assert.equal(await cta.count(),1);assert.equal(await cta.getAttribute('href'),base+(role==='visitor'?'/join/':'/profile/'));
 assert.equal(await page.getByRole('button',{name:'Offer your skills',exact:true}).count(),0);assert.equal(await page.getByRole('button',{name:'Find talent for a project',exact:true}).count(),0);assert.equal(await page.locator('form').count(),0);assert.equal(await page.getByRole('dialog').count(),0);
 const next=page.getByRole('button',{name:'Next page',exact:true}).first();await next.focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>document.body.textContent.includes('Page 2 of 20'));
 await page.getByRole('button',{name:'Previous page',exact:true}).first().click();await page.waitForFunction(()=>document.body.textContent.includes('Page 1 of 20'));
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 if(role==='visitor')await page.screenshot({path:`deliverables/storyboard-profile/${width}-${theme}.png`,fullPage:true});
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('bg2-sample-v2')).outbox.length);await cta.focus();await page.keyboard.press('Enter');await page.waitForURL(role==='visitor'?/\/join\/?$/:/\/profile(?:\/|$)/);
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('bg2-sample-v2')).outbox.length),before,'navigation queues no email');await context.close();
}console.log('PASS: one Storyboard CTA, correct visitor/Gigster/owner routes, no popup/forms/email, keyboard page turns; 390/1440 light/dark');}finally{await browser.close();server.close();}
