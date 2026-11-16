/** Additive optional answer. Keep rendering existing explicit answers during a UI-only rollback. */
export const travelPreferenceEnabled=()=>process.env.NEXT_PUBLIC_PROFILE_TRAVEL_PREFERENCE==="1";
export const extendedTravelLabel=(value:unknown)=>value===true?"Willing to travel beyond Los Angeles.":"";
