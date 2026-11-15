import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
const browser=await chromium.launch({executablePath:"/usr/bin/chromium",headless:true,args:["--no-sandbox"]});
mkdirSync('/tmp/diagnostic-screens',{recursive:true});
for(const width of [390,1440]){
 const page=await browser.newPage({viewport:{width,height:1000}});
 await page.goto('http://localhost:3011/emails/',{waitUntil:'networkidle'});
 await page.getByRole('heading',{name:'Diagnostic email · one-time test'}).waitFor();
 if(width===390)await page.getByRole('button',{name:'Phone preview',exact:true}).click();
 const frame=page.frameLocator('iframe[title="Diagnostic email preview"]');
 await frame.getByRole('heading',{name:'Email check'}).waitFor();
 await page.screenshot({path:`/tmp/diagnostic-screens/dashboard-${width}.png`,fullPage:true});
 const dims=await frame.locator('body').evaluate(el=>({scroll:el.scrollWidth,client:el.clientWidth,images:[...el.querySelectorAll('img')].map(i=>({src:i.src,loaded:i.complete&&i.naturalWidth>0}))}));
 if(dims.scroll>dims.client+1)throw new Error(`Email overflow at ${width}: ${JSON.stringify(dims)}`);
 if(dims.images.some(i=>!i.loaded))throw new Error(`Broken email image at ${width}`);
 const emailPage=await browser.newPage({viewport:{width:width===390?390:640,height:900}});
 await emailPage.setContent(await frame.locator('html').evaluate(el=>el.outerHTML),{waitUntil:'networkidle'});
 await emailPage.screenshot({path:`/tmp/diagnostic-screens/email-${width}.png`,fullPage:true});
 await emailPage.close();
 console.log(JSON.stringify({width,...dims}));await page.close();
}
await browser.close();
