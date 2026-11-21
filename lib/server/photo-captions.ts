import { CAPTION_MAX } from '@/lib/profile/video-links';
import { CompanyOsError, type BatchOp, type Row } from './companyos';

const ownedPhoto = (profileId: string, f: Row) => f.data.owner_entity === 'profile' && f.data.owner_id === profileId && f.data.kind === 'portfolio' && f.data.status === 'ready';
/** Existing file.caption only. Stable file IDs keep descriptions independent of order and fit. */
export function photoCaptionsFrom(profileId: string, files: readonly Row[]): Record<string,string> {
  return Object.fromEntries(files.filter(f => f.data.owner_entity === 'profile' && f.data.owner_id === profileId && f.data.kind === 'portfolio' && (f.data.status === undefined || f.data.status === 'ready') && typeof f.data.caption === 'string').map(f => [f.id, f.data.caption as string]));
}

/** Existing file rows only. A raw missing value compares as undefined (omitted in JSON), not an empty caption. */
export function photoCaptionOps(changes: ReturnType<typeof planPhotoCaptions>): BatchOp[] {
  return changes.map(({id, caption, expected}) => ({
    op: 'update', entity: 'file', id, data: { caption: caption === '' ? null : caption }, ifMatch: { field: 'caption', value: expected },
  }));
}

export function verifyPhotoCaptionReadback(profileId: string, changes: ReturnType<typeof planPhotoCaptions>, files: readonly Row[]) {
  const owned = new Map(files.filter(f => ownedPhoto(profileId, f)).map(f => [f.id, f]));
  if (changes.some(({ id, caption }) => owned.get(id)?.data.caption !== (caption === '' ? null : caption))) {
    throw new CompanyOsError(502, 'photo_caption_not_saved', 'The saved photo description could not be verified. Reload before trying again.');
  }
}

export function planPhotoCaptions(profileId:string,want:unknown,files:readonly Row[],baseline:Record<string,string> = photoCaptionsFrom(profileId,files)) {
  const invalid = () => new CompanyOsError(422,'invalid_photo_caption','Use a description of at most 160 characters for a saved photo.');
  if (!want || typeof want !== 'object' || Array.isArray(want)) throw invalid();
  const owned = new Map(files.filter(f=>ownedPhoto(profileId,f)).map(f=>[f.id,f]));
  const changes: {id:string; caption:string; expected:unknown}[]=[];
  for (const [id,caption] of Object.entries(want)) {
    const photo=owned.get(id);
    if (!photo || typeof caption!=='string' || caption.length>CAPTION_MAX) throw invalid();
    const before=typeof baseline[id]==='string'?baseline[id]:'';
    if (caption===before) continue; // unchanged entries in a stale full map never overwrite another edit
    const current=typeof photo.data.caption==='string'?photo.data.caption:'';
    if (current!==before && current!==caption) throw new CompanyOsError(409,'photo_caption_conflict','This photo description changed elsewhere. Reload before editing it.');
    if (current!==caption) changes.push({id,caption,expected:photo.data.caption});
  }
  return changes;
}
