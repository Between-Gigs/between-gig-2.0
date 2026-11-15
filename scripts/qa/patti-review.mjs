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
  // Save a linked video and caption through the UI, then prove they survive reload.
  while(await p.locator('#sec-work li').count()>=5)await p.getByRole("button",{name:"Remove showcase item 1",exact:true}).click();
  await p.locator('#sec-work input[type="url"]').fill("https://example.com/showcase-video");
  await p.getByRole("button",{name:"Add link",exact:true}).click();
  await p.locator('#sec-work textarea').last().fill("Fictional showcase example for this review.");
  await p.getByRole("button",{name:"Save draft",exact:true}).click();await p.waitForTimeout(1200);await p.reload();
  await p.locator('#sec-work textarea').last().waitFor();assert.equal(await p.locator('#sec-work textarea').last().inputValue(),"Fictional showcase example for this review.");
  await p.getByRole("button",{name:"Choose video thumbnail",exact:true}).waitFor();
  // Evidence for the requested per-item PDF. All accounts here are fictional sample data.
  const capture=async(name,selector)=>{const target=p.locator(selector).first(),viewport=p.viewportSize();const height=Math.ceil(await target.evaluate(el=>el.getBoundingClientRect().height));await p.setViewportSize({width:viewport.width,height:Math.max(viewport.height,height+240)});await target.evaluate(el=>window.scrollTo(0,window.scrollY+el.getBoundingClientRect().top-160));await p.evaluate(()=>document.fonts.ready);await target.screenshot({path:"deliverables/patti-review/"+name+".png"});await p.setViewportSize(viewport);};
  await capture("location-international","#sec-where");
  await p.getByRole("radio",{name:"Los Angeles",exact:true}).check();await p.locator("#f-zip").fill("90026");
  await p.getByRole("radio",{name:"I have liability insurance",exact:true}).check();

  for(const [name,sel] of [["location","#sec-where"],["experience","#sec-film"],["services","#sec-help"],["rates","#sec-rates"],["showcase","#sec-work"],["credits","#sec-credits"],["personality","#sec-personality"],["details","#sec-details"],["contact","#sec-contact"]])await capture(name,sel);
  await p.locator("#f-travel").click();await p.getByRole("listbox").screenshot({path:"deliverables/patti-review/travel-options.png"});await p.keyboard.press("Escape");
  await capture("availability","#sec-availability");
  await p.getByRole("checkbox",{name:"Hourly",exact:true}).uncheck();await capture("rates-project","#sec-rates");await p.getByRole("checkbox",{name:"Hourly",exact:true}).check();
  await p.locator("#sec-help textarea").first().fill("");await capture("services-instruction","#sec-help");
  const other=p.getByRole("button",{name:"Other — name your service",exact:true});if(await other.count())await other.click();await capture("services-other","#sec-help");
  await p.getByLabel("Credit 1: Your role or Title",{exact:true}).fill("");await p.getByLabel("Credit 1: Name of the Production",{exact:true}).fill("");await capture("credits-empty","#sec-credits");
  await p.locator("#f-mobile").fill("+12135550123");await p.getByRole("checkbox",{name:"SMS",exact:true}).check();await capture("contact-channels","#sec-contact");
  await p.locator("#sec-work li").last().screenshot({path:"deliverables/patti-review/showcase-caption.png"});
  await p.getByRole("heading",{name:"You’re Almost There!",exact:true}).locator("..").screenshot({path:"deliverables/patti-review/submit.png"});
  for(const width of [390,1440]) {await p.setViewportSize({width,height:1000});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),"no horizontal overflow at "+width);}
  const publicPage=await browser.newPage({viewport:{width:1440,height:1000}});
  for(const [name,route] of [["signup","join"],["signin","login"],["professionals","professionals"],["invitation","emails/invite"]]){await publicPage.goto(url+"/"+route+"/");await publicPage.waitForLoadState("networkidle");await publicPage.evaluate(()=>document.fonts.ready);await publicPage.screenshot({path:"deliverables/patti-review/"+name+".png",fullPage:true});
    if(name==="invitation"){const frame=publicPage.frameLocator("iframe");await frame.locator(".e-invite-scene").screenshot({path:"deliverables/patti-review/invitation-hero.png"});await frame.locator(".e-invite-lead").screenshot({path:"deliverables/patti-review/invitation-lead.png"});await frame.locator("p").filter({hasText:"What happens next?"}).screenshot({path:"deliverables/patti-review/invitation-next.png"});await frame.getByText("The Between Gigs Team",{exact:true}).screenshot({path:"deliverables/patti-review/invitation-signoff.png"});await frame.locator("[data-email-unsubscribe]").locator("..").screenshot({path:"deliverables/patti-review/invitation-footer.png"});}
    if(name==="professionals"){await publicPage.getByText("Get discovered, get hired,",{exact:true}).locator("..").screenshot({path:"deliverables/patti-review/professionals-heading.png"});}
    if(name==="signup"||name==="signin"){await publicPage.getByText(name==="signup"?"Founding Gigsters":"Welcome back",{exact:true}).locator("..").screenshot({path:"deliverables/patti-review/"+name+"-intro.png"});await publicPage.locator("form").first().screenshot({path:"deliverables/patti-review/"+name+"-form.png"});}}
  console.log("PASS: Patti review location, dual pricing, custom skills, persistence, separate marketing choice and 390/1440px layouts");
} finally {await browser.close();server.close();}
