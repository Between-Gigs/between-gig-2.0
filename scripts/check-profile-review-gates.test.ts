import {expect,it} from 'vitest';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
// @ts-expect-error plain mjs deploy check
import {checkProfileReviewGates} from './check-profile-review-gates.mjs';
it.each([[undefined,undefined],['',''],['0','0'],['1','1'],['0','1']])('allows compatible UI/backend states %s/%s', (ui,backend)=>{expect(checkProfileReviewGates(ui,backend)).toBeNull();});
it.each([['1',''],['1','0'],['yes','1'],['0','yes']])('rejects incomplete or ambiguous activation %s/%s',(ui,backend)=>{expect(checkProfileReviewGates(ui,backend)).toBeTruthy();});
it('fails the actual deploy command before activation and supports a UI-only rollback',()=>{
 const script=fileURLToPath(new URL('./check-profile-review-gates.mjs',import.meta.url));
 const run=(ui:string,backend:string)=>spawnSync(process.execPath,[script],{encoding:'utf8',env:{...process.env,PROFILE_REVIEW_ENABLED:ui,PROFILE_REVIEW_BACKEND_ENABLED:backend}});
 expect(run('1','').status).toBe(1);expect(run('1','').stderr).toContain('independently reviewed');expect(run('0','1').status).toBe(0);
});
