import {it,expect} from "vitest";
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,readdirSync,rmSync,cpSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {spawnSync} from "node:child_process";
it("exports/checks only the invitation and preserves diagnostic and all unrelated template bytes",()=>{
 const root=mkdtempSync(join(tmpdir(),"bg-invite-render-")),dir=join(root,"deploy/recipes/between-gigs/emails");mkdirSync(dir,{recursive:true});
 const names=["invite.html","invite.txt","diagnostic.html","diagnostic.txt","welcome.html","welcome.txt","coming-soon.html","coming-soon.txt","sign-in-code.html","sign-in-code.txt","approved.html","approved.txt","profile-submitted.html","profile-submitted.txt","changes-requested.html","changes-requested.txt"];
 try{
 for(const name of names)writeFileSync(join(dir,name),`preserve-${name}`);
 writeFileSync(join(dir,"subjects.json"),JSON.stringify({invite:"old",diagnostic:"preserve diagnostic",approved:"preserve approved"}));
 const run=(...flags:string[])=>spawnSync(process.execPath,["scripts/render-companyos-emails.mjs",root,"--invite-only",...flags],{encoding:"utf8"});
 expect(run().status).toBe(0);
 for(const name of names.filter(n=>!n.startsWith("invite.")))expect(readFileSync(join(dir,name),"utf8"),name).toBe(`preserve-${name}`);
 const html=readFileSync(join(dir,"invite.html"),"utf8"),text=readFileSync(join(dir,"invite.txt"),"utf8");
 expect(html).toContain('href="{{links.unsubscribe}}"');expect(text).toContain("Unsubscribe: {{links.unsubscribe}}");expect(html).not.toContain("RESEND_UNSUBSCRIBE_URL");expect(html).not.toContain("data-email-unsubscribe");expect(html).not.toMatch(/background-image:[^;]*\{\{/);expect(html).toContain('src="{{links.base}}/email/invitation-hero-approved.png"');expect(html).toContain('src="{{links.base}}/email/invitation-hero-approved-mobile.png"');expect(html).not.toContain('background="{{links.base}}/email/craft-invitation-portrait.jpg"');
 expect(html).toContain("Your skills have value beyond the set. Let us help you put them to work.");expect(text).toContain("The Between Gigs Team");expect(html).toContain('alt="Create your profile.');expect(html.match(/href="\{\{vars\.invite_url\}\}"/g)).toHaveLength(3);
 expect(JSON.parse(readFileSync(join(dir,"subjects.json"),"utf8"))).toEqual({invite:"You're invited to Between Gigs",diagnostic:"preserve diagnostic",approved:"preserve approved"});
 const snapshot=()=>Object.fromEntries(readdirSync(dir).map(name=>[name,readFileSync(join(dir,name),"utf8")]));const before=snapshot();expect(run("--check").status).toBe(0);expect(snapshot()).toEqual(before);
 writeFileSync(join(dir,"invite.txt"),text+"drift");const drift=snapshot();expect(run("--check").status).toBe(1);expect(snapshot()).toEqual(drift);
 }finally{rmSync(root,{recursive:true,force:true});}
});

it("renders from a source checkout containing spaces without changing its selected target scope",()=>{
 const root=mkdtempSync(join(tmpdir(),"bg-invite-source-")),source=join(root,"source with spaces"),target=join(root,"target with spaces"),dir=join(target,"deploy/recipes/between-gigs/emails");
 try{mkdirSync(join(source,"scripts"),{recursive:true});mkdirSync(join(source,"lib"));mkdirSync(dir,{recursive:true});writeFileSync(join(source,"package.json"),'{"type":"module"}');cpSync("emails",join(source,"emails"),{recursive:true});cpSync("lib/lettering.ts",join(source,"lib/lettering.ts"));cpSync("scripts/render-companyos-emails.mjs",join(source,"scripts/render-companyos-emails.mjs"));writeFileSync(join(dir,"subjects.json"),'{"diagnostic":"preserve"}');
 const result=spawnSync(process.execPath,[join(source,"scripts/render-companyos-emails.mjs"),target,"--invite-only"],{encoding:"utf8"});expect(result.status,result.stderr).toBe(0);expect(readFileSync(join(dir,"invite.txt"),"utf8")).toContain("The Between Gigs Team");expect(JSON.parse(readFileSync(join(dir,"subjects.json"),"utf8")).diagnostic).toBe("preserve");
 }finally{rmSync(root,{recursive:true,force:true});}
});
