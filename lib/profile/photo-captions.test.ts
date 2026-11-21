import {expect,it} from 'vitest';
import {adoptPhotoCaptionSave, keepPhotoCaptions, photoCaptionFor, photoFileId, reconcilePhotoCaptionSave} from './photo-captions';
it('ties text to a saved photo ID rather than its ordering or fit',()=>{expect(photoFileId('/media/a#fit=0.5,0.5,1,1')).toBe('a');expect(photoCaptionFor('/media/a#fit=0.5,0.5,1,1',{a:'Tailored jacket'})).toBe('Tailored jacket');});
it('drops removed/replaced captions without touching surviving text',()=>expect(keepPhotoCaptions(['/media/b','data:image/jpeg;base64,AAAA'],{a:'removed',b:'kept'})).toEqual({b:'kept'}));
it('does not treat video or arbitrary paths as photos',()=>{expect(photoFileId('video:x')).toBeNull();expect(photoFileId('/media/../x')).toBeNull();});

it('adopts saved descriptions without replacing edits typed during save',()=>expect(adoptPhotoCaptionSave({a:'newer typing',b:'old'},{a:'sent',b:'old'},{a:'sent',b:'other tab'})).toEqual({a:'newer typing',b:'other tab'}));

it('two unrelated stale saves accept the other tab’s caption rather than submitting a stale edit', () => {
  const old = { photoCaptions: { a: 'Old' }, photoCaptionBaseline: { a: 'Old' } };
  const stored = { photoCaptions: { a: 'From tab A' }, photoCaptionBaseline: { a: 'From tab A' } };
  const first = reconcilePhotoCaptionSave(old, old, stored, stored.photoCaptions, false);
  const second = reconcilePhotoCaptionSave(first, first, first, stored.photoCaptions, false);
  expect(first).toEqual(stored);
  expect(second).toEqual(stored);
});

it('keeps new typing without reviving an untouched stale caption on the next save', () => {
  const old = { photoCaptions: { a: 'Old A', b: 'Old B' }, photoCaptionBaseline: { a: 'Old A', b: 'Old B' } };
  const merged = { photoCaptions: { a: 'Tab A changed a', b: 'Old B' }, photoCaptionBaseline: { a: 'Tab A changed a', b: 'Old B' } };
  const typing = { ...old, photoCaptions: { ...old.photoCaptions, b: 'Typing in tab B' } };
  expect(reconcilePhotoCaptionSave(typing, old, merged, merged.photoCaptions, true)).toEqual({
    photoCaptions: { a: 'Tab A changed a', b: 'Typing in tab B' },
    photoCaptionBaseline: merged.photoCaptionBaseline,
  });
});

it('keeps its previous CAS baseline when an in-flight local edit competes with unseen saved text', () => {
  const old = { photoCaptions: { a: 'Old A' }, photoCaptionBaseline: { a: 'Old A' } };
  const typing = { ...old, photoCaptions: { a: 'New typing' } };
  expect(reconcilePhotoCaptionSave(typing, old, old, { a: 'Competing caption' }, true)).toEqual({
    photoCaptions: { a: 'New typing' }, photoCaptionBaseline: { a: 'Old A' },
  });
});

it('advances the CAS baseline after acknowledging a previous local edit while still preserving newer typing', () => {
  const local = { photoCaptions: { a: 'First typed' }, photoCaptionBaseline: { a: 'Original' } };
  const typing = { ...local, photoCaptions: { a: 'Second typed' } };
  expect(reconcilePhotoCaptionSave(typing, local, local, { a: 'First typed' }, true)).toEqual({
    photoCaptions: { a: 'Second typed' }, photoCaptionBaseline: { a: 'First typed' },
  });
});
