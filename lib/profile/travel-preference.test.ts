import{afterEach,expect,it,vi}from'vitest';
import{travelPreferenceEnabled,extendedTravelLabel}from'./travel-preference';
afterEach(()=>vi.unstubAllEnvs());
it('is explicitly opt-in and only renders a true answer, independently of pricing',()=>{
 vi.stubEnv('NEXT_PUBLIC_PROFILE_TRAVEL_PREFERENCE','');expect(travelPreferenceEnabled()).toBe(false);vi.stubEnv('NEXT_PUBLIC_PROFILE_TRAVEL_PREFERENCE','1');expect(travelPreferenceEnabled()).toBe(true);
 expect(extendedTravelLabel(true)).toBe('Willing to travel beyond Los Angeles.');for(const v of[false,undefined,null,'true',1])expect(extendedTravelLabel(v)).toBe('');
});
