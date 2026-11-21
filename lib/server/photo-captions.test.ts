import { describe, expect, it, vi } from 'vitest';
import { photoCaptionsFrom, savePhotoCaptions } from './photo-captions';
import { CompanyOsError, type Row } from './companyos';
const photo = (id='photo1', caption='Original'):Row => ({id,createdAt:'',updatedAt:'',data:{owner_entity:'profile',owner_id:'profile1',kind:'portfolio',status:'ready',caption,position:2,published:true}});
const cred = {kind:'bearer',token:'fictional'} as never;
describe('existing photo caption contract',()=>{
 it('reads captions by stable file ID without changing media or position',()=>expect(photoCaptionsFrom('profile1',[photo()])).toEqual({photo1:'Original'}));
 it('writes caption only and verifies returned persisted row',async()=>{const patch=vi.fn(async()=>photo('photo1','New'));await savePhotoCaptions({cos:{patch},cred},'profile1',{photo1:'New'},[photo()]);expect(patch).toHaveBeenCalledTimes(1);expect(patch).toHaveBeenCalledWith(cred,'file','photo1',{caption:'New'});});
 it('keeps omitted entries unchanged and supports explicit clear',async()=>{const patch=vi.fn(async()=>photo('photo1',''));await savePhotoCaptions({cos:{patch},cred},'profile1',{},[photo()]);expect(patch).not.toHaveBeenCalled();await savePhotoCaptions({cos:{patch},cred},'profile1',{photo1:''},[photo()]);expect(patch).toHaveBeenCalledTimes(1);});
 it.each([{other:'x'},{photo1:5},{photo1:'x'.repeat(161)}])('rejects invalid request before any mutation',async want=>{const patch=vi.fn();await expect(savePhotoCaptions({cos:{patch},cred},'profile1',want,[photo()])).rejects.toBeInstanceOf(CompanyOsError);expect(patch).not.toHaveBeenCalled();});
 it('validates the entire batch first',async()=>{const patch=vi.fn();await expect(savePhotoCaptions({cos:{patch},cred},'profile1',{photo1:'New',foreign:'No'},[photo()])).rejects.toBeInstanceOf(CompanyOsError);expect(patch).not.toHaveBeenCalled();});
 it.each(['wrong-caption','wrong-owner','wrong-id','missing-caption'])('fails closed on %s readback',async issue=>{const r=photo('photo1','New');if(issue==='wrong-caption')r.data.caption='Old';if(issue==='wrong-owner')r.data.owner_id='other';if(issue==='wrong-id')r.id='other';if(issue==='missing-caption')delete r.data.caption;const patch=vi.fn(async()=>r);await expect(savePhotoCaptions({cos:{patch},cred},'profile1',{photo1:'New'},[photo()])).rejects.toMatchObject({code:'photo_caption_not_saved'});});
 it('propagates review/permission failure and never deletes/reuploads files',async()=>{const patch=vi.fn(async()=>{throw new CompanyOsError(403,'forbidden');});await expect(savePhotoCaptions({cos:{patch},cred},'profile1',{photo1:'New'},[photo()])).rejects.toMatchObject({code:'forbidden'});});
 it('round trips the updated caption while retaining immutable original photo metadata',async()=>{const r=photo();const original={...r.data};const patch=vi.fn(async(_cred:unknown,_entity:string,_id:string,data:Record<string,unknown>)=>{Object.assign(r.data,data);return r;});await savePhotoCaptions({cos:{patch},cred},'profile1',{photo1:'Edited description'},[r]);expect(photoCaptionsFrom('profile1',[r])).toEqual({photo1:'Edited description'});expect(r.data).toEqual({...original,caption:'Edited description'});});
});

it('keeps another tab edit while applying a different caption and preserves it on reorder',async()=>{
 const f=photo('photo1','New from A'),g=photo('photo2','Old');const patch=vi.fn(async(_c:unknown,_e:string,id:string,d:Record<string,unknown>)=>({...g,id,data:{...g.data,...d}}));
 await savePhotoCaptions({cos:{patch},cred},'profile1',{photo1:'Original',photo2:'New from B'},[f,g],{photo1:'Original',photo2:'Old'});
 expect(patch).toHaveBeenCalledTimes(1);expect(patch).toHaveBeenCalledWith(cred,'file','photo2',{caption:'New from B'});
 patch.mockClear();await savePhotoCaptions({cos:{patch},cred},'profile1',{photo1:'Original'},[f],{photo1:'Original'});expect(patch).not.toHaveBeenCalled();
});
it('conflicting edits to same photo refuse before mutation',async()=>{const patch=vi.fn();await expect(savePhotoCaptions({cos:{patch},cred},'profile1',{photo1:'My edit'},[photo('photo1','Other edit')],{photo1:'Original'})).rejects.toMatchObject({code:'photo_caption_conflict'});expect(patch).not.toHaveBeenCalled();});
