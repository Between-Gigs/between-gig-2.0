import { describe, expect, it } from "vitest";
import { checkProfileActivation } from "./check-profile-activation.mjs";
const pending=JSON.stringify({requires:">=1.14.0",profileFeatures:{customServiceReview:{requires:null,apiCommit:null,profilesModule:"1.5.0"}}});
// Fictional release declarations, never a real reservation or deployed capability claim.
const ready=JSON.stringify({requires:">=2.7.0",profileFeatures:{customServiceReview:{requires:">=2.7.0",apiCommit:"a".repeat(40),profilesModule:"1.5.0",settingsEvidence:{test:"libfile_fictional_test",production:null}}}});
describe("profile activation preflight",()=>{
 it.each([{}, {NEXT_PUBLIC_CUSTOM_SERVICE_REVIEW:"0"}, {NEXT_PUBLIC_PROFILE_NO_DEPARTMENT:"0"}])("permits a dormant build and preserves an absent runtime flag (%j)",env=>expect(checkProfileActivation(env,pending).ok).toBe(true));
 it("does not treat a diagnostic/baseline API version as the custom feature",()=>expect(checkProfileActivation({NEXT_PUBLIC_CUSTOM_SERVICE_REVIEW:"1",CUSTOM_SERVICE_REVIEW_ENABLED:"1"},pending).ok).toBe(false));
 it.each([undefined,"","0"])("refuses UI activation without the explicit server guard (%s)",runtime=>expect(checkProfileActivation({NEXT_PUBLIC_CUSTOM_SERVICE_REVIEW:"1",CUSTOM_SERVICE_REVIEW_ENABLED:runtime},ready).ok).toBe(false));
 it("accepts paired activation declarations only after version coordination",()=>expect(checkProfileActivation({RAILWAY_ENV:"test",NEXT_PUBLIC_CUSTOM_SERVICE_REVIEW:"1",CUSTOM_SERVICE_REVIEW_ENABLED:"1"},ready).ok).toBe(true));
 it("supports hiding the UI while retaining enforcement",()=>expect(checkProfileActivation({RAILWAY_ENV:"test",NEXT_PUBLIC_CUSTOM_SERVICE_REVIEW:"0",CUSTOM_SERVICE_REVIEW_ENABLED:"1"},ready).ok).toBe(true));
 it("refuses an ordinary workflow reset of the installed runtime guard",()=>expect(checkProfileActivation({NEXT_PUBLIC_CUSTOM_SERVICE_REVIEW:"0",CUSTOM_SERVICE_REVIEW_ENABLED:"0"},ready).ok).toBe(false));
 it.each(["NEXT_PUBLIC_CUSTOM_SERVICE_REVIEW","NEXT_PUBLIC_PROFILE_NO_DEPARTMENT","CUSTOM_SERVICE_REVIEW_ENABLED"])("rejects malformed %s without echoing its value",name=>{const result=checkProfileActivation({[name]:"\n::notice::untrusted"},ready);expect(result.ok).toBe(false);expect(result.error).not.toContain("untrusted");});
});

describe("Department-only activation readiness",()=>{
 it("refuses hiding Department with only the baseline and unverified settings",()=>expect(checkProfileActivation({RAILWAY_ENV:"test",NEXT_PUBLIC_PROFILE_NO_DEPARTMENT:"1"},pending).ok).toBe(false));
 it("does not reuse test settings evidence for production",()=>{
  const manifest=JSON.stringify({requires:">=1.14.0",profileFeatures:{departmentRetirement:{apiCommit:"a".repeat(40),settingsEvidence:{test:"libfile_fictional_test",production:null}}}});
  expect(checkProfileActivation({RAILWAY_ENV:"test",NEXT_PUBLIC_PROFILE_NO_DEPARTMENT:"1"},manifest).ok).toBe(true);
  expect(checkProfileActivation({RAILWAY_ENV:"production",NEXT_PUBLIC_PROFILE_NO_DEPARTMENT:"1"},manifest).ok).toBe(false);
 });
});

describe("custom-service settings evidence stays environment scoped",()=>{
 it.each([undefined,"production"])("does not enable from a test receipt in %s",environment=>expect(checkProfileActivation({RAILWAY_ENV:environment,NEXT_PUBLIC_CUSTOM_SERVICE_REVIEW:"1",CUSTOM_SERVICE_REVIEW_ENABLED:"1"},ready).ok).toBe(false));
 it("rejects raw/signed URL evidence in the source declaration",()=>{
  const declaration=JSON.parse(ready);declaration.profileFeatures.customServiceReview.settingsEvidence.test="https://fictional.invalid/token=do-not-publish";
  expect(checkProfileActivation({RAILWAY_ENV:"test",CUSTOM_SERVICE_REVIEW_ENABLED:"1"},JSON.stringify(declaration)).ok).toBe(false);
 });
});

