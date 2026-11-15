// Backend capability outlives the editor UI: rolling back the UI must not break delivered unsubscribe links.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export function checkProfileReviewGates(ui, backend) {
  for(const value of [ui,backend]) if(![undefined,'','0','1'].includes(value)) return 'Profile review settings must be empty, 0 or 1.';
  if(ui==='1' && backend!=='1') return 'Profile review UI requires the independently reviewed backend activation. Obtain Anu’s review before setting PROFILE_REVIEW_BACKEND_ENABLED=1.';
  return null;
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const error=checkProfileReviewGates(process.env.PROFILE_REVIEW_ENABLED,process.env.PROFILE_REVIEW_BACKEND_ENABLED);
  if(error){console.error(`::error::${error}`);process.exit(1);}
  console.log('Profile review UI/backend settings are compatible.');
}
