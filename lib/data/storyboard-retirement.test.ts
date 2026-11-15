import {beforeEach,expect,it} from 'vitest';
import {sampleSource as source} from './sample';
beforeEach(async()=>{await source.demo!.reset();});
it('keeps prior Storyboard mail and signups without automatically queueing another Storyboard welcome',async()=>{
 const old=await source.emails.queue('welcome','old@example.org',{storyboardUrl:'https://example.org/storyboard/'});
 const joined=await source.funnel.joinWaitlist({email:'new@example.org',zip:'90026',placement:'hero'});
 expect(joined.ok).toBe(true);
 const outbox=await source.emails.outbox();expect(outbox.map(e=>e.id)).toEqual([old.id]);
 await source.demo!.signInAs('owner');
 if(joined.ok)expect((await source.owners.waitlist({text:'new@example.org'})).some(r=>r.signup.id===joined.signup.id)).toBe(true);
});
it('keeps deliberate invitations and unrelated confirmation email behavior',async()=>{
 const joined=await source.funnel.joinWaitlist({email:'invite@example.org',zip:'90026',placement:'hero'});
 await source.demo!.signInAs('owner');if(!joined.ok)throw Error('fixture signup failed');
 expect(await source.owners.invite([joined.signup.id])).toMatchObject({invited:1});
 expect((await source.emails.outbox()).some(e=>e.template==='invite')).toBe(true);
 await source.funnel.submitSketch('talent',{name:'Fictional',email:'craft@example.org'});
 expect((await source.emails.outbox()).some(e=>e.template==='coming-soon')).toBe(true);
 expect((await source.emails.outbox()).filter(e=>e.template==='welcome')).toHaveLength(0);
});
