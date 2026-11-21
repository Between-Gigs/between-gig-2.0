import { describe, expect, it } from 'vitest';
import { photoCaptionOps, photoCaptionsFrom, planPhotoCaptions, verifyPhotoCaptionReadback } from './photo-captions';
import { CompanyOsError, type Row } from './companyos';

const photo = (id='photo1', caption:unknown='Original'):Row => ({id,createdAt:'',updatedAt:'',data:{owner_entity:'profile',owner_id:'profile1',kind:'portfolio',status:'ready',caption,position:2,published:true}});

describe('existing photo caption contract',()=>{
  it('reads captions by stable file ID without changing media or position',()=>{
    expect(photoCaptionsFrom('profile1',[photo()])).toEqual({photo1:'Original'});
  });
  it('constructs only caption updates, with CAS guards on the exact stored values',()=>{
    const absent=photo('photo2'); delete absent.data.caption;
    const cleared=photo('photo3',null);
    const changes=planPhotoCaptions('profile1',{photo1:'',photo2:'New',photo3:'New'},[photo(),absent,cleared]);
    expect(JSON.parse(JSON.stringify(photoCaptionOps(changes)))).toEqual([
      {op:'update',entity:'file',id:'photo1',data:{caption:null},ifMatch:{field:'caption',value:'Original'}},
      {op:'update',entity:'file',id:'photo2',data:{caption:'New'},ifMatch:{field:'caption'}},
      {op:'update',entity:'file',id:'photo3',data:{caption:'New'},ifMatch:{field:'caption',value:null}},
    ]);
  });
  it.each([{other:'x'},{photo1:5},{photo1:'x'.repeat(161)},{photo1:'New',foreign:'No'}])('rejects entire invalid batch before mutation',want=>{
    expect(()=>planPhotoCaptions('profile1',want,[photo()])).toThrow(CompanyOsError);
  });
  it.each(['wrong-caption','wrong-owner','wrong-id','missing-caption','status'])('fails closed on %s readback',issue=>{
    const r=photo('photo1','New');if(issue==='wrong-caption')r.data.caption='Old';if(issue==='wrong-owner')r.data.owner_id='other';if(issue==='wrong-id')r.id='other';if(issue==='missing-caption')delete r.data.caption;if(issue==='status')r.data.status='pending';
    const changes=planPhotoCaptions('profile1',{photo1:'New'},[photo()]);
    expect(()=>verifyPhotoCaptionReadback('profile1',changes,[r])).toThrow(CompanyOsError);
  });

  it('verifies an explicit clear against Company OS’s canonical null, but not a missing row',()=>{
    const changes=planPhotoCaptions('profile1',{photo1:''},[photo()]);
    expect(()=>verifyPhotoCaptionReadback('profile1',changes,[photo('photo1',null)])).not.toThrow();
    expect(()=>verifyPhotoCaptionReadback('profile1',changes,[])).toThrow(CompanyOsError);
  });
  it('keeps another tab edit while applying a different caption and preserves it on reorder',()=>{
    const f=photo('photo1','New from A'),g=photo('photo2','Old');
    expect(photoCaptionOps(planPhotoCaptions('profile1',{photo1:'Original',photo2:'New from B'},[f,g],{photo1:'Original',photo2:'Old'}))).toEqual([
      {op:'update',entity:'file',id:'photo2',data:{caption:'New from B'},ifMatch:{field:'caption',value:'Old'}},
    ]);
    expect(planPhotoCaptions('profile1',{photo1:'Original'},[f],{photo1:'Original'})).toEqual([]);
  });
  it('conflicting edits to same photo refuse before mutation',()=>{
    expect(()=>planPhotoCaptions('profile1',{photo1:'My edit'},[photo('photo1','Other edit')],{photo1:'Original'})).toThrow(/changed elsewhere/);
  });
});
