import { serviceCatalogue } from "../profile/service-catalogue";

/*
 * Option lists for the questionnaire and search. The on-set / off-set lists and LA areas come from the
 * design system's GigsterOnboarding template (marked there as a draft taxonomy, subject to the client's
 * review). The waitlist categories are the ones the live "Get on the call sheet" form collects today
 * (imagine-os/between-gigs lib/professional3-options.ts), stored in D1 `leads.category`.
 */

export const onSetSkills = ["Wardrobe & costume", "Props", "Set decoration", "Lighting & grip", "Camera", "Hair & makeup", "Art department", "Locations", "Production office"];

/** Stable saved values; render the approved customer-facing names with serviceLabel. */
export const offSetServices = serviceCatalogue.map(c => c.value);

/** New choices use the same approved catalogue in every mode; old sample answers remain readable. */
export function serviceChoices(source: "sample" | "live") {
  void source;
  return offSetServices;
}

export const laServiceAreas = ["Eastside", "Downtown", "Hollywood", "Westside", "The Valley", "Pasadena area", "South Bay"];

export const waitlistCategories = [
  ["builds", "Furniture & Creative Builds"], ["styling", "Beauty & Personal Styling"],
  ["makeup", "Makeup Services"], ["hair", "Hair Styling"], ["wardrobe", "Wardrobe & Personal Styling"],
  ["interiors", "Interior Styling"], ["photo", "Photography & Video"],
  ["events", "Events & Organization"], ["coaching", "Coaching & Mentorship"],
  ["venues", "Venue & Location Scouting"], ["archives", "Family Films & Digital Archives"], ["other", "Something else"],
] as const;

export const waitlistCategoryLabel = (value: string) => waitlistCategories.find(([id]) => id === value)?.[1] ?? value;

export const monthStatusLabel = { available: "Available this month", limited: "Limited Availability", away: "Not available this month" } as const;
export const basisLabel = { hourly: "Hourly", project: "Per project", day: "Day rate" } as const;
export const basisShort = { hourly: "hr", project: "project", day: "day" } as const;
export const insuranceLabel = { private: "Prefer to discuss privately", yes: "Has liability insurance (self-reported)", no: "No insurance" } as const;
export const modeLabel = { "on-site": "On site", studio: "At their studio", both: "On site or at their studio" } as const;
