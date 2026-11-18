// Canonical invite and preserved journey stages. Sample data only; never submits or sends email.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { chromium } from "playwright-core";
import { serve } from "./serve.mjs";

const { server, url } = await serve("out", { base: process.env.NEXT_PUBLIC_BASE_PATH ?? "" });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium" });
fs.mkdirSync("deliverables/invitation", { recursive: true });
let canonicalHtml;
async function assertFits(html,stage) {
  const dimensions=await html.evaluate(()=>({
    viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,
    overflowing:[...document.querySelectorAll("body,table,td,div,h1,p,a,img")].map(element=>{
      const box=element.getBoundingClientRect(),style=getComputedStyle(element);
      return {tag:element.tagName,className:element.className,left:box.left,right:box.right,width:box.width,cssWidth:style.width,paddingLeft:style.paddingLeft,paddingRight:style.paddingRight,display:style.display};
    }).filter(box=>box.width>0&&(box.left<-.5||box.right>innerWidth+1)).sort((a,b)=>b.right-a.right).slice(0,12)
  }));
  assert.ok(dimensions.scrollWidth<=dimensions.viewport+1,`${stage}: ${JSON.stringify(dimensions)}`);
}
async function resetScroll(html) {
  // Do not schedule callbacks in a sandboxed/offscreen iframe; screenshot waits for layout itself.
  await html.evaluate(()=>{
    for(const element of document.querySelectorAll("*"))if(element.scrollTop||element.scrollLeft)element.scrollTo({top:0,left:0,behavior:"instant"});
    window.scrollTo({top:0,left:0,behavior:"instant"});
  });
}
try {
  for (const width of [320, 390, 768, 1440]) for (const theme of ["light", "dark"]) for (const blocked of [false, true]) {
    console.log(`START owner-preview ${width}/${theme}/images-blocked=${blocked}`);
    const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme, reducedMotion: "reduce" });
    await context.addInitScript(t => localStorage.setItem("bg-theme", t), theme);
    if (blocked) await context.route(/\/email\/.*\.(?:png|jpg|webp)/, route => route.abort());
    const page = await context.newPage();
    await page.goto(`${url}/emails/invite/`);
    const frame = page.frameLocator("iframe");
    await page.getByRole("radio", { name: theme === "dark" ? "Dark" : "Light", exact: true }).click();
    await frame.getByRole("heading", { name: /^Create your profile\. You.re invited/ }).waitFor();
    assert.equal(await frame.getByRole("link", { name: /^Create your profile/ }).count(), 2);
    assert.equal(await frame.locator(".e-k-card").count(), 0, "hero has no white content card");
    const scene = frame.locator(".e-invite-artwork");
    const artwork = scene.locator("img:visible");
    await artwork.evaluate(async image => { await image.decode().catch(() => {}); });
    const geometry = await artwork.evaluate(image => {
      const box=image.getBoundingClientRect();
      return {width:box.width,height:box.height,naturalWidth:image.naturalWidth,naturalHeight:image.naturalHeight,mobile:image.src.includes("-mobile.png")};
    });
    const source=geometry.mobile?{width:260,height:340,lead:12,cta:12}:{width:598,height:784,lead:17,cta:14};
    if(!blocked)assert.ok(Math.abs(geometry.height/geometry.width-source.height/source.width)<.01,"selected approved image preserves its proportions");
    assert.equal(geometry.mobile,(await page.locator("iframe").evaluate(el=>el.clientWidth))<=620);
    assert.equal(geometry.naturalWidth,blocked?0:source.width);
    assert.equal(geometry.naturalHeight,blocked?0:source.height);
    if(geometry.mobile&&!blocked){assert.ok(Math.round(source.lead*geometry.width/source.width)>=12,"mobile baked lead remains at least12px to nearest renderedpixel");assert.ok(Math.round(source.cta*geometry.width/source.width)>=12,"mobile baked CTA remains at least12px to nearest renderedpixel");}
    assert.match(await artwork.getAttribute("alt"),/Your craft\. More possibilities\..*Your skills have value beyond the set/);
    {
      // Run the actual email HTML in an isolated QA document: the product iframe intentionally blocks scripts.
      const emailPage = await context.newPage();
      await emailPage.setViewportSize({ width: await page.locator("iframe").evaluate(el => el.clientWidth), height: 900 });
      canonicalHtml = await frame.locator("html").evaluate(el => el.outerHTML);
      await emailPage.setContent(canonicalHtml);
      await emailPage.locator(".e-invite-artwork").screenshot({ path: `deliverables/invitation/hero-${width}-${theme}${blocked ? "-images-blocked" : ""}.png` });
      {
        await emailPage.addScriptTag({ content: fs.readFileSync("node_modules/axe-core/axe.min.js", "utf8") });
        const violations = await emailPage.evaluate(async () => (await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } })).violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })));
        assert.deepEqual(violations, [], "email keyboard/contrast/accessibility");
      }
      await emailPage.close();
    }
    const actions = frame.getByRole("link", { name: /^Create your profile/ });
    assert.equal(await actions.nth(0).getAttribute("href"), await actions.nth(1).getAttribute("href"), "both actions use the approved destination");
    const cta = actions.first();
    assert.equal(await scene.getByRole("link", { name: /^Create your profile/ }).count(), 1, "hero action is inside the artwork");
    assert.match(await cta.getAttribute("href"), /\/join\/\?invite=/);
    for (const action of [actions.first(), actions.last()]) {
      await action.focus();
      assert.equal(await action.evaluate(el => el === document.activeElement), true, "both CTAs are keyboard focusable");
    }
    const htmlCta=frame.locator(".e-invite-html-cta a");
    assert.ok((await htmlCta.boundingBox()).height>=44,"HTML CTA remains usable with images blocked");
    const colors=await frame.locator(".e-invite-paper p").first().evaluate(p=>({ink:getComputedStyle(p).color,surface:getComputedStyle(p.closest(".e-invite-paper")).backgroundColor}));
    assert.deepEqual(colors,theme==="dark"?{ink:"rgb(251, 248, 242)",surface:"rgb(19, 58, 40)"}:{ink:"rgb(15, 61, 41)",surface:"rgb(247, 243, 236)"},"HTML foreground and surface change together");
    assert.equal(await htmlCta.evaluate(a=>getComputedStyle(a).color),"rgb(255, 255, 255)");
    await frame.getByText("Welcome to Stage 2: Building our Gigster community!", { exact: true }).waitFor();
    assert.equal(await frame.getByText("Between Gigs · 11766 Wilshire Blvd, Los Angeles, CA 90025", { exact: true }).count(), 1);
    assert.equal(await frame.locator('[data-email-unsubscribe]').getAttribute("aria-disabled"), "true");
    assert.equal(await frame.getByRole("link", { name: "Unsubscribe", exact: true }).count(), 0);
    assert.equal(await frame.getByRole("link", { name: "Privacy", exact: true }).getAttribute("href"), "https://between-gigs.com/privacy/");
    assert.equal(await frame.getByRole("link", { name: "Contact support", exact: true }).getAttribute("href"), "mailto:hello@between-gigs.com");
    await assertFits(page.locator("html"),`owner preview ${width}/${theme}/${blocked}`);
    await assertFits(frame.locator("html"),`email iframe ${width}/${theme}/${blocked}`);
    assert.equal(await frame.locator('meta[name="color-scheme"]').getAttribute("content"), "light");
    console.log(`CAPTURE owner-preview ${width}/${theme}/images-blocked=${blocked}: resetting scroll`);
    await resetScroll(page.locator("html"));
    await resetScroll(frame.locator("html"));
    await page.screenshot({ path: `deliverables/invitation/${width}-${theme}${blocked ? "-images-blocked" : ""}.png`, fullPage: true });
    await page.goto(`${url}/preview/gigster-journey/?source=legacy#invite`);
    await page.waitForURL(location => location.pathname.endsWith("/emails/invite/") && location.searchParams.get("source") === "legacy" && location.hash === "#invite");
    await page.goto(`${url}/preview/gigster-journey/account/`);
    await page.getByRole("heading", { name: "Create your Gigster account." }).waitFor();
    assert.equal(await page.getByRole("link", { name: "1 · Invitation" }).getAttribute("href"), `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/emails/invite/`);
    await context.close();
    console.log(`PASS owner-preview ${width}/${theme}/images-blocked=${blocked}`);
  }
  // Direct boundary and Outlook-marker simulations use the actual rendered HTML, not a mockup.
  const boundaryContext=await browser.newContext();
  const boundaryMetrics=[];
  try {
    for(const width of [262,298,320,390,619,620,621,622,623,624,640]) {
      console.log(`START actual email boundary ${width}px`);
      const page=await boundaryContext.newPage();await page.setViewportSize({width,height:1000});
      await page.setContent(canonicalHtml);await page.locator(".e-invite-artwork img:visible").evaluate(async image=>{await image.decode();});
      const metrics=await page.locator(".e-invite-artwork img:visible").evaluate(image=>({width:image.getBoundingClientRect().width,height:image.getBoundingClientRect().height,mobile:image.src.includes("-mobile.png")}));
      const source=metrics.mobile?{width:260,height:340,lead:12,cta:12}:{width:598,height:784,lead:17,cta:14};
      assert.ok(metrics.width<=width);assert.ok(Math.abs(metrics.height/metrics.width-source.height/source.width)<.01);
      assert.equal(metrics.mobile,width<=620);
      if(width===262){assert.ok(metrics.width>=260);assert.ok(source.lead*metrics.width/source.width>=12);assert.ok(source.cta*metrics.width/source.width>=12);}
      await assertFits(page.locator("html"),`actual email viewport ${width}`);
      boundaryMetrics.push({width,...metrics,bakedLeadSize:source.lead*metrics.width/source.width,bakedCtaSize:source.cta*metrics.width/source.width});
      await page.locator(".e-invite-artwork").screenshot({path:`deliverables/invitation/boundary-${width}.png`});await page.close();
      console.log(`PASS actual email boundary ${width}px`);
    }
    console.log("START Outlook-marker simulation");
    const outlook=await boundaryContext.newPage();
    await outlook.setContent(canonicalHtml.replaceAll("@media all{","@media not all{"));
    await outlook.locator("html").evaluate(html=>html.setAttribute("data-ogsc",""));
    assert.equal(await outlook.locator(".e-invite-paper").evaluate(el=>getComputedStyle(el).backgroundColor),"rgb(19, 58, 40)");
    assert.equal(await outlook.locator(".e-invite-paper p").first().evaluate(el=>getComputedStyle(el).color),"rgb(251, 248, 242)");
    await outlook.screenshot({path:"deliverables/invitation/outlook-marker-simulation.png",fullPage:true});
    fs.writeFileSync("deliverables/invitation/geometry.json",JSON.stringify(boundaryMetrics,null,2));
  } finally {await boundaryContext.close();}
  // Actual email viewport widths are distinct from the owner-preview iframe widths above.
  const standalone=await browser.newContext({reducedMotion:"reduce"});
  const phoneMetrics=[],artHashes=new Map();
  try {
    for(const width of [320,390])for(const theme of ["light","dark"])for(const blocked of [false,true]) {
      console.log(`START standalone email ${width}/${theme}/images-blocked=${blocked}`);
      const page=await standalone.newPage();await page.setViewportSize({width,height:900});
      if(blocked)await page.route(/\/email\/.*\.(?:png|jpg|webp)/,route=>route.abort());
      await page.setContent(theme==="light"?canonicalHtml.replaceAll("@media all{","@media not all{"):canonicalHtml);
      const image=page.locator(".e-invite-artwork img:visible");
      await image.evaluate(async image=>{await image.decode().catch(()=>{});});
      assert.equal(await page.getByRole("link",{name:/^Create your profile/}).count(),2,"one accessible image action plus HTML CTA; hidden image variant excluded");
      assert.equal(await page.getByRole("heading",{level:1}).count(),1);
      assert.equal(await page.locator(".e-invite-desktop").isVisible(),false);
      const metrics=await image.evaluate(image=>({width:image.getBoundingClientRect().width,height:image.getBoundingClientRect().height,naturalWidth:image.naturalWidth}));
      const htmlCta=page.locator(".e-invite-html-cta a");
      const ctaHeight=(await htmlCta.boundingBox()).height;
      const lead=12*metrics.width/260,cta=12*metrics.width/260;
      if(!blocked)assert.ok(lead>=12&&cta>=12);assert.ok(ctaHeight>=44);
      await assertFits(page.locator("html"),`actual email viewport ${width}`);
      assert.equal(metrics.naturalWidth,blocked?0:260);
      await page.addScriptTag({content:fs.readFileSync("node_modules/axe-core/axe.min.js","utf8")});
      const violations=await page.evaluate(async()=>(await window.axe.run(document,{runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21aa"]}})).violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})));
      assert.deepEqual(violations,[],"standalone email accessibility/contrast");
      phoneMetrics.push({viewportWidth:width,theme,imagesBlocked:blocked,imageWidth:metrics.width,imageHeight:metrics.height,effectiveBakedLead:blocked?null:lead,effectiveBakedCta:blocked?null:cta,htmlCtaHeight:ctaHeight});
      await page.screenshot({path:`deliverables/invitation/email-viewport-${width}-${theme}${blocked?"-images-blocked":""}.png`,fullPage:true});
      if(!blocked){
        const capture=await image.screenshot();
        const hash=createHash("sha256").update(capture).digest("hex");
        const rendering=await image.evaluate(image=>{
          const box=image.getBoundingClientRect(),style=getComputedStyle(image);
          return {currentSrc:image.currentSrc,src:image.src,naturalWidth:image.naturalWidth,naturalHeight:image.naturalHeight,
            rect:{x:box.x,y:box.y,width:box.width,height:box.height,top:box.top,bottom:box.bottom,left:box.left,right:box.right},
            devicePixelRatio,filter:style.filter,mixBlendMode:style.mixBlendMode,opacity:style.opacity,transform:style.transform,imageRendering:style.imageRendering,
            ancestors:[image,...(function*(node){while(node.parentElement){node=node.parentElement;yield node;}})(image)].map(node=>{const s=getComputedStyle(node);return {tag:node.tagName,className:node.className,background:s.backgroundColor,filter:s.filter,mixBlendMode:s.mixBlendMode,opacity:s.opacity,transform:s.transform};})};
        });
        fs.writeFileSync(`deliverables/invitation/art-pixels-${width}-${theme}.png`,capture);
        fs.writeFileSync(`deliverables/invitation/art-pixels-${width}-${theme}.json`,JSON.stringify({pngSha256:hash,...rendering},null,2));
        fs.writeFileSync("deliverables/invitation/email-viewport-metrics.json",JSON.stringify(phoneMetrics,null,2));
        console.log(`ART pixel evidence saved ${width}/${theme}: ${hash}; rect=${JSON.stringify(rendering.rect)}; filter=${rendering.filter}; blend=${rendering.mixBlendMode}`);
        if(theme==="light")artHashes.set(width,hash);else assert.equal(hash,artHashes.get(width),"approved image pixels unchanged across simulated themes; inspect saved art-pixels PNGs and JSON on mismatch");
      }
      await page.close();
      console.log(`PASS standalone email ${width}/${theme}/images-blocked=${blocked}`);
    }
    console.log("START adverse HTML recolour simulation");
    const forced=await standalone.newPage();await forced.setViewportSize({width:390,height:900});
    await forced.setContent(canonicalHtml.replaceAll("@media all{","@media not all{"));
    await forced.locator(".e-invite-artwork img:visible").evaluate(image=>image.decode());
    // An explicit QA-only adverse recolour model, not an emulation of a particular Gmail build.
    await forced.addStyleTag({content:'.e-body,.e-outer{background-color:#0b2e1f!important}.e-card,.e-invite-paper{background-color:#133a28!important}.e-invite-paper p,.e-subtle,.e-link{color:#eaf4ee!important}.e-invite-html-cta td{background-color:#0f3d29!important}.e-invite-html-cta a{color:#ffffff!important}'});
    const forcedHash=createHash("sha256").update(await forced.locator(".e-invite-artwork img:visible").screenshot()).digest("hex");
    assert.equal(forcedHash,artHashes.get(390),"HTML recolouring cannot recolour baked artwork pixels in this browser model");
    await forced.addScriptTag({content:fs.readFileSync("node_modules/axe-core/axe.min.js","utf8")});
    assert.deepEqual(await forced.evaluate(async()=>(await window.axe.run(document,{runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21aa"]}})).violations.map(v=>v.id)),[]);
    await forced.screenshot({path:"deliverables/invitation/SIMULATION-forced-html-recolour-390.png",fullPage:true});
    fs.writeFileSync("deliverables/invitation/email-viewport-metrics.json",JSON.stringify(phoneMetrics,null,2));
    fs.writeFileSync("deliverables/invitation/README.txt","Browser CI renders only; no real inbox send or Gmail validation. email-viewport-* uses actual email widths 320/390px. Other numeric filenames use outer owner-preview widths; their iframe/hero is narrower. SIMULATION-forced-html-recolour is an explicit adverse HTML recolour model, not Gmail emulation. Assets are 1x approved screenshots, so scaling beyond native dimensions can soften raster text.\n");
  } finally {await standalone.close();}
  console.log("PASS: approved image invitation, copy/asset provenance, paired HTML light/dark fallback, keyboard/axe with images blocked, responsive fit, legacy/account stages. Browser/Outlook-marker simulations only; no inbox send or Gmail validation.");
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