it("does not combine readiness declarations for different deployed API source commits",()=>{
 const manifest=JSON.parse(ready);manifest.profileFeatures.departmentRetirement={apiCommit:"b".repeat(40),settingsEvidence:{test:"libfile_fictional_test"}};
 expect(checkProfileActivation({RAILWAY_ENV:"test",NEXT_PUBLIC_PROFILE_NO_DEPARTMENT:"1",CUSTOM_SERVICE_REVIEW_ENABLED:"1"},JSON.stringify(manifest)).ok).toBe(false);
});

describe("location controls activation",()=>{
 it("refuses hiding areas/requiring travel until this environment's settings declaration exists",()=>expect(checkProfileActivation({RAILWAY_ENV:"test",NEXT_PUBLIC_PROFILE_LOCATION_CONTROLS:"1"},pending).ok).toBe(false));
 it("requires a feature API release plus matching cohort cutoff rather than a metadata-only baseline",()=>{
  const cutoff="2026-12-01T00:00:00.000Z";
  const manifest=JSON.stringify({requires:">=2.8.0",profileFeatures:{locationControls:{requires:">=2.8.0",profilesModule:"1.6.0",travelRequiredAfter:{test:cutoff,production:null},apiCommit:"a".repeat(40),settingsEvidence:{test:"libfile_fictional_location",production:null}}}});
  const env={RAILWAY_ENV:"test",NEXT_PUBLIC_PROFILE_LOCATION_CONTROLS:"1",NEXT_PUBLIC_PROFILE_TRAVEL_REQUIRED_AFTER:cutoff};
  expect(checkProfileActivation(env,manifest).ok).toBe(true);expect(checkProfileActivation({...env,RAILWAY_ENV:"production"},manifest).ok).toBe(false);
  expect(checkProfileActivation({...env,NEXT_PUBLIC_PROFILE_TRAVEL_REQUIRED_AFTER:"2026-12-02T00:00:00.000Z"},manifest).ok).toBe(false);
  expect(checkProfileActivation(env,JSON.stringify({requires:">=1.14.0",profileFeatures:{locationControls:{apiCommit:"a".repeat(40),settingsEvidence:{test:"libfile_fictional_location"}}}})).ok).toBe(false);
 });
});

it("does not reuse or move a test cutoff to activate production",()=>{
 const test="2026-12-01T00:00:00.000Z",prod="2026-12-15T00:00:00.000Z";
 const manifest=JSON.stringify({requires:">=2.8.0",profileFeatures:{locationControls:{requires:">=2.8.0",profilesModule:"1.6.0",travelRequiredAfter:{test,production:prod},apiCommit:"a".repeat(40),settingsEvidence:{test:"libfile_fictional_test",production:"libfile_fictional_prod"}}}});
 expect(checkProfileActivation({RAILWAY_ENV:"production",NEXT_PUBLIC_PROFILE_LOCATION_CONTROLS:"1",NEXT_PUBLIC_PROFILE_TRAVEL_REQUIRED_AFTER:test},manifest).ok).toBe(false);
 expect(checkProfileActivation({RAILWAY_ENV:"production",NEXT_PUBLIC_PROFILE_LOCATION_CONTROLS:"1",NEXT_PUBLIC_PROFILE_TRAVEL_REQUIRED_AFTER:prod},manifest).ok).toBe(true);
});

describe("custom skill activation",()=>{
 it("refuses baseline/unknown capability and requires the correct environment's declared receipt",()=>{
  const env={RAILWAY_ENV:"test",NEXT_PUBLIC_PROFILE_CUSTOM_SKILLS:"1"};expect(checkProfileActivation(env,pending).ok).toBe(false);
  const manifest=JSON.stringify({requires:">=2.9.0",profileFeatures:{customSkills:{requires:">=2.9.0",profilesModule:"1.7.0",apiCommit:"a".repeat(40),settingsEvidence:{test:"libfile_fictional_skills",production:null}}}});
  expect(checkProfileActivation(env,manifest).ok).toBe(true);expect(checkProfileActivation({...env,RAILWAY_ENV:"production"},manifest).ok).toBe(false);
 });
});

it('requires actual travel preference field/policy capability and environment receipt before showing the checkbox',()=>{
 const env={RAILWAY_ENV:'test',NEXT_PUBLIC_PROFILE_TRAVEL_PREFERENCE:'1'};expect(checkProfileActivation(env,pending).ok).toBe(false);
 const manifest=JSON.stringify({requires:'>=2.10.0',profileFeatures:{travelPreference:{requires:'>=2.10.0',profilesModule:'1.8.0',apiCommit:'a'.repeat(40),settingsEvidence:{test:'libfile_fictional_travel',production:null}}}});
 expect(checkProfileActivation(env,manifest).ok).toBe(true);expect(checkProfileActivation({...env,RAILWAY_ENV:'production'},manifest).ok).toBe(false);expect(checkProfileActivation({...env,NEXT_PUBLIC_PROFILE_TRAVEL_PREFERENCE:'true'},manifest).ok).toBe(false);
});
