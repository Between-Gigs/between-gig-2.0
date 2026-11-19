import {expect,it} from 'vitest';
import {adoptPhotoCaptionSave, keepPhotoCaptions, photoCaptionFor, photoFileId} from './photo-captions';
it('ties text to a saved photo ID rather than its ordering or fit',()=>{expect(photoFileId('/media/a#fit=0.5,0.5,1,1')).toBe('a');expect(photoCaptionFor('/media/a#fit=0.5,0.5,1,1',{a:'Tailored jacket'})).toBe('Tailored jacket');});
it('drops removed/replaced captions without touching surviving text',()=>expect(keepPhotoCaptions(['/media/b','data:image/jpeg;base64,AAAA'],{a:'removed',b:'kept'})).toEqual({b:'kept'}));
it('does not treat video or arbitrary paths as photos',()=>{expect(photoFileId('video:x')).toBeNull();expect(photoFileId('/media/../x')).toBeNull();});

it('adopts saved descriptions without replacing edits typed during save',()=>expect(adoptPhotoCaptionSave({a:'newer typing',b:'old'},{a:'sent',b:'old'},{a:'sent',b:'other tab'})).toEqual({a:'newer typing',b:'other tab'}));
