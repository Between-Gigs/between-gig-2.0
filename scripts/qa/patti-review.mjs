// Patti's 57-item review: fictional sample data only; no real messages or users.
import assert from "node:assert/strict";
import fs from "node:fs";
fs.mkdirSync("deliverables/patti-review",{recursive:true});
import { chromium } from "playwright-core";
import { serve } from "./serve.mjs";
const {server,url}=await serve("out");
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??"/opt/pw-browsers/chromium"});
try {
  const p=await browser.newPage({viewport:{width:1440,height:1000}});
  await p.goto(url+"/");await p.waitForFunction(()=>"bgSample" in window);
  await p.evaluate(()=>window.bgSample.reset().then(()=>window.bgSample.signInAs("gigster","maya")));
  await p.goto(url+"/profile/canvas/");await p.locator("#sec-film").waitFor();
  assert.ok(await p.locator("#sec-film").evaluate(el=>!!(el.compareDocumentPosition(document.querySelector("#sec-help"))&Node.DOCUMENT_POSITION_FOLLOWING)),"experience precedes services");
  assert.equal(await p.getByText("Areas you serve",{exact:true}).count(),0);
  await p.getByRole("radio",{name:"Somewhere else",exact:true}).check();
  await p.locator("#f-zip").fill("SW1A 1AA");
  assert.equal(await p.locator("#f-zip").inputValue(),"SW1A 1AA");
  await p.locator("#f-otherCity").fill("London, United Kingdom");
  await p.locator("#f-travel").click();await p.getByRole("option",{name:"Up to 25 miles",exact:true}).click();
  await p.getByRole("checkbox",{name:"Hourly",exact:true}).check();
  await p.getByRole("checkbox",{name:"By Project",exact:true}).check();
  await p.locator("#f-rate").fill("60");await p.locator("#f-projectMinimum").fill("250");await p.locator("#f-minimumHours").fill("2");
  await p.locator("#f-skills").fill("Custom craft");await p.getByRole("button",{name:"Add skill",exact:true}).click();
  await p.getByRole("button",{name:"Remove Custom craft",exact:true}).waitFor();
  await p.getByRole("button",{name:"Save draft",exact:true}).click();await p.waitForTimeout(1200);await p.reload();
  await p.locator("#f-travel").waitFor();assert.equal(await p.locator("#f-zip").inputValue(),"SW1A 1AA");
  assert.ok(await p.getByRole("checkbox",{name:"Hourly",exact:true}).isChecked());assert.ok(await p.getByRole("checkbox",{name:"By Project",exact:true}).isChecked());
  assert.equal(await p.locator("#f-projectMinimum").inputValue(),"250");
  await p.getByRole("button",{name:"Remove Custom craft",exact:true}).waitFor();
  assert.equal(await p.locator("#f-marketingEmailConsent").isChecked(),false);
  // Evidence for the requested per-item PDF. All accounts here are fictional sample data.
  await p.getByRole("radio",{name:"Los Angeles",exact:true}).check();await p.locator("#f-zip").fill("90026");
  await p.getByRole("radio",{name:"I have liability insurance",exact:true}).check();
  const capture=async(name,selector)=>{const target=p.locator(selector).first();await target.scrollIntoViewIfNeeded();await p.evaluate(()=>document.fonts.ready);await target.screenshot({path:"deliverables/patti-review/"+name+".png"});};
  for(const [name,sel] of [["location","#sec-where"],["experience","#sec-film"],["services","#sec-help"],["rates","#sec-rates"],["showcase","#sec-work"],["credits","#sec-credits"],["personality","#sec-personality"],["details","#sec-details"],["contact","#sec-contact"]])await capture(name,sel);
  await p.getByRole("heading",{name:"You’re Almost There!",exact:true}).scrollIntoViewIfNeeded();await p.screenshot({path:"deliverables/patti-review/submit.png"});
  for(const width of [390,1440]) {await p.setViewportSize({width,height:1000});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),"no horizontal overflow at "+width);}
  const publicPage=await browser.newPage({viewport:{width:1440,height:1000}});
  for(const [name,route] of [["signup","join"],["signin","login"],["professionals","professionals"],["invitation","emails/invite"]]){await publicPage.goto(url+"/"+route+"/");await publicPage.waitForLoadState("networkidle");await publicPage.evaluate(()=>document.fonts.ready);await publicPage.screenshot({path:"deliverables/patti-review/"+name+".png",fullPage:true});}
  console.log("PASS: Patti review location, dual pricing, custom skills, persistence, separate marketing choice and 390/1440px layouts");
} finally {await browser.close();server.close();}
