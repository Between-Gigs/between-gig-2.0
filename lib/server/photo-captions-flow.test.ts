import {afterEach,expect,it,vi} from 'vitest';
import {saveDraft} from './gigs';
import {cleanFields} from './routes';
import {completeFields} from '@/lib/data/contract/fixtures';
import {CompanyOsError,type Row} from './companyos';
const row=(id:string,data:Record<string,unknown>):Row=>({id,data,createdAt:'',updatedAt:''});
afterEach(()=>vi.unstubAllEnvs());
function fixture(mode='ok'){
 const profile=row('prof',{person:'p',status:'approved',display_name:'Maya'});
 const photo=row('f',{owner_entity:'profile',owner_id:'prof',kind:'portfolio',status:'ready',position:0,caption:'Before',published:true});
 const patches:unknown[]=[];
 const cos={query:vi.fn(async(_c:unknown,s:{entity:string})=>s.entity==='profile'?[profile]:[]),all:vi.fn(async(_c:unknown,s:{entity:string})=>s.entity==='file'?[photo]:[]),batch:vi.fn(async()=>({ids:[]})),remove:vi.fn(),patch:vi.fn(async(_c:unknown,e:string,id:string,data:Record<string,unknown>)=>{patches.push({e,id,data});if(mode==='denied')throw new CompanyOsError(403,'forbidden');if(mode==='wrong')return photo;profile.data.status='submitted';photo.data={...photo.data,...data,published:false};return photo;})};
 return {ctx:{cos,cred:{kind:'session',token:'fictional'},appUrl:''} as never,cos,photo,profile,patches};
}
it('editor save/reload returns canonical caption without touching original photo/order; backend review result retained',async()=>{
 vi.stubEnv('NEXT_PUBLIC_PROFILE_VIDEO_LINKS','1');const f=fixture();const fields=cleanFields({...completeFields('Maya','/media/avatar'),workSamples:['/media/f'],photoCaptions:{f:'After'},photoCaptionBaseline:{f:'Before'}});
 const saved=await saveDraft(f.ctx,'p',fields);expect(saved.fields.photoCaptions).toEqual({f:'After'});expect(saved.fields.workSamples).toEqual(['/media/f']);expect(f.profile.data.status).toBe('submitted');expect(f.photo.data.position).toBe(0);expect(f.cos.remove).not.toHaveBeenCalled();
});
it.each(['denied','wrong'])('refuses false save success on %s',async mode=>{vi.stubEnv('NEXT_PUBLIC_PROFILE_VIDEO_LINKS','1');const f=fixture(mode);await expect(saveDraft(f.ctx,'p',{...completeFields('Maya','/media/avatar'),workSamples:['/media/f'],photoCaptions:{f:'After'},photoCaptionBaseline:{f:'Before'}})).rejects.toBeInstanceOf(CompanyOsError);expect(f.cos.remove).not.toHaveBeenCalled();expect(f.photo.data.caption).toBe('Before');});
it('foreign caption preflight happens before other profile mutation',async()=>{vi.stubEnv('NEXT_PUBLIC_PROFILE_VIDEO_LINKS','1');const f=fixture();await expect(saveDraft(f.ctx,'p',{...completeFields('Maya','/media/avatar'),photoCaptions:{foreign:'No'}})).rejects.toMatchObject({code:'invalid_photo_caption'});expect(f.cos.batch).not.toHaveBeenCalled();expect(f.cos.patch).not.toHaveBeenCalled();});
it('flag off does not accept caption persistence',()=>{vi.stubEnv('NEXT_PUBLIC_PROFILE_VIDEO_LINKS','0');expect(cleanFields({photoCaptions:{f:'text'}}).photoCaptions).toBeUndefined();});
