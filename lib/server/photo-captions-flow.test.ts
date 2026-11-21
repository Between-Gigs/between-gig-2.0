import { afterEach, expect, it, vi } from 'vitest';
import { saveDraft } from './gigs';
import { cleanFields, handle } from './routes';
import { completeFields } from '@/lib/data/contract/fixtures';
import { CompanyOsError, type BatchOp, type Row } from './companyos';

const row=(id:string,data:Record<string,unknown>):Row=>({id,data,createdAt:'',updatedAt:''});
afterEach(()=>vi.unstubAllEnvs());
function fixture(mode='ok'){
  const profile=row('prof',{person:'p',status:'approved',display_name:'Maya'});
  const photo=(id:string, position:number)=>row(id,{owner_entity:'profile',owner_id:'prof',kind:'portfolio',status:'ready',position,caption:'Before',published:true});
  const photos=[photo('f',0),photo('g',1)];
  const cos={
    query:vi.fn(async(_c:unknown,s:{entity:string})=>s.entity==='profile'?[profile]:[]),
    all:vi.fn(async(_c:unknown,s:{entity:string})=>s.entity==='file'?photos:[]),remove:vi.fn(),patch:vi.fn(async()=>undefined),
    batch:vi.fn(async(_c:unknown, ops:BatchOp[])=>{
      const captionOps=ops.filter(op=>op.entity==='file');
      // The fixture simulates the contract, not the hosted DB or actual role/review policy.
      if(mode==='upstream-lookalike')throw new CompanyOsError(502,'photo_caption_not_saved','private upstream detail');
      if(mode==='denied')throw new CompanyOsError(403,'forbidden');
      if(mode==='cas-fails-second' && captionOps.length===2)throw new CompanyOsError(409,'ifMatch mismatch');
      if(mode!=='wrong-readback')for(const op of captionOps){
        const photo=photos.find(f=>f.id===op.id)!;
        photo.data={...photo.data,...op.data,published:false};
        profile.data.status='submitted';
      }
      return {ids:ops.map(op=>mode==='wrong-id'?'wrong':op.id??'generated')};
    }),
  };
  return {ctx:{cos,cred:{kind:'session',token:'fictional'},appUrl:''} as never,cos,photos,profile};
}
const fields=()=>cleanFields({...completeFields('Maya','/media/avatar'),workSamples:['/media/f','/media/g'],photoCaptions:{f:'After',g:'After 2'},photoCaptionBaseline:{f:'Before',g:'Before'}});

it('sends two captions and profile fields in a single conditional batch and verifies canonical readback',async()=>{
  vi.stubEnv('NEXT_PUBLIC_PROFILE_VIDEO_LINKS','1');const f=fixture();
  const saved=await saveDraft(f.ctx,'p',fields());
  expect(f.cos.batch).toHaveBeenCalledTimes(1);
  const ops=f.cos.batch.mock.calls[0]![1];
  expect(ops.some(op=>op.entity==='profile')).toBe(true);
  expect(ops.filter(op=>op.entity==='file')).toEqual([
    {op:'update',entity:'file',id:'f',data:{caption:'After'},ifMatch:{field:'caption',value:'Before'}},
    {op:'update',entity:'file',id:'g',data:{caption:'After 2'},ifMatch:{field:'caption',value:'Before'}},
  ]);
  expect(saved.fields.photoCaptions).toEqual({f:'After',g:'After 2'});
  expect(saved.fields.workSamples).toEqual(['/media/f','/media/g']);
  expect(f.profile.data.status).toBe('submitted');expect(f.photos[0]!.data.position).toBe(0);
  expect(f.cos.remove).not.toHaveBeenCalled();expect(f.cos.patch).not.toHaveBeenCalled();
});
it.each([['denied','forbidden'],['wrong-readback','photo_caption_not_saved'],['wrong-id','photo_caption_not_saved'],['cas-fails-second','photo_caption_conflict']])('refuses false save success on %s',async(mode,code)=>{
  vi.stubEnv('NEXT_PUBLIC_PROFILE_VIDEO_LINKS','1');const f=fixture(mode);
  await expect(saveDraft(f.ctx,'p',fields())).rejects.toMatchObject({code});
  expect(f.cos.remove).not.toHaveBeenCalled();expect(f.cos.patch).not.toHaveBeenCalled();
  if(mode==='cas-fails-second')expect(f.photos.map(p=>p.data.caption)).toEqual(['Before','Before']);
});
it('foreign caption preflight happens before other profile mutation',async()=>{
  vi.stubEnv('NEXT_PUBLIC_PROFILE_VIDEO_LINKS','1');const f=fixture();
  await expect(saveDraft(f.ctx,'p',{...fields(),photoCaptions:{foreign:'No'}})).rejects.toMatchObject({code:'invalid_photo_caption'});
  expect(f.cos.batch).not.toHaveBeenCalled();expect(f.cos.patch).not.toHaveBeenCalled();
});
it('flag off does not accept caption persistence',()=>{
  vi.stubEnv('NEXT_PUBLIC_PROFILE_VIDEO_LINKS','0');
  expect(cleanFields({photoCaptions:{f:'text'}}).photoCaptions).toBeUndefined();
});

it('rejects an explicit caption change for a photo removed by the same request before any write',async()=>{
  vi.stubEnv('NEXT_PUBLIC_PROFILE_VIDEO_LINKS','1');const f=fixture();
  const input={...fields(),workSamples:['/media/g']};
  await expect(saveDraft(f.ctx,'p',input)).rejects.toMatchObject({code:'invalid_photo_caption_removal'});
  expect(f.cos.batch).not.toHaveBeenCalled();
  expect(f.cos.remove).not.toHaveBeenCalled();
  expect(f.photos.map(p=>p.data.caption)).toEqual(['Before','Before']);
});

function saveRequest(authenticated = true) {
  return new Request("https://fixture.example/api/profiles/saveDraft/", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(authenticated ? { Authorization: "Bearer fictional-caption-session" } : {}) },
    body: JSON.stringify({ args: ["p", fields()] }),
  });
}

it('reports a locally detected ambiguous caption receipt only to the authenticated draft save', async()=>{
  vi.stubEnv('NEXT_PUBLIC_PROFILE_VIDEO_LINKS','1');
  const f=fixture('wrong-id');
  const response=await handle("profiles.saveDraft",saveRequest(),{cos:f.cos as never});
  expect(response.status).toBe(502);
  expect(await response.json()).toEqual({error:'photo_caption_not_saved'});

  const anonymous=await handle("profiles.saveDraft",saveRequest(false),{cos:f.cos as never});
  expect(anonymous.status).toBe(401);
  expect(await anonymous.json()).toEqual({error:'unauthorized'});

  const lookalike=fixture('upstream-lookalike');
  const opaque=await handle("profiles.saveDraft",saveRequest(),{cos:lookalike.cos as never});
  expect(opaque.status).toBe(502);
  expect(await opaque.json()).toEqual({error:'unavailable'});
});
